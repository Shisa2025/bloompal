import "server-only";

import { randomUUID } from "node:crypto";
import { sql, withTransaction } from "./connection";
import { insertCompletedSession, isCompletedSessionReplay } from "./game-sessions";
import type { GameCompletionMetrics } from "@/lib/game-metrics";

export const fruitKinds = ["apple", "cherry", "lemon", "pear", "strawberry"] as const;
export type FruitKind = (typeof fruitKinds)[number];
export type UserFruit = { id: string; fruitKind: FruitKind; createdAt: string };
let tableReady: Promise<void> | null = null;

export function isFruitKind(value: string): value is FruitKind {
  return fruitKinds.includes(value as FruitKind);
}

export async function getUserFruits(userid: string): Promise<UserFruit[]> {
  await ensureFruitTable();
  const rows = await sql.query<{ id: string; fruit_kind: string; created_at: Date | string }>(
    "SELECT id, fruit_kind, created_at FROM user_fruits WHERE userid = $1 ORDER BY created_at ASC",
    [userid],
  );
  return rows.filter((row) => isFruitKind(row.fruit_kind)).map((row) => ({
    id: row.id,
    fruitKind: row.fruit_kind as FruitKind,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

export async function addUserFruitWithSession({ userid, fruitKind, metrics }: {
  userid: string; fruitKind: FruitKind; metrics: GameCompletionMetrics;
}) {
  await ensureFruitTable();
  return withTransaction(async (client) => {
    if (await isCompletedSessionReplay(client, userid, metrics.sessionId, "pluck_fruit")) return true;
    const fruitId = randomUUID();
    await client.query(
      "INSERT INTO user_fruits (id, userid, fruit_kind) VALUES ($1, $2, $3)",
      [fruitId, userid, fruitKind],
    );
    await insertCompletedSession({
      client, userid, activityType: "pluck_fruit", metrics, sourceRecordId: fruitId,
      metadata: { fruitId, fruitKind },
    });
    return true;
  });
}

export async function deleteUserFruit({ userid, fruitId }: { userid: string; fruitId: string }) {
  await ensureFruitTable();
  const rows = await sql.query<{ id: string }>(
    "DELETE FROM user_fruits WHERE id = $1 AND userid = $2 RETURNING id",
    [fruitId, userid],
  );
  return Boolean(rows[0]);
}

function ensureFruitTable() {
  if (!tableReady) {
    tableReady = sql.query(`CREATE TABLE IF NOT EXISTS user_fruits (
      id TEXT PRIMARY KEY,
      userid VARCHAR(120) NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
      fruit_kind VARCHAR(24) NOT NULL CHECK (fruit_kind IN ('apple', 'cherry', 'lemon', 'pear', 'strawberry')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`).then(async () => {
      await sql.query("CREATE INDEX IF NOT EXISTS user_fruits_userid_created_idx ON user_fruits(userid, created_at ASC)");
      await withTransaction(async (client) => {
        // Runtime initializers can execute concurrently across dashboard requests.
        // Serialize this schema upgrade so two processes cannot recreate the
        // named constraint at the same time.
        await client.query("SELECT pg_advisory_xact_lock(42420002)");
        await client.query("ALTER TABLE user_fruits DROP CONSTRAINT IF EXISTS user_fruits_kind_check");
        await client.query("ALTER TABLE user_fruits DROP CONSTRAINT IF EXISTS user_fruits_fruit_kind_check");
        await client.query("UPDATE user_fruits SET fruit_kind = CASE fruit_kind WHEN 'orange' THEN 'lemon' WHEN 'plum' THEN 'cherry' WHEN 'peach' THEN 'strawberry' ELSE fruit_kind END WHERE fruit_kind IN ('orange', 'plum', 'peach')");
        await client.query("ALTER TABLE user_fruits ADD CONSTRAINT user_fruits_kind_check CHECK (fruit_kind IN ('apple', 'cherry', 'lemon', 'pear', 'strawberry'))");
        await client.query("ALTER TABLE game_sessions DROP CONSTRAINT IF EXISTS game_sessions_activity_check");
        await client.query("ALTER TABLE game_sessions ADD CONSTRAINT game_sessions_activity_check CHECK (activity_type IN ('watering', 'collect_bugs', 'snapshot', 'catch_fish', 'pluck_fruit'))");
      });
    });
  }
  return tableReady;
}
