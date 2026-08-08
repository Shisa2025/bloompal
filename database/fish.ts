import "server-only";

import { randomUUID } from "crypto";
import { sql, withTransaction } from "./connection";
import { insertCompletedSession, isCompletedSessionReplay } from "./game-sessions";
import type { GameCompletionMetrics } from "@/lib/game-metrics";

export const fishKinds = ["goldfish", "bluefish", "koi", "angelfish"] as const;
export type FishKind = (typeof fishKinds)[number];

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
  return fishKinds.includes(value as FishKind);
}

export async function getUserFish(userid: string): Promise<UserFish[]> {
  await ensureFishTable();
  const rows = await sql.query<UserFishRow>(
    "SELECT id, fish_kind, created_at FROM user_fish WHERE userid = $1 ORDER BY created_at ASC",
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
  const rows = await sql.query<{ id: string }>(
    "DELETE FROM user_fish WHERE id = $1 AND userid = $2 RETURNING id",
    [fishId, userid],
  );
  return Boolean(rows[0]);
}

function ensureFishTable() {
  if (!tableReady) {
    tableReady = sql.query(`
      CREATE TABLE IF NOT EXISTS user_fish (
        id TEXT PRIMARY KEY,
        userid VARCHAR(120) NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
        fish_kind VARCHAR(32) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT user_fish_kind_check CHECK (
          fish_kind IN ('goldfish', 'bluefish', 'koi', 'angelfish')
        )
      )
    `).then(async () => {
      await sql.query("CREATE INDEX IF NOT EXISTS user_fish_userid_created_idx ON user_fish(userid, created_at ASC)");
    });
  }
  return tableReady;
}
