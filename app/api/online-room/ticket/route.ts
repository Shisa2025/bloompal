import { getCurrentAccount } from "@/lib/auth";
import {
  isOnlineRoomEnabled,
  onlineRoomApiEndpoint,
} from "@/lib/online-room-config";
import { onlineRoomContract } from "@/lib/online-room-protocol";
import { normalizeOnlineRoomSessionId } from "@/lib/online-room-ticket";

export async function POST(request: Request) {
  if (!isOnlineRoomEnabled()) {
    return Response.json({ error: "feature_disabled" }, { status: 404 });
  }

  const account = await getCurrentAccount();
  if (!account || account.role !== "user" || account.mustChangePassword) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let requestedSessionId: unknown;
  try {
    const body = (await request.json()) as { sessionId?: unknown };
    requestedSessionId = body.sessionId;
  } catch {
    requestedSessionId = undefined;
  }

  const sessionId = normalizeOnlineRoomSessionId(requestedSessionId);
  const issuedAt = Date.now();
  const expiresAt = new Date(
    issuedAt + onlineRoomContract.ticketLifetimeSeconds * 1000,
  );

  return Response.json(
    {
      endpoint: onlineRoomApiEndpoint,
      expiresAt: expiresAt.toISOString(),
      issuedAt,
      sessionId,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
