# BloomPal MediaPipe Interface

This folder is the local integration boundary for browser motion tracking. App
pages should call this layer instead of importing `@mediapipe/tasks-vision`
directly.

## Dependency

Installed package:

```bash
npm install @mediapipe/tasks-vision
```

This project uses the Web MediaPipe Tasks Vision package only. It does not use
the Python MediaPipe package.

## Runtime Files

MediaPipe Tasks Vision loads wasm files at runtime. The package wasm files are
mirrored from:

```text
node_modules/@mediapipe/tasks-vision/wasm
```

to the browser-accessible path:

```text
public/mediapipe/wasm
```

The wrapper defaults to:

```ts
wasmBaseUrl: "/mediapipe/wasm"
```

Model `.task` files are not included in the npm package. Before using camera
detection in a page, place model files under:

```text
public/mediapipe/models/pose_landmarker_full.task
public/mediapipe/models/hand_landmarker.task
```

or pass custom model URLs to `createMotionTracker`.

## Files

- `types.ts` defines normalized motion result, tracker, and rule types.
- `motion.ts` initializes PoseLandmarker and HandLandmarker, runs video-frame
  detection, normalizes results, and releases resources.
- `rules.ts` provides a rule layer for game logic, such as raised hands,
  extended arms, and two-hand spacing.

## Basic Usage

Use this from a client component that already owns camera permissions and a
ready `HTMLVideoElement`.

```ts
import { createMotionTracker } from "@/mediapipe/motion";
import { createHandRaisedRule, evaluateMotionRules } from "@/mediapipe/rules";

const tracker = await createMotionTracker({
  enablePose: true,
  enableHands: true,
  maxHands: 2,
});

const result = tracker.detectMotion(videoElement, performance.now());
const checks = evaluateMotionRules(result, [createHandRaisedRule("right")]);

tracker.disposeMotionTracker();
```

## Notes For Future Game Pages

- Keep camera setup and animation loops in `"use client"` components.
- Pass each video frame into `detectMotion(video, timestampMs)`.
- Keep game-specific checks in `rules.ts` or a separate rule module that accepts
  `MotionResult`.
- Call `disposeMotionTracker()` when leaving the page to release MediaPipe
  resources.
