import "server-only";

import { randomUUID } from "node:crypto";
import {
  getCatalogAssetBySource,
  getMusicAsset,
  getSellableAsset,
  isMusicTrackId,
  sellableAssetCatalog,
  type AssetCategory,
  type MusicTrackId,
  type SellableAssetId,
  type SellableCatalogAsset,
  type ShopInventoryItem,
  type ShopSaleRequestLine,
  type ShopSaleResultItem,
  type ShopState,
} from "../lib/asset-catalog";
import {
  getPurchasableDashboardOutfit,
  isDashboardOutfitId,
  isPurchasableDashboardOutfitId,
  type DashboardOutfitId,
  type PurchasableDashboardOutfitId,
} from "../lib/dashboard-outfits";
import { sql, withTransaction, type DatabaseClient } from "./connection";

type SellableCategory = ShopInventoryItem["category"];

let shopTablesReady: Promise<void> | null = null;

export function ensureShopTables() {
  if (!shopTablesReady) {
    shopTablesReady = withTransaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(42420004)");
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_wallets (
          userid VARCHAR(120) PRIMARY KEY REFERENCES users(userid) ON DELETE CASCADE,
          balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_music (
          userid VARCHAR(120) NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
          track_id VARCHAR(80) NOT NULL,
          purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (userid, track_id)
        )
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_outfits (
          userid VARCHAR(120) NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
          outfit_id VARCHAR(80) NOT NULL,
          purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (userid, outfit_id)
        )
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_dashboard_settings (
          userid VARCHAR(120) PRIMARY KEY REFERENCES users(userid) ON DELETE CASCADE,
          table_flower_asset VARCHAR(120),
          equipped_outfit_id VARCHAR(80),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      await client.query(`
        ALTER TABLE user_dashboard_settings
        ADD COLUMN IF NOT EXISTS equipped_outfit_id VARCHAR(80)
      `);
      await client.query(
        "ALTER TABLE user_dashboard_settings DROP CONSTRAINT IF EXISTS user_dashboard_settings_equipped_outfit_check",
      );
      await client.query(`
        ALTER TABLE user_dashboard_settings
        ADD CONSTRAINT user_dashboard_settings_equipped_outfit_check
        CHECK (
          equipped_outfit_id IS NULL OR
          equipped_outfit_id IN ('base', 'moss-cardigan', 'honey-raincoat', 'leafback-dinosaur')
        )
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS asset_sales (
          id TEXT PRIMARY KEY,
          userid VARCHAR(120) NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
          asset_id VARCHAR(120) NOT NULL,
          source_type VARCHAR(24) NOT NULL CHECK (source_type IN ('flower', 'bug', 'fish', 'fruit')),
          source_record_id TEXT NOT NULL,
          coin_value INTEGER NOT NULL CHECK (coin_value > 0),
          sold_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (source_type, source_record_id)
        )
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS coin_transactions (
          id TEXT PRIMARY KEY,
          userid VARCHAR(120) NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
          amount INTEGER NOT NULL CHECK (amount <> 0),
          balance_after INTEGER NOT NULL CHECK (balance_after >= 0),
          reason VARCHAR(32) NOT NULL CHECK (reason IN ('purchase_music', 'purchase_outfit', 'sell_asset')),
          reference_id TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE (userid, reason, reference_id)
        )
      `);
      await client.query(
        "ALTER TABLE coin_transactions DROP CONSTRAINT IF EXISTS coin_transactions_reason_check",
      );
      await client.query(`
        ALTER TABLE coin_transactions
        ADD CONSTRAINT coin_transactions_reason_check
        CHECK (reason IN ('purchase_music', 'purchase_outfit', 'sell_asset'))
      `);
      await client.query(
        "CREATE INDEX IF NOT EXISTS asset_sales_userid_asset_idx ON asset_sales(userid, asset_id, sold_at)",
      );
      await client.query(
        "CREATE INDEX IF NOT EXISTS coin_transactions_userid_created_idx ON coin_transactions(userid, created_at DESC)",
      );
      await client.query(`
        INSERT INTO user_wallets (userid, balance)
        SELECT userid, 0 FROM users WHERE role = 'user'
        ON CONFLICT (userid) DO NOTHING
      `);
    });
  }
  return shopTablesReady;
}

export async function getShopState(userid: string): Promise<ShopState> {
  await ensureShopTables();
  const [walletRows, musicRows, outfitRows, inventoryRows] = await Promise.all([
    sql.query<{ balance: number }>(
      "SELECT balance FROM user_wallets WHERE userid = $1",
      [userid],
    ),
    sql.query<{ track_id: string }>(
      "SELECT track_id FROM user_music WHERE userid = $1 ORDER BY purchased_at ASC",
      [userid],
    ),
    sql.query<{ outfit_id: string }>(
      "SELECT outfit_id FROM user_outfits WHERE userid = $1 ORDER BY purchased_at ASC",
      [userid],
    ),
    sql.query<{ category: SellableCategory; source_value: string; quantity: string | number }>(
      `
        SELECT 'flower'::text AS category, plants.flower_asset AS source_value, COUNT(*) AS quantity
        FROM user_plants plants
        WHERE plants.userid = $1 AND plants.status = 'completed' AND plants.flower_asset IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM asset_sales sales WHERE sales.source_type = 'flower' AND sales.source_record_id = plants.id)
        GROUP BY plants.flower_asset
        UNION ALL
        SELECT 'bug', bugs.bug_asset, COUNT(*)
        FROM user_bugs bugs
        WHERE bugs.userid = $1
          AND NOT EXISTS (SELECT 1 FROM asset_sales sales WHERE sales.source_type = 'bug' AND sales.source_record_id = bugs.id)
        GROUP BY bugs.bug_asset
        UNION ALL
        SELECT 'fish', fish.fish_kind, COUNT(*)
        FROM user_fish fish
        WHERE fish.userid = $1
          AND NOT EXISTS (SELECT 1 FROM asset_sales sales WHERE sales.source_type = 'fish' AND sales.source_record_id = fish.id)
        GROUP BY fish.fish_kind
        UNION ALL
        SELECT 'fruit', fruits.fruit_kind, COUNT(*)
        FROM user_fruits fruits
        WHERE fruits.userid = $1
          AND NOT EXISTS (SELECT 1 FROM asset_sales sales WHERE sales.source_type = 'fruit' AND sales.source_record_id = fruits.id)
        GROUP BY fruits.fruit_kind
      `,
      [userid],
    ),
  ]);

  return {
    coinBalance: Number(walletRows[0]?.balance ?? 0),
    ownedMusicIds: musicRows.flatMap((row) =>
      isMusicTrackId(row.track_id) ? [row.track_id] : [],
    ),
    ownedOutfitIds: outfitRows.flatMap((row) =>
      isPurchasableDashboardOutfitId(row.outfit_id) ? [row.outfit_id] : [],
    ),
    inventory: inventoryRows.flatMap((row) => {
      const asset = getCatalogAssetBySource(row.category, row.source_value);
      return asset && getSellableAsset(asset.id)
        ? [
            {
              assetId: asset.id as SellableAssetId,
              category: row.category,
              quantity: Number(row.quantity),
            },
          ]
        : [];
    }),
  };
}

export async function getEquippedDashboardOutfit(
  userid: string,
): Promise<DashboardOutfitId | null> {
  await ensureShopTables();
  const rows = await sql.query<{ equipped_outfit_id: string | null }>(
    `
      SELECT settings.equipped_outfit_id
      FROM user_dashboard_settings settings
      WHERE settings.userid = $1
        AND (
          settings.equipped_outfit_id = 'base'
          OR EXISTS (
            SELECT 1
            FROM user_outfits outfits
            WHERE outfits.userid = settings.userid
              AND outfits.outfit_id = settings.equipped_outfit_id
          )
        )
      LIMIT 1
    `,
    [userid],
  );
  const outfitId = rows[0]?.equipped_outfit_id;
  return isDashboardOutfitId(outfitId) ? outfitId : null;
}

export async function setEquippedDashboardOutfit({
  userid,
  outfitId,
}: {
  userid: string;
  outfitId: string;
}): Promise<DashboardOutfitId | null> {
  if (!isDashboardOutfitId(outfitId)) return null;

  await ensureShopTables();
  const rows = await sql.query<{ equipped_outfit_id: string }>(
    `
      INSERT INTO user_dashboard_settings (userid, equipped_outfit_id)
      SELECT requested.userid, requested.outfit_id
      FROM (
        VALUES ($1::VARCHAR(120), $2::VARCHAR(80))
      ) AS requested(userid, outfit_id)
      WHERE requested.outfit_id = 'base'
        OR EXISTS (
          SELECT 1 FROM user_outfits
          WHERE userid = requested.userid
            AND outfit_id = requested.outfit_id
        )
      ON CONFLICT (userid) DO UPDATE
      SET equipped_outfit_id = EXCLUDED.equipped_outfit_id,
          updated_at = NOW()
      RETURNING equipped_outfit_id
    `,
    [userid, outfitId],
  );
  const savedOutfitId = rows[0]?.equipped_outfit_id;
  return isDashboardOutfitId(savedOutfitId) ? savedOutfitId : null;
}

export async function purchaseOutfit({
  userid,
  outfitId,
}: {
  userid: string;
  outfitId: string;
}): Promise<
  | {
      ok: true;
      coinBalance: number;
      outfitId: PurchasableDashboardOutfitId;
    }
  | { ok: false; reason: "invalid" | "already_owned" | "insufficient_coins" }
> {
  const outfit = getPurchasableDashboardOutfit(outfitId);
  if (!outfit || !isPurchasableDashboardOutfitId(outfit.id)) {
    return { ok: false, reason: "invalid" };
  }

  await ensureShopTables();
  return withTransaction(async (client) => {
    await ensureWalletRow(client, userid);
    const walletRows = await client.query<{ balance: number }>(
      "SELECT balance FROM user_wallets WHERE userid = $1 FOR UPDATE",
      [userid],
    );
    const currentBalance = Number(walletRows[0]?.balance ?? 0);
    const ownedRows = await client.query<{ outfit_id: string }>(
      "SELECT outfit_id FROM user_outfits WHERE userid = $1 AND outfit_id = $2",
      [userid, outfit.id],
    );
    if (ownedRows.length > 0) {
      return { ok: false as const, reason: "already_owned" as const };
    }
    if (currentBalance < outfit.buyPrice) {
      return { ok: false as const, reason: "insufficient_coins" as const };
    }

    await client.query(
      "INSERT INTO user_outfits (userid, outfit_id) VALUES ($1, $2)",
      [userid, outfit.id],
    );
    await client.query(
      `INSERT INTO user_dashboard_settings (userid, equipped_outfit_id)
       VALUES ($1, $2)
       ON CONFLICT (userid) DO UPDATE
       SET equipped_outfit_id = EXCLUDED.equipped_outfit_id,
           updated_at = NOW()`,
      [userid, outfit.id],
    );
    const balanceRows = await client.query<{ balance: number }>(
      "UPDATE user_wallets SET balance = balance - $2, updated_at = NOW() WHERE userid = $1 RETURNING balance",
      [userid, outfit.buyPrice],
    );
    const coinBalance = Number(balanceRows[0].balance);
    await client.query(
      `INSERT INTO coin_transactions (id, userid, amount, balance_after, reason, reference_id)
       VALUES ($1, $2, $3, $4, 'purchase_outfit', $5)`,
      [randomUUID(), userid, -outfit.buyPrice, coinBalance, outfit.id],
    );

    return {
      ok: true as const,
      coinBalance,
      outfitId: outfit.id,
    };
  });
}

export async function purchaseMusic({
  userid,
  trackId,
}: {
  userid: string;
  trackId: string;
}): Promise<
  | { ok: true; coinBalance: number; trackId: MusicTrackId }
  | { ok: false; reason: "invalid" | "already_owned" | "insufficient_coins" }
> {
  const track = getMusicAsset(trackId);
  if (!track || !isMusicTrackId(track.id) || track.buyPrice !== 10) {
    return { ok: false, reason: "invalid" };
  }

  await ensureShopTables();
  return withTransaction(async (client) => {
    await ensureWalletRow(client, userid);
    const walletRows = await client.query<{ balance: number }>(
      "SELECT balance FROM user_wallets WHERE userid = $1 FOR UPDATE",
      [userid],
    );
    const currentBalance = Number(walletRows[0]?.balance ?? 0);
    const ownedRows = await client.query<{ track_id: string }>(
      "SELECT track_id FROM user_music WHERE userid = $1 AND track_id = $2",
      [userid, track.id],
    );
    if (ownedRows.length > 0) {
      return { ok: false as const, reason: "already_owned" as const };
    }
    if (currentBalance < track.buyPrice) {
      return { ok: false as const, reason: "insufficient_coins" as const };
    }

    await client.query(
      "INSERT INTO user_music (userid, track_id) VALUES ($1, $2)",
      [userid, track.id],
    );
    const balanceRows = await client.query<{ balance: number }>(
      "UPDATE user_wallets SET balance = balance - $2, updated_at = NOW() WHERE userid = $1 RETURNING balance",
      [userid, track.buyPrice],
    );
    const coinBalance = Number(balanceRows[0].balance);
    await client.query(
      `INSERT INTO coin_transactions (id, userid, amount, balance_after, reason, reference_id)
       VALUES ($1, $2, $3, $4, 'purchase_music', $5)`,
      [randomUUID(), userid, -track.buyPrice, coinBalance, track.id],
    );

    return { ok: true as const, coinBalance, trackId: track.id };
  });
}

export async function sellResources({
  userid,
  lines,
}: {
  userid: string;
  lines: readonly ShopSaleRequestLine[];
}): Promise<
  | {
      ok: true;
      coinBalance: number;
      earnedCoins: number;
      soldQuantity: number;
      items: ShopSaleResultItem[];
    }
  | { ok: false; reason: "invalid" | "inventory_changed" }
> {
  const validatedLines = validateSaleLines(lines);
  if (!validatedLines) return { ok: false, reason: "invalid" };

  await ensureShopTables();
  return withTransaction(async (client) => {
    await ensureWalletRow(client, userid);
    await client.query(
      "SELECT balance FROM user_wallets WHERE userid = $1 FOR UPDATE",
      [userid],
    );

    const lockedLines: Array<
      ValidatedSaleLine & { sources: OwnedSourceRow[] }
    > = [];

    for (const line of validatedLines) {
      const sources = await selectOldestOwnedResources({
        client,
        userid,
        category: line.asset.category,
        sourceValue: line.asset.sourceValue,
        quantity: line.quantity,
      });
      if (sources.length !== line.quantity) {
        return {
          ok: false as const,
          reason: "inventory_changed" as const,
        };
      }
      lockedLines.push({ ...line, sources });
    }

    const batchId = randomUUID();
    const earnedCoins = lockedLines.reduce(
      (total, line) => total + line.quantity * line.asset.sellPrice,
      0,
    );
    const soldQuantity = lockedLines.reduce(
      (total, line) => total + line.quantity,
      0,
    );

    for (const line of lockedLines) {
      for (const source of line.sources) {
        await client.query(
          `INSERT INTO asset_sales (id, userid, asset_id, source_type, source_record_id, coin_value)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            randomUUID(),
            userid,
            line.asset.id,
            line.asset.category,
            source.id,
            line.asset.sellPrice,
          ],
        );
      }
    }

    for (const line of lockedLines) {
      await reconcileDisplayedResources({
        client,
        userid,
        category: line.asset.category,
        sourceValue: line.asset.sourceValue,
        sources: line.sources,
      });
    }

    const balanceRows = await client.query<{ balance: number }>(
      "UPDATE user_wallets SET balance = balance + $2, updated_at = NOW() WHERE userid = $1 RETURNING balance",
      [userid, earnedCoins],
    );
    const coinBalance = Number(balanceRows[0].balance);
    await client.query(
      `INSERT INTO coin_transactions (id, userid, amount, balance_after, reason, reference_id)
       VALUES ($1, $2, $3, $4, 'sell_asset', $5)`,
      [randomUUID(), userid, earnedCoins, coinBalance, batchId],
    );

    const items: ShopSaleResultItem[] = [];
    for (const line of lockedLines) {
      const countRows = await countOwnedResource({
        client,
        userid,
        category: line.asset.category,
        sourceValue: line.asset.sourceValue,
      });
      items.push({
        assetId: line.asset.id as SellableAssetId,
        soldQuantity: line.quantity,
        remainingQuantity: Number(countRows[0]?.quantity ?? 0),
      });
    }

    return {
      ok: true as const,
      coinBalance,
      earnedCoins,
      soldQuantity,
      items,
    };
  });
}

type ValidatedSaleLine = {
  asset: SellableCatalogAsset;
  quantity: number;
};

function validateSaleLines(
  lines: readonly ShopSaleRequestLine[],
): ValidatedSaleLine[] | null {
  if (
    !Array.isArray(lines) ||
    lines.length === 0 ||
    lines.length > sellableAssetCatalog.length
  ) {
    return null;
  }

  const seen = new Set<string>();
  const validated: ValidatedSaleLine[] = [];

  for (const line of lines) {
    if (
      !line ||
      typeof line.assetId !== "string" ||
      !Number.isSafeInteger(line.quantity) ||
      line.quantity <= 0 ||
      seen.has(line.assetId)
    ) {
      return null;
    }

    const asset = getSellableAsset(line.assetId);
    if (!asset || !isSellableCategory(asset.category) || !asset.sourceValue) {
      return null;
    }

    seen.add(line.assetId);
    validated.push({ asset, quantity: line.quantity });
  }

  return validated.sort((left, right) =>
    left.asset.id.localeCompare(right.asset.id),
  );
}

async function ensureWalletRow(client: DatabaseClient, userid: string) {
  await client.query(
    "INSERT INTO user_wallets (userid, balance) VALUES ($1, 0) ON CONFLICT (userid) DO NOTHING",
    [userid],
  );
}

function isSellableCategory(category: AssetCategory): category is SellableCategory {
  return ["flower", "bug", "fish", "fruit"].includes(category);
}

type OwnedSourceRow = { id: string; is_active?: boolean };

function selectOldestOwnedResources({
  client,
  userid,
  category,
  sourceValue,
  quantity,
}: {
  client: DatabaseClient;
  userid: string;
  category: SellableCategory;
  sourceValue: string;
  quantity: number;
}) {
  const definitions = {
    flower: { table: "user_plants", value: "flower_asset", extra: "AND source.status = 'completed'", columns: "source.id" },
    bug: { table: "user_bugs", value: "bug_asset", extra: "", columns: "source.id, source.is_active" },
    fish: { table: "user_fish", value: "fish_kind", extra: "", columns: "source.id" },
    fruit: { table: "user_fruits", value: "fruit_kind", extra: "", columns: "source.id" },
  } as const;
  const definition = definitions[category];
  return client.query<OwnedSourceRow>(
    `SELECT ${definition.columns} FROM ${definition.table} source
     WHERE source.userid = $1 AND source.${definition.value} = $2 ${definition.extra}
       AND NOT EXISTS (SELECT 1 FROM asset_sales sales WHERE sales.source_type = $3 AND sales.source_record_id = source.id)
     ORDER BY source.created_at ASC LIMIT $4 FOR UPDATE`,
    [userid, sourceValue, category, quantity],
  );
}

function countOwnedResource({
  client,
  userid,
  category,
  sourceValue,
}: {
  client: DatabaseClient;
  userid: string;
  category: SellableCategory;
  sourceValue: string;
}) {
  const definitions = {
    flower: { table: "user_plants", value: "flower_asset", extra: "AND source.status = 'completed'" },
    bug: { table: "user_bugs", value: "bug_asset", extra: "" },
    fish: { table: "user_fish", value: "fish_kind", extra: "" },
    fruit: { table: "user_fruits", value: "fruit_kind", extra: "" },
  } as const;
  const definition = definitions[category];
  return client.query<{ quantity: number | string }>(
    `SELECT COUNT(*) AS quantity FROM ${definition.table} source
     WHERE source.userid = $1 AND source.${definition.value} = $2 ${definition.extra}
       AND NOT EXISTS (SELECT 1 FROM asset_sales sales WHERE sales.source_type = $3 AND sales.source_record_id = source.id)`,
    [userid, sourceValue, category],
  );
}

async function reconcileDisplayedResources({
  client,
  userid,
  category,
  sourceValue,
  sources,
}: {
  client: DatabaseClient;
  userid: string;
  category: SellableCategory;
  sourceValue: string;
  sources: OwnedSourceRow[];
}) {
  if (category === "flower") {
    const remaining = await countOwnedResource({
      client,
      userid,
      category,
      sourceValue,
    });
    if (Number(remaining[0]?.quantity ?? 0) === 0) {
      await client.query(
        "UPDATE user_dashboard_settings SET table_flower_asset = NULL, updated_at = NOW() WHERE userid = $1 AND table_flower_asset = $2",
        [userid, sourceValue],
      );
    }
  }

  const activeBugIds = sources
    .filter((source) => source.is_active)
    .map((source) => source.id);

  if (category === "bug" && activeBugIds.length > 0) {
    await client.query(
      "UPDATE user_bugs SET is_active = FALSE WHERE id = ANY($1::TEXT[])",
      [activeBugIds],
    );
    await client.query(
      `UPDATE user_bugs SET is_active = TRUE WHERE id = (
         SELECT bugs.id FROM user_bugs bugs
         WHERE bugs.userid = $1
           AND NOT EXISTS (SELECT 1 FROM asset_sales sales WHERE sales.source_type = 'bug' AND sales.source_record_id = bugs.id)
         ORDER BY bugs.created_at DESC LIMIT 1
       )`,
      [userid],
    );
  }
}
