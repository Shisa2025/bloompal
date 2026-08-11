import "server-only";

import { randomUUID } from "crypto";
import { sql, withTransaction } from "./connection";
import { insertCompletedSession, isCompletedSessionReplay } from "./game-sessions";
import type { WateringCompletionMetrics } from "@/lib/game-metrics";
import { flowerCatalog } from "@/lib/asset-catalog";
import { ensureShopTables } from "./shop";
import { getStoredWateringSession } from "./watering-session";

export const mysterySeedKeys = ["mystery-a", "mystery-b", "mystery-c"] as const;
export const flowerAssets = flowerCatalog.map((asset) => asset.sourceValue);

export type MysterySeedKey = (typeof mysterySeedKeys)[number];
export type FlowerAsset = (typeof flowerCatalog)[number]["sourceValue"];
export type UserPlantStatus = "selected" | "completed";

export type UserPlant = {
  id: string;
  userid: string;
  seedKey: MysterySeedKey;
  status: UserPlantStatus;
  leftWaterCount: number;
  rightWaterCount: number;
  flowerAsset: FlowerAsset | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

type UserPlantRow = {
  id: string;
  userid: string;
  seed_key: string;
  status: string;
  left_water_count: number;
  right_water_count: number;
  flower_asset: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

type UserDashboardSettingsRow = {
  table_flower_asset: string | null;
};

export function isMysterySeedKey(value: string): value is MysterySeedKey {
  return mysterySeedKeys.includes(value as MysterySeedKey);
}

export function isFlowerAsset(value: string): value is FlowerAsset {
  return flowerAssets.includes(value as FlowerAsset);
}

export async function getLatestUserPlant(
  userid: string,
): Promise<UserPlant | null> {
  const rows = (await sql.query(
    `
    SELECT id, userid, seed_key, status, left_water_count, right_water_count,
      flower_asset, created_at, updated_at, completed_at
    FROM user_plants
    WHERE userid = $1
    ORDER BY COALESCE(completed_at, updated_at, created_at) DESC
    LIMIT 1
    `,
    [userid],
  )) as UserPlantRow[];

  return toUserPlant(rows[0]);
}

export async function getOwnedFlowerAssets(userid: string): Promise<FlowerAsset[]> {
  await ensureShopTables();
  const rows = (await sql.query(
    `
    SELECT DISTINCT flower_asset
    FROM user_plants
    WHERE userid = $1
      AND status = 'completed'
      AND flower_asset IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM asset_sales sales
        WHERE sales.source_type = 'flower' AND sales.source_record_id = user_plants.id
      )
    ORDER BY flower_asset ASC
    `,
    [userid],
  )) as { flower_asset: string | null }[];

  return rows
    .map((row) => toFlowerAsset(row.flower_asset))
    .filter((asset): asset is FlowerAsset => Boolean(asset));
}

export async function getTableFlowerAsset(
  userid: string,
): Promise<FlowerAsset | null> {
  await ensureShopTables();
  const rows = (await sql.query(
    `
    SELECT settings.table_flower_asset
    FROM user_dashboard_settings settings
    WHERE settings.userid = $1
      AND (
        settings.table_flower_asset IS NULL
        OR EXISTS (
          SELECT 1
          FROM user_plants plants
          WHERE plants.userid = settings.userid
            AND plants.status = 'completed'
            AND plants.flower_asset = settings.table_flower_asset
            AND NOT EXISTS (
              SELECT 1 FROM asset_sales sales
              WHERE sales.source_type = 'flower' AND sales.source_record_id = plants.id
            )
        )
      )
    LIMIT 1
    `,
    [userid],
  )) as UserDashboardSettingsRow[];

  return toFlowerAsset(rows[0]?.table_flower_asset ?? null);
}

export async function setTableFlowerAsset({
  userid,
  flowerAsset,
}: {
  userid: string;
  flowerAsset: FlowerAsset | null;
}): Promise<FlowerAsset | null> {
  await ensureShopTables();
  if (flowerAsset) {
    const ownedRows = (await sql.query(
      `
      SELECT 1
      FROM user_plants
      WHERE userid = $1
        AND status = 'completed'
        AND flower_asset = $2
        AND NOT EXISTS (
          SELECT 1 FROM asset_sales sales
          WHERE sales.source_type = 'flower' AND sales.source_record_id = user_plants.id
        )
      LIMIT 1
      `,
      [userid, flowerAsset],
    )) as { "?column?": number }[];

    if (ownedRows.length === 0) {
      return null;
    }
  }

  const rows = (await sql.query(
    `
    INSERT INTO user_dashboard_settings (userid, table_flower_asset)
    VALUES ($1, $2)
    ON CONFLICT (userid) DO UPDATE
    SET
      table_flower_asset = EXCLUDED.table_flower_asset,
      updated_at = NOW()
    RETURNING table_flower_asset
    `,
    [userid, flowerAsset],
  )) as UserDashboardSettingsRow[];

  return toFlowerAsset(rows[0]?.table_flower_asset ?? null);
}

export async function getActiveUserPlant(
  userid: string,
): Promise<UserPlant | null> {
  const rows = (await sql.query(
    `
    SELECT id, userid, seed_key, status, left_water_count, right_water_count,
      flower_asset, created_at, updated_at, completed_at
    FROM user_plants
    WHERE userid = $1 AND status = 'selected'
    ORDER BY updated_at DESC
    LIMIT 1
    `,
    [userid],
  )) as UserPlantRow[];

  return toUserPlant(rows[0]);
}

export async function selectUserSeed({
  userid,
  seedKey,
}: {
  userid: string;
  seedKey: MysterySeedKey;
}): Promise<UserPlant | null> {
  const existing = await getActiveUserPlant(userid);

  if (existing) {
    return existing;
  }

  try {
    const rows = (await sql.query(
      `
      INSERT INTO user_plants (
        id, userid, seed_key, status, left_water_count, right_water_count
      )
      VALUES ($1, $2, $3, 'selected', 0, 0)
      RETURNING id, userid, seed_key, status, left_water_count, right_water_count,
        flower_asset, created_at, updated_at, completed_at
      `,
      [randomUUID(), userid, seedKey],
    )) as UserPlantRow[];

    return toUserPlant(rows[0]);
  } catch (error) {
    console.error("Failed to create selected seed.", error);
    return getActiveUserPlant(userid);
  }
}

export async function completeUserPlantWithSession({
  userid,
  plantId,
  metrics,
}: {
  userid: string;
  plantId: string;
  metrics: WateringCompletionMetrics;
}): Promise<UserPlant | null> {
  return withTransaction(async (client) => {
    const currentRows = await client.query<UserPlantRow>(
      `
      SELECT id, userid, seed_key, status, left_water_count, right_water_count,
        flower_asset, created_at, updated_at, completed_at
      FROM user_plants WHERE id = $1 AND userid = $2 LIMIT 1
      `,
      [plantId, userid],
    );
    let plant = toUserPlant(currentRows[0]);
    if (!plant) return null;

    if (await isCompletedSessionReplay(client, userid, metrics.sessionId, "watering")) {
      return plant;
    }

    if (plant.status !== "completed") {
      const flowerAsset = getRandomFlowerAsset();
      const rows = await client.query<UserPlantRow>(
        `
        UPDATE user_plants SET status = 'completed', left_water_count = 5,
          right_water_count = 5, flower_asset = $3, completed_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND userid = $2 AND status = 'selected'
        RETURNING id, userid, seed_key, status, left_water_count, right_water_count,
          flower_asset, created_at, updated_at, completed_at
        `,
        [plantId, userid, flowerAsset],
      );
      plant = toUserPlant(rows[0]);
      if (!plant) return null;
    }

    const storedSession = getStoredWateringSession(metrics);
    await insertCompletedSession({
      client,
      userid,
      activityType: "watering",
      metrics: storedSession.metrics,
      sourceRecordId: plant.id,
      metadata: {
        plantId: plant.id,
        flowerAsset: plant.flowerAsset,
        ...storedSession.metadata,
      },
    });
    return plant;
  });
}

function getRandomFlowerAsset(): FlowerAsset {
  const index = Math.floor(Math.random() * flowerAssets.length);

  return flowerAssets[index];
}

function toUserPlant(row: UserPlantRow | undefined): UserPlant | null {
  if (!row || !isMysterySeedKey(row.seed_key)) {
    return null;
  }

  return {
    id: row.id,
    userid: row.userid,
    seedKey: row.seed_key,
    status: row.status === "completed" ? "completed" : "selected",
    leftWaterCount: Number(row.left_water_count),
    rightWaterCount: Number(row.right_water_count),
    flowerAsset: toFlowerAsset(row.flower_asset),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    completedAt: row.completed_at ? String(row.completed_at) : null,
  };
}

function toFlowerAsset(value: string | null): FlowerAsset | null {
  if (!value) {
    return null;
  }

  return flowerAssets.includes(value as FlowerAsset) ? (value as FlowerAsset) : null;
}
