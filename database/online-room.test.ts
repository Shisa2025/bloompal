import { beforeEach, describe, expect, it, vi } from "vitest";

type FakePresence = {
  room_id: string;
  userid: string;
  session_id: string;
  session_issued_at: number;
  display_name: string;
  outfit_id:
    | "base"
    | "moss-cardigan"
    | "honey-raincoat"
    | "leafback-dinosaur";
  position_x: number;
  position_z: number;
  heading: number;
  movement_state: "idle" | "walk";
  sequence: number;
  connected_at: Date;
  last_seen_at: Date;
  expires_at: Date;
};

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
const state = new Map<string, FakePresence>();

async function executeQuery(
  text: string,
  values: readonly unknown[] = [],
) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (
    normalized.startsWith("CREATE TABLE") ||
    normalized.startsWith("CREATE INDEX") ||
    normalized.startsWith("ALTER TABLE")
  ) {
    return [];
  }
  if (normalized.startsWith("WITH room_lock AS MATERIALIZED")) {
    const roomId = String(values[0]);
    const userId = String(values[1]);
    const key = `${roomId}:${userId}`;
    const now = new Date();
    state.forEach((row, rowKey) => {
      if (
        row.room_id === roomId &&
        row.userid !== userId &&
        row.expires_at.getTime() <= now.getTime()
      ) {
        state.delete(rowKey);
      }
    });
    const stored = state.get(key);
    const existing =
      stored && stored.expires_at.getTime() > now.getTime() ? stored : undefined;
    const active = activeRows(roomId);
    const incomingSessionId = String(values[2]);
    const incomingIssuedAt = Number(values[3]);
    const sequence = Number(values[10]);
    const status =
      existing &&
      existing.session_id !== incomingSessionId &&
      incomingIssuedAt <= existing.session_issued_at
        ? "session_replaced"
        : existing &&
            existing.session_id === incomingSessionId &&
            sequence <= existing.sequence
          ? "stale_sequence"
          : !existing && active.length >= Number(values[12])
            ? "room_full"
            : "ok";

    if (status === "ok") {
      const spawnPositions = JSON.parse(String(values[13])) as Array<{
        x: number;
        z: number;
      }>;
      const spawn =
        spawnPositions.find((candidate) =>
          active.every(
            (row) =>
              Math.hypot(
                row.position_x - candidate.x,
                row.position_z - candidate.z,
              ) > 0.8,
          ),
        ) ?? { x: Number(values[14]), z: Number(values[15]) };
      state.set(key, {
        room_id: roomId,
        userid: userId,
        session_id: incomingSessionId,
        session_issued_at: Math.max(
          existing?.session_issued_at ?? 0,
          incomingIssuedAt,
        ),
        display_name: String(values[4]),
        outfit_id: values[5] as FakePresence["outfit_id"],
        position_x: existing ? Number(values[6]) : spawn.x,
        position_z: existing ? Number(values[7]) : spawn.z,
        heading: Number(values[8]),
        movement_state: values[9] as FakePresence["movement_state"],
        sequence:
          existing && existing.session_id !== incomingSessionId ? 0 : sequence,
        connected_at: existing?.connected_at ?? now,
        last_seen_at: now,
        expires_at: new Date(now.getTime() + Number(values[11])),
      });
    }

    const players =
      status === "ok"
        ? activeRows(roomId).map((row) => ({
            userId: row.userid,
            displayName: row.display_name,
            outfitId: row.outfit_id,
            x: row.position_x,
            z: row.position_z,
            heading: row.heading,
            moving: row.movement_state === "walk",
            lastSeenAt: row.last_seen_at.toISOString(),
          }))
        : [];
    return [{ status, players }];
  }
  if (
    normalized.startsWith(
      "DELETE FROM online_room_presence WHERE room_id = $1 AND expires_at",
    )
  ) {
    state.forEach((row, key) => {
      if (row.room_id === values[0] && row.expires_at.getTime() <= Date.now()) {
        state.delete(key);
      }
    });
    return [];
  }
  if (normalized.startsWith("SELECT session_id, session_issued_at")) {
    const row = state.get(`${values[0]}:${values[1]}`);
    return row ? [row] : [];
  }
  if (normalized.startsWith("SELECT userid, position_x, position_z")) {
    return activeRows(String(values[0]));
  }
  if (normalized.startsWith("INSERT INTO online_room_presence")) {
    const key = `${values[0]}:${values[1]}`;
    const previous = state.get(key);
    const now = new Date();
    state.set(key, {
      room_id: String(values[0]),
      userid: String(values[1]),
      session_id: String(values[2]),
      session_issued_at: Number(values[3]),
      display_name: String(values[4]),
      outfit_id: values[5] as FakePresence["outfit_id"],
      position_x: Number(values[6]),
      position_z: Number(values[7]),
      heading: Number(values[8]),
      movement_state: values[9] as FakePresence["movement_state"],
      sequence: Number(values[10]),
      connected_at: previous?.connected_at ?? now,
      last_seen_at: now,
      expires_at: new Date(now.getTime() + Number(values[11])),
    });
    return [];
  }
  if (normalized.startsWith("SELECT userid, display_name")) {
    return activeRows(String(values[0]));
  }
  if (normalized.startsWith("DELETE FROM online_room_presence") && normalized.includes("RETURNING userid")) {
    const key = `${values[0]}:${values[1]}`;
    const row = state.get(key);
    if (!row || row.session_id !== values[2]) return [];
    state.delete(key);
    return [{ userid: row.userid }];
  }
  throw new Error(`Unexpected query: ${normalized}`);
}

function activeRows(roomId: string) {
  return [...state.values()]
    .filter(
      (row) => row.room_id === roomId && row.expires_at.getTime() > Date.now(),
    )
    .sort((left, right) => left.connected_at.getTime() - right.connected_at.getTime());
}

vi.mock("server-only", () => ({}));
vi.mock("@/database/connection", () => ({
  sql: { query },
  withTransaction: (operation: (client: { query: typeof query }) => unknown) =>
    operation({ query }),
}));

import {
  OnlineRoomPresenceError,
  syncOnlineRoomPresence,
} from "@/database/online-room";

function identity(user: number, issuedAt = Date.now()) {
  return {
    userId: `user-${user}`,
    displayName: `Friend ${user}`,
    sessionId: `00000000-0000-4000-8000-${String(user).padStart(12, "0")}`,
    issuedAt,
  };
}

function input(sequence = 0) {
  return {
    sequence,
    x: 0,
    z: 0,
    heading: 0,
    moving: false,
    outfitId: "base" as const,
  };
}

describe("Vercel online room presence", () => {
  beforeEach(() => {
    state.clear();
    query.mockReset();
    query.mockImplementation(executeQuery);
    process.env.ROOM_MAX_PLAYERS = "8";
    process.env.PRESENCE_TTL_MS = "5000";
  });

  it("joins, updates movement, and returns all active players", async () => {
    await syncOnlineRoomPresence({ identity: identity(1), input: input() });
    const moved = await syncOnlineRoomPresence({
      identity: identity(1),
      input: { ...input(1), x: 1.4, z: -0.5, moving: true },
    });
    const joined = await syncOnlineRoomPresence({
      identity: identity(2),
      input: input(),
    });

    expect(moved.self).toMatchObject({ x: 1.4, z: -0.5, moving: true });
    expect(joined.players).toHaveLength(2);
    expect(
      query.mock.calls.filter(([text]) =>
        String(text).trim().startsWith("WITH room_lock AS MATERIALIZED"),
      ),
    ).toHaveLength(3);
  });

  it("persists the leafback dinosaur outfit for remote players", async () => {
    const joined = await syncOnlineRoomPresence({
      identity: identity(1),
      input: { ...input(), outfitId: "leafback-dinosaur" },
    });

    expect(joined.self.outfitId).toBe("leafback-dinosaur");
  });

  it("caps the room at eight and releases expired capacity", async () => {
    for (let user = 1; user <= 8; user += 1) {
      await syncOnlineRoomPresence({ identity: identity(user), input: input() });
    }
    await expect(
      syncOnlineRoomPresence({ identity: identity(9), input: input() }),
    ).rejects.toMatchObject({ status: 409, code: "room_full" });

    const expired = state.get("public:user-1");
    if (expired) expired.expires_at = new Date(Date.now() - 1);
    await expect(
      syncOnlineRoomPresence({ identity: identity(9), input: input() }),
    ).resolves.toMatchObject({ self: { userId: "user-9" } });
  });

  it("lets a newer tab replace an older tab and rejects the old session", async () => {
    const first = identity(1, 1000);
    const second = { ...identity(1, 2000), sessionId: "99999999-9999-4999-8999-999999999999" };
    await syncOnlineRoomPresence({ identity: first, input: input() });
    await syncOnlineRoomPresence({ identity: second, input: input() });

    await expect(
      syncOnlineRoomPresence({ identity: first, input: input(1) }),
    ).rejects.toBeInstanceOf(OnlineRoomPresenceError);
  });
});
