import type { MotionResult, MotionSide } from "@/mediapipe/types";

export type ClawSignals = Record<MotionSide, { detected: boolean; claw: boolean; confidence: number; x: number; y: number }>;
const sides: MotionSide[] = ["left", "right"];

export function getClawSignals(result: MotionResult): ClawSignals {
  const signals: ClawSignals = {
    left: { detected: false, claw: false, confidence: 0, x: 0.5, y: 0.5 },
    right: { detected: false, claw: false, confidence: 0, x: 0.5, y: 0.5 },
  };
  result.handLandmarks.forEach((hand, index) => {
    const label = result.handedness[index]?.[0]?.categoryName?.toLowerCase();
    if (!sides.includes(label as MotionSide) || hand.length < 21) return;
    const side = label as MotionSide;
    const confidence = result.handedness[index]?.[0]?.score ?? 0;
    if (confidence < signals[side].confidence) return;
    const palm = distance(hand[0], hand[9]);
    const fingers = [[5, 6, 8], [9, 10, 12], [13, 14, 16], [17, 18, 20]] as const;
    const bentAtMiddleJoint = fingers.filter(([mcp, pip, tip]) => {
      const angle = jointAngle(hand[mcp], hand[pip], hand[tip]);
      return angle <= 150;
    }).length;
    const foldedTowardPalm = fingers.filter(([mcp, , tip]) => {
      return distance(hand[0], hand[tip]) < distance(hand[0], hand[mcp]) + palm * 0.68;
    }).length;
    const handBounds = hand.reduce(
      (bounds, point) => ({
        minX: Math.min(bounds.minX, point.x),
        maxX: Math.max(bounds.maxX, point.x),
        minY: Math.min(bounds.minY, point.y),
        maxY: Math.max(bounds.maxY, point.y),
      }),
      { minX: 1, maxX: 0, minY: 1, maxY: 0 },
    );
    const handCenter = {
      x: (handBounds.minX + handBounds.maxX) / 2,
      y: (handBounds.minY + handBounds.maxY) / 2,
    };
    signals[side] = {
      detected: true,
      // Combine joint bend with fingertip folding so the gesture works when
      // the palm is angled toward or away from the camera. The thumb is not
      // constrained because a natural claw may keep it open or tucked.
      claw: palm > 0.025 && bentAtMiddleJoint >= 2 && foldedTowardPalm >= 3,
      confidence,
      // Match the mirrored webcam using the visual center of the complete
      // hand. This stays intuitive as the fingers open and curl.
      x: clampAim(1 - handCenter.x),
      y: clampAim(handCenter.y),
    };
  });
  return signals;
}

function clampAim(value: number) {
  return Math.min(0.96, Math.max(0.04, value));
}

function distance(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
function jointAngle(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) {
  const first = { x: a.x - b.x, y: a.y - b.y };
  const second = { x: c.x - b.x, y: c.y - b.y };
  const cosine = (first.x * second.x + first.y * second.y) / Math.max(Math.hypot(first.x, first.y) * Math.hypot(second.x, second.y), 0.0001);
  return (Math.acos(Math.min(1, Math.max(-1, cosine))) * 180) / Math.PI;
}
