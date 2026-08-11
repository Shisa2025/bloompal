import { leaveOnlineRoomPresence } from "@/database/online-room";
import {
  getOnlineRoomIdentity,
  onlineRoomErrorResponse,
  onlineRoomJson,
} from "@/lib/online-room-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const identity = await getOnlineRoomIdentity(request);
    const result = await leaveOnlineRoomPresence(identity);
    return onlineRoomJson(result);
  } catch (error) {
    return onlineRoomErrorResponse(error);
  }
}
