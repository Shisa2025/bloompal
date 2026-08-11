export type CompletionTimingMetrics = {
  sessionId: string;
  durationSeconds: number;
};

export type GameCompletionMetrics = CompletionTimingMetrics & {
  leftRepetitions: number;
  rightRepetitions: number;
  successfulActions?: number | null;
  totalAttempts?: number | null;
};

export type WateringCompletionMetrics = CompletionTimingMetrics & {
  leftMomentumPercent: number;
  rightMomentumPercent: number;
};

export function isSessionId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function validWateringMetrics(metrics: WateringCompletionMetrics) {
  return (
    validCommon(metrics) &&
    metrics.leftMomentumPercent === 100 &&
    metrics.rightMomentumPercent === 100
  );
}

export function validBugMetrics(metrics: GameCompletionMetrics) {
  return (
    validCommon(metrics) &&
    metrics.leftRepetitions === 4 &&
    metrics.rightRepetitions === 4 &&
    metrics.successfulActions === 8 &&
    typeof metrics.totalAttempts === "number" &&
    Number.isInteger(metrics.totalAttempts) &&
    metrics.totalAttempts >= 8 &&
    metrics.totalAttempts <= 1000
  );
}

export function validSnapshotMetrics(metrics: GameCompletionMetrics) {
  return validCommon(metrics) && metrics.leftRepetitions === 3 && metrics.rightRepetitions === 3;
}

export function validFishMetrics(metrics: GameCompletionMetrics) {
  return (
    validCommon(metrics) &&
    metrics.leftRepetitions === 3 &&
    metrics.rightRepetitions === 3 &&
    metrics.successfulActions === 6 &&
    typeof metrics.totalAttempts === "number" &&
    Number.isInteger(metrics.totalAttempts) &&
    metrics.totalAttempts >= 1 &&
    metrics.totalAttempts <= 1000
  );
}

export function validFruitMetrics(metrics: GameCompletionMetrics) {
  return (
    validCommon(metrics) &&
    metrics.leftRepetitions === 5 &&
    metrics.rightRepetitions === 5 &&
    metrics.successfulActions === 10 &&
    metrics.totalAttempts === 10
  );
}

function validCommon(metrics: CompletionTimingMetrics) {
  return Boolean(
    metrics &&
      isSessionId(metrics.sessionId) &&
      Number.isFinite(metrics.durationSeconds) &&
      metrics.durationSeconds > 0 &&
      metrics.durationSeconds <= 7200,
  );
}
