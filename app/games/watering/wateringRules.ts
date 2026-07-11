import type { MotionResult, MotionSide } from "@/mediapipe/types";

type HandSignal = {
  detected: boolean;
  fist: boolean;
  angleDegrees: number;
  confidence: number;
};

export type WateringSignals = Record<MotionSide, HandSignal>;

const fingerPairs = [
  { tip: 8, mcp: 5 },
  { tip: 12, mcp: 9 },
  { tip: 16, mcp: 13 },
  { tip: 20, mcp: 17 },
] as const;

const emptySignal: HandSignal = {
  detected: false,
  fist: false,
  angleDegrees: 0,
  confidence: 0,
};

export function getWateringSignals(result: MotionResult): WateringSignals {
  const signals: WateringSignals = {
    left: { ...emptySignal },
    right: { ...emptySignal },
  };

  result.handLandmarks.forEach((landmarks, index) => {
    const side = getHandSide(result, index);

    if (!side || landmarks.length < 21) {
      return;
    }

    const signal = analyzeHand(landmarks, result.handedness[index]?.[0]?.score ?? 0);

    if (signal.confidence >= signals[side].confidence) {
      signals[side] = signal;
    }
  });

  return signals;
}

function getHandSide(
  result: MotionResult,
  index: number,
): MotionSide | undefined {
  const label = result.handedness[index]?.[0]?.categoryName?.toLowerCase();

  return label === "left" || label === "right" ? label : undefined;
}

function analyzeHand(
  landmarks: MotionResult["handLandmarks"][number],
  confidence: number,
): HandSignal {
  const wrist = landmarks[0];
  const middleMcp = landmarks[9];
  const palmSize = getDistance(wrist, middleMcp);

  if (palmSize < 0.025) {
    return { ...emptySignal, detected: true, confidence };
  }

  const foldedFingers = fingerPairs.filter(({ tip, mcp }) => {
    const tipDistance = getDistance(wrist, landmarks[tip]);
    const mcpDistance = getDistance(wrist, landmarks[mcp]);

    return tipDistance < mcpDistance + palmSize * 0.58;
  }).length;
  const angleDegrees = normalizeDegrees(
    (Math.atan2(middleMcp.y - wrist.y, middleMcp.x - wrist.x) * 180) / Math.PI,
  );

  return {
    detected: true,
    fist: foldedFingers >= 3,
    angleDegrees,
    confidence,
  };
}

function getDistance(
  first: MotionResult["handLandmarks"][number][number],
  second: MotionResult["handLandmarks"][number][number],
) {
  return Math.hypot(first.x - second.x, first.y - second.y, first.z - second.z);
}

function normalizeDegrees(value: number) {
  return ((value % 360) + 360) % 360;
}
