import { createHmac, randomUUID, timingSafeEqual } from "crypto";

import { onlineRoomContract } from "@/lib/online-room-protocol";

export type OnlineRoomTicketPayload = {
  sub: string;
  name: string;
  sid: string;
  iat: number;
  exp: number;
};

const sessionIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isOnlineRoomSessionId(value: unknown): value is string {
  return typeof value === "string" && sessionIdPattern.test(value);
}

export function normalizeOnlineRoomSessionId(value: unknown) {
  return isOnlineRoomSessionId(value)
    ? value
    : randomUUID();
}

export function createOnlineRoomTicket({
  displayName,
  secret,
  sessionId,
  userId,
  now = Date.now(),
}: {
  displayName: string;
  secret: string;
  sessionId: string;
  userId: string;
  now?: number;
}) {
  const issuedAt = Math.floor(now);
  const payload: OnlineRoomTicketPayload = {
    sub: userId,
    name: displayName.trim().slice(0, 120) || userId,
    sid: sessionId,
    iat: issuedAt,
    exp: issuedAt + onlineRoomContract.ticketLifetimeSeconds * 1000,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(encodedPayload, secret);

  return {
    expiresAt: new Date(payload.exp),
    payload,
    ticket: `v1.${encodedPayload}.${signature}`,
  };
}

export function verifyOnlineRoomTicket(
  ticket: string,
  secret: string,
  now = Date.now(),
): OnlineRoomTicketPayload | null {
  const [version, encodedPayload, providedSignature, ...rest] = ticket.split(".");
  if (version !== "v1" || !encodedPayload || !providedSignature || rest.length) {
    return null;
  }

  const expectedSignature = sign(encodedPayload, secret);
  const expected = Buffer.from(expectedSignature);
  const provided = Buffer.from(providedSignature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<OnlineRoomTicketPayload>;
    const nowMilliseconds = Math.floor(now);
    if (
      typeof payload.sub !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.sid !== "string" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number" ||
      payload.iat > nowMilliseconds + 30_000 ||
      payload.exp <= nowMilliseconds ||
      payload.exp - payload.iat > onlineRoomContract.ticketLifetimeSeconds * 1000
    ) {
      return null;
    }
    return payload as OnlineRoomTicketPayload;
  } catch {
    return null;
  }
}

function sign(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}
