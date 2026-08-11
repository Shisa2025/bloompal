import { describe, expect, it } from "vitest";
import { validBugMetrics, validSnapshotMetrics, validWateringMetrics } from "./game-metrics";

const sessionId = "9c43aeb8-16d1-4d09-8c5a-efed4347c1c1";

describe("game completion metrics", () => {
  it("accepts the exact repetition targets", () => {
    expect(validWateringMetrics({ sessionId, durationSeconds: 30, leftMomentumPercent: 100, rightMomentumPercent: 100 })).toBe(true);
    expect(validSnapshotMetrics({ sessionId, durationSeconds: 20, leftRepetitions: 3, rightRepetitions: 3 })).toBe(true);
    expect(validBugMetrics({ sessionId, durationSeconds: 45, leftRepetitions: 4, rightRepetitions: 4, successfulActions: 8, totalAttempts: 10 })).toBe(true);
  });
  it("rejects malformed, incomplete, or implausible payloads", () => {
    expect(validWateringMetrics({ sessionId: "bad", durationSeconds: 30, leftMomentumPercent: 100, rightMomentumPercent: 100 })).toBe(false);
    expect(validWateringMetrics({ sessionId, durationSeconds: 30, leftMomentumPercent: 99, rightMomentumPercent: 100 })).toBe(false);
    expect(validSnapshotMetrics({ sessionId, durationSeconds: 0, leftRepetitions: 3, rightRepetitions: 3 })).toBe(false);
    expect(validBugMetrics({ sessionId, durationSeconds: 45, leftRepetitions: 4, rightRepetitions: 4, successfulActions: 8, totalAttempts: 7 })).toBe(false);
  });
});
