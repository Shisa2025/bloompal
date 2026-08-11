import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentAccount } = vi.hoisted(() => ({
  getCurrentAccount: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({ getCurrentAccount }));

import {
  getOnlineRoomIdentity,
  OnlineRoomServerError,
  readOnlineRoomSyncRequest,
} from "@/lib/online-room-server";

const sessionId = "11111111-1111-4111-8111-111111111111";

function createRequest(body = "{}", origin = "http://localhost") {
  return new Request("http://localhost/api/online-room/sync", {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "X-Online-Room-Issued-At": String(Date.now()),
      "X-Online-Room-Session-Id": sessionId,
    },
  });
}

describe("online room server request validation", () => {
  beforeEach(() => {
    delete process.env.ONLINE_ROOM_ENABLED;
    getCurrentAccount.mockResolvedValue({
      userid: "user-1",
      displayName: "Garden Friend",
      role: "user",
      mustChangePassword: false,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses the signed-in account and tab session headers", async () => {
    await expect(getOnlineRoomIdentity(createRequest())).resolves.toMatchObject({
      userId: "user-1",
      displayName: "Garden Friend",
      sessionId,
    });
  });

  it("rejects cross-origin and unauthenticated requests", async () => {
    await expect(
      getOnlineRoomIdentity(createRequest("{}", "https://attacker.example")),
    ).rejects.toMatchObject({ status: 403, code: "invalid_origin" });

    getCurrentAccount.mockResolvedValue(null);
    await expect(getOnlineRoomIdentity(createRequest())).rejects.toMatchObject({
      status: 401,
      code: "unauthorized",
    });
  });

  it("normalizes valid movement and rejects coordinates outside the room", async () => {
    const valid = await readOnlineRoomSyncRequest(
      createRequest(
        JSON.stringify({
          sequence: 1,
          x: 1,
          z: 2,
          heading: Math.PI * 3,
          moving: true,
          outfitId: "base",
        }),
      ),
    );
    expect(valid).toMatchObject({
      sequence: 1,
      x: 1,
      z: 2,
      moving: true,
      outfitId: "base",
    });
    expect(valid.heading).toBeCloseTo(Math.PI);

    await expect(
      readOnlineRoomSyncRequest(
        createRequest(
          JSON.stringify({
            sequence: 1,
            x: 99,
            z: 0,
            heading: 0,
            moving: false,
            outfitId: "base",
          }),
        ),
      ),
    ).rejects.toBeInstanceOf(OnlineRoomServerError);
  });
});
