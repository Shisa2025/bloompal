import type { MotionResult, MotionSide } from "@/mediapipe/types";

export type FishingHandSignal = {
  detected: boolean;
  fist: boolean;
  x: number;
  y: number;
  confidence: number;
};

export type FishingSignals = Record<MotionSide, FishingHandSignal>;

const emptySignal: FishingHandSignal = { detected: false, fist: false, x: 0.5, y: 0.5, confidence: 0 };
const fingers = [
  { tip: 8, mcp: 5 },
  { tip: 12, mcp: 9 },
  { tip: 16, mcp: 13 },
  { tip: 20, mcp: 17 },
] as const;

export function getFishingSignals(result: MotionResult): FishingSignals {
  const signals: FishingSignals = { left: { ...emptySignal }, right: { ...emptySignal } };

  result.handLandmarks.forEach((landmarks, index) => {
    const label = result.handedness[index]?.[0]?.categoryName?.toLowerCase();
    if ((label !== "left" && label !== "right") || landmarks.length < 21) return;

    const wrist = landmarks[0];
    const middleMcp = landmarks[9];
    const palmSize = distance(wrist, middleMcp);
    const folded = fingers.filter(({ tip, mcp }) => distance(wrist, landmarks[tip]) < distance(wrist, landmarks[mcp]) + palmSize * 0.58).length;
    const confidence = result.handedness[index]?.[0]?.score ?? 0;
    const next = {
      detected: true,
      fist: palmSize >= 0.025 && folded >= 3,
      // The selfie camera is mirrored visually, so mirror its normalized X coordinate too.
      x: clamp(1 - middleMcp.x),
      y: clamp(middleMcp.y),
      confidence,
    };
    if (confidence >= signals[label].confidence) signals[label] = next;
  });

  return signals;
}

function distance(first: MotionResult["handLandmarks"][number][number], second: MotionResult["handLandmarks"][number][number]) {
  return Math.hypot(first.x - second.x, first.y - second.y, first.z - second.z);
}

function clamp(value: number) {
  return Math.max(0.04, Math.min(0.96, value));
}
