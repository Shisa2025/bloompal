import "server-only";

import { sql, withTransaction } from "@/database/connection";
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

type ExistingPresenceRow = {
  position_x: number | string;
  position_z: number | string;
  sequence: number | string;
  session_id: string;
  session_issued_at: number | string;
};

type ActivePositionRow = {
  position_x: number | string;
  position_z: number | string;
  userid: string;
};

type PlayerRow = ActivePositionRow & {
  display_name: string;
  heading: number | string;
  last_seen_at: Date | string;
  movement_state: "idle" | "walk";
  outfit_id: OnlineRoomPlayer["outfitId"];
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

  return withTransaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [roomId]);
    await client.query(
      "DELETE FROM online_room_presence WHERE room_id = $1 AND expires_at <= NOW()",
      [roomId],
    );

    const existingRows = await client.query<ExistingPresenceRow>(
      `SELECT session_id, session_issued_at, sequence, position_x, position_z
       FROM online_room_presence
       WHERE room_id = $1 AND userid = $2
       LIMIT 1`,
      [roomId, identity.userId],
    );
    const existing = existingRows[0];
    const isNewSession = Boolean(
      existing && existing.session_id !== identity.sessionId,
    );

    if (
      isNewSession &&
      identity.issuedAt <= Number(existing.session_issued_at)
    ) {
      throw new OnlineRoomPresenceError(409, "session_replaced");
    }
    if (
      existing &&
      !isNewSession &&
      input.sequence <= Number(existing.sequence)
    ) {
      throw new OnlineRoomPresenceError(409, "stale_sequence");
    }

    const activeRows = await client.query<ActivePositionRow>(
      `SELECT userid, position_x, position_z
       FROM online_room_presence
       WHERE room_id = $1 AND expires_at > NOW()
       ORDER BY connected_at ASC`,
      [roomId],
    );
    if (!existing && activeRows.length >= maxPlayers) {
      throw new OnlineRoomPresenceError(409, "room_full");
    }

    const spawn = chooseSpawn(activeRows);
    const position = existing
      ? { x: input.x, z: input.z }
      : { x: spawn.x, z: spawn.z };
    const nextSequence = isNewSession ? 0 : input.sequence;

    await client.query(
      `INSERT INTO online_room_presence (
         room_id, userid, session_id, session_issued_at, display_name,
         outfit_id, position_x, position_z, heading, movement_state,
         sequence, connected_at, last_seen_at, expires_at
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9, $10,
         $11, NOW(), NOW(), NOW() + ($12::int * INTERVAL '1 millisecond')
       )
       ON CONFLICT (room_id, userid) DO UPDATE SET
         session_id = EXCLUDED.session_id,
         session_issued_at = GREATEST(online_room_presence.session_issued_at, EXCLUDED.session_issued_at),
         display_name = EXCLUDED.display_name,
         outfit_id = EXCLUDED.outfit_id,
         position_x = EXCLUDED.position_x,
         position_z = EXCLUDED.position_z,
         heading = EXCLUDED.heading,
         movement_state = EXCLUDED.movement_state,
         sequence = EXCLUDED.sequence,
         last_seen_at = NOW(),
         expires_at = EXCLUDED.expires_at`,
      [
        roomId,
        identity.userId,
        identity.sessionId,
        identity.issuedAt,
        identity.displayName.trim().slice(0, 120) || identity.userId,
        input.outfitId,
        position.x,
        position.z,
        input.heading,
        input.moving ? "walk" : "idle",
        nextSequence,
        ttlMs,
      ],
    );

    const playerRows = await client.query<PlayerRow>(
      `SELECT userid, display_name, outfit_id, position_x, position_z,
              heading, movement_state, last_seen_at
       FROM online_room_presence
       WHERE room_id = $1 AND expires_at > NOW()
       ORDER BY connected_at ASC`,
      [roomId],
    );
    const players = playerRows.map(mapPlayer);
    const self = players.find((player) => player.userId === identity.userId);
    if (!self) throw new Error("Online room presence was not persisted.");

    return {
      roomId,
      serverTime: new Date().toISOString(),
      capacity: maxPlayers,
      self,
      players,
    };
  });
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

function chooseSpawn(activeRows: ActivePositionRow[]) {
  return (
    onlineRoomContract.spawnPositions.find((candidate) =>
      activeRows.every(
        (row) =>
          Math.hypot(
            Number(row.position_x) - candidate.x,
            Number(row.position_z) - candidate.z,
          ) > 0.8,
      ),
    ) ||
    onlineRoomContract.spawnPositions[
      activeRows.length % onlineRoomContract.spawnPositions.length
    ]
  );
}

function mapPlayer(row: PlayerRow): OnlineRoomPlayer {
  return {
    userId: row.userid,
    displayName: row.display_name,
    outfitId: row.outfit_id,
    x: Number(row.position_x),
    z: Number(row.position_z),
    heading: Number(row.heading),
    moving: row.movement_state === "walk",
    lastSeenAt: new Date(row.last_seen_at).toISOString(),
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
