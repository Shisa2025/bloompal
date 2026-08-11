import type { MotionSide } from "@/mediapipe/types";

export type PluckAnimationPoint = { x: number; y: number };
export type PluckHandUiState = {
  detected: boolean;
  claw: boolean;
  targetIndex: number;
};
export type PluckUiState = Record<MotionSide, PluckHandUiState>;

export const pluckInferenceIntervalMs = 40;
export const pluckAimResponse = 28;
export const pluckGrabFlashDurationMs = 240;

export function shouldRunPluckInference({
  videoTime,
  lastVideoTime,
  timestampMs,
  lastInferenceAtMs,
}: {
  videoTime: number;
  lastVideoTime: number;
  timestampMs: number;
  lastInferenceAtMs: number;
}) {
  return (
    videoTime > lastVideoTime &&
    timestampMs - lastInferenceAtMs >= pluckInferenceIntervalMs
  );
}

export function smoothPluckPoint(
  current: PluckAnimationPoint,
  target: PluckAnimationPoint,
  deltaSeconds: number,
  response = pluckAimResponse,
): PluckAnimationPoint {
  const amount = 1 - Math.exp(-response * Math.max(0, deltaSeconds));

  return {
    x: current.x + (target.x - current.x) * amount,
    y: current.y + (target.y - current.y) * amount,
  };
}

export function findClosestPluckTarget(
  point: PluckAnimationPoint,
  targets: readonly PluckAnimationPoint[],
  unavailableTargets: readonly boolean[],
  hitRadius: number,
) {
  let closestIndex = -1;
  let closestDistance = hitRadius;

  targets.forEach((target, index) => {
    if (unavailableTargets[index]) return;
    const distance = Math.hypot(point.x - target.x, point.y - target.y);
    if (distance <= closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

export function isPluckGestureStart(
  wasClosed: boolean,
  signal: { detected: boolean; claw: boolean },
) {
  return signal.detected && signal.claw && !wasClosed;
}

export function hasPluckUiStateChanged(
  previous: PluckUiState,
  next: PluckUiState,
) {
  return (["left", "right"] as const).some((side) =>
    previous[side].detected !== next[side].detected ||
    previous[side].claw !== next[side].claw ||
    previous[side].targetIndex !== next[side].targetIndex
  );
}
