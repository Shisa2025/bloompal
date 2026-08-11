import "server-only";

import { sql } from "@/database/connection";
import {
  onlineRoomContract,
  type OnlineRoomErrorCode,
  type OnlineRoomPlayer,
  type OnlineRoomSyncRequest,
  type OnlineRoomSyncResponse,
} from "@/lib/online-room-protocol";

export type OnlineRoomIdentity = {
  displayName: string;
  issuedAt: number;
  sessionId: string;
  userId: string;
};

type SyncResultRow = {
  players: OnlineRoomPlayer[];
  status: "ok" | "room_full" | "session_replaced" | "stale_sequence";
};

export class OnlineRoomPresenceError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: OnlineRoomErrorCode,
  ) {
    super(code);
  }
}

let schemaReady: Promise<void> | null = null;

export async function ensureOnlineRoomSchema() {
  if (!schemaReady) {
    schemaReady = createOnlineRoomSchema().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

export async function syncOnlineRoomPresence({
  identity,
  input,
}: {
  identity: OnlineRoomIdentity;
  input: OnlineRoomSyncRequest;
}): Promise<OnlineRoomSyncResponse> {
  await ensureOnlineRoomSchema();
  const roomId = onlineRoomContract.roomId;
  const ttlMs = positiveInteger(
    process.env.PRESENCE_TTL_MS,
    onlineRoomContract.presenceTtlMs,
  );
  const maxPlayers = Math.min(
    onlineRoomContract.maxPlayers,
    positiveInteger(
      process.env.ROOM_MAX_PLAYERS,
      onlineRoomContract.maxPlayers,
    ),
  );

  const firstSpawn = onlineRoomContract.spawnPositions[0];
  const resultRows = await sql.query<SyncResultRow>(
    `WITH room_lock AS MATERIALIZED (
       SELECT pg_advisory_xact_lock(hashtext($1::text)) AS locked
     ),
     expired AS (
       DELETE FROM online_room_presence AS presence
       USING room_lock
       WHERE presence.room_id = $1
         AND presence.userid <> $2
         AND presence.expires_at <= NOW()
       RETURNING presence.userid
     ),
     existing AS MATERIALIZED (
       SELECT presence.userid, presence.session_id,
              presence.session_issued_at, presence.sequence
       FROM online_room_presence AS presence, room_lock
       WHERE presence.room_id = $1
         AND presence.userid = $2
         AND presence.expires_at > NOW()
       LIMIT 1
     ),
     active AS MATERIALIZED (
       SELECT presence.userid, presence.display_name, presence.outfit_id,
              presence.position_x, presence.position_z, presence.heading,
              presence.movement_state, presence.last_seen_at,
              presence.connected_at
       FROM online_room_presence AS presence, room_lock
       WHERE presence.room_id = $1
         AND presence.expires_at > NOW()
       ORDER BY presence.connected_at ASC
     ),
     decision AS MATERIALIZED (
       SELECT existing.userid IS NOT NULL AS has_existing,
              existing.session_id,
              existing.session_issued_at,
              existing.sequence,
              (SELECT COUNT(*)::int FROM active) AS active_count,
              CASE
                WHEN existing.userid IS NOT NULL
                  AND existing.session_id <> $3
                  AND $4::bigint <= existing.session_issued_at
                  THEN 'session_replaced'
                WHEN existing.userid IS NOT NULL
                  AND existing.session_id = $3
                  AND $11::bigint <= existing.sequence
                  THEN 'stale_sequence'
                WHEN existing.userid IS NULL
                  AND (SELECT COUNT(*) FROM active) >= $13::int
                  THEN 'room_full'
                ELSE 'ok'
              END AS status
       FROM room_lock
       LEFT JOIN existing ON TRUE
     ),
     upserted AS (
       INSERT INTO online_room_presence (
         room_id, userid, session_id, session_issued_at, display_name,
         outfit_id, position_x, position_z, heading, movement_state,
         sequence, connected_at, last_seen_at, expires_at
       )
       SELECT $1, $2, $3, $4, $5,
              $6,
              CASE WHEN decision.has_existing
                THEN $7::double precision
                ELSE COALESCE(spawn.x, $15::double precision)
              END,
              CASE WHEN decision.has_existing
                THEN $8::double precision
                ELSE COALESCE(spawn.z, $16::double precision)
              END,
              $9, $10,
              CASE WHEN decision.has_existing AND decision.session_id <> $3
                THEN 0
                ELSE $11::bigint
              END,
              NOW(), NOW(), NOW() + ($12::int * INTERVAL '1 millisecond')
       FROM decision
       LEFT JOIN LATERAL (
         SELECT candidate.x, candidate.z
         FROM ROWS FROM (
           jsonb_to_recordset($14::jsonb)
             AS (x double precision, z double precision)
         ) WITH ORDINALITY AS candidate(x, z, ordinal)
         WHERE NOT EXISTS (
           SELECT 1
           FROM active
           WHERE SQRT(
             POWER(active.position_x - candidate.x, 2) +
             POWER(active.position_z - candidate.z, 2)
           ) <= 0.8
         )
         ORDER BY candidate.ordinal
         LIMIT 1
       ) AS spawn ON TRUE
       WHERE decision.status = 'ok'
       ON CONFLICT (room_id, userid) DO UPDATE SET
         session_id = EXCLUDED.session_id,
         session_issued_at = GREATEST(
           online_room_presence.session_issued_at,
           EXCLUDED.session_issued_at
         ),
         display_name = EXCLUDED.display_name,
         outfit_id = EXCLUDED.outfit_id,
         position_x = EXCLUDED.position_x,
         position_z = EXCLUDED.position_z,
         heading = EXCLUDED.heading,
         movement_state = EXCLUDED.movement_state,
         sequence = EXCLUDED.sequence,
         connected_at = CASE
           WHEN online_room_presence.expires_at <= NOW() THEN NOW()
           ELSE online_room_presence.connected_at
         END,
         last_seen_at = NOW(),
         expires_at = EXCLUDED.expires_at
       RETURNING userid, display_name, outfit_id, position_x, position_z,
                 heading, movement_state, last_seen_at, connected_at
     ),
     players AS (
       SELECT * FROM active WHERE active.userid <> $2
       UNION ALL
       SELECT * FROM upserted
     )
     SELECT decision.status,
            COALESCE(
              JSONB_AGG(
                JSONB_BUILD_OBJECT(
                  'userId', players.userid,
                  'displayName', players.display_name,
                  'outfitId', players.outfit_id,
                  'x', players.position_x,
                  'z', players.position_z,
                  'heading', players.heading,
                  'moving', players.movement_state = 'walk',
                  'lastSeenAt', players.last_seen_at
                ) ORDER BY players.connected_at
              ) FILTER (WHERE players.userid IS NOT NULL),
              '[]'::jsonb
            ) AS players
     FROM decision
     LEFT JOIN players ON decision.status = 'ok'
     GROUP BY decision.status`,
    [
      roomId,
      identity.userId,
      identity.sessionId,
      identity.issuedAt,
      identity.displayName.trim().slice(0, 120) || identity.userId,
      input.outfitId,
      input.x,
      input.z,
      input.heading,
      input.moving ? "walk" : "idle",
      input.sequence,
      ttlMs,
      maxPlayers,
      JSON.stringify(onlineRoomContract.spawnPositions),
      firstSpawn.x,
      firstSpawn.z,
    ],
  );
  const result = resultRows[0];
  if (!result) throw new Error("Online room sync returned no result.");
  if (result.status !== "ok") {
    throw new OnlineRoomPresenceError(409, result.status);
  }

  const players = result.players.map(normalizePlayer);
  const self = players.find((player) => player.userId === identity.userId);
  if (!self) throw new Error("Online room presence was not persisted.");

  return {
    roomId,
    serverTime: new Date().toISOString(),
    capacity: maxPlayers,
    self,
    players,
  };
}

export async function leaveOnlineRoomPresence(identity: OnlineRoomIdentity) {
  await ensureOnlineRoomSchema();
  const deletedRows = await sql.query<{ userid: string }>(
    `DELETE FROM online_room_presence
     WHERE room_id = $1 AND userid = $2 AND session_id = $3
     RETURNING userid`,
    [onlineRoomContract.roomId, identity.userId, identity.sessionId],
  );
  return { left: deletedRows.length > 0 };
}

function normalizePlayer(player: OnlineRoomPlayer): OnlineRoomPlayer {
  return {
    ...player,
    x: Number(player.x),
    z: Number(player.z),
    heading: Number(player.heading),
    lastSeenAt: new Date(player.lastSeenAt).toISOString(),
  };
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function createOnlineRoomSchema() {
  await sql.query(`
    CREATE TABLE IF NOT EXISTS online_room_presence (
      room_id VARCHAR(40) NOT NULL,
      userid VARCHAR(120) NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
      session_id VARCHAR(64) NOT NULL,
      session_issued_at BIGINT NOT NULL,
      display_name VARCHAR(120) NOT NULL,
      outfit_id VARCHAR(80) NOT NULL,
      position_x DOUBLE PRECISION NOT NULL,
      position_z DOUBLE PRECISION NOT NULL,
      heading DOUBLE PRECISION NOT NULL,
      movement_state VARCHAR(12) NOT NULL,
      sequence BIGINT NOT NULL DEFAULT 0,
      connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      PRIMARY KEY (room_id, userid),
      CONSTRAINT online_room_presence_outfit_check CHECK (
        outfit_id IN ('base', 'moss-cardigan', 'honey-raincoat')
      ),
      CONSTRAINT online_room_presence_movement_check CHECK (
        movement_state IN ('idle', 'walk')
      ),
      CONSTRAINT online_room_presence_sequence_check CHECK (sequence >= 0)
    )
  `);
  await sql.query(`
    CREATE INDEX IF NOT EXISTS online_room_presence_expiry_idx
    ON online_room_presence(room_id, expires_at)
  `);
}
