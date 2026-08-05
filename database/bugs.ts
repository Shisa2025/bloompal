import "server-only";

import { randomUUID } from "crypto";
import { sql, withTransaction } from "./connection";
import { insertCompletedSession, isCompletedSessionReplay } from "./game-sessions";
import type { GameCompletionMetrics } from "@/lib/game-metrics";

export const bugAssets = [
  "Bee.glb",
  "Beetle.glb",
  "Butterfly.glb",
  "Dragonfly.glb",
  "Ladybug.glb",
] as const;

export type BugAsset = (typeof bugAssets)[number];

export type UserBug = {
  id: string;
  userid: string;
  bugAsset: BugAsset;
  createdAt: string;
  isActive: boolean;
};

type UserBugRow = {
  id: string;
  userid: string;
  bug_asset: string;
  created_at: string;
  is_active: boolean;
};

let tableReady: Promise<void> | null = null;

export function isBugAsset(value: string): value is BugAsset {
  return bugAssets.includes(value as BugAsset);
}

export async function getUserBugs(userid: string): Promise<UserBug[]> {
  await ensureBugsTable();
  const rows = (await sql.query(
    `SELECT id, userid, bug_asset, created_at, is_active FROM user_bugs WHERE userid = $1 ORDER BY created_at ASC`,
    [userid],
  )) as UserBugRow[];

  return rows.map(toUserBug).filter((bug): bug is UserBug => Boolean(bug));
}

export async function addUserBugWithSession({
  userid,
  bugAsset,
  metrics,
}: {
  userid: string;
  bugAsset: BugAsset;
  metrics: GameCompletionMetrics;
}) {
  return withTransaction(async (client) => {
    if (await isCompletedSessionReplay(client, userid, metrics.sessionId, "collect_bugs")) return true;

    await client.query("UPDATE user_bugs SET is_active = FALSE WHERE userid = $1", [userid]);
    const bugId = randomUUID();
    const rows = await client.query<{ id: string }>(
      `
      INSERT INTO user_bugs (id, userid, bug_asset, is_active)
      VALUES ($1, $2, $3, TRUE) RETURNING id
      `,
      [bugId, userid, bugAsset],
    );
    if (!rows[0]) return false;

    await insertCompletedSession({
      client,
      userid,
      activityType: "collect_bugs",
      metrics,
      sourceRecordId: bugId,
      metadata: { bugId, bugAsset },
    });
    return true;
  });
}

export async function deleteUserBug({ userid, bugId }: { userid: string; bugId: string }): Promise<boolean> {
  await ensureBugsTable();
  const rows = (await sql.query(
    `DELETE FROM user_bugs WHERE id = $1 AND userid = $2 RETURNING id, is_active`,
    [bugId, userid],
  )) as { id: string; is_active: boolean }[];

  // If the active companion was released, show the most recently caught
  // remaining bug instead.
  if (rows[0]?.is_active) {
    await sql.query(
      `
        UPDATE user_bugs
        SET is_active = (id = (
          SELECT id FROM user_bugs
          WHERE userid = $1
          ORDER BY created_at DESC
          LIMIT 1
        ))
        WHERE userid = $1
      `,
      [userid],
    );
  }

  return rows.length > 0;
}

export async function setActiveUserBug({ userid, bugId }: { userid: string; bugId: string }): Promise<UserBug | null> {
  await ensureBugsTable();
  const owned = (await sql.query(
    "SELECT id FROM user_bugs WHERE id = $1 AND userid = $2",
    [bugId, userid],
  )) as { id: string }[];

  if (owned.length === 0) return null;

  await sql.query("UPDATE user_bugs SET is_active = (id = $1) WHERE userid = $2", [bugId, userid]);
  const rows = (await sql.query(
    "SELECT id, userid, bug_asset, created_at, is_active FROM user_bugs WHERE id = $1 AND userid = $2",
    [bugId, userid],
  )) as UserBugRow[];

  return toUserBug(rows[0]);
}

function ensureBugsTable() {
  if (!tableReady) {
    tableReady = (async () => {
      await sql.query(`
        CREATE TABLE IF NOT EXISTS user_bugs (
          id TEXT PRIMARY KEY,
          userid VARCHAR(120) NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
          bug_asset VARCHAR(120) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          is_active BOOLEAN NOT NULL DEFAULT FALSE,
          CONSTRAINT user_bugs_asset_check CHECK (
            bug_asset IN ('Bee.glb', 'Beetle.glb', 'Butterfly.glb', 'Dragonfly.glb', 'Ladybug.glb')
          )
        )
      `);
      await sql.query("ALTER TABLE user_bugs ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT FALSE");
      await sql.query(`
        WITH users_without_an_active_bug AS (
          SELECT userid
          FROM user_bugs
          GROUP BY userid
          HAVING NOT BOOL_OR(is_active)
        ), latest_bugs AS (
          SELECT DISTINCT ON (userid) id
          FROM user_bugs
          WHERE userid IN (SELECT userid FROM users_without_an_active_bug)
          ORDER BY userid, created_at DESC
        )
        UPDATE user_bugs SET is_active = TRUE
        WHERE id IN (SELECT id FROM latest_bugs)
      `);
      await sql.query("CREATE INDEX IF NOT EXISTS user_bugs_userid_created_idx ON user_bugs(userid, created_at ASC)");
    })();
  }

  return tableReady;
}

function toUserBug(row: UserBugRow | undefined): UserBug | null {
  if (!row || !isBugAsset(row.bug_asset)) return null;

  return {
    id: row.id,
    userid: row.userid,
    bugAsset: row.bug_asset,
    createdAt: String(row.created_at),
    isActive: Boolean(row.is_active),
  };
}
