import contract from "@/online-room/function/contract.json";
import type { DashboardOutfitId } from "@/app/dashboard/components/dashboardOutfits";

export const onlineRoomContract = contract;
export const onlineRoomBounds = contract.bounds;

export type OnlineRoomMovementState = "idle" | "walk";

export type OnlineRoomPlayer = {
  userId: string;
  displayName: string;
  outfitId: DashboardOutfitId;
  x: number;
  z: number;
  heading: number;
  moving: boolean;
  lastSeenAt: string;
};

export type OnlineRoomSyncRequest = {
  sequence: number;
  x: number;
  z: number;
  heading: number;
  moving: boolean;
  outfitId: DashboardOutfitId;
};

export type OnlineRoomSyncResponse = {
  roomId: string;
  serverTime: string;
  capacity: number;
  self: OnlineRoomPlayer;
  players: OnlineRoomPlayer[];
};

export type OnlineRoomTicketResponse = {
  endpoint: string;
  ticket: string;
  expiresAt: string;
  sessionId: string;
};

export type OnlineRoomErrorCode =
  | "already_left"
  | "database_unavailable"
  | "feature_disabled"
  | "invalid_origin"
  | "invalid_request"
  | "invalid_ticket"
  | "missing_configuration"
  | "room_full"
  | "session_replaced"
  | "stale_sequence"
  | "unauthorized";

export type OnlineRoomErrorResponse = {
  error: OnlineRoomErrorCode;
};

export function clampOnlineRoomPosition(position: { x: number; z: number }) {
  return {
    x: Math.min(onlineRoomBounds.maxX, Math.max(onlineRoomBounds.minX, position.x)),
    z: Math.min(onlineRoomBounds.maxZ, Math.max(onlineRoomBounds.minZ, position.z)),
  };
}

export function isOnlineRoomOutfitId(value: unknown): value is DashboardOutfitId {
  return typeof value === "string" && contract.outfitIds.includes(value);
}

export function getOnlineRoomInterpolationAlpha(
  deltaSeconds: number,
  reducedMotion = false,
) {
  return reducedMotion ? 1 : 1 - Math.exp(-Math.max(0, deltaSeconds) * 9);
}
