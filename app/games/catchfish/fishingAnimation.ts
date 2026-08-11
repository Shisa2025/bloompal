export type FishingAnimationPoint = { x: number; y: number };

export const fishingInferenceIntervalMs = 40;
export const fishingUiRefreshIntervalMs = 150;
export const fishingAimResponse = 28;
export const fishingDragResponse = 70;

export function shouldRunFishingInference({
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
    timestampMs - lastInferenceAtMs >= fishingInferenceIntervalMs
  );
}

export function smoothFishingPoint(
  current: FishingAnimationPoint,
  target: FishingAnimationPoint,
  deltaSeconds: number,
  response: number,
): FishingAnimationPoint {
  const amount = 1 - Math.exp(-response * Math.max(0, deltaSeconds));

  return {
    x: current.x + (target.x - current.x) * amount,
    y: current.y + (target.y - current.y) * amount,
  };
}
