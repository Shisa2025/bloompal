import { describe, expect, it } from "vitest";
import {
  findClosestPluckTarget,
  hasPluckUiStateChanged,
  isPluckGestureStart,
  pluckInferenceIntervalMs,
  shouldRunPluckInference,
  smoothPluckPoint,
  type PluckUiState,
} from "./pluckAnimation";

describe("pluck animation scheduling", () => {
  it("only runs inference for a new camera frame after the interval", () => {
    expect(shouldRunPluckInference({ videoTime: 1, lastVideoTime: 1, timestampMs: 100, lastInferenceAtMs: 0 })).toBe(false);
    expect(shouldRunPluckInference({ videoTime: 2, lastVideoTime: 1, timestampMs: pluckInferenceIntervalMs - 1, lastInferenceAtMs: 0 })).toBe(false);
    expect(shouldRunPluckInference({ videoTime: 2, lastVideoTime: 1, timestampMs: pluckInferenceIntervalMs, lastInferenceAtMs: 0 })).toBe(true);
  });

  it("smooths at the same rate across display refresh rates without overshooting", () => {
    const oneFrame = smoothPluckPoint({ x: 0, y: 1 }, { x: 1, y: 0 }, 1 / 60, 40);
    const twoFrames = smoothPluckPoint(
      smoothPluckPoint({ x: 0, y: 1 }, { x: 1, y: 0 }, 1 / 120, 40),
      { x: 1, y: 0 },
      1 / 120,
      40,
    );

    expect(oneFrame.x).toBeGreaterThan(0);
    expect(oneFrame.x).toBeLessThan(1);
    expect(oneFrame.y).toBeGreaterThan(0);
    expect(oneFrame.x).toBeCloseTo(twoFrames.x);
    expect(oneFrame.y).toBeCloseTo(twoFrames.y);
  });
});

describe("pluck interaction state", () => {
  it("selects the closest available target inside the hit radius", () => {
    const targets = [{ x: 0.2, y: 0.2 }, { x: 0.3, y: 0.2 }, { x: 0.8, y: 0.8 }];
    expect(findClosestPluckTarget({ x: 0.27, y: 0.2 }, targets, [false, false, false], 0.13)).toBe(1);
    expect(findClosestPluckTarget({ x: 0.27, y: 0.2 }, targets, [false, true, false], 0.13)).toBe(0);
    expect(findClosestPluckTarget({ x: 0.5, y: 0.5 }, targets, [false, false, false], 0.13)).toBe(-1);
  });

  it("starts a grab once per open-to-claw transition", () => {
    expect(isPluckGestureStart(false, { detected: true, claw: true })).toBe(true);
    expect(isPluckGestureStart(true, { detected: true, claw: true })).toBe(false);
    expect(isPluckGestureStart(false, { detected: true, claw: false })).toBe(false);
    expect(isPluckGestureStart(false, { detected: false, claw: true })).toBe(false);
  });

  it("publishes UI only when a semantic hand state changes", () => {
    const previous: PluckUiState = {
      left: { detected: true, claw: false, targetIndex: 2 },
      right: { detected: false, claw: false, targetIndex: -1 },
    };
    expect(hasPluckUiStateChanged(previous, { ...previous, left: { ...previous.left } })).toBe(false);
    expect(hasPluckUiStateChanged(previous, { ...previous, left: { ...previous.left, claw: true } })).toBe(true);
    expect(hasPluckUiStateChanged(previous, { ...previous, left: { ...previous.left, targetIndex: 3 } })).toBe(true);
  });
});
