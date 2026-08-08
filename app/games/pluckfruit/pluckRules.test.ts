import { describe, expect, it } from "vitest";
import type { MotionLandmark, MotionResult } from "@/mediapipe/types";
import { getClawSignals } from "./pluckRules";

describe("getClawSignals", () => {
  it("recognizes a hook claw with straight MCP and bent PIP/DIP joints", () => {
    expect(getClawSignals(resultWithHand(makeHand("hook"))).left.claw).toBe(true);
  });

  it("does not recognize an open hand", () => {
    expect(getClawSignals(resultWithHand(makeHand("open"))).left.claw).toBe(false);
  });

  it("does not recognize a full fist with bent MCP knuckles", () => {
    expect(getClawSignals(resultWithHand(makeHand("fist"))).left.claw).toBe(false);
  });
});

function makeHand(shape: "hook" | "open" | "fist") {
  const hand: MotionLandmark[] = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.7, z: 0 }));
  hand[0] = { x: 0.5, y: 0.9, z: 0 };
  const fingers = [[5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16], [17, 18, 19, 20]] as const;

  fingers.forEach(([mcpIndex, pipIndex, dipIndex, tipIndex], index) => {
    const mcp = { x: 0.35 + index * 0.1, y: 0.65, z: 0 };
    const extension = { x: (mcp.x - hand[0].x) * 0.45, y: (mcp.y - hand[0].y) * 0.45 };
    const bend = { x: -extension.y * 0.65, y: extension.x * 0.65 };
    hand[mcpIndex] = mcp;

    if (shape === "fist") {
      hand[pipIndex] = { x: mcp.x + bend.x, y: mcp.y + bend.y, z: 0 };
      hand[dipIndex] = { x: hand[pipIndex].x - extension.x, y: hand[pipIndex].y - extension.y, z: 0 };
      hand[tipIndex] = { x: hand[dipIndex].x - bend.x, y: hand[dipIndex].y - bend.y, z: 0 };
      return;
    }

    hand[pipIndex] = { x: mcp.x + extension.x, y: mcp.y + extension.y, z: 0 };
    if (shape === "open") {
      hand[dipIndex] = { x: hand[pipIndex].x + extension.x, y: hand[pipIndex].y + extension.y, z: 0 };
      hand[tipIndex] = { x: hand[dipIndex].x + extension.x, y: hand[dipIndex].y + extension.y, z: 0 };
      return;
    }

    hand[dipIndex] = { x: hand[pipIndex].x + bend.x, y: hand[pipIndex].y + bend.y, z: 0 };
    hand[tipIndex] = { x: hand[dipIndex].x - extension.x * 0.55, y: hand[dipIndex].y - extension.y * 0.55, z: 0 };
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
