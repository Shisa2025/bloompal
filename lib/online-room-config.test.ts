import { afterEach, describe, expect, it } from "vitest";

import { isOnlineRoomEnabled, onlineRoomApiEndpoint } from "./online-room-config";

describe("online room configuration", () => {
  afterEach(() => {
    delete process.env.ONLINE_ROOM_ENABLED;
  });

  it("uses the same-origin API and enables the computer by default", () => {
    expect(onlineRoomApiEndpoint).toBe("/api/online-room");
    expect(isOnlineRoomEnabled()).toBe(true);
  });

  it("supports an explicit emergency kill switch", () => {
    process.env.ONLINE_ROOM_ENABLED = "0";
    expect(isOnlineRoomEnabled()).toBe(false);
  });
});
