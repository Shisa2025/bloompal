import { describe, expect, it } from "vitest";

import {
  createOnlineRoomTicket,
  normalizeOnlineRoomSessionId,
  verifyOnlineRoomTicket,
} from "./online-room-ticket";

const secret = "test-secret-that-is-longer-than-thirty-two-characters";
const sessionId = "0b34755a-4157-4be8-b2fa-98a948a688e8";

describe("online room tickets", () => {
  it("round-trips a valid short-lived ticket", () => {
    const issued = createOnlineRoomTicket({
      displayName: " Garden Friend ",
      now: 1_800_000_000_000,
      secret,
      sessionId,
      userId: "user-1",
    });

    expect(
      verifyOnlineRoomTicket(issued.ticket, secret, 1_800_000_100_000),
    ).toMatchObject({
      sub: "user-1",
      name: "Garden Friend",
      sid: sessionId,
    });
    expect(issued.expiresAt.toISOString()).toBe("2027-01-15T08:10:00.000Z");
  });

  it("rejects expired and tampered tickets", () => {
    const issued = createOnlineRoomTicket({
      displayName: "Friend",
      now: 1_800_000_000_000,
      secret,
      sessionId,
      userId: "user-1",
    });

    expect(
      verifyOnlineRoomTicket(issued.ticket, secret, 1_800_000_600_000),
    ).toBeNull();
    expect(
      verifyOnlineRoomTicket(`${issued.ticket}x`, secret, 1_800_000_100_000),
    ).toBeNull();
  });

  it("keeps valid session IDs and replaces invalid values", () => {
    expect(normalizeOnlineRoomSessionId(sessionId)).toBe(sessionId);
    expect(normalizeOnlineRoomSessionId("not-a-session")).toMatch(
      /^[0-9a-f-]{36}$/,
    );
  });
});
