"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
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
import {
  createWateringMomentumState,
  getCombinedWateringPercent,
  getDisplayedWateringPercent,
  shouldRunWateringInference,
  updateWateringMomentum,
  type WateringMomentumState,
} from "./wateringMomentum";
import { getCatalogAssetBySource } from "@/lib/asset-catalog";

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

type WateringPercentages = Record<MotionSide, number>;
type WaterBurst = {
  id: number;
  side: MotionSide;
};

const seedKeys = ["mystery-a", "mystery-b", "mystery-c"] as const;
const sides: MotionSide[] = ["left", "right"];
const emptyPercentages: WateringPercentages = { left: 0, right: 0 };
const emptySignals: WateringSignals = {
  left: { detected: false, fist: false, angleDegrees: 0, confidence: 0 },
  right: { detected: false, fist: false, angleDegrees: 0, confidence: 0 },
};

export default function WateringGameClient({
  initialPlant,
}: WateringGameClientProps) {
  const t = useTranslations("Games.watering");
  const tErrors = useTranslations("Errors");
  const [plant, setPlant] = useState<WateringPlant | null>(initialPlant);
  const [phase, setPhase] = useState<GamePhase>(
    initialPlant ? "watering" : "choosing",
  );
  const [momentumPercent, setMomentumPercent] = useState<WateringPercentages>(emptyPercentages);
  const [signals, setSignals] = useState<WateringSignals>(emptySignals);
  const [cameraStatus, setCameraStatus] = useState(t("cameraIdle"));
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [bursts, setBursts] = useState<WaterBurst[]>([]);
  const [cameraRunId, setCameraRunId] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackerRef = useRef<MotionTracker | null>(null);
  const animationFrameRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const momentumStateRef = useRef<Record<MotionSide, WateringMomentumState>>({
    left: createWateringMomentumState(),
    right: createWateringMomentumState(),
  });
  const displayedMomentumRef = useRef<WateringPercentages>(emptyPercentages);
  const nextBurstAtRef = useRef<WateringPercentages>({ left: 10, right: 10 });
  const uiSignalsRef = useRef<WateringSignals>(emptySignals);
  const burstIdRef = useRef(0);
  const completingRef = useRef(false);
  const sessionIdRef = useRef("");
  const runStartedAtRef = useRef(0);
  const seedOrder = useMemo(() => shuffleSeeds([...seedKeys]), []);

  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = crypto.randomUUID();
      runStartedAtRef.current = Date.now();
    }
  }, []);

  const resetRunProgress = useCallback(() => {
    setMomentumPercent(emptyPercentages);
    displayedMomentumRef.current = emptyPercentages;
    momentumStateRef.current = {
      left: createWateringMomentumState(),
      right: createWateringMomentumState(),
    };
    nextBurstAtRef.current = { left: 10, right: 10 };
    uiSignalsRef.current = emptySignals;
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

  const processSignals = useCallback(
    (nextSignals: WateringSignals, timestampMs: number) => {
      const nextDisplayed = { ...displayedMomentumRef.current };
      let displayChanged = false;

      sides.forEach((side) => {
        const signal = nextSignals[side];
        if (momentumStateRef.current[side].progress < 100) {
          const result = updateWateringMomentum(
            momentumStateRef.current[side],
            signal,
            timestampMs,
          );
          momentumStateRef.current[side] = result.state;
          const displayed = getDisplayedWateringPercent(result.state.progress);
          if (displayed !== nextDisplayed[side]) {
            nextDisplayed[side] = displayed;
            displayChanged = true;
          }

          while (
            result.state.progress >= nextBurstAtRef.current[side] &&
            nextBurstAtRef.current[side] <= 100
          ) {
            addWaterBurst(side);
            nextBurstAtRef.current[side] += 10;
          }
        }
      });

      if (displayChanged) {
        displayedMomentumRef.current = nextDisplayed;
        setMomentumPercent(nextDisplayed);
      }

      const signalStateChanged = sides.some((side) =>
        uiSignalsRef.current[side].detected !== nextSignals[side].detected ||
        uiSignalsRef.current[side].fist !== nextSignals[side].fist
      );
      if (signalStateChanged) {
        uiSignalsRef.current = nextSignals;
        setSignals(nextSignals);
      }
    },
    [addWaterBurst],
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
      leftMomentumPercent: displayedMomentumRef.current.left,
      rightMomentumPercent: displayedMomentumRef.current.right,
    });

    if (!result.ok) {
      completingRef.current = false;
      setActionError(tErrors(result.errorCode));
      setPhase("complete-error");
      return;
    }

    setPlant(result.plant);
    setPhase("reward");
  }, [plant, tErrors]);

  useEffect(() => {
    if (
      phase === "watering" &&
      momentumPercent.left >= 100 &&
      momentumPercent.right >= 100
    ) {
      const timer = window.setTimeout(() => {
        void finishWatering();
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [finishWatering, momentumPercent, phase]);

  useEffect(() => {
    if (phase !== "watering" || !plant) {
      return;
    }

    let disposed = false;
    let videoElement: HTMLVideoElement | null = null;
    let lastVideoTime = -1;
    let lastInferenceAtMs = Number.NEGATIVE_INFINITY;

    async function startCamera() {
      const video = videoRef.current;

      if (!video) {
        return;
      }

      videoElement = video;
      setCameraStatus(t("startingCamera"));
      setCameraError(null);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            width: { ideal: 640 },
            height: { ideal: 360 },
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

        setCameraStatus(t("loadingTracker"));

        const tracker = await createHandsTracker();

        if (disposed) {
          tracker.disposeMotionTracker();
          return;
        }

        trackerRef.current = tracker;
        setCameraStatus(t("trackingHands"));

        const detectFrame = (timestampMs: number) => {
          if (disposed || !trackerRef.current || !videoRef.current) {
            return;
          }

          if (
            videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
            shouldRunWateringInference({
              videoTime: videoRef.current.currentTime,
              lastVideoTime,
              timestampMs,
              lastInferenceAtMs,
            })
          ) {
            lastVideoTime = videoRef.current.currentTime;
            lastInferenceAtMs = timestampMs;
            const result = trackerRef.current.detectMotion(videoRef.current, timestampMs);

            processSignals(getWateringSignals(result), timestampMs);
          }

          animationFrameRef.current = window.requestAnimationFrame(detectFrame);
        };

        animationFrameRef.current = window.requestAnimationFrame(detectFrame);
      } catch (error) {
        console.error("Watering camera setup failed.", error);
        setCameraStatus(t("cameraUnavailable"));
        setCameraError(t("cameraStartFailed"));
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
  }, [cameraRunId, phase, plant, processSignals, t]);

  const handleSeedSelect = async (seedKey: (typeof seedKeys)[number]) => {
    setPhase("starting");
    setActionError(null);

    const result = await selectMysterySeed(seedKey);

    if (!result.ok) {
      setActionError(tErrors(result.errorCode));
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
          <p>{t("gameLabel")}</p>
          <h1>{t("title")}</h1>
        </div>
        <Link className="watering-secondary-link" href="/dashboard">
          {t("dashboard")}
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
            momentumPercent={momentumPercent}
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
  momentumPercent,
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
  momentumPercent: WateringPercentages;
  phase: GamePhase;
  signals: WateringSignals;
  onRetryCamera: () => void;
  onRetryComplete: () => void;
  videoRef: RefObject<HTMLVideoElement | null>;
}) {
  const t = useTranslations("Games.watering");
  const growthPercent = getCombinedWateringPercent(
    momentumPercent.left,
    momentumPercent.right,
  );

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
          <p>{t("liveGrowth")}</p>
          <h2>{growthPercent >= 100 ? t("readyToBloom") : t("keepWatering")}</h2>
        </div>
        <SproutFeedbackStage progress={growthPercent} waterBursts={bursts} />
      </div>

      <div className="watering-side-column">
        <ProgressPanel momentumPercent={momentumPercent} phase={phase} signals={signals} />
        <GestureGuidePanel momentumPercent={momentumPercent} signals={signals} />
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
  const t = useTranslations("Games.watering");
  return (
    <div className="watering-seed-stage">
      <div className="watering-stage-copy">
        <p>{t("mysterySeeds")}</p>
        <h2>{t("chooseSeed")}</h2>
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
            <strong>{t("seedNumber", { number: index + 1 })}</strong>
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
  const t = useTranslations("Games.watering");
  return (
    <div className="watering-camera-panel">
      <div className="watering-panel-heading">
        <p>{t("webcam")}</p>
        <h2>{t("showHands")}</h2>
      </div>
      <div className="watering-video-wrap">
        <video
          ref={videoRef}
          className="watering-video"
          muted
          playsInline
          aria-label={t("webcamLabel")}
        />
        {phase === "completing" ? (
          <div className="watering-overlay-message">{t("savingBloom")}</div>
        ) : null}
      </div>

      <div className="watering-camera-footer">
        <span>{cameraStatus}</span>
        {cameraError ? (
          <button className="watering-text-button" onClick={onRetryCamera} type="button">
            {t("retryCamera")}
          </button>
        ) : null}
        {phase === "complete-error" ? (
          <button
            className="watering-text-button"
            onClick={onRetryComplete}
            type="button"
          >
            {t("retrySave")}
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
  momentumPercent,
  phase,
  signals,
}: {
  momentumPercent: WateringPercentages;
  phase: GamePhase;
  signals: WateringSignals;
}) {
  const t = useTranslations("Games.watering");
  return (
    <aside className="watering-progress-panel">
      <div>
        <p className="watering-panel-kicker">{t("waterLevel")}</p>
        <h2>{phase === "reward" ? t("bloomUnlocked") : t("wristWatering")}</h2>
      </div>

      <div className="watering-progress-list">
        {sides.map((side) => (
          <div className="watering-progress-row" key={side}>
            <div>
              <span>{side === "left" ? t("left") : t("right")}</span>
              <strong>{momentumPercent[side]}%</strong>
            </div>
            <div
              aria-label={t("momentumProgressLabel", { side: t(side) })}
              aria-valuemax={100}
              aria-valuemin={0}
              aria-valuenow={momentumPercent[side]}
              className="watering-progress-track"
              role="progressbar"
            >
              <span style={{ width: `${momentumPercent[side]}%` }} />
            </div>
            <p>{getSignalCopy(signals[side], momentumPercent[side], t)}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}

function GestureGuidePanel({
  momentumPercent,
  signals,
}: {
  momentumPercent: WateringPercentages;
  signals: WateringSignals;
}) {
  const t = useTranslations("Games.watering");
  return (
    <aside className="watering-guide-panel">
      <div>
        <p className="watering-panel-kicker">{t("howToPlay")}</p>
        <h2>{t("fistTwistReturn")}</h2>
      </div>

      <ol className="watering-guide-steps">
        <li>
          <span className="watering-gesture-icon watering-gesture-icon-fist" aria-hidden="true">
            <span />
          </span>
          <div>
            <strong>{t("makeFist")}</strong>
            <p>{t("makeFistDescription")}</p>
          </div>
        </li>
        <li>
          <span className="watering-gesture-icon watering-gesture-icon-twist" aria-hidden="true">
            <span />
          </span>
          <div>
            <strong>{t("twistWrist")}</strong>
            <p>{t("twistWristDescription")}</p>
          </div>
        </li>
        <li>
          <span className="watering-gesture-icon watering-gesture-icon-return" aria-hidden="true">
            <span />
          </span>
          <div>
            <strong>{t("keepMoving")}</strong>
            <p>{t("keepMovingDescription")}</p>
          </div>
        </li>
      </ol>

      <div className="watering-live-hint">
        <strong>{t("now")}</strong>
        <p>{getGuideHint(momentumPercent, signals, t)}</p>
      </div>
    </aside>
  );
}

function RewardPanel({ flowerAsset }: { flowerAsset: string }) {
  const t = useTranslations("Games.watering");
  const tAssets = useTranslations("Assets");
  const catalogAsset = getCatalogAssetBySource("flower", flowerAsset);
  return (
    <div className="watering-reward-panel">
      <FlowerRewardStage flowerAsset={flowerAsset} />
      <div className="watering-reward-copy">
        <p>{t("bloomReward")}</p>
        <h2>{catalogAsset ? tAssets(catalogAsset.nameKey) : flowerAsset}</h2>
        <Link className="watering-primary-link" href="/dashboard">
          {t("backToGarden")}
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

type WateringTranslator = ReturnType<typeof useTranslations<"Games.watering">>;

function getSignalCopy(signal: WateringSignals[MotionSide], percent: number, t: WateringTranslator) {
  if (percent >= 100) {
    return t("complete");
  }

  if (!signal.detected) {
    return t("looking");
  }

  return signal.fist ? t("ready") : t("openHand");
}

function getGuideHint(momentumPercent: WateringPercentages, signals: WateringSignals, t: WateringTranslator) {
  if (momentumPercent.left >= 100 && momentumPercent.right >= 100) {
    return t("bothHandsComplete");
  }

  const activeSide = momentumPercent.left <= momentumPercent.right ? "left" : "right";
  const signal = signals[activeSide];
  const label = activeSide === "left" ? "left" : "right";

  if (!signal.detected) {
    return t("showFist", { side: t(label) });
  }

  if (!signal.fist) {
    return t("closeHand", { side: t(label) });
  }

  return t("twistHint", {
    side: t(label),
    percent: momentumPercent[activeSide],
  });
}

function shuffleSeeds(values: (typeof seedKeys)[number][]) {
  return values
    .map((value) => ({ value, sort: Math.random() }))
    .sort((first, second) => first.sort - second.sort)
    .map(({ value }) => value);
}
