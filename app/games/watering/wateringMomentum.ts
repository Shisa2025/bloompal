export type WateringMomentumSignal = {
  detected: boolean;
  fist: boolean;
  angleDegrees: number;
};

export type WateringMomentumState = {
  progress: number;
  smoothedAngle: number | null;
  lastSampleAt: number | null;
  lastValidAt: number | null;
  direction: -1 | 0 | 1;
  directionalTravel: number;
  directionCredited: boolean;
};

export const wateringInferenceIntervalMs = 40;
export const wateringTrackingGraceMs = 200;
export const wateringDegreesPerPercent = 3.6;
export const wateringNoiseFloorDegrees = 0.4;
export const wateringMaxFrameDegrees = 6;
export const wateringMaxRawJumpDegrees = 45;
export const wateringAngleResponse = 18;
export const wateringCompletionSnapPercent = 0.01;

export function createWateringMomentumState(): WateringMomentumState {
  return {
    progress: 0,
    smoothedAngle: null,
    lastSampleAt: null,
    lastValidAt: null,
    direction: 0,
    directionalTravel: 0,
    directionCredited: false,
  };
}

export function shouldRunWateringInference({
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
    timestampMs - lastInferenceAtMs >= wateringInferenceIntervalMs
  );
}

export function updateWateringMomentum(
  state: WateringMomentumState,
  signal: WateringMomentumSignal,
  timestampMs: number,
) {
  if (!signal.detected || !signal.fist) {
    const trackingExpired =
      state.lastValidAt !== null &&
      timestampMs - state.lastValidAt > wateringTrackingGraceMs;

    return {
      state: trackingExpired ? resetWateringMomentumAnchor(state) : state,
      addedPercent: 0,
    };
  }

  const angle = normalizeDegrees(signal.angleDegrees);
  const trackingExpired =
    state.lastValidAt === null ||
    timestampMs - state.lastValidAt > wateringTrackingGraceMs;
  if (trackingExpired || state.smoothedAngle === null || state.lastSampleAt === null) {
    return {
      state: {
        ...resetWateringMomentumAnchor(state),
        smoothedAngle: angle,
        lastSampleAt: timestampMs,
        lastValidAt: timestampMs,
      },
      addedPercent: 0,
    };
  }

  const rawDelta = shortestSignedAngleDelta(angle, state.smoothedAngle);
  if (Math.abs(rawDelta) > wateringMaxRawJumpDegrees) {
    return {
      state: {
        ...resetWateringMomentumAnchor(state),
        smoothedAngle: angle,
        lastSampleAt: timestampMs,
        lastValidAt: timestampMs,
      },
      addedPercent: 0,
    };
  }

  const deltaSeconds = Math.min(
    Math.max((timestampMs - state.lastSampleAt) / 1000, 0),
    0.1,
  );
  const smoothedAngle = smoothCircularAngle(
    state.smoothedAngle,
    angle,
    deltaSeconds,
  );
  const filteredDelta = shortestSignedAngleDelta(
    smoothedAngle,
    state.smoothedAngle,
  );
  const direction = Math.sign(filteredDelta) as -1 | 0 | 1;
  const frameTravel = Math.min(
    Math.abs(filteredDelta),
    wateringMaxFrameDegrees,
  );

  let directionalTravel = state.directionalTravel;
  let directionCredited = state.directionCredited;
  let addedDegrees = 0;
  if (direction !== 0 && direction !== state.direction) {
    directionalTravel = frameTravel;
    directionCredited = false;
  } else if (direction !== 0) {
    directionalTravel += frameTravel;
  }

  if (direction !== 0 && !directionCredited && directionalTravel > wateringNoiseFloorDegrees) {
    addedDegrees = directionalTravel;
    directionCredited = true;
  } else if (direction !== 0 && directionCredited) {
    addedDegrees = frameTravel;
  }

  const accumulatedProgress = Math.min(
    100,
    state.progress + degreesToWateringPercent(addedDegrees),
  );
  const nextProgress = accumulatedProgress >= 100 - wateringCompletionSnapPercent
    ? 100
    : accumulatedProgress;

  return {
    state: {
      progress: nextProgress,
      smoothedAngle,
      lastSampleAt: timestampMs,
      lastValidAt: timestampMs,
      direction: direction || state.direction,
      directionalTravel,
      directionCredited,
    },
    addedPercent: nextProgress - state.progress,
  };
}

export function degreesToWateringPercent(degrees: number) {
  return Math.max(0, degrees) / wateringDegreesPerPercent;
}

export function getDisplayedWateringPercent(progress: number) {
  return Math.min(100, Math.max(0, Math.floor(progress + 0.000001)));
}

export function getCombinedWateringPercent(left: number, right: number) {
  return Math.min(100, Math.max(0, (left + right) / 2));
}

export function shortestSignedAngleDelta(next: number, previous: number) {
  return ((next - previous + 540) % 360) - 180;
}

function smoothCircularAngle(
  current: number,
  target: number,
  deltaSeconds: number,
) {
  const amount = 1 - Math.exp(-wateringAngleResponse * deltaSeconds);
  return normalizeDegrees(
    current + shortestSignedAngleDelta(target, current) * amount,
  );
}

function resetWateringMomentumAnchor(
  state: WateringMomentumState,
): WateringMomentumState {
  return {
    ...state,
    smoothedAngle: null,
    lastSampleAt: null,
    lastValidAt: null,
    direction: 0,
    directionalTravel: 0,
    directionCredited: false,
  };
}

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}
