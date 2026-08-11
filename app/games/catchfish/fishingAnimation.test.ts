import { describe, expect, it } from "vitest";
import {
  fishingInferenceIntervalMs,
  shouldRunFishingInference,
  smoothFishingPoint,
} from "./fishingAnimation";

describe("fishing animation scheduling", () => {
  it("only runs inference for a new camera frame after the interval", () => {
    expect(
      shouldRunFishingInference({
        videoTime: 1,
        lastVideoTime: 1,
        timestampMs: 100,
        lastInferenceAtMs: 0,
      }),
    ).toBe(false);
    expect(
      shouldRunFishingInference({
        videoTime: 2,
        lastVideoTime: 1,
        timestampMs: fishingInferenceIntervalMs - 1,
        lastInferenceAtMs: 0,
      }),
    ).toBe(false);
    expect(
      shouldRunFishingInference({
        videoTime: 2,
        lastVideoTime: 1,
        timestampMs: fishingInferenceIntervalMs,
        lastInferenceAtMs: 0,
      }),
    ).toBe(true);
  });

  it("uses frame-rate-independent smoothing without overshooting", () => {
    const oneFrame = smoothFishingPoint(
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      1 / 60,
      40,
    );
    const twoFrames = smoothFishingPoint(
      smoothFishingPoint({ x: 0, y: 1 }, { x: 1, y: 0 }, 1 / 120, 40),
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
