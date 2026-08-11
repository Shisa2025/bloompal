import "server-only";

import { OnlineRoomPresenceError } from "@/database/online-room";
import { getCurrentAccount } from "@/lib/auth";
import { isOnlineRoomEnabled } from "@/lib/online-room-config";
import {
  isOnlineRoomOutfitId,
  onlineRoomBounds,
  onlineRoomContract,
  onlineRoomIssuedAtHeader,
  onlineRoomSessionIdHeader,
  type OnlineRoomErrorCode,
  type OnlineRoomSyncRequest,
} from "@/lib/online-room-protocol";
import { isOnlineRoomSessionId } from "@/lib/online-room-ticket";

const bodyLimitBytes = 8 * 1024;

export class OnlineRoomServerError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: OnlineRoomErrorCode,
  ) {
    super(code);
  }
}

export async function getOnlineRoomIdentity(request: Request) {
  if (!isOnlineRoomEnabled()) {
    throw new OnlineRoomServerError(404, "feature_disabled");
  }
  validateSameOrigin(request);

  const account = await getCurrentAccount();
  if (!account || account.role !== "user" || account.mustChangePassword) {
    throw new OnlineRoomServerError(401, "unauthorized");
  }

  const sessionId = request.headers.get(onlineRoomSessionIdHeader);
  const issuedAt = Number(request.headers.get(onlineRoomIssuedAtHeader));
  const now = Date.now();
  if (
    !isOnlineRoomSessionId(sessionId) ||
    !Number.isSafeInteger(issuedAt) ||
    issuedAt <= 0 ||
    issuedAt > now + 30_000 ||
    issuedAt < now - onlineRoomContract.ticketLifetimeSeconds * 1000
  ) {
    throw new OnlineRoomServerError(401, "invalid_ticket");
  }

  return {
    displayName: account.displayName,
    issuedAt,
    sessionId,
    userId: account.userid,
  };
}

export async function readOnlineRoomSyncRequest(
  request: Request,
): Promise<OnlineRoomSyncRequest> {
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > bodyLimitBytes) {
    throw new OnlineRoomServerError(400, "invalid_request");
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw || "{}") as Record<string, unknown>;
  } catch {
    throw new OnlineRoomServerError(400, "invalid_request");
  }

  const values = [body.x, body.z, body.heading, body.sequence];
  if (
    values.some(
      (value) => typeof value !== "number" || !Number.isFinite(value),
    ) ||
    !Number.isSafeInteger(body.sequence) ||
    Number(body.sequence) < 0 ||
    typeof body.moving !== "boolean" ||
    !isOnlineRoomOutfitId(body.outfitId) ||
    Number(body.x) < onlineRoomBounds.minX ||
    Number(body.x) > onlineRoomBounds.maxX ||
    Number(body.z) < onlineRoomBounds.minZ ||
    Number(body.z) > onlineRoomBounds.maxZ
  ) {
    throw new OnlineRoomServerError(400, "invalid_request");
  }

  return {
    sequence: Number(body.sequence),
    x: Number(body.x),
    z: Number(body.z),
    heading: Math.atan2(
      Math.sin(Number(body.heading)),
      Math.cos(Number(body.heading)),
    ),
    moving: body.moving,
    outfitId: body.outfitId,
  };
}

export function onlineRoomJson(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function onlineRoomErrorResponse(error: unknown) {
  if (
    error instanceof OnlineRoomServerError ||
    error instanceof OnlineRoomPresenceError
  ) {
    return onlineRoomJson({ error: error.code }, error.status);
  }

  console.error(
    JSON.stringify({
      route: "online-room",
      statusCode: 503,
      error: "database_unavailable",
    }),
  );
  return onlineRoomJson({ error: "database_unavailable" }, 503);
}

function validateSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw new OnlineRoomServerError(403, "invalid_origin");
  }
}
