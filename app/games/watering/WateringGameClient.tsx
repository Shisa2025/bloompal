"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createMotionTracker } from "@/mediapipe/motion";
import type { MotionSide, MotionTracker } from "@/mediapipe/types";
import { completeWateringRun, selectMysterySeed } from "./actions";
import FlowerRewardStage from "./FlowerRewardStage";
import SproutFeedbackStage from "./SproutFeedbackStage";
import { getWateringSignals, type WateringSignals } from "./wateringRules";

type WateringPlant = {
  id: string;
  seedKey: string;
  status: "selected" | "completed";
  flowerAsset: string | null;
};

type WateringGameClientProps = {
  initialPlant: WateringPlant | null;
};

type GamePhase =
  | "choosing"
  | "starting"
  | "watering"
  | "completing"
  | "complete-error"
  | "reward";

type WaterCounts = Record<MotionSide, number>;
type HandCycle = {
  baseline: number | null;
  phase: "searching" | "ready" | "rotated" | "cooldown";
  lastCountAt: number;
};
type WaterBurst = {
  id: number;
  side: MotionSide;
};

const seedKeys = ["mystery-a", "mystery-b", "mystery-c"] as const;
const sides: MotionSide[] = ["left", "right"];
const emptyCounts: WaterCounts = { left: 0, right: 0 };
const emptySignals: WateringSignals = {
  left: { detected: false, fist: false, angleDegrees: 0, confidence: 0 },
  right: { detected: false, fist: false, angleDegrees: 0, confidence: 0 },
};

export default function WateringGameClient({
  initialPlant,
}: WateringGameClientProps) {
  const [plant, setPlant] = useState<WateringPlant | null>(initialPlant);
  const [phase, setPhase] = useState<GamePhase>(
    initialPlant ? "watering" : "choosing",
  );
  const [counts, setCounts] = useState<WaterCounts>(emptyCounts);
  const [signals, setSignals] = useState<WateringSignals>(emptySignals);
  const [cameraStatus, setCameraStatus] = useState("Camera idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [bursts, setBursts] = useState<WaterBurst[]>([]);
  const [cameraRunId, setCameraRunId] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackerRef = useRef<MotionTracker | null>(null);
  const animationFrameRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const countsRef = useRef<WaterCounts>(emptyCounts);
  const burstIdRef = useRef(0);
  const completingRef = useRef(false);
  const sessionIdRef = useRef("");
  const runStartedAtRef = useRef(0);
  const lastSignalUiAtRef = useRef(0);
  const cyclesRef = useRef<Record<MotionSide, HandCycle>>({
    left: createHandCycle(),
    right: createHandCycle(),
  });
  const seedOrder = useMemo(() => shuffleSeeds([...seedKeys]), []);

  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = crypto.randomUUID();
      runStartedAtRef.current = Date.now();
    }
  }, []);

  useEffect(() => {
    countsRef.current = counts;
  }, [counts]);

  const resetRunProgress = useCallback(() => {
    setCounts(emptyCounts);
    countsRef.current = emptyCounts;
    cyclesRef.current = {
      left: createHandCycle(),
      right: createHandCycle(),
    };
    completingRef.current = false;
    setSignals(emptySignals);
    setBursts([]);
    setActionError(null);
    sessionIdRef.current = crypto.randomUUID();
    runStartedAtRef.current = Date.now();
  }, []);

  const addWaterBurst = useCallback((side: MotionSide) => {
    const id = (burstIdRef.current += 1);

    setBursts((current) => [...current, { id, side }]);
    window.setTimeout(() => {
      setBursts((current) => current.filter((burst) => burst.id !== id));
    }, 680);
  }, []);

  const registerWater = useCallback(
    (side: MotionSide) => {
      setCounts((current) => {
        if (current[side] >= 5) {
          return current;
        }

        const next = {
          ...current,
          [side]: current[side] + 1,
        };

        countsRef.current = next;
        return next;
      });
      addWaterBurst(side);
    },
    [addWaterBurst],
  );

  const processSignals = useCallback(
    (nextSignals: WateringSignals, timestampMs: number) => {
      sides.forEach((side) => {
        const signal = nextSignals[side];
        const cycle = cyclesRef.current[side];

        if (countsRef.current[side] >= 5) {
          return;
        }

        if (!signal.detected || !signal.fist) {
          cyclesRef.current[side] = createHandCycle();
          return;
        }

        if (cycle.baseline === null) {
          cycle.baseline = signal.angleDegrees;
          cycle.phase = "ready";
          return;
        }

        const delta = getAngleDelta(signal.angleDegrees, cycle.baseline);

        if (cycle.phase === "ready" && delta >= 30) {
          cycle.phase = "rotated";
          return;
        }

        if (
          cycle.phase === "rotated" &&
          delta <= 12 &&
          timestampMs - cycle.lastCountAt > 450
        ) {
          cycle.phase = "cooldown";
          cycle.lastCountAt = timestampMs;
          registerWater(side);
          return;
        }

        if (
          cycle.phase === "cooldown" &&
          delta <= 12 &&
          timestampMs - cycle.lastCountAt > 700
        ) {
          cycle.phase = "ready";
          cycle.baseline = signal.angleDegrees;
        }
      });

      if (timestampMs - lastSignalUiAtRef.current > 150) {
        lastSignalUiAtRef.current = timestampMs;
        setSignals(nextSignals);
      }
    },
    [registerWater],
  );

  const finishWatering = useCallback(async () => {
    if (!plant || completingRef.current) {
      return;
    }

    completingRef.current = true;
    setPhase("completing");
    setActionError(null);

    if (!sessionIdRef.current) {
      sessionIdRef.current = crypto.randomUUID();
      runStartedAtRef.current = Date.now();
    }
    const result = await completeWateringRun(plant.id, {
      sessionId: sessionIdRef.current,
      durationSeconds: (Date.now() - runStartedAtRef.current) / 1000,
      leftRepetitions: countsRef.current.left,
      rightRepetitions: countsRef.current.right,
    });

    if (!result.ok) {
      completingRef.current = false;
      setActionError(result.error);
      setPhase("complete-error");
      return;
    }

    setPlant(result.plant);
    setPhase("reward");
  }, [plant]);

  useEffect(() => {
    if (phase === "watering" && counts.left >= 5 && counts.right >= 5) {
      const timer = window.setTimeout(() => {
        void finishWatering();
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [counts, finishWatering, phase]);

  useEffect(() => {
    if (phase !== "watering" || !plant) {
      return;
    }

    let disposed = false;
    let videoElement: HTMLVideoElement | null = null;

    async function startCamera() {
      const video = videoRef.current;

      if (!video) {
        return;
      }

      videoElement = video;
      setCameraStatus("Starting camera");
      setCameraError(null);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            width: { ideal: 960 },
            height: { ideal: 540 },
            facingMode: "user",
          },
        });

        if (disposed) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();

        setCameraStatus("Loading hand tracker");

        const tracker = await createHandsTracker();

        if (disposed) {
          tracker.disposeMotionTracker();
          return;
        }

        trackerRef.current = tracker;
        setCameraStatus("Tracking hands");

        const detectFrame = () => {
          if (disposed || !trackerRef.current || !videoRef.current) {
            return;
          }

          if (videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            const timestampMs = performance.now();
            const result = trackerRef.current.detectMotion(videoRef.current, timestampMs);

            processSignals(getWateringSignals(result), timestampMs);
          }

          animationFrameRef.current = window.requestAnimationFrame(detectFrame);
        };

        detectFrame();
      } catch (error) {
        console.error("Watering camera setup failed.", error);
        setCameraStatus("Camera unavailable");
        setCameraError(
          error instanceof Error
            ? error.message
            : "Could not start camera or hand tracking.",
        );
      }
    }

    void startCamera();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
      trackerRef.current?.disposeMotionTracker();
      trackerRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;

      if (videoElement) {
        videoElement.srcObject = null;
      }
    };
  }, [cameraRunId, phase, plant, processSignals]);

  const handleSeedSelect = async (seedKey: (typeof seedKeys)[number]) => {
    setPhase("starting");
    setActionError(null);

    const result = await selectMysterySeed(seedKey);

    if (!result.ok) {
      setActionError(result.error);
      setPhase("choosing");
      return;
    }

    resetRunProgress();
    setPlant(result.plant);
    setPhase("watering");
  };

  const rewardAsset = plant?.status === "completed" ? plant.flowerAsset : null;

  return (
    <div className="watering-game">
      <header className="watering-header">
        <div>
          <p>BloomPal Game</p>
          <h1>Watering</h1>
        </div>
        <Link className="watering-secondary-link" href="/dashboard">
          Dashboard
        </Link>
      </header>

      <section
        className={
          phase === "choosing" || phase === "starting" || phase === "reward"
            ? "watering-layout watering-layout-single"
            : "watering-playfield"
        }
        aria-live="polite"
      >
        {phase === "choosing" || phase === "starting" ? (
          <div className="watering-main-panel">
            <SeedPicker
              disabled={phase === "starting"}
              seedOrder={seedOrder}
              onSelect={handleSeedSelect}
            />
          </div>
        ) : phase === "reward" && rewardAsset ? (
          <div className="watering-main-panel watering-reward-main-panel">
            <RewardPanel flowerAsset={rewardAsset} />
          </div>
        ) : (
          <WateringPlayfield
            actionError={actionError}
            bursts={bursts}
            cameraError={cameraError}
            cameraStatus={cameraStatus}
            counts={counts}
            phase={phase}
            signals={signals}
            onRetryCamera={() => setCameraRunId((current) => current + 1)}
            onRetryComplete={() => void finishWatering()}
            videoRef={videoRef}
          />
        )}
      </section>
    </div>
  );
}

function WateringPlayfield({
  actionError,
  bursts,
  cameraError,
  cameraStatus,
  counts,
  phase,
  signals,
  onRetryCamera,
  onRetryComplete,
  videoRef,
}: {
  actionError: string | null;
  bursts: WaterBurst[];
  cameraError: string | null;
  cameraStatus: string;
  counts: WaterCounts;
  phase: GamePhase;
  signals: WateringSignals;
  onRetryCamera: () => void;
  onRetryComplete: () => void;
  videoRef: RefObject<HTMLVideoElement | null>;
}) {
  const progress = counts.left + counts.right;

  return (
    <>
      <div className="watering-camera-column">
        <CameraPanel
          actionError={actionError}
          cameraError={cameraError}
          cameraStatus={cameraStatus}
          phase={phase}
          onRetryCamera={onRetryCamera}
          onRetryComplete={onRetryComplete}
          videoRef={videoRef}
        />
      </div>

      <div className="watering-sprout-panel">
        <div className="watering-sprout-heading">
          <p>Live growth</p>
          <h2>{progress >= 10 ? "Ready to bloom" : "Keep watering"}</h2>
        </div>
        <SproutFeedbackStage progress={progress} waterBursts={bursts} />
      </div>

      <div className="watering-side-column">
        <ProgressPanel counts={counts} phase={phase} signals={signals} />
        <GestureGuidePanel counts={counts} signals={signals} />
      </div>
    </>
  );
}

function SeedPicker({
  disabled,
  seedOrder,
  onSelect,
}: {
  disabled: boolean;
  seedOrder: readonly (typeof seedKeys)[number][];
  onSelect: (seedKey: (typeof seedKeys)[number]) => void;
}) {
  return (
    <div className="watering-seed-stage">
      <div className="watering-stage-copy">
        <p>Mystery seeds</p>
        <h2>Choose one seed</h2>
      </div>
      <div className="watering-seed-grid">
        {seedOrder.map((seedKey, index) => (
          <button
            className="watering-seed-card"
            disabled={disabled}
            key={seedKey}
            onClick={() => onSelect(seedKey)}
            type="button"
          >
            <span className="watering-seed-visual" aria-hidden="true" />
            <strong>Seed {index + 1}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}

function CameraPanel({
  actionError,
  cameraError,
  cameraStatus,
  phase,
  onRetryCamera,
  onRetryComplete,
  videoRef,
}: {
  actionError: string | null;
  cameraError: string | null;
  cameraStatus: string;
  phase: GamePhase;
  onRetryCamera: () => void;
  onRetryComplete: () => void;
  videoRef: RefObject<HTMLVideoElement | null>;
}) {
  return (
    <div className="watering-camera-panel">
      <div className="watering-panel-heading">
        <p>Webcam</p>
        <h2>Show your hands</h2>
      </div>
      <div className="watering-video-wrap">
        <video
          ref={videoRef}
          className="watering-video"
          muted
          playsInline
          aria-label="Watering webcam"
        />
        {phase === "completing" ? (
          <div className="watering-overlay-message">Saving bloom</div>
        ) : null}
      </div>

      <div className="watering-camera-footer">
        <span>{cameraStatus}</span>
        {cameraError ? (
          <button className="watering-text-button" onClick={onRetryCamera} type="button">
            Retry camera
          </button>
        ) : null}
        {phase === "complete-error" ? (
          <button
            className="watering-text-button"
            onClick={onRetryComplete}
            type="button"
          >
            Retry save
          </button>
        ) : null}
      </div>

      {cameraError || actionError ? (
        <p className="watering-error">{cameraError ?? actionError}</p>
      ) : null}
    </div>
  );
}

function ProgressPanel({
  counts,
  phase,
  signals,
}: {
  counts: WaterCounts;
  phase: GamePhase;
  signals: WateringSignals;
}) {
  return (
    <aside className="watering-progress-panel">
      <div>
        <p className="watering-panel-kicker">Water level</p>
        <h2>{phase === "reward" ? "Bloom unlocked" : "Wrist watering"}</h2>
      </div>

      <div className="watering-progress-list">
        {sides.map((side) => (
          <div className="watering-progress-row" key={side}>
            <div>
              <span>{side === "left" ? "Left" : "Right"}</span>
              <strong>{counts[side]}/5</strong>
            </div>
            <div className="watering-progress-track" aria-hidden="true">
              <span style={{ width: `${Math.min(counts[side], 5) * 20}%` }} />
            </div>
            <p>{getSignalCopy(signals[side], counts[side])}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}

function GestureGuidePanel({
  counts,
  signals,
}: {
  counts: WaterCounts;
  signals: WateringSignals;
}) {
  return (
    <aside className="watering-guide-panel">
      <div>
        <p className="watering-panel-kicker">How to play</p>
        <h2>Fist, twist, return</h2>
      </div>

      <ol className="watering-guide-steps">
        <li>
          <span className="watering-gesture-icon watering-gesture-icon-fist" aria-hidden="true">
            <span />
          </span>
          <div>
            <strong>Make a fist</strong>
            <p>Close one hand clearly in view.</p>
          </div>
        </li>
        <li>
          <span className="watering-gesture-icon watering-gesture-icon-twist" aria-hidden="true">
            <span />
          </span>
          <div>
            <strong>Twist your wrist</strong>
            <p>Rotate the fist away from center.</p>
          </div>
        </li>
        <li>
          <span className="watering-gesture-icon watering-gesture-icon-return" aria-hidden="true">
            <span />
          </span>
          <div>
            <strong>Return to center</strong>
            <p>Come back to count one watering.</p>
          </div>
        </li>
      </ol>

      <div className="watering-live-hint">
        <strong>Now</strong>
        <p>{getGuideHint(counts, signals)}</p>
      </div>
    </aside>
  );
}

function RewardPanel({ flowerAsset }: { flowerAsset: string }) {
  return (
    <div className="watering-reward-panel">
      <FlowerRewardStage flowerAsset={flowerAsset} />
      <div className="watering-reward-copy">
        <p>Bloom reward</p>
        <h2>{flowerAsset.replace(".glb", "")}</h2>
        <Link className="watering-primary-link" href="/dashboard">
          Back to garden
        </Link>
      </div>
    </div>
  );
}

async function createHandsTracker() {
  try {
    return await createMotionTracker({
      delegate: "GPU",
      enableHands: true,
      enablePose: false,
      maxHands: 2,
    });
  } catch (error) {
    console.warn("GPU hand tracker failed; retrying on CPU.", error);
    return createMotionTracker({
      delegate: "CPU",
      enableHands: true,
      enablePose: false,
      maxHands: 2,
    });
  }
}

function createHandCycle(): HandCycle {
  return {
    baseline: null,
    phase: "searching",
    lastCountAt: 0,
  };
}

function getAngleDelta(first: number, second: number) {
  const diff = Math.abs(first - second) % 360;

  return diff > 180 ? 360 - diff : diff;
}

function getSignalCopy(signal: WateringSignals[MotionSide], count: number) {
  if (count >= 5) {
    return "Complete";
  }

  if (!signal.detected) {
    return "Looking";
  }

  return signal.fist ? "Ready" : "Open hand";
}

function getGuideHint(counts: WaterCounts, signals: WateringSignals) {
  if (counts.left >= 5 && counts.right >= 5) {
    return "Both hands are complete. Your bloom is being saved.";
  }

  const activeSide = counts.left <= counts.right ? "left" : "right";
  const signal = signals[activeSide];
  const label = activeSide === "left" ? "left" : "right";

  if (counts[activeSide] >= 5) {
    const otherSide = activeSide === "left" ? "right" : "left";

    return `${label} hand complete. Work on your ${otherSide} hand.`;
  }

  if (!signal.detected) {
    return `Show your ${label} fist to the camera.`;
  }

  if (!signal.fist) {
    return `Close your ${label} hand into a fist.`;
  }

  return `Twist your ${label} wrist, then return to center.`;
}

function shuffleSeeds(values: (typeof seedKeys)[number][]) {
  return values
    .map((value) => ({ value, sort: Math.random() }))
    .sort((first, second) => first.sort - second.sort)
    .map(({ value }) => value);
}
