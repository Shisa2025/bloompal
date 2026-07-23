"use client";

import Link from "next/link";
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
  tableFlowerAsset,
}: {
  caughtBugs: { id: string; bugAsset: string; isActive: boolean }[];
  tableFlowerAsset: string | null;
}) {
  const [counts, setCounts] = useState<Counts>(emptyCounts);
  const [signals, setSignals] = useState<ThumbFlexSignals>(emptySignals);
  const [cameraStatus, setCameraStatus] = useState("Camera idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraRunId, setCameraRunId] = useState(0);
  const [snapshotTaken, setSnapshotTaken] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
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
  const isComplete = counts.left >= requiredReps && counts.right >= requiredReps;
  // Keep this reference stable while the hand-tracking UI updates. Otherwise
  // the embedded Three.js dashboard is torn down and rebuilt every frame.
  const activeBugs = useMemo(() => caughtBugs.filter((bug) => bug.isActive), [caughtBugs]);

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
    if (!isComplete || snapshotSavingRef.current) return;
    snapshotSavingRef.current = true;
    const timer = window.setTimeout(() => {
      const sourceCanvas = stageRef.current?.querySelector("canvas");
      const snapshotCanvas = document.createElement("canvas");
      snapshotCanvas.width = 480;
      snapshotCanvas.height = 270;
      const context = snapshotCanvas.getContext("2d");
      if (!sourceCanvas || !context) {
        setSnapshotError("Could not capture the garden scene.");
        return;
      }
      context.drawImage(sourceCanvas, 0, 0, snapshotCanvas.width, snapshotCanvas.height);
      void saveGardenSnapshot(snapshotCanvas.toDataURL("image/jpeg", 0.76)).then((result) => {
        if (!result.ok) { setSnapshotError(result.error); return; }
        setSnapshotTaken(true);
      });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [isComplete]);

  useEffect(() => {
    if (snapshotTaken) return;
    let disposed = false;
    let videoElement: HTMLVideoElement | null = null;

    async function startCamera() {
      const video = videoRef.current;
      if (!video) return;
      videoElement = video;
      setCameraStatus("Starting camera");
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
        setCameraStatus("Loading hand tracker");
        const tracker = await createHandsTracker();
        if (disposed) {
          tracker.disposeMotionTracker();
          return;
        }
        trackerRef.current = tracker;
        setCameraStatus("Tracking thumb flexes");
        const detectFrame = () => {
          if (disposed || !videoRef.current || !trackerRef.current) return;
          if (videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            const timestampMs = performance.now();
            processSignals(getThumbFlexSignals(trackerRef.current.detectMotion(videoRef.current, timestampMs)), timestampMs);
          }
          animationFrameRef.current = window.requestAnimationFrame(detectFrame);
        };
        detectFrame();
      } catch (error) {
        setCameraStatus("Camera unavailable");
        setCameraError(error instanceof Error ? error.message : "Could not start camera or hand tracking.");
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
  }, [cameraRunId, processSignals, snapshotTaken]);

  return (
    <div className="watering-game">
      <header className="watering-header">
        <div><p>BloomPal Game</p><h1>Take a Snapshot</h1></div>
        <Link className="watering-secondary-link" href="/dashboard">Dashboard</Link>
      </header>
      <section className="watering-playfield" aria-live="polite">
        <div className="watering-camera-column">
          <section className="watering-camera-panel">
            <div className="watering-panel-heading"><p>Webcam</p><h2>Show your hands</h2></div>
            <div className="watering-video-wrap"><video ref={videoRef} className="watering-video" muted playsInline aria-label="Snapshot game webcam" /></div>
            <div className="watering-camera-footer"><span>{cameraStatus}</span>{cameraError ? <button className="watering-text-button" onClick={() => setCameraRunId((value) => value + 1)} type="button">Retry camera</button> : null}</div>
            {cameraError ? <p className="watering-error">{cameraError}</p> : null}
          </section>
        </div>
        <section className="watering-sprout-panel">
          <div className="watering-sprout-heading"><p>Live growth</p><h2>{snapshotTaken ? "Snapshot taken!" : "Frame your garden"}</h2></div>
          <div ref={stageRef} className={["watering-sprout-stage-shell", "snapshot-garden-stage", snapshotTaken ? "is-captured" : ""].join(" ")}>
            <DashboardHomeScene caughtBugs={activeBugs} embedded tableFlowerAsset={tableFlowerAsset} />
            {snapshotTaken ? <div className="snapshot-captured-overlay"><span aria-hidden="true">&#128247;</span><strong>Garden snapshot captured</strong></div> : null}
          </div>
          {snapshotError ? <p className="watering-error">{snapshotError}</p> : null}
        </section>
        <div className="watering-side-column">
          <aside className="watering-progress-panel">
            <div><p className="watering-panel-kicker">Snapshot count</p><h2>Thumb flex</h2></div>
            <div className="watering-progress-list">{sides.map((side) => <ProgressRow counts={counts} key={side} side={side} signals={signals} />)}</div>
          </aside>
          <aside className="watering-guide-panel">
            <div><p className="watering-panel-kicker">How to play</p><h2>Out, in, repeat</h2></div>
            <ol className="watering-guide-steps">
              <li><span className="collectbugs-guide-icon" aria-hidden="true">1</span><div><strong>Show one hand</strong><p>Keep either hand clearly visible to the camera.</p></div></li>
              <li><span className="collectbugs-guide-icon" aria-hidden="true">2</span><div><strong>Extend your thumb</strong><p>Move it away from your palm.</p></div></li>
              <li><span className="collectbugs-guide-icon" aria-hidden="true">3</span><div><strong>Bring it back in</strong><p>Tuck the thumb toward your palm. Repeat three times per hand.</p></div></li>
            </ol>
            <div className="watering-live-hint"><strong>Now</strong><p>{getHint(counts, signals, snapshotTaken)}</p></div>
          </aside>
        </div>
      </section>
    </div>
  );
}

function ProgressRow({ counts, side, signals }: { counts: Counts; side: MotionSide; signals: ThumbFlexSignals }) {
  const signal = signals[side];
  const status = counts[side] >= requiredReps ? "Complete" : !signal.detected ? "Looking" : signal.extended ? "Bring thumb in" : signal.flexed ? "Extend again" : "Extend thumb";
  return <div className="watering-progress-row"><div><span>{side === "left" ? "Left" : "Right"}</span><strong>{counts[side]}/{requiredReps}</strong></div><div className="watering-progress-track" aria-hidden="true"><span style={{ width: `${(counts[side] / requiredReps) * 100}%` }} /></div><p>{status}</p></div>;
}

function getHint(counts: Counts, signals: ThumbFlexSignals, snapshotTaken: boolean) {
  if (snapshotTaken) return "Your garden moment has been captured.";
  const side = counts.left < requiredReps ? "left" : "right";
  const signal = signals[side];
  if (!signal.detected) return `Show your ${side} hand to the camera.`;
  if (signal.extended) return `Bring your ${side} thumb in toward your palm.`;
  return `Extend your ${side} thumb away from your palm.`;
}

async function createHandsTracker() {
  try {
    return await createMotionTracker({ delegate: "GPU", enableHands: true, enablePose: false, maxHands: 2 });
  } catch (error) {
    console.warn("GPU hand tracker failed; retrying on CPU.", error);
    return createMotionTracker({ delegate: "CPU", enableHands: true, enablePose: false, maxHands: 2 });
  }
}
