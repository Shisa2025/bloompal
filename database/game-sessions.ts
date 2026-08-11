import "server-only";

import type { ActivityType } from "./admin";
import { sql, type DatabaseClient } from "./connection";
import { normalizeDurationSeconds } from "@/lib/validation";
import type { GameCompletionMetrics } from "@/lib/game-metrics";

export type StoredGameSessionMetrics = Omit<
  GameCompletionMetrics,
  "leftRepetitions" | "rightRepetitions"
> & {
  leftRepetitions: number | null;
  rightRepetitions: number | null;
};

export async function isCompletedSessionReplay(
  client: DatabaseClient,
  userid: string,
  sessionId: string,
  activityType: ActivityType,
) {
  const rows = await client.query<{ userid: string; activity_type: ActivityType }>(
    "SELECT userid, activity_type FROM game_sessions WHERE id = $1 LIMIT 1",
    [sessionId],
  );
  if (!rows[0]) return false;
  if (rows[0].userid === userid && rows[0].activity_type === activityType) return true;
  throw new Error("Session ID is already in use.");
}

export async function insertCompletedSession({
  client,
  userid,
  activityType,
  metrics,
  sourceRecordId,
  metadata,
}: {
  client: DatabaseClient;
  userid: string;
  activityType: ActivityType;
  metrics: StoredGameSessionMetrics;
  sourceRecordId: string;
  metadata: Record<string, unknown>;
}) {
  const duration = normalizeDurationSeconds(metrics.durationSeconds);
  const completedAt = new Date();
  const startedAt = new Date(completedAt.getTime() - duration * 1000);

  const rows = await client.query<{ id: string }>(
    `
    INSERT INTO game_sessions (
      id, userid, activity_type, status, started_at, completed_at,
      duration_seconds, left_repetitions, right_repetitions,
      successful_actions, total_attempts, source_record_id, result_metadata
    )
    VALUES ($1, $2, $3, 'completed', $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
    ON CONFLICT DO NOTHING
    RETURNING id
    `,
    [
      metrics.sessionId,
      userid,
      activityType,
      startedAt,
      completedAt,
      duration,
      metrics.leftRepetitions,
      metrics.rightRepetitions,
      metrics.successfulActions ?? null,
      metrics.totalAttempts ?? null,
      sourceRecordId,
      JSON.stringify(metadata),
    ],
  );

  if (!rows[0]) {
    throw new Error("Could not persist the completed game session.");
  }
}

export type UserGameHistoryEntry = {
  id: string;
  activityType: ActivityType;
  completedAt: string;
  durationSeconds: number | null;
};

export async function getUserGameHistory(userid: string, limit = 50): Promise<UserGameHistoryEntry[]> {
  const rows = await sql.query<{
      id: string;
      activity_type: ActivityType;
      completed_at: Date | string;
      duration_seconds: number | null;
    }>(
      `SELECT id, activity_type, completed_at, duration_seconds
       FROM game_sessions
       WHERE userid = $1 AND status = 'completed'
       ORDER BY completed_at DESC
       LIMIT $2`,
      [userid, Math.min(100, Math.max(1, limit))],
    );

  return rows.map((row) => ({
    id: row.id,
    activityType: row.activity_type,
    completedAt: new Date(row.completed_at).toISOString(),
    durationSeconds: row.duration_seconds,
  }));
}
