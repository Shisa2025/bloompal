import "server-only";

import { randomUUID } from "crypto";
import { sql, withTransaction } from "./connection";
import { insertCompletedSession, isCompletedSessionReplay } from "./game-sessions";
import type { GameCompletionMetrics } from "@/lib/game-metrics";

export type UserSnapshot = { id: string; imageData: string; isActive: boolean; createdAt: string };
type Row = { id: string; image_data: string; is_active: boolean; created_at: string };
let tableReady: Promise<void> | null = null;

export async function getUserSnapshots(userid: string): Promise<UserSnapshot[]> {
  await ensureTable();
  const rows = await sql.query("SELECT id, image_data, is_active, created_at FROM user_snapshots WHERE userid = $1 ORDER BY created_at DESC", [userid]) as Row[];
  return rows.map(toSnapshot);
}

export async function addUserSnapshotWithSession({
  userid,
  imageData,
  metrics,
}: {
  userid: string;
  imageData: string;
  metrics: GameCompletionMetrics;
}) {
  return withTransaction(async (client) => {
    if (await isCompletedSessionReplay(client, userid, metrics.sessionId, "snapshot")) return true;

    await client.query("UPDATE user_snapshots SET is_active = FALSE WHERE userid = $1", [userid]);
    const snapshotId = randomUUID();
    const rows = await client.query<{ id: string }>(
      `
      INSERT INTO user_snapshots (id, userid, image_data, storage_provider, is_active)
      VALUES ($1, $2, $3, 'database', TRUE) RETURNING id
      `,
      [snapshotId, userid, imageData],
    );
    if (!rows[0]) return false;

    await insertCompletedSession({
      client,
      userid,
      activityType: "snapshot",
      metrics,
      sourceRecordId: snapshotId,
      metadata: { snapshotId, storageProvider: "database" },
    });
    return true;
  });
}

export async function setActiveUserSnapshot({ userid, snapshotId }: { userid: string; snapshotId: string }) {
  await ensureTable();
  const rows = await sql.query("SELECT id FROM user_snapshots WHERE id = $1 AND userid = $2", [snapshotId, userid]) as { id: string }[];
  if (!rows[0]) return false;
  await sql.query("UPDATE user_snapshots SET is_active = (id = $1) WHERE userid = $2", [snapshotId, userid]);
  return true;
}

export async function deleteUserSnapshot({ userid, snapshotId }: { userid: string; snapshotId: string }) {
  await ensureTable();
  const rows = await sql.query(
    "DELETE FROM user_snapshots WHERE id = $1 AND userid = $2 RETURNING id",
    [snapshotId, userid],
  ) as { id: string }[];
  return Boolean(rows[0]);
}

function ensureTable() {
  if (!tableReady) tableReady = (async () => {
    await sql.query("CREATE TABLE IF NOT EXISTS user_snapshots (id TEXT PRIMARY KEY, userid VARCHAR(120) NOT NULL REFERENCES users(userid) ON DELETE CASCADE, image_data TEXT NOT NULL, is_active BOOLEAN NOT NULL DEFAULT FALSE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
    await sql.query("CREATE INDEX IF NOT EXISTS user_snapshots_userid_created_idx ON user_snapshots(userid, created_at DESC)");
  })();
  return tableReady;
}

function toSnapshot(row: Row): UserSnapshot { return { id: row.id, imageData: row.image_data, isActive: Boolean(row.is_active), createdAt: String(row.created_at) }; }
