import {
  getCurrentAccount,
  getCurrentSessionSigningSecret,
} from "@/lib/auth";
import {
  isOnlineRoomEnabled,
  onlineRoomApiEndpoint,
} from "@/lib/online-room-config";
import {
  createOnlineRoomTicket,
  normalizeOnlineRoomSessionId,
} from "@/lib/online-room-ticket";

export async function POST(request: Request) {
  if (!isOnlineRoomEnabled()) {
    return Response.json({ error: "feature_disabled" }, { status: 404 });
  }

  const [account, signingSecret] = await Promise.all([
    getCurrentAccount(),
    getCurrentSessionSigningSecret(),
  ]);
  if (
    !account ||
    account.role !== "user" ||
    account.mustChangePassword ||
    !signingSecret
  ) {
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
  const { expiresAt, ticket } = createOnlineRoomTicket({
    displayName: account.displayName,
    secret: signingSecret,
    sessionId,
    userId: account.userid,
  });

  return Response.json(
    {
      endpoint: onlineRoomApiEndpoint,
      expiresAt: expiresAt.toISOString(),
      sessionId,
      ticket,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
