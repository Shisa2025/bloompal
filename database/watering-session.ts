import type { WateringCompletionMetrics } from "@/lib/game-metrics";

export function getStoredWateringSession(
  metrics: WateringCompletionMetrics,
) {
  return {
    metrics: {
      sessionId: metrics.sessionId,
      durationSeconds: metrics.durationSeconds,
      leftRepetitions: null,
      rightRepetitions: null,
      successfulActions: null,
      totalAttempts: null,
    },
    metadata: {
      progressUnit: "percent" as const,
      leftMomentumPercent: metrics.leftMomentumPercent,
      rightMomentumPercent: metrics.rightMomentumPercent,
    },
  };
}
