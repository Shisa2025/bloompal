import { describe, expect, it } from "vitest";
import { getStoredWateringSession } from "./watering-session";

describe("watering session persistence", () => {
  it("stores percentages in metadata without fabricating repetition counts", () => {
    const stored = getStoredWateringSession({
      sessionId: "9c43aeb8-16d1-4d09-8c5a-efed4347c1c1",
      durationSeconds: 42,
      leftMomentumPercent: 100,
      rightMomentumPercent: 100,
    });

    expect(stored.metrics.leftRepetitions).toBeNull();
    expect(stored.metrics.rightRepetitions).toBeNull();
    expect(stored.metrics.successfulActions).toBeNull();
    expect(stored.metadata).toEqual({
      progressUnit: "percent",
      leftMomentumPercent: 100,
      rightMomentumPercent: 100,
    });
  });
});
