export type MotionRunningMode = "VIDEO" | "IMAGE";

export type MotionDelegate = "CPU" | "GPU";

export type MotionSide = "left" | "right";

export type MotionLandmark = {
  x: number;
  y: number;
  z: number;
  visibility?: number;
};

export type MotionCategory = {
  index?: number;
  score?: number;
  categoryName?: string;
  displayName?: string;
};

export type MotionStatus =
  | "idle"
  | "initializing"
  | "ready"
  | "detecting"
  | "disposed"
  | "error";

export type MotionResult = {
  timestampMs: number;
  poseLandmarks: MotionLandmark[][];
  poseWorldLandmarks: MotionLandmark[][];
  handLandmarks: MotionLandmark[][];
  handWorldLandmarks: MotionLandmark[][];
  handedness: MotionCategory[][];
  status: MotionStatus;
};

export type MotionTrackerOptions = {
  enablePose?: boolean;
  enableHands?: boolean;
  runningMode?: MotionRunningMode;
  delegate?: MotionDelegate;
  wasmBaseUrl?: string;
  poseModelAssetPath?: string;
  handModelAssetPath?: string;
  maxHands?: number;
  numPoses?: number;
  minPoseDetectionConfidence?: number;
  minPosePresenceConfidence?: number;
  minHandDetectionConfidence?: number;
  minHandPresenceConfidence?: number;
  minTrackingConfidence?: number;
};

export type MotionTracker = {
  detectMotion(video: HTMLVideoElement, timestampMs?: number): MotionResult;
  disposeMotionTracker(): void;
};

export type MotionRuleEvaluation = {
  passed: boolean;
  score?: number;
  details?: Record<string, unknown>;
};

export type MotionRule = {
  id: string;
  evaluate(result: MotionResult): MotionRuleEvaluation;
};

export type MotionRuleResults = Record<string, MotionRuleEvaluation>;
