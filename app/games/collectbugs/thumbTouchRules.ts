import type { MotionResult, MotionSide } from "@/mediapipe/types";

export const thumbTouchFingerNames = ["index", "middle", "ring", "pinky"] as const;

export type ThumbTouchFinger = (typeof thumbTouchFingerNames)[number];

export type ThumbTouchSignals = Record<
  MotionSide,
  { detected: boolean; touching: boolean; confidence: number }
>;

const fingertipIndexes: Record<ThumbTouchFinger, number> = {
  index: 8,
  middle: 12,
  ring: 16,
  pinky: 20,
};

const emptySignal = { detected: false, touching: false, confidence: 0 };

export function getThumbTouchSignals(
  result: MotionResult,
  nextFingers: Record<MotionSide, ThumbTouchFinger>,
): ThumbTouchSignals {
  const signals: ThumbTouchSignals = {
    left: { ...emptySignal },
    right: { ...emptySignal },
  };

  result.handLandmarks.forEach((landmarks, index) => {
    const side = getHandSide(result, index);

    if (!side || landmarks.length < 21) {
      return;
    }

    const confidence = result.handedness[index]?.[0]?.score ?? 0;

    if (confidence < signals[side].confidence) {
      return;
    }

    const thumbTip = landmarks[4];
    const wrist = landmarks[0];
    const middleMcp = landmarks[9];
    const palmSize = distance(wrist, middleMcp);
    const targetTip = landmarks[fingertipIndexes[nextFingers[side]]];

    signals[side] = {
      detected: true,
      touching: palmSize >= 0.025 && distance(thumbTip, targetTip) <= palmSize * 0.52,
      confidence,
    };
  });

  return signals;
}

function getHandSide(result: MotionResult, index: number): MotionSide | undefined {
  const label = result.handedness[index]?.[0]?.categoryName?.toLowerCase();

  return label === "left" || label === "right" ? label : undefined;
}

function distance(
  first: MotionResult["handLandmarks"][number][number],
  second: MotionResult["handLandmarks"][number][number],
) {
  return Math.hypot(first.x - second.x, first.y - second.y, first.z - second.z);
}
