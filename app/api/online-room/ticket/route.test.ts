import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentAccount, getCurrentSessionSigningSecret } = vi.hoisted(() => ({
  getCurrentAccount: vi.fn(),
  getCurrentSessionSigningSecret: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentAccount,
  getCurrentSessionSigningSecret,
}));

import { verifyOnlineRoomTicket } from "@/lib/online-room-ticket";
import { POST } from "./route";

const sessionSecret = "session-derived-secret-with-at-least-thirty-two-characters";

describe("online room ticket route", () => {
  beforeEach(() => {
    process.env.ONLINE_ROOM_ENABLED = "1";
    getCurrentSessionSigningSecret.mockResolvedValue(sessionSecret);
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

  it("issues no-store same-origin room credentials for an authenticated player", async () => {
    const response = await POST(
      new Request("http://localhost/api/online-room/ticket", {
        method: "POST",
        body: JSON.stringify({
          sessionId: "11111111-1111-4111-8111-111111111111",
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body.endpoint).toBe("/api/online-room");
    expect(body.sessionId).toBe("11111111-1111-4111-8111-111111111111");
    expect(verifyOnlineRoomTicket(body.ticket, sessionSecret)).toMatchObject({
      sub: "user-1",
      name: "Garden Friend",
      sid: body.sessionId,
    });
  });

  it("is enabled by default when no feature flag is configured", async () => {
    delete process.env.ONLINE_ROOM_ENABLED;

    const response = await POST(
      new Request("http://localhost/api/online-room/ticket", {
        method: "POST",
        body: "{}",
      }),
    );

    expect(response.status).toBe(200);
  });

  it("rejects non-player accounts and disabled deployments", async () => {
    getCurrentAccount.mockResolvedValue({
      userid: "admin-1",
      displayName: "Admin",
      role: "admin",
      mustChangePassword: false,
    });
    expect(
      (await POST(new Request("http://localhost", { method: "POST" }))).status,
    ).toBe(401);

    process.env.ONLINE_ROOM_ENABLED = "0";
    expect(
      (await POST(new Request("http://localhost", { method: "POST" }))).status,
    ).toBe(404);
  });
});
