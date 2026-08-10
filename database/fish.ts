import "server-only";

import { randomUUID } from "crypto";
import { sql, withTransaction } from "./connection";
import { insertCompletedSession, isCompletedSessionReplay } from "./game-sessions";
import type { GameCompletionMetrics } from "@/lib/game-metrics";
import { meshFishKinds, type FishKind } from "@/lib/fish-assets";
import { ensureShopTables } from "./shop";

export const fishKinds = meshFishKinds;
export type { FishKind };

export type UserFish = {
  id: string;
  fishKind: FishKind;
  createdAt: string;
};

type UserFishRow = {
  id: string;
  fish_kind: string;
  created_at: string;
};

let tableReady: Promise<void> | null = null;

export function isFishKind(value: string): value is FishKind {
  return meshFishKinds.includes(value as FishKind);
}

export async function getUserFish(userid: string): Promise<UserFish[]> {
  await ensureFishTable();
  await ensureShopTables();
  const rows = await sql.query<UserFishRow>(
    `SELECT id, fish_kind, created_at FROM user_fish WHERE userid = $1
       AND NOT EXISTS (SELECT 1 FROM asset_sales sales WHERE sales.source_type = 'fish' AND sales.source_record_id = user_fish.id)
     ORDER BY created_at ASC`,
    [userid],
  );

  return rows.flatMap((row) =>
    isFishKind(row.fish_kind)
      ? [{ id: row.id, fishKind: row.fish_kind, createdAt: row.created_at }]
      : [],
  );
}

export async function addUserFish(userid: string, fishKind: FishKind) {
  await ensureFishTable();
  const rows = await sql.query<{ id: string }>(
    "INSERT INTO user_fish (id, userid, fish_kind) VALUES ($1, $2, $3) RETURNING id",
    [randomUUID(), userid, fishKind],
  );
  return Boolean(rows[0]);
}

export async function addUserFishWithSession({ userid, fishKind, metrics }: { userid: string; fishKind: FishKind; metrics: GameCompletionMetrics }) {
  await ensureFishTable();
  return withTransaction(async (client) => {
    if (await isCompletedSessionReplay(client, userid, metrics.sessionId, "catch_fish")) return true;
    const fishId = randomUUID();
    const rows = await client.query<{ id: string }>(
      "INSERT INTO user_fish (id, userid, fish_kind) VALUES ($1, $2, $3) RETURNING id",
      [fishId, userid, fishKind],
    );
    if (!rows[0]) return false;
    await insertCompletedSession({
      client,
      userid,
      activityType: "catch_fish",
      metrics,
      sourceRecordId: fishId,
      metadata: { fishId, fishKind },
    });
    return true;
  });
}

export async function deleteUserFish({ userid, fishId }: { userid: string; fishId: string }) {
  await ensureFishTable();
  await ensureShopTables();
  const rows = await sql.query<{ id: string }>(
    `DELETE FROM user_fish WHERE id = $1 AND userid = $2
       AND NOT EXISTS (SELECT 1 FROM asset_sales sales WHERE sales.source_type = 'fish' AND sales.source_record_id = user_fish.id)
     RETURNING id`,
    [fishId, userid],
  );
  return Boolean(rows[0]);
}

function ensureFishTable() {
  if (!tableReady) {
    tableReady = withTransaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(42420003)");
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_fish (
          id TEXT PRIMARY KEY,
          userid VARCHAR(120) NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
          fish_kind VARCHAR(32) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT user_fish_kind_check CHECK (
            fish_kind IN ('fish1', 'fish2', 'fish3', 'fish4', 'fish5', 'fish6')
          )
        )
      `);
      await client.query("ALTER TABLE user_fish DROP CONSTRAINT IF EXISTS user_fish_kind_check");
      await client.query("UPDATE user_fish SET fish_kind = CASE fish_kind WHEN 'goldfish' THEN 'fish1' WHEN 'bluefish' THEN 'fish2' WHEN 'koi' THEN 'fish3' WHEN 'angelfish' THEN 'fish4' ELSE fish_kind END WHERE fish_kind IN ('goldfish', 'bluefish', 'koi', 'angelfish')");
      await client.query("ALTER TABLE user_fish ADD CONSTRAINT user_fish_kind_check CHECK (fish_kind IN ('fish1', 'fish2', 'fish3', 'fish4', 'fish5', 'fish6'))");
      await client.query("CREATE INDEX IF NOT EXISTS user_fish_userid_created_idx ON user_fish(userid, created_at ASC)");
    });
  }
  return tableReady;
}
