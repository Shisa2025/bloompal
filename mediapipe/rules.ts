import type {
  MotionLandmark,
  MotionResult,
  MotionRule,
  MotionRuleEvaluation,
  MotionRuleResults,
  MotionSide,
} from "./types";

const POSE_INDEX = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
} as const;

const HAND_WRIST_INDEX = 0;

export function evaluateMotionRules(
  result: MotionResult,
  rules: MotionRule[],
): MotionRuleResults {
  return rules.reduce<MotionRuleResults>((evaluations, rule) => {
    evaluations[rule.id] = rule.evaluate(result);
    return evaluations;
  }, {});
}

export function createHandRaisedRule(
  side: MotionSide,
  options: { margin?: number; minVisibility?: number } = {},
): MotionRule {
  const margin = options.margin ?? 0.05;
  const minVisibility = options.minVisibility ?? 0.5;

  return {
    id: `${side}-hand-raised`,
    evaluate(result) {
      const pose = result.poseLandmarks[0];
      const shoulder = getPoseLandmark(pose, side, "shoulder");
      const wrist = getPoseLandmark(pose, side, "wrist");

      if (!shoulder || !wrist || !hasVisibility(wrist, minVisibility)) {
        return failed("Missing visible shoulder or wrist landmark.");
      }

      const distanceAboveShoulder = shoulder.y - wrist.y;

      return {
        passed: distanceAboveShoulder > margin,
        score: Math.max(0, distanceAboveShoulder),
        details: { side, distanceAboveShoulder, margin },
      };
    },
  };
}

export function createArmExtendedRule(
  side: MotionSide,
  options: { minAngleDegrees?: number; minVisibility?: number } = {},
): MotionRule {
  const minAngleDegrees = options.minAngleDegrees ?? 155;
  const minVisibility = options.minVisibility ?? 0.5;

  return {
    id: `${side}-arm-extended`,
    evaluate(result) {
      const pose = result.poseLandmarks[0];
      const shoulder = getPoseLandmark(pose, side, "shoulder");
      const elbow = getPoseLandmark(pose, side, "elbow");
      const wrist = getPoseLandmark(pose, side, "wrist");

      if (
        !shoulder ||
        !elbow ||
        !wrist ||
        !hasVisibility(shoulder, minVisibility) ||
        !hasVisibility(elbow, minVisibility) ||
        !hasVisibility(wrist, minVisibility)
      ) {
        return failed("Missing visible shoulder, elbow, or wrist landmark.");
      }

      const angleDegrees = getAngleDegrees(shoulder, elbow, wrist);

      return {
        passed: angleDegrees >= minAngleDegrees,
        score: angleDegrees / 180,
        details: { side, angleDegrees, minAngleDegrees },
      };
    },
  };
}

export function createHandsApartRule(
  options: { minDistance?: number } = {},
): MotionRule {
  const minDistance = options.minDistance ?? 0.35;

  return {
    id: "hands-apart",
    evaluate(result) {
      const firstWrist = result.handLandmarks[0]?.[HAND_WRIST_INDEX];
      const secondWrist = result.handLandmarks[1]?.[HAND_WRIST_INDEX];

      if (!firstWrist || !secondWrist) {
        return failed("Two visible hands are required.");
      }

      const distance = getDistance(firstWrist, secondWrist);

      return {
        passed: distance >= minDistance,
        score: distance,
        details: { distance, minDistance },
      };
    },
  };
}

export function getPrimaryHandSide(result: MotionResult): MotionSide | undefined {
  const label = result.handedness[0]?.[0]?.categoryName?.toLowerCase();

  if (label === "left" || label === "right") {
    return label;
  }

  return undefined;
}

function getPoseLandmark(
  pose: MotionLandmark[] | undefined,
  side: MotionSide,
  joint: "shoulder" | "elbow" | "wrist",
): MotionLandmark | undefined {
  if (!pose) {
    return undefined;
  }

  const key = `${side}${capitalize(joint)}` as keyof typeof POSE_INDEX;
  return pose[POSE_INDEX[key]];
}

function hasVisibility(landmark: MotionLandmark, minVisibility: number): boolean {
  return landmark.visibility === undefined || landmark.visibility >= minVisibility;
}

function getAngleDegrees(
  start: MotionLandmark,
  center: MotionLandmark,
  end: MotionLandmark,
): number {
  const first = { x: start.x - center.x, y: start.y - center.y };
  const second = { x: end.x - center.x, y: end.y - center.y };
  const dot = first.x * second.x + first.y * second.y;
  const firstLength = Math.hypot(first.x, first.y);
  const secondLength = Math.hypot(second.x, second.y);

  if (firstLength === 0 || secondLength === 0) {
    return 0;
  }

  const cosine = clamp(dot / (firstLength * secondLength), -1, 1);
  return (Math.acos(cosine) * 180) / Math.PI;
}

function getDistance(first: MotionLandmark, second: MotionLandmark): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function failed(reason: string): MotionRuleEvaluation {
  return {
    passed: false,
    score: 0,
    details: { reason },
  };
}
