export const onlineRoomApiEndpoint = "/api/online-room";

export function isOnlineRoomEnabled() {
  return process.env.ONLINE_ROOM_ENABLED !== "0";
}
