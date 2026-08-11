import {
  type OnlineRoomErrorCode,
  type OnlineRoomErrorResponse,
  type OnlineRoomSyncRequest,
  type OnlineRoomSyncResponse,
  type OnlineRoomTicketResponse,
} from "@/lib/online-room-protocol";

export class OnlineRoomRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: OnlineRoomErrorCode,
  ) {
    super(code);
  }
}

export type OnlineRoomConnection = OnlineRoomTicketResponse & {
  initialSnapshot: OnlineRoomSyncResponse;
  sequence: number;
};

export async function requestOnlineRoomTicket(sessionId?: string) {
  const response = await fetch("/api/online-room/ticket", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId }),
    cache: "no-store",
  });
  const body = (await readJson(response)) as
    | OnlineRoomTicketResponse
    | OnlineRoomErrorResponse;
  if (!response.ok || !("sessionId" in body) || !("ticket" in body)) {
    throw toRequestError(response.status, body);
  }
  return body;
}

export async function syncOnlineRoom(
  credentials: Pick<
    OnlineRoomTicketResponse,
    "endpoint" | "ticket"
  >,
  state: OnlineRoomSyncRequest,
) {
  const response = await fetch(`${credentials.endpoint}/sync`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.ticket}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(state),
    cache: "no-store",
  });
  const body = (await readJson(response)) as
    | OnlineRoomSyncResponse
    | OnlineRoomErrorResponse;
  if (!response.ok || !("players" in body)) {
    throw toRequestError(response.status, body);
  }
  return body;
}

export async function leaveOnlineRoom(
  credentials: Pick<
    OnlineRoomTicketResponse,
    "endpoint" | "ticket"
  >,
  keepalive = false,
) {
  try {
    await fetch(`${credentials.endpoint}/leave`, {
      method: "POST",
      headers: { Authorization: `Bearer ${credentials.ticket}` },
      cache: "no-store",
      keepalive,
    });
  } catch {
    // Presence expires automatically when an explicit leave cannot be delivered.
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return { error: "database_unavailable" };
  }
}

function toRequestError(status: number, body: unknown) {
  const code =
    body &&
    typeof body === "object" &&
    "error" in body &&
    typeof body.error === "string"
      ? (body.error as OnlineRoomErrorCode)
      : "database_unavailable";
  return new OnlineRoomRequestError(status, code);
}
