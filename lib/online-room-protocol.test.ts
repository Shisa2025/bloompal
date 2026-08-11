import { describe, expect, it } from "vitest";

import {
  clampOnlineRoomPosition,
  getOnlineRoomInterpolationAlpha,
  isOnlineRoomOutfitId,
  onlineRoomContract,
} from "./online-room-protocol";

describe("online room protocol", () => {
  it("clamps click targets to the shared walkable bounds", () => {
    expect(clampOnlineRoomPosition({ x: -20, z: 20 })).toEqual({
      x: onlineRoomContract.bounds.minX,
      z: onlineRoomContract.bounds.maxZ,
    });
  });

  it("recognises only contract outfits", () => {
    expect(isOnlineRoomOutfitId("base")).toBe(true);
    expect(isOnlineRoomOutfitId("made-up-outfit")).toBe(false);
  });

  it("smooths normal movement and snaps reduced motion", () => {
    expect(getOnlineRoomInterpolationAlpha(0.25)).toBeGreaterThan(0.8);
    expect(getOnlineRoomInterpolationAlpha(0.25)).toBeLessThan(1);
    expect(getOnlineRoomInterpolationAlpha(0.25, true)).toBe(1);
  });
});
