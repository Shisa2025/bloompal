import type { MotionResult, MotionSide } from "@/mediapipe/types";

export type ClawSignals = Record<MotionSide, { detected: boolean; claw: boolean; confidence: number; x: number; y: number }>;
const sides: MotionSide[] = ["left", "right"];
const fingerJoints = [
  { mcp: 5, pip: 6, dip: 7, tip: 8 },
  { mcp: 9, pip: 10, dip: 11, tip: 12 },
  { mcp: 13, pip: 14, dip: 15, tip: 16 },
  { mcp: 17, pip: 18, dip: 19, tip: 20 },
] as const;
const aimLandmarkIndexes = fingerJoints.map(({ mcp }) => mcp);

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
    const angleLandmarks = result.handWorldLandmarks[index]?.length >= 21 ? result.handWorldLandmarks[index] : hand;
    const hookFingers = fingerJoints.filter(({ mcp, pip, dip, tip }) => {
      const largeKnuckleAngle = jointAngle(angleLandmarks[0], angleLandmarks[mcp], angleLandmarks[pip]);
      const middleJointAngle = jointAngle(angleLandmarks[mcp], angleLandmarks[pip], angleLandmarks[dip]);
      const endJointAngle = jointAngle(angleLandmarks[pip], angleLandmarks[dip], angleLandmarks[tip]);

      return largeKnuckleAngle >= 145 && middleJointAngle <= 150 && endJointAngle <= 160;
    }).length;
    const knuckleCenter = aimLandmarkIndexes.reduce(
      (center, landmarkIndex) => ({
        x: center.x + hand[landmarkIndex].x / aimLandmarkIndexes.length,
        y: center.y + hand[landmarkIndex].y / aimLandmarkIndexes.length,
      }),
      { x: 0, y: 0 },
    );
    signals[side] = {
      detected: true,
      // A hook claw keeps the large MCP knuckles extended while flexing the
      // PIP and DIP joints. The thumb is intentionally unconstrained.
      claw: palm > 0.025 && hookFingers >= 3,
      confidence,
      // Match the mirrored webcam using the four large knuckles. Fingertip
      // movement must not pull the aim point while the claw closes.
      x: clampAim(1 - knuckleCenter.x),
      y: clampAim(knuckleCenter.y),
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
function jointAngle(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }, c: { x: number; y: number; z: number }) {
  const first = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const second = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const cosine = (first.x * second.x + first.y * second.y + first.z * second.z) / Math.max(Math.hypot(first.x, first.y, first.z) * Math.hypot(second.x, second.y, second.z), 0.0001);
  return (Math.acos(Math.min(1, Math.max(-1, cosine))) * 180) / Math.PI;
}
