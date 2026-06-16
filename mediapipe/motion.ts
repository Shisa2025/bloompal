import {
  FilesetResolver,
  HandLandmarker,
  PoseLandmarker,
  type Category,
  type HandLandmarkerResult,
  type Landmark,
  type NormalizedLandmark,
  type PoseLandmarkerResult,
} from "@mediapipe/tasks-vision";

import type {
  MotionCategory,
  MotionLandmark,
  MotionResult,
  MotionTracker,
  MotionTrackerOptions,
} from "./types";

export const DEFAULT_MEDIAPIPE_WASM_BASE_URL = "/mediapipe/wasm";
export const DEFAULT_POSE_MODEL_ASSET_PATH =
  "/mediapipe/models/pose_landmarker_full.task";
export const DEFAULT_HAND_MODEL_ASSET_PATH =
  "/mediapipe/models/hand_landmarker.task";

type ResolvedMotionTrackerOptions = Required<
  Pick<
    MotionTrackerOptions,
    | "enablePose"
    | "enableHands"
    | "runningMode"
    | "delegate"
    | "wasmBaseUrl"
    | "poseModelAssetPath"
    | "handModelAssetPath"
    | "maxHands"
    | "numPoses"
    | "minPoseDetectionConfidence"
    | "minPosePresenceConfidence"
    | "minHandDetectionConfidence"
    | "minHandPresenceConfidence"
    | "minTrackingConfidence"
  >
>;

const DEFAULT_OPTIONS: ResolvedMotionTrackerOptions = {
  enablePose: true,
  enableHands: true,
  runningMode: "VIDEO",
  delegate: "GPU",
  wasmBaseUrl: DEFAULT_MEDIAPIPE_WASM_BASE_URL,
  poseModelAssetPath: DEFAULT_POSE_MODEL_ASSET_PATH,
  handModelAssetPath: DEFAULT_HAND_MODEL_ASSET_PATH,
  maxHands: 2,
  numPoses: 1,
  minPoseDetectionConfidence: 0.5,
  minPosePresenceConfidence: 0.5,
  minHandDetectionConfidence: 0.5,
  minHandPresenceConfidence: 0.5,
  minTrackingConfidence: 0.5,
};

export async function createMotionTracker(
  options: MotionTrackerOptions = {},
): Promise<MotionTracker> {
  const config = { ...DEFAULT_OPTIONS, ...options };

  if (!config.enablePose && !config.enableHands) {
    throw new Error("Motion tracker requires pose, hands, or both to be enabled.");
  }

  const vision = await FilesetResolver.forVisionTasks(config.wasmBaseUrl);

  const poseLandmarker = config.enablePose
    ? await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: config.poseModelAssetPath,
          delegate: config.delegate,
        },
        runningMode: config.runningMode,
        numPoses: config.numPoses,
        minPoseDetectionConfidence: config.minPoseDetectionConfidence,
        minPosePresenceConfidence: config.minPosePresenceConfidence,
        minTrackingConfidence: config.minTrackingConfidence,
        outputSegmentationMasks: false,
      })
    : undefined;

  const handLandmarker = config.enableHands
    ? await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: config.handModelAssetPath,
          delegate: config.delegate,
        },
        runningMode: config.runningMode,
        numHands: config.maxHands,
        minHandDetectionConfidence: config.minHandDetectionConfidence,
        minHandPresenceConfidence: config.minHandPresenceConfidence,
        minTrackingConfidence: config.minTrackingConfidence,
      })
    : undefined;

  return {
    detectMotion(video, timestampMs = Date.now()) {
      return detectMotionFrame({
        video,
        timestampMs,
        poseLandmarker,
        handLandmarker,
      });
    },
    disposeMotionTracker() {
      poseLandmarker?.close();
      handLandmarker?.close();
    },
  };
}

function detectMotionFrame({
  video,
  timestampMs,
  poseLandmarker,
  handLandmarker,
}: {
  video: HTMLVideoElement;
  timestampMs: number;
  poseLandmarker?: PoseLandmarker;
  handLandmarker?: HandLandmarker;
}): MotionResult {
  const poseResult = poseLandmarker?.detectForVideo(video, timestampMs);
  const handResult = handLandmarker?.detectForVideo(video, timestampMs);

  return {
    timestampMs,
    poseLandmarks: toMotionLandmarkGroups(poseResult?.landmarks),
    poseWorldLandmarks: toMotionLandmarkGroups(poseResult?.worldLandmarks),
    handLandmarks: toMotionLandmarkGroups(handResult?.landmarks),
    handWorldLandmarks: toMotionLandmarkGroups(handResult?.worldLandmarks),
    handedness: toMotionCategoryGroups(handResult?.handedness),
    status: "detecting",
  };
}

export function normalizePoseResult(
  result: PoseLandmarkerResult,
  timestampMs: number,
): Pick<MotionResult, "poseLandmarks" | "poseWorldLandmarks" | "timestampMs"> {
  return {
    timestampMs,
    poseLandmarks: toMotionLandmarkGroups(result.landmarks),
    poseWorldLandmarks: toMotionLandmarkGroups(result.worldLandmarks),
  };
}

export function normalizeHandResult(
  result: HandLandmarkerResult,
  timestampMs: number,
): Pick<
  MotionResult,
  "handLandmarks" | "handWorldLandmarks" | "handedness" | "timestampMs"
> {
  return {
    timestampMs,
    handLandmarks: toMotionLandmarkGroups(result.landmarks),
    handWorldLandmarks: toMotionLandmarkGroups(result.worldLandmarks),
    handedness: toMotionCategoryGroups(result.handedness),
  };
}

function toMotionLandmarkGroups(
  groups: NormalizedLandmark[][] | Landmark[][] | undefined,
): MotionLandmark[][] {
  return (
    groups?.map((group) =>
      group.map((landmark) => ({
        x: landmark.x,
        y: landmark.y,
        z: landmark.z,
        visibility:
          "visibility" in landmark ? landmark.visibility : undefined,
      })),
    ) ?? []
  );
}

function toMotionCategoryGroups(
  groups: Category[][] | undefined,
): MotionCategory[][] {
  return (
    groups?.map((group) =>
      group.map((category) => ({
        index: category.index,
        score: category.score,
        categoryName: category.categoryName,
        displayName: category.displayName,
      })),
    ) ?? []
  );
}
