import { syncOnlineRoomPresence } from "@/database/online-room";
import {
  getOnlineRoomIdentity,
  onlineRoomErrorResponse,
  onlineRoomJson,
  readOnlineRoomSyncRequest,
} from "@/lib/online-room-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const identity = await getOnlineRoomIdentity(request);
    const input = await readOnlineRoomSyncRequest(request);
    const snapshot = await syncOnlineRoomPresence({ identity, input });
    return onlineRoomJson(snapshot);
  } catch (error) {
    return onlineRoomErrorResponse(error);
  }
}
