"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition, type RefObject } from "react";
import { createMotionTracker } from "@/mediapipe/motion";
import type { MotionSide, MotionTracker } from "@/mediapipe/types";
import { getThumbTouchSignals, thumbTouchFingerNames, type ThumbTouchSignals } from "./thumbTouchRules";
import MovingBugStage from "./MovingBugStage";
import BugCaughtStage from "./BugCaughtStage";
import { completeBugHunt } from "./actions";

type CollectBugsGameClientProps = { mysteryBugs: readonly string[] };
type TouchCounts = Record<MotionSide, number>;
type TouchLatch = Record<MotionSide, boolean>;
type CompletionSnapshot = { sessionId: string; startedAtMs: number; totalAttempts: number };

const sides: MotionSide[] = ["left", "right"];
const requiredTouches = thumbTouchFingerNames.length;
const emptyCounts: TouchCounts = { left: 0, right: 0 };
const emptySignals: ThumbTouchSignals = {
  left: { detected: false, touching: false, confidence: 0 },
  right: { detected: false, touching: false, confidence: 0 },
};
const bugPeriodMs = 3400;
const centerWindow = 0.13;

export default function CollectBugsGameClient({ mysteryBugs }: CollectBugsGameClientProps) {
  const t = useTranslations("Games.collectBugs");
  const [selectedBug, setSelectedBug] = useState<number | null>(null);
  const [counts, setCounts] = useState<TouchCounts>(emptyCounts);
  const [signals, setSignals] = useState<ThumbTouchSignals>(emptySignals);
  const [bugPosition, setBugPosition] = useState(0);
  const [cameraStatus, setCameraStatus] = useState(t("cameraIdle"));
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [timingHint, setTimingHint] = useState(t("waitCentreHint"));
  const [cameraRunId, setCameraRunId] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackerRef = useRef<MotionTracker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef(0);
  const countsRef = useRef<TouchCounts>(emptyCounts);
  const latchesRef = useRef<TouchLatch>({ left: false, right: false });
  const lastSignalUiAtRef = useRef(0);
  const lastBugUiAtRef = useRef(0);
  const bugPositionRef = useRef(0);
  const sessionIdRef = useRef("");
  const runStartedAtRef = useRef(0);
  const attemptCountRef = useRef(0);
  const [completion, setCompletion] = useState<CompletionSnapshot | null>(null);
  const isChoosing = selectedBug === null;
  const isComplete = counts.left >= requiredTouches && counts.right >= requiredTouches;

  useEffect(() => {
    if (isComplete && !completion) {
      setCompletion({
        sessionId: sessionIdRef.current,
        startedAtMs: runStartedAtRef.current,
        totalAttempts: attemptCountRef.current,
      });
    }
  }, [completion, isComplete]);

  const registerTouch = useCallback((side: MotionSide) => {
    setCounts((current) => {
      if (current[side] >= requiredTouches) return current;
      const next = { ...current, [side]: current[side] + 1 };
      countsRef.current = next;
      return next;
    });
    setTimingHint(t("touchCounted", { side: t(side) }));
  }, [t]);

  const processSignals = useCallback((nextSignals: ThumbTouchSignals, timestampMs: number) => {
    sides.forEach((side) => {
      if (countsRef.current[side] >= requiredTouches) return;
      if (!nextSignals[side].touching) {
        latchesRef.current[side] = false;
        return;
      }
      if (latchesRef.current[side]) return;
      latchesRef.current[side] = true;
      attemptCountRef.current += 1;

      if (Math.abs(bugPositionRef.current) <= centerWindow) registerTouch(side);
      else setTimingHint(t("almostHint"));
    });

    if (timestampMs - lastSignalUiAtRef.current > 120) {
      lastSignalUiAtRef.current = timestampMs;
      setSignals(nextSignals);
    }
  }, [registerTouch, t]);

  useEffect(() => {
    if (isChoosing || isComplete) return;

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
        setCameraStatus(t("trackingTouches"));

        const detectFrame = () => {
          if (disposed || !videoRef.current) return;
          const timestampMs = performance.now();
          const position = getBugPosition(timestampMs);
          bugPositionRef.current = position;

          if (timestampMs - lastBugUiAtRef.current > 40) {
            lastBugUiAtRef.current = timestampMs;
            setBugPosition(position);
          }

          if (trackerRef.current && videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            const nextFingers = {
              left: thumbTouchFingerNames[Math.min(countsRef.current.left, requiredTouches - 1)],
              right: thumbTouchFingerNames[Math.min(countsRef.current.right, requiredTouches - 1)],
            };
            processSignals(getThumbTouchSignals(trackerRef.current.detectMotion(videoRef.current, timestampMs), nextFingers), timestampMs);
          }
          animationFrameRef.current = window.requestAnimationFrame(detectFrame);
        };
        detectFrame();
      } catch (error) {
        console.error("Collect Bugs camera setup failed.", error);
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
  }, [cameraRunId, isChoosing, isComplete, processSignals, t]);

  function startHunt(index: number) {
    countsRef.current = emptyCounts;
    latchesRef.current = { left: false, right: false };
    setCounts(emptyCounts);
    setSignals(emptySignals);
    setTimingHint(t("waitCentreHint"));
    sessionIdRef.current = crypto.randomUUID();
    runStartedAtRef.current = Date.now();
    attemptCountRef.current = 0;
    setCompletion(null);
    setSelectedBug(index);
  }

  return (
    <div className="watering-game">
      <header className="watering-header"><div><p>{t("gameLabel")}</p><h1>{t("title")}</h1></div><Link className="watering-secondary-link" href="/dashboard">{t("dashboard")}</Link></header>
      <section className={isChoosing || isComplete ? "watering-layout watering-layout-single" : "watering-playfield"} aria-live="polite">
        {isChoosing ? <BugPicker mysteryBugs={mysteryBugs} onSelect={startHunt} /> : isComplete && completion ? <BugRewardPanel bugAsset={mysteryBugs[selectedBug ?? 0]} sessionId={completion.sessionId} startedAtMs={completion.startedAtMs} totalAttempts={completion.totalAttempts} /> : <BugHuntPlayfield bugAsset={mysteryBugs[selectedBug ?? 0]} bugPosition={bugPosition} cameraError={cameraError} cameraStatus={cameraStatus} counts={counts} isComplete={isComplete} signals={signals} timingHint={timingHint} videoRef={videoRef} onRetryCamera={() => setCameraRunId((value) => value + 1)} />}
      </section>
    </div>
  );
}

function BugPicker({ mysteryBugs, onSelect }: { mysteryBugs: readonly string[]; onSelect: (index: number) => void }) {
  const t = useTranslations("Games.collectBugs");
  return <div className="watering-main-panel"><div className="watering-seed-stage"><div className="watering-stage-copy"><p>{t("mysteryBugs")}</p><h2>{t("chooseBug")}</h2></div><div className="watering-seed-grid" aria-label={t("chooseMysteryBug")}>{mysteryBugs.map((asset, index) => <button className="watering-seed-card" key={asset} onClick={() => onSelect(index)} type="button"><span className="collectbugs-question-mark" aria-hidden="true">?</span><strong>{t("bugNumber", { number: index + 1 })}</strong></button>)}</div></div></div>;
}

function BugRewardPanel({ bugAsset, sessionId, startedAtMs, totalAttempts }: { bugAsset: string; sessionId: string; startedAtMs: number; totalAttempts: number }) {
  const router = useRouter();
  const t = useTranslations("Games.collectBugs");
  const tErrors = useTranslations("Errors");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function saveAndReturn() {
    setError(null);
    startTransition(async () => {
      const result = await completeBugHunt(bugAsset, {
        sessionId,
        durationSeconds: (Date.now() - startedAtMs) / 1000,
        leftRepetitions: requiredTouches,
        rightRepetitions: requiredTouches,
        successfulActions: requiredTouches * 2,
        totalAttempts,
      });
      if (!result.ok) {
        setError(tErrors(result.errorCode));
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return <div className="watering-main-panel watering-reward-main-panel"><div className="watering-reward-panel"><BugCaughtStage bugAsset={bugAsset} /><div className="watering-reward-copy"><p>{t("bugCaught")}</p><h2>{formatBugName(bugAsset)}</h2><button className="watering-primary-link" disabled={isPending} onClick={saveAndReturn} type="button">{isPending ? t("savingBug") : t("backToGarden")}</button>{error ? <p className="collectbugs-reward-error">{error}</p> : null}</div></div></div>;
}

function formatBugName(bugAsset: string) {
  return bugAsset.replace(/\.glb$/i, "");
}

function BugHuntPlayfield({ bugAsset, bugPosition, cameraError, cameraStatus, counts, isComplete, signals, timingHint, videoRef, onRetryCamera }: { bugAsset: string; bugPosition: number; cameraError: string | null; cameraStatus: string; counts: TouchCounts; isComplete: boolean; signals: ThumbTouchSignals; timingHint: string; videoRef: RefObject<HTMLVideoElement | null>; onRetryCamera: () => void }) {
  const t = useTranslations("Games.collectBugs");
  const nextFingers = {
    left: thumbTouchFingerNames[Math.min(counts.left, requiredTouches - 1)],
    right: thumbTouchFingerNames[Math.min(counts.right, requiredTouches - 1)],
  };

  return <>
    <div className="watering-camera-column"><section className="watering-camera-panel"><div className="watering-panel-heading"><p>{t("webcam")}</p><h2>{t("showHands")}</h2></div><div className="watering-video-wrap"><video ref={videoRef} className="watering-video" muted playsInline aria-label={t("webcamLabel")} /></div><div className="watering-camera-footer"><span>{cameraStatus}</span>{cameraError ? <button className="watering-text-button" onClick={onRetryCamera} type="button">{t("retryCamera")}</button> : null}</div>{cameraError ? <p className="watering-error">{cameraError}</p> : null}</section></div>
    <section className="watering-sprout-panel"><div className="watering-sprout-heading"><p>{t("liveGrowth")}</p><h2>{isComplete ? t("bugFound") : t("timeTouch")}</h2></div><div className="watering-sprout-stage-shell collectbugs-log-stage"><span className="collectbugs-stump-grass collectbugs-stump-grass-left" aria-hidden="true" /><span className="collectbugs-stump-grass collectbugs-stump-grass-right" aria-hidden="true" /><div className="collectbugs-log" aria-hidden="true"><span className="collectbugs-log-bark" /><span className="collectbugs-log-end"><i /></span><span className="collectbugs-log-moss" /></div><MovingBugStage bugAsset={bugAsset} position={bugPosition} /><span className="collectbugs-centre-marker" aria-hidden="true" /><p>{isComplete ? t("roundsComplete") : timingHint}</p></div></section>
    <div className="watering-side-column"><aside className="watering-progress-panel"><div><p className="watering-panel-kicker">{t("bugFinder")}</p><h2>{t("thumbTouches")}</h2></div><div className="watering-progress-list">{sides.map((side) => <div className="watering-progress-row" key={side}><div><span>{t(side)}</span><strong>{counts[side]}/{requiredTouches}</strong></div><div className="watering-progress-track" aria-hidden="true"><span style={{ width: `${(counts[side] / requiredTouches) * 100}%` }} /></div><p>{counts[side] >= requiredTouches ? t("complete") : t("touchFinger", { finger: t(`finger.${nextFingers[side]}`), detected: signals[side].touching ? t("touchDetected") : "" })}</p></div>)}</div></aside><aside className="watering-guide-panel"><div><p className="watering-panel-kicker">{t("howToPlay")}</p><h2>{t("thumbTouchTiming")}</h2></div><ol className="watering-guide-steps"><li><span className="collectbugs-guide-icon" aria-hidden="true">1</span><div><strong>{t("followOrder")}</strong><p>{t("fingerOrder")}</p></div></li><li><span className="collectbugs-guide-icon" aria-hidden="true">2</span><div><strong>{t("waitCentre")}</strong><p>{t("waitCentreDescription")}</p></div></li><li><span className="collectbugs-guide-icon" aria-hidden="true">3</span><div><strong>{t("repeatHands")}</strong><p>{t("repeatHandsDescription", { count: requiredTouches })}</p></div></li></ol><div className="watering-live-hint"><strong>{t("now")}</strong><p>{timingHint}</p></div></aside></div>
  </>;
}

async function createHandsTracker() {
  try { return await createMotionTracker({ delegate: "GPU", enableHands: true, enablePose: false, maxHands: 2 }); }
  catch (error) { console.warn("GPU hand tracker failed; retrying on CPU.", error); return createMotionTracker({ delegate: "CPU", enableHands: true, enablePose: false, maxHands: 2 }); }
}

function getBugPosition(timestampMs: number) {
  return Math.sin(((timestampMs % bugPeriodMs) / bugPeriodMs) * Math.PI * 2);
}
