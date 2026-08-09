"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DashboardHomeScene from "@/app/dashboard/components/DashboardHomeScene";
import { createMotionTracker } from "@/mediapipe/motion";
import type { MotionSide, MotionTracker } from "@/mediapipe/types";
import { getThumbFlexSignals, type ThumbFlexSignals } from "./thumbFlexRules";
import { saveGardenSnapshot } from "./actions";

type Counts = Record<MotionSide, number>;
type FlexCycle = Record<MotionSide, "extend" | "flex" | "cooldown">;

const sides: MotionSide[] = ["left", "right"];
const requiredReps = 3;
const emptyCounts: Counts = { left: 0, right: 0 };
const emptySignals: ThumbFlexSignals = {
  left: { detected: false, palmFacing: false, extended: false, flexed: false },
  right: { detected: false, palmFacing: false, extended: false, flexed: false },
};

export default function SnapshotGameClient({
  caughtBugs,
  fruits,
  tableFlowerAsset,
}: {
  caughtBugs: { id: string; bugAsset: string; isActive: boolean }[];
  fruits: { id: string; fruitKind: string; createdAt: string }[];
  tableFlowerAsset: string | null;
}) {
  const router = useRouter();
  const t = useTranslations("Games.snapshot");
  const tErrors = useTranslations("Errors");
  const [counts, setCounts] = useState<Counts>(emptyCounts);
  const [signals, setSignals] = useState<ThumbFlexSignals>(emptySignals);
  const [cameraStatus, setCameraStatus] = useState(t("cameraIdle"));
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraRunId, setCameraRunId] = useState(0);
  const [snapshotTaken, setSnapshotTaken] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackerRef = useRef<MotionTracker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef(0);
  const countsRef = useRef<Counts>(emptyCounts);
  const cyclesRef = useRef<FlexCycle>({ left: "extend", right: "extend" });
  const lastCountAtRef = useRef<Record<MotionSide, number>>({ left: 0, right: 0 });
  const lastSignalUiAtRef = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const snapshotSavingRef = useRef(false);
  const sessionIdRef = useRef("");
  const runStartedAtRef = useRef(0);
  const isComplete = counts.left >= requiredReps && counts.right >= requiredReps;
  // Keep this reference stable while the hand-tracking UI updates. Otherwise
  // the embedded Three.js dashboard is torn down and rebuilt every frame.
  const activeBugs = useMemo(() => caughtBugs.filter((bug) => bug.isActive), [caughtBugs]);
  const handleSceneReady = useCallback(() => setSceneReady(true), []);

  useEffect(() => {
    sessionIdRef.current = crypto.randomUUID();
    runStartedAtRef.current = Date.now();
  }, []);

  const processSignals = useCallback((nextSignals: ThumbFlexSignals, timestampMs: number) => {
    sides.forEach((side) => {
      if (countsRef.current[side] >= requiredReps) return;
      const signal = nextSignals[side];
      if (!signal.detected) {
        cyclesRef.current[side] = "extend";
        return;
      }
      if (cyclesRef.current[side] === "extend" && signal.extended) {
        cyclesRef.current[side] = "flex";
        return;
      }
      if (
        cyclesRef.current[side] === "flex" &&
        signal.flexed &&
        timestampMs - lastCountAtRef.current[side] > 500
      ) {
        lastCountAtRef.current[side] = timestampMs;
        cyclesRef.current[side] = "cooldown";
        setCounts((current) => {
          const next = { ...current, [side]: Math.min(requiredReps, current[side] + 1) };
          countsRef.current = next;
          return next;
        });
        return;
      }
      if (cyclesRef.current[side] === "cooldown" && !signal.flexed) {
        cyclesRef.current[side] = "extend";
      }
    });

    if (timestampMs - lastSignalUiAtRef.current > 120) {
      lastSignalUiAtRef.current = timestampMs;
      setSignals(nextSignals);
    }
  }, []);

  useEffect(() => {
    if (!isComplete || !sceneReady || snapshotSavingRef.current) return;
    snapshotSavingRef.current = true;
    const timer = window.setTimeout(() => {
      const sourceCanvas = stageRef.current?.querySelector("canvas");
      const snapshotCanvas = document.createElement("canvas");
      snapshotCanvas.width = 480;
      snapshotCanvas.height = 270;
      const context = snapshotCanvas.getContext("2d");
      if (!sourceCanvas || !context) {
        setSnapshotError(tErrors("captureSceneFailed"));
        return;
      }
      drawCanvasCover(context, sourceCanvas, snapshotCanvas.width, snapshotCanvas.height);
      void saveGardenSnapshot(snapshotCanvas.toDataURL("image/jpeg", 0.76), {
        sessionId: sessionIdRef.current,
        durationSeconds: (Date.now() - runStartedAtRef.current) / 1000,
        leftRepetitions: countsRef.current.left,
        rightRepetitions: countsRef.current.right,
      }).then((result) => {
        if (!result.ok) { setSnapshotError(tErrors(result.errorCode)); return; }
        setSnapshotTaken(true);
        router.replace("/dashboard");
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [isComplete, router, sceneReady, tErrors]);

  useEffect(() => {
    if (snapshotTaken) return;
    let disposed = false;
    let videoElement: HTMLVideoElement | null = null;

    async function startCamera() {
      const video = videoRef.current;
      if (!video) return;
      videoElement = video;
      setCameraStatus(t("startingCamera"));
      setCameraError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { width: { ideal: 960 }, height: { ideal: 540 }, facingMode: "user" },
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
        setCameraStatus(t("trackingFlexes"));
        const detectFrame = () => {
          if (disposed || !videoRef.current || !trackerRef.current) return;
          if (videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            const timestampMs = performance.now();
            processSignals(getThumbFlexSignals(trackerRef.current.detectMotion(videoRef.current, timestampMs)), timestampMs);
          }
          animationFrameRef.current = window.requestAnimationFrame(detectFrame);
        };
        detectFrame();
      } catch {
        setCameraStatus(t("cameraUnavailable"));
        setCameraError(t("cameraStartFailed"));
      }
    }
    void startCamera();
    return () => {
      disposed = true;
      window.cancelAnimationFrame(animationFrameRef.current);
      trackerRef.current?.disposeMotionTracker();
      trackerRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoElement) videoElement.srcObject = null;
    };
  }, [cameraRunId, processSignals, snapshotTaken, t]);

  return (
    <div className="watering-game">
      <header className="watering-header">
        <div><p>{t("gameLabel")}</p><h1>{t("title")}</h1></div>
        <Link className="watering-secondary-link" href="/dashboard">{t("dashboard")}</Link>
      </header>
      <section className="watering-playfield" aria-live="polite">
        <div className="watering-camera-column">
          <section className="watering-camera-panel">
            <div className="watering-panel-heading"><p>{t("webcam")}</p><h2>{t("showHands")}</h2></div>
            <div className="watering-video-wrap"><video ref={videoRef} className="watering-video" muted playsInline aria-label={t("webcamLabel")} /></div>
            <div className="watering-camera-footer"><span>{cameraStatus}</span>{cameraError ? <button className="watering-text-button" onClick={() => setCameraRunId((value) => value + 1)} type="button">{t("retryCamera")}</button> : null}</div>
            {cameraError ? <p className="watering-error">{cameraError}</p> : null}
          </section>
        </div>
        <section className="watering-sprout-panel">
          <div className="watering-sprout-heading"><p>{t("liveGrowth")}</p><h2>{snapshotTaken ? t("snapshotTaken") : t("frameGarden")}</h2></div>
          <div ref={stageRef} className={["watering-sprout-stage-shell", "snapshot-garden-stage", snapshotTaken ? "is-captured" : ""].join(" ")}>
            <DashboardHomeScene caughtBugs={activeBugs} embedded fruits={fruits} onSceneReady={handleSceneReady} tableFlowerAsset={tableFlowerAsset} />
            {snapshotTaken ? <div className="snapshot-captured-overlay"><span aria-hidden="true">&#128247;</span><strong>{t("captured")}</strong></div> : null}
          </div>
          {snapshotError ? <p className="watering-error">{snapshotError}</p> : null}
        </section>
        <div className="watering-side-column">
          <aside className="watering-progress-panel">
            <div><p className="watering-panel-kicker">{t("snapshotCount")}</p><h2>{t("thumbFlex")}</h2></div>
            <div className="watering-progress-list">{sides.map((side) => <ProgressRow counts={counts} key={side} side={side} signals={signals} />)}</div>
          </aside>
          <aside className="watering-guide-panel">
            <div><p className="watering-panel-kicker">{t("howToPlay")}</p><h2>{t("outInRepeat")}</h2></div>
            <ol className="watering-guide-steps">
              <li><span className="collectbugs-guide-icon" aria-hidden="true">1</span><div><strong>{t("showOneHand")}</strong><p>{t("showOneHandDescription")}</p></div></li>
              <li><span className="collectbugs-guide-icon" aria-hidden="true">2</span><div><strong>{t("extendThumb")}</strong><p>{t("extendThumbDescription")}</p></div></li>
              <li><span className="collectbugs-guide-icon" aria-hidden="true">3</span><div><strong>{t("bringBack")}</strong><p>{t("bringBackDescription", { count: requiredReps })}</p></div></li>
            </ol>
            <div className="watering-live-hint"><strong>{t("now")}</strong><p>{getHint(counts, signals, snapshotTaken, t)}</p></div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function drawCanvasCover(
  context: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number,
) {
  const sourceAspect = source.width / source.height;
  const targetAspect = targetWidth / targetHeight;
  let sourceWidth = source.width;
  let sourceHeight = source.height;
  let sourceX = 0;
  let sourceY = 0;

  if (sourceAspect > targetAspect) {
    sourceWidth = source.height * targetAspect;
    sourceX = (source.width - sourceWidth) / 2;
  } else if (sourceAspect < targetAspect) {
    sourceHeight = source.width / targetAspect;
    sourceY = (source.height - sourceHeight) / 2;
  }

  context.drawImage(
    source,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    targetWidth,
    targetHeight,
  );
}

function ProgressRow({ counts, side, signals }: { counts: Counts; side: MotionSide; signals: ThumbFlexSignals }) {
  const t = useTranslations("Games.snapshot");
  const signal = signals[side];
  const status = counts[side] >= requiredReps ? t("complete") : !signal.detected ? t("looking") : signal.extended ? t("bringThumbIn") : signal.flexed ? t("extendAgain") : t("extendThumb");
  return <div className="watering-progress-row"><div><span>{t(side)}</span><strong>{counts[side]}/{requiredReps}</strong></div><div className="watering-progress-track" aria-hidden="true"><span style={{ width: `${(counts[side] / requiredReps) * 100}%` }} /></div><p>{status}</p></div>;
}

type SnapshotTranslator = ReturnType<typeof useTranslations<"Games.snapshot">>;

function getHint(counts: Counts, signals: ThumbFlexSignals, snapshotTaken: boolean, t: SnapshotTranslator) {
  if (snapshotTaken) return t("momentCaptured");
  const side = counts.left < requiredReps ? "left" : "right";
  const signal = signals[side];
  if (!signal.detected) return t("showSide", { side: t(side) });
  if (signal.extended) return t("bringSideIn", { side: t(side) });
  return t("extendSide", { side: t(side) });
}

async function createHandsTracker() {
  try {
    return await createMotionTracker({ delegate: "GPU", enableHands: true, enablePose: false, maxHands: 2 });
  } catch (error) {
    console.warn("GPU hand tracker failed; retrying on CPU.", error);
    return createMotionTracker({ delegate: "CPU", enableHands: true, enablePose: false, maxHands: 2 });
  }
}
