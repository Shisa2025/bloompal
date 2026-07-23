import type { MotionResult, MotionSide } from "@/mediapipe/types";

export type ThumbFlexSignals = Record<
  MotionSide,
  { detected: boolean; palmFacing: boolean; extended: boolean; flexed: boolean }
>;

const emptySignal = { detected: false, palmFacing: false, extended: false, flexed: false };

export function getThumbFlexSignals(result: MotionResult): ThumbFlexSignals {
  const signals: ThumbFlexSignals = { left: { ...emptySignal }, right: { ...emptySignal } };

  result.handLandmarks.forEach((landmarks, index) => {
    const side = getHandSide(result, index);
    if (!side || landmarks.length < 21 || signals[side].detected) return;

    const wrist = landmarks[0];
    const indexBase = landmarks[5];
    const pinkyBase = landmarks[17];
    const thumbTip = landmarks[4];
    const middleBase = landmarks[9];
    const palmSize = distance(wrist, middleBase);
    const palmNormalZ = Math.abs(
      (indexBase.x - wrist.x) * (pinkyBase.y - wrist.y) -
        (indexBase.y - wrist.y) * (pinkyBase.x - wrist.x),
    );
    const palmNormalLength = Math.hypot(
      (indexBase.y - wrist.y) * (pinkyBase.z - wrist.z) - (indexBase.z - wrist.z) * (pinkyBase.y - wrist.y),
      (indexBase.z - wrist.z) * (pinkyBase.x - wrist.x) - (indexBase.x - wrist.x) * (pinkyBase.z - wrist.z),
      palmNormalZ,
    );
    const palmFacing = palmNormalLength > 0.0001 && palmNormalZ / palmNormalLength > 0.62;
    const thumbToMiddleBase = distance(thumbTip, middleBase);

    signals[side] = {
      detected: palmSize > 0.025,
      palmFacing,
      // A simple, forgiving in/out movement: no exact fingertip contact or
      // fixed palm orientation is required for a repetition to count.
      extended: palmSize >= 0.025 && thumbToMiddleBase >= palmSize * 0.82,
      flexed: palmSize >= 0.025 && thumbToMiddleBase <= palmSize * 0.72,
    };
  });

  return signals;
}

function getHandSide(result: MotionResult, index: number): MotionSide | undefined {
  const label = result.handedness[index]?.[0]?.categoryName?.toLowerCase();
  return label === "left" || label === "right" ? label : undefined;
}

function distance(first: { x: number; y: number; z: number }, second: { x: number; y: number; z: number }) {
  return Math.hypot(first.x - second.x, first.y - second.y, first.z - second.z);
}
