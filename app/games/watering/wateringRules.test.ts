import { describe, expect, it } from "vitest";
import type { MotionLandmark, MotionResult } from "@/mediapipe/types";
import { getWateringSignals } from "./wateringRules";

describe("getWateringSignals", () => {
  it("accepts a relaxed fist with three loosely folded fingers", () => {
    expect(getWateringSignals(resultWithHand(makeHand(3))).left.fist).toBe(true);
  });

  it("does not treat two folded fingers as a fist", () => {
    expect(getWateringSignals(resultWithHand(makeHand(2))).left.fist).toBe(false);
  });

  it("does not treat an open hand as a fist", () => {
    expect(getWateringSignals(resultWithHand(makeHand(0))).left.fist).toBe(false);
  });
});

function makeHand(foldedFingers: number) {
  const hand: MotionLandmark[] = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  hand[0] = { x: 0.5, y: 0.9, z: 0 };
  const fingers = [[5, 8], [9, 12], [13, 16], [17, 20]] as const;

  fingers.forEach(([mcpIndex, tipIndex], index) => {
    hand[mcpIndex] = { x: 0.35 + index * 0.1, y: 0.65, z: 0 };
    hand[tipIndex] = index < foldedFingers
      ? { x: 0.35 + index * 0.1, y: 0.5, z: 0 }
      : { x: 0.35 + index * 0.1, y: 0.18, z: 0 };
  });

  return hand;
}

function resultWithHand(hand: MotionLandmark[]): MotionResult {
  return {
    timestampMs: 1,
    poseLandmarks: [],
    poseWorldLandmarks: [],
    handLandmarks: [hand],
    handWorldLandmarks: [],
    handedness: [[{ categoryName: "Left", score: 0.99 }]],
    status: "detecting",
  };
}
