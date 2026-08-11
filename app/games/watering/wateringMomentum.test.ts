import { describe, expect, it } from "vitest";
import {
  createWateringMomentumState,
  degreesToWateringPercent,
  getCombinedWateringPercent,
  getDisplayedWateringPercent,
  shortestSignedAngleDelta,
  shouldRunWateringInference,
  updateWateringMomentum,
  wateringInferenceIntervalMs,
} from "./wateringMomentum";

const fist = (angleDegrees: number) => ({
  detected: true,
  fist: true,
  angleDegrees,
});

describe("watering momentum", () => {
  it("maps 360 degrees of travel to 100 percent", () => {
    expect(degreesToWateringPercent(3.6)).toBeCloseTo(1);
    expect(degreesToWateringPercent(360)).toBeCloseTo(100);
  });

  it("fills the meter after about 360 degrees of continuous valid travel", () => {
    let timestampMs = 0;
    let current = updateWateringMomentum(
      createWateringMomentumState(),
      fist(0),
      timestampMs,
    );
    for (let degrees = 3; degrees <= 360; degrees += 3) {
      timestampMs += 40;
      current = updateWateringMomentum(
        current.state,
        fist(degrees % 360),
        timestampMs,
      );
    }
    for (let settle = 0; settle < 8; settle += 1) {
      timestampMs += 40;
      current = updateWateringMomentum(current.state, fist(0), timestampMs);
    }

    expect(current.state.progress).toBe(100);
  });

  it("adds a small proportional amount without requiring a completed cycle", () => {
    const initial = updateWateringMomentum(createWateringMomentumState(), fist(20), 0);
    const moved = updateWateringMomentum(initial.state, fist(22), 40);

    expect(moved.addedPercent).toBeGreaterThan(0);
    expect(moved.addedPercent).toBeLessThan(1);
  });

  it("adds travel in both directions and handles the zero-degree boundary", () => {
    let current = updateWateringMomentum(createWateringMomentumState(), fist(358), 0);
    current = updateWateringMomentum(current.state, fist(2), 40);
    const forwardProgress = current.state.progress;
    current = updateWateringMomentum(current.state, fist(358), 80);

    expect(shortestSignedAngleDelta(2, 358)).toBe(4);
    expect(shortestSignedAngleDelta(358, 2)).toBe(-4);
    expect(forwardProgress).toBeGreaterThan(0);
    expect(current.state.progress).toBeGreaterThan(forwardProgress);
  });

  it("keeps progress while tracking is absent and reanchors after the grace period", () => {
    let current = updateWateringMomentum(createWateringMomentumState(), fist(10), 0);
    current = updateWateringMomentum(current.state, fist(20), 40);
    const savedProgress = current.state.progress;
    current = updateWateringMomentum(current.state, { detected: false, fist: false, angleDegrees: 0 }, 300);
    current = updateWateringMomentum(current.state, fist(80), 340);

    expect(current.state.progress).toBeCloseTo(savedProgress);
    expect(current.addedPercent).toBe(0);
  });

  it("rejects an implausible tracking jump and caps progress at 100", () => {
    let current = updateWateringMomentum(createWateringMomentumState(), fist(0), 0);
    current = updateWateringMomentum(current.state, fist(120), 40);
    expect(current.addedPercent).toBe(0);

    current.state.progress = 99.9;
    current = updateWateringMomentum(current.state, fist(126), 80);
    expect(current.state.progress).toBeLessThanOrEqual(100);
  });

  it("formats display and combined growth percentages", () => {
    expect(getDisplayedWateringPercent(22.99)).toBe(22);
    expect(getDisplayedWateringPercent(100.4)).toBe(100);
    expect(getCombinedWateringPercent(100, 40)).toBe(70);
  });
});

describe("watering inference scheduling", () => {
  it("only runs for a new video frame after the interval", () => {
    expect(shouldRunWateringInference({ videoTime: 1, lastVideoTime: 1, timestampMs: 100, lastInferenceAtMs: 0 })).toBe(false);
    expect(shouldRunWateringInference({ videoTime: 2, lastVideoTime: 1, timestampMs: wateringInferenceIntervalMs - 1, lastInferenceAtMs: 0 })).toBe(false);
    expect(shouldRunWateringInference({ videoTime: 2, lastVideoTime: 1, timestampMs: wateringInferenceIntervalMs, lastInferenceAtMs: 0 })).toBe(true);
  });
});
