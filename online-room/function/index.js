"use strict";
/* eslint-disable @typescript-eslint/no-require-imports -- FunctionGraph's Node event runtime loads CommonJS handlers. */

const crypto = require("crypto");
const { Pool } = require("pg");
const contract = require("./contract.json");

const bodyLimitBytes = 8 * 1024;
let pool;

class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function getPool() {
  if (pool) return pool;
  const connectionString =
    process.env.ONLINE_ROOM_DATABASE_URL || process.env.DATABASE_URL;
  if (!connectionString) throw new HttpError(503, "database_unavailable");

  const sslMode = process.env.DATABASE_SSL_MODE?.trim().toLowerCase();
  let normalizedConnectionString = connectionString;
  try {
    const url = new URL(connectionString);
    if (sslMode) {
      url.searchParams.delete("sslmode");
      url.searchParams.delete("uselibpqcompat");
    } else if (
      url.searchParams.get("sslmode") === "require" &&
      !url.searchParams.has("uselibpqcompat")
    ) {
      url.searchParams.set("sslmode", "verify-full");
    }
    normalizedConnectionString = url.toString();
  } catch {
    // pg will report a useful error for non-URL connection strings.
  }

  pool = new Pool({
    connectionString: normalizedConnectionString,
    max: positiveInteger(process.env.DATABASE_POOL_MAX, 2),
    ssl:
      sslMode === "disable"
        ? false
        : sslMode === "require"
          ? { rejectUnauthorized: false }
          : sslMode === "verify-full"
            ? {
                rejectUnauthorized: true,
                ca: process.env.DATABASE_CA_CERT?.replaceAll("\\n", "\n"),
              }
            : undefined,
  });
  return pool;
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function allowedOrigins() {
  return new Set(
    (process.env.ONLINE_ROOM_ALLOWED_ORIGINS || "http://localhost:3000")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function getHeader(event, name) {
  const headers = event.headers || {};
  const target = name.toLowerCase();
  const entry = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === target,
  );
  return typeof entry?.[1] === "string" ? entry[1] : undefined;
}

function corsHeaders(origin) {
  const headers = {
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
  if (origin && allowedOrigins().has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function response(statusCode, body, origin) {
  return {
    statusCode,
    isBase64Encoded: false,
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json; charset=utf-8",
    },
    body: body === undefined ? "" : JSON.stringify(body),
  };
}

function parseBody(event) {
  const raw = event.body || "";
  const decoded = event.isBase64Encoded
    ? Buffer.from(raw, "base64").toString("utf8")
    : raw;
  if (Buffer.byteLength(decoded, "utf8") > bodyLimitBytes) {
    throw new HttpError(400, "invalid_request");
  }
  try {
    return JSON.parse(decoded || "{}");
  } catch {
    throw new HttpError(400, "invalid_request");
  }
}

function verifyTicket(event) {
  const authorization = getHeader(event, "authorization");
  const secret = process.env.ONLINE_ROOM_SIGNING_SECRET?.trim();
  if (
    !authorization?.startsWith("Bearer ") ||
    !secret ||
    secret.length < 32 ||
    secret.startsWith("replace-with")
  ) {
    throw new HttpError(401, "invalid_ticket");
  }
  const ticket = authorization.slice("Bearer ".length).trim();
  const [version, encodedPayload, suppliedSignature, ...rest] = ticket.split(".");
  if (version !== "v1" || !encodedPayload || !suppliedSignature || rest.length) {
    throw new HttpError(401, "invalid_ticket");
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
  const expected = Buffer.from(expectedSignature);
  const supplied = Buffer.from(suppliedSignature);
  if (
    expected.length !== supplied.length ||
    !crypto.timingSafeEqual(expected, supplied)
  ) {
    throw new HttpError(401, "invalid_ticket");
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    );
    const now = Date.now();
    if (
      typeof payload.sub !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.sid !== "string" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number" ||
      payload.iat > now + 30000 ||
      payload.exp <= now ||
      payload.exp - payload.iat > contract.ticketLifetimeSeconds * 1000
    ) {
      throw new Error("invalid payload");
    }
    return payload;
  } catch {
    throw new HttpError(401, "invalid_ticket");
  }
}

function validateSyncBody(body) {
  const values = [body.x, body.z, body.heading, body.sequence];
  if (
    values.some((value) => typeof value !== "number" || !Number.isFinite(value)) ||
    !Number.isSafeInteger(body.sequence) ||
    body.sequence < 0 ||
    typeof body.moving !== "boolean" ||
    !contract.outfitIds.includes(body.outfitId) ||
    body.x < contract.bounds.minX ||
    body.x > contract.bounds.maxX ||
    body.z < contract.bounds.minZ ||
    body.z > contract.bounds.maxZ
  ) {
    throw new HttpError(400, "invalid_request");
  }
  return {
    sequence: body.sequence,
    x: body.x,
    z: body.z,
    heading: Math.atan2(Math.sin(body.heading), Math.cos(body.heading)),
    moving: body.moving,
    outfitId: body.outfitId,
  };
}

function chooseSpawn(activeRows) {
  return (
    contract.spawnPositions.find((candidate) =>
      activeRows.every(
        (row) => Math.hypot(row.position_x - candidate.x, row.position_z - candidate.z) > 0.8,
      ),
    ) || contract.spawnPositions[activeRows.length % contract.spawnPositions.length]
  );
}

function mapPlayer(row) {
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

async function syncPresence(event) {
  const identity = verifyTicket(event);
  const input = validateSyncBody(parseBody(event));
  const roomId = contract.roomId;
  const ttlMs = positiveInteger(process.env.PRESENCE_TTL_MS, contract.presenceTtlMs);
  const maxPlayers = Math.min(
    contract.maxPlayers,
    positiveInteger(process.env.ROOM_MAX_PLAYERS, contract.maxPlayers),
  );
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [roomId]);
    await client.query(
      "DELETE FROM online_room_presence WHERE room_id = $1 AND expires_at <= NOW()",
      [roomId],
    );
    const existingResult = await client.query(
      `SELECT session_id, session_issued_at, sequence, position_x, position_z
       FROM online_room_presence
       WHERE room_id = $1 AND userid = $2
       LIMIT 1`,
      [roomId, identity.sub],
    );
    const existing = existingResult.rows[0];
    const isNewSession = Boolean(existing && existing.session_id !== identity.sid);
    if (
      isNewSession &&
      Number(identity.iat) <= Number(existing.session_issued_at)
    ) {
      throw new HttpError(409, "session_replaced");
    }
    if (
      existing &&
      !isNewSession &&
      input.sequence <= Number(existing.sequence)
    ) {
      throw new HttpError(409, "stale_sequence");
    }

    const activeResult = await client.query(
      `SELECT userid, position_x, position_z
       FROM online_room_presence
       WHERE room_id = $1 AND expires_at > NOW()
       ORDER BY connected_at ASC`,
      [roomId],
    );
    if (!existing && activeResult.rowCount >= maxPlayers) {
      throw new HttpError(409, "room_full");
    }

    const spawn = chooseSpawn(activeResult.rows);
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
        identity.sub,
        identity.sid,
        identity.iat,
        identity.name.trim().slice(0, 120) || identity.sub,
        input.outfitId,
        position.x,
        position.z,
        input.heading,
        input.moving ? "walk" : "idle",
        nextSequence,
        ttlMs,
      ],
    );

    const playersResult = await client.query(
      `SELECT userid, display_name, outfit_id, position_x, position_z,
              heading, movement_state, last_seen_at
       FROM online_room_presence
       WHERE room_id = $1 AND expires_at > NOW()
       ORDER BY connected_at ASC`,
      [roomId],
    );
    await client.query("COMMIT");
    const players = playersResult.rows.map(mapPlayer);
    const self = players.find((player) => player.userId === identity.sub);
    return {
      roomId,
      serverTime: new Date().toISOString(),
      capacity: maxPlayers,
      self,
      players,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function leaveRoom(event) {
  const identity = verifyTicket(event);
  const result = await getPool().query(
    `DELETE FROM online_room_presence
     WHERE room_id = $1 AND userid = $2 AND session_id = $3`,
    [contract.roomId, identity.sub, identity.sid],
  );
  return { left: result.rowCount > 0 };
}

async function health(event) {
  const deep = event.queryStringParameters?.deep === "1";
  if (deep) await getPool().query("SELECT 1");
  return { ok: true, database: deep ? "connected" : "unchecked" };
}

async function handler(event, context) {
  // FunctionGraph validates the exported handler's declared arity and accepts
  // only two or three parameters. Keep both parameters explicit even though
  // this HTTP handler does not otherwise need the invocation context.
  void context;
  event ||= {};
  const startedAt = Date.now();
  const origin = getHeader(event, "origin");
  const requestId = event.requestContext?.requestId || crypto.randomUUID();
  let statusCode = 500;
  let activePlayers;
  try {
    if (origin && !allowedOrigins().has(origin)) {
      throw new HttpError(403, "invalid_origin");
    }
    const method = String(event.httpMethod || "GET").toUpperCase();
    const path = String(event.path || "/").replace(/\/+$/, "");
    if (method === "OPTIONS") {
      statusCode = 204;
      return response(statusCode, undefined, origin);
    }
    if (method === "GET" && path.endsWith("/v1/health")) {
      const result = await health(event);
      statusCode = 200;
      return response(statusCode, result, origin);
    }
    if (method === "POST" && path.endsWith("/v1/sync")) {
      const result = await syncPresence(event);
      activePlayers = result.players.length;
      statusCode = 200;
      return response(statusCode, result, origin);
    }
    if (method === "POST" && path.endsWith("/v1/leave")) {
      const result = await leaveRoom(event);
      statusCode = 200;
      return response(statusCode, result, origin);
    }
    throw new HttpError(404, "invalid_request");
  } catch (error) {
    if (error instanceof HttpError) {
      statusCode = error.status;
      return response(statusCode, { error: error.code }, origin);
    }
    console.error(
      JSON.stringify({ requestId, statusCode: 503, error: "database_unavailable" }),
    );
    statusCode = 503;
    return response(statusCode, { error: "database_unavailable" }, origin);
  } finally {
    console.info(
      JSON.stringify({
        requestId,
        statusCode,
        durationMs: Date.now() - startedAt,
        ...(activePlayers === undefined ? {} : { activePlayers }),
      }),
    );
  }
}

async function closePool() {
  if (!pool) return;
  const activePool = pool;
  pool = undefined;
  await activePool.end();
}

module.exports = {
  closePool,
  handler,
  _test: {
    HttpError,
    allowedOrigins,
    mapPlayer,
    parseBody,
    setPool: (nextPool) => {
      pool = nextPool;
    },
    syncPresence,
    validateSyncBody,
    verifyTicket,
  },
};
