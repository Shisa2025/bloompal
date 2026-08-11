import { createRequire } from "node:module";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createOnlineRoomTicket } from "@/lib/online-room-ticket";

const require = createRequire(import.meta.url);
const onlineFunction = require("./index.js") as {
  handler: (event: unknown, context?: unknown) => Promise<{
    body: string;
    headers: Record<string, string>;
    statusCode: number;
  }>;
  _test: { setPool: (pool: unknown) => void };
};

const secret = "function-test-secret-with-at-least-thirty-two-characters";
const allowedOrigin = "http://localhost:3000";

type FakePresence = {
  room_id: string;
  userid: string;
  session_id: string;
  session_issued_at: number;
  display_name: string;
  outfit_id: string;
  position_x: number;
  position_z: number;
  heading: number;
  movement_state: string;
  sequence: number;
  connected_at: Date;
  last_seen_at: Date;
  expires_at: Date;
};

function createFakePool() {
  const rows = new Map<string, FakePresence>();
  const query = vi.fn(async (text: string, values: unknown[] = []) => {
    const normalized = text.replace(/\s+/g, " ").trim();
    if (
      normalized === "BEGIN" ||
      normalized === "COMMIT" ||
      normalized === "ROLLBACK" ||
      normalized.startsWith("SELECT pg_advisory_xact_lock")
    ) {
      return { rows: [], rowCount: 0 };
    }
    if (normalized.startsWith("DELETE FROM online_room_presence")) {
      let deleted = 0;
      rows.forEach((row, key) => {
        if (row.expires_at.getTime() <= Date.now()) {
          rows.delete(key);
          deleted += 1;
        }
      });
      return { rows: [], rowCount: deleted };
    }
    if (normalized.includes("SELECT session_id, session_issued_at")) {
      const row = rows.get(String(values[1]));
      return { rows: row ? [row] : [], rowCount: row ? 1 : 0 };
    }
    if (normalized.includes("SELECT userid, position_x, position_z")) {
      const active = [...rows.values()]
        .filter((row) => row.expires_at.getTime() > Date.now())
        .map(({ userid, position_x, position_z }) => ({
          userid,
          position_x,
          position_z,
        }));
      return { rows: active, rowCount: active.length };
    }
    if (normalized.startsWith("INSERT INTO online_room_presence")) {
      const now = new Date();
      const row: FakePresence = {
        room_id: String(values[0]),
        userid: String(values[1]),
        session_id: String(values[2]),
        session_issued_at: Number(values[3]),
        display_name: String(values[4]),
        outfit_id: String(values[5]),
        position_x: Number(values[6]),
        position_z: Number(values[7]),
        heading: Number(values[8]),
        movement_state: String(values[9]),
        sequence: Number(values[10]),
        connected_at: rows.get(String(values[1]))?.connected_at ?? now,
        last_seen_at: now,
        expires_at: new Date(now.getTime() + Number(values[11])),
      };
      rows.set(row.userid, row);
      return { rows: [], rowCount: 1 };
    }
    if (normalized.includes("SELECT userid, display_name, outfit_id")) {
      const active = [...rows.values()].filter(
        (row) => row.expires_at.getTime() > Date.now(),
      );
      return { rows: active, rowCount: active.length };
    }
    if (normalized === "SELECT 1") {
      return { rows: [{ "?column?": 1 }], rowCount: 1 };
    }
    throw new Error(`Unhandled fake query: ${normalized}`);
  });
  const client = { query, release: vi.fn() };
  return {
    rows,
    pool: {
      connect: vi.fn(async () => client),
      query,
      end: vi.fn(),
    },
  };
}

function makeTicket(userId: string, sessionId: string, now: number) {
  return createOnlineRoomTicket({
    displayName: `Player ${userId}`,
    now,
    secret,
    sessionId,
    userId,
  }).ticket;
}

function syncEvent(ticket: string, sequence = 0, x = 0, z = 0) {
  return {
    body: JSON.stringify({
      heading: 0,
      moving: false,
      outfitId: "base",
      sequence,
      x,
      z,
    }),
    headers: { authorization: `Bearer ${ticket}`, origin: allowedOrigin },
    httpMethod: "POST",
    isBase64Encoded: false,
    path: "/online-room/v1/sync",
    requestContext: { requestId: "test-request" },
  };
}

describe("FunctionGraph online room handler", () => {
  it("declares the two parameters required by FunctionGraph", () => {
    expect(onlineFunction.handler.length).toBe(2);
  });

  beforeEach(() => {
    process.env.ONLINE_ROOM_SIGNING_SECRET = secret;
    process.env.ONLINE_ROOM_ALLOWED_ORIGINS = allowedOrigin;
    process.env.ROOM_MAX_PLAYERS = "8";
  });

  afterEach(() => {
    onlineFunction._test.setPool(undefined);
    vi.restoreAllMocks();
  });

  it("accepts valid tickets and rejects tampered coordinates", async () => {
    const { pool } = createFakePool();
    onlineFunction._test.setPool(pool);
    const ticket = makeTicket(
      "user-1",
      "11111111-1111-4111-8111-111111111111",
      Date.now(),
    );

    const joined = await onlineFunction.handler(syncEvent(ticket));
    expect(joined.statusCode).toBe(200);
    expect(JSON.parse(joined.body).players).toHaveLength(1);

    const outside = await onlineFunction.handler(syncEvent(ticket, 1, 99, 0));
    expect(outside.statusCode).toBe(400);
    expect(JSON.parse(outside.body)).toEqual({ error: "invalid_request" });
  });

  it("caps the public room at eight active users", async () => {
    const { pool, rows } = createFakePool();
    onlineFunction._test.setPool(pool);
    const now = Date.now();

    for (let index = 1; index <= 8; index += 1) {
      const id = String(index).padStart(8, "0");
      const response = await onlineFunction.handler(
        syncEvent(makeTicket(`user-${index}`, `${id}-1111-4111-8111-111111111111`, now + index)),
      );
      expect(response.statusCode).toBe(200);
    }

    const full = await onlineFunction.handler(
      syncEvent(
        makeTicket("user-9", "99999999-1111-4111-8111-111111111111", now + 9),
      ),
    );
    expect(full.statusCode).toBe(409);
    expect(JSON.parse(full.body)).toEqual({ error: "room_full" });

    rows.get("user-1")!.expires_at = new Date(Date.now() - 1);
    const afterExpiry = await onlineFunction.handler(
      syncEvent(
        makeTicket("user-9", "99999999-1111-4111-8111-111111111111", now + 9),
      ),
    );
    expect(afterExpiry.statusCode).toBe(200);
  });

  it("lets a newer tab replace an older session without letting it take back control", async () => {
    const { pool } = createFakePool();
    onlineFunction._test.setPool(pool);
    const now = Date.now();
    const oldTicket = makeTicket(
      "user-1",
      "11111111-1111-4111-8111-111111111111",
      now,
    );
    const newTicket = makeTicket(
      "user-1",
      "22222222-2222-4222-8222-222222222222",
      now + 10,
    );

    expect((await onlineFunction.handler(syncEvent(oldTicket))).statusCode).toBe(200);
    expect((await onlineFunction.handler(syncEvent(newTicket))).statusCode).toBe(200);
    const replaced = await onlineFunction.handler(syncEvent(oldTicket, 1));
    expect(replaced.statusCode).toBe(409);
    expect(JSON.parse(replaced.body)).toEqual({ error: "session_replaced" });
  });

  it("rejects disallowed browser origins before touching storage", async () => {
    const event = syncEvent("bad-ticket");
    event.headers.origin = "https://attacker.example";
    const result = await onlineFunction.handler(event);
    expect(result.statusCode).toBe(403);
    expect(result.headers["Access-Control-Allow-Origin"]).toBeUndefined();
  });
});
