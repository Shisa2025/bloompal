"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition, type RefObject } from "react";
import FishModel from "@/app/components/FishModel";
import { createMotionTracker } from "@/mediapipe/motion";
import type { MotionSide, MotionTracker } from "@/mediapipe/types";
import { getFishAssetPath, type FishKind } from "@/lib/fish-assets";
import { getCatalogAssetBySource } from "@/lib/asset-catalog";
import { getFishingSignals, type FishingHandSignal, type FishingSignals } from "./fishingRules";
import { saveCaughtFish } from "./actions";

type Point = { x: number; y: number };
type Counts = Record<MotionSide, number>;
type Completion = { sessionId: string; startedAtMs: number; attempts: number };

const sides: MotionSide[] = ["left", "right"];
const requiredSets = 3;
const totalFish = requiredSets * sides.length;
const hitRadius = 0.115;
const netBounds = { left: 0.32, right: 0.68, top: 0.02, bottom: 0.29 };
const emptyCounts: Counts = { left: 0, right: 0 };
const emptySignals: FishingSignals = {
  left: { detected: false, fist: false, x: 0.35, y: 0.5, confidence: 0 },
  right: { detected: false, fist: false, x: 0.65, y: 0.5, confidence: 0 },
};
export default function CatchFishGameClient({ fishKinds }: { fishKinds: readonly FishKind[] }) {
  const router = useRouter();
  const t = useTranslations("Games.catchFish");
  const tErrors = useTranslations("Errors");
  const tAssets = useTranslations("Assets");
  const [fishRun] = useState(() => {
    const sequence = Array.from({ length: totalFish }, () => fishKinds[randomIndex(fishKinds.length)]);
    return { sequence, reward: sequence[randomIndex(sequence.length)] };
  });
  const [counts, setCounts] = useState<Counts>(emptyCounts);
  const [signals, setSignals] = useState<FishingSignals>(emptySignals);
  const [activeSide, setActiveSide] = useState<MotionSide | null>(null);
  const [hint, setHint] = useState(t("initialHint"));
  const [cameraStatus, setCameraStatus] = useState(t("cameraIdle"));
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraRunId, setCameraRunId] = useState(0);
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackerRef = useRef<MotionTracker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef(0);
  const fishElementRef = useRef<HTMLDivElement>(null);
  const countsRef = useRef<Counts>(emptyCounts);
  const fishRef = useRef<Point>({ x: 0.24, y: 0.58 });
  const fishVelocityRef = useRef<Point>({ x: 0, y: 0 });
  const fishTargetRef = useRef<Point>({ x: 0.78, y: 0.48 });
  const fishDirectionRef = useRef(1);
  const fishUpdatedAtRef = useRef(0);
  const grabRef = useRef<{ side: MotionSide } | null>(null);
  const startedAtRef = useRef(0);
  const sessionIdRef = useRef("");
  const attemptsRef = useRef(0);
  const lastUiRef = useRef(0);

  const drawFish = useCallback((point: Point, now: number, turn = 0) => {
    const fishElement = fishElementRef.current;
    const pond = fishElement?.parentElement;
    if (!fishElement || !pond) return;
    const bob = grabRef.current ? 0 : Math.sin(now / 230) * 1.5;
    fishElement.style.left = "0";
    fishElement.style.top = "0";
    fishElement.style.transform = `translate3d(${point.x * pond.clientWidth}px, ${point.y * pond.clientHeight + bob}px, 0) translate(-50%, -50%) scaleX(${fishDirectionRef.current}) rotate(${turn}deg)`;
  }, []);

  const spawnFish = useCallback(() => {
    const point = randomPondPoint();
    fishRef.current = point;
    fishVelocityRef.current = { x: 0, y: 0 };
    fishTargetRef.current = randomPondPoint();
    fishUpdatedAtRef.current = 0;
    requestAnimationFrame((now) => drawFish(point, now));
  }, [drawFish]);

  const processFrame = useCallback((next: FishingSignals, now: number) => {
    const grab = grabRef.current;
    if (grab) {
      const signal = next[grab.side];
      if (signal.detected && signal.fist) {
        const draggedPoint = { x: signal.x, y: signal.y };
        fishRef.current = draggedPoint;
        drawFish(draggedPoint, now);
        setHint(t("dragOpenHint", { side: t(grab.side) }));
      } else if (!signal.detected) {
        setHint(t("keepVisibleHint", { side: t(grab.side) }));
      } else {
        grabRef.current = null;
        setActiveSide(null);
        fishVelocityRef.current = { x: 0, y: 0 };
        fishUpdatedAtRef.current = 0;
        const placedInNet = isInsideNet(fishRef.current);
        if (placedInNet) {
          const nextCounts = { ...countsRef.current, [grab.side]: countsRef.current[grab.side] + 1 };
          countsRef.current = nextCounts;
          setCounts(nextCounts);
          const caught = nextCounts.left + nextCounts.right;
          if (caught >= totalFish) {
            setCompletion({ sessionId: sessionIdRef.current, startedAtMs: startedAtRef.current, attempts: attemptsRef.current });
          } else {
            setHint(t("catchCounted", { side: t(grab.side), current: caught + 1, total: totalFish }));
            spawnFish();
          }
        } else {
          fishTargetRef.current = randomPondPoint();
          setHint(t("escapedHint"));
        }
      }
    } else {
      const candidate = sides.find((side) => {
        const signal = next[side];
        return countsRef.current[side] < requiredSets && signal.fist && distance(signal, fishRef.current) <= hitRadius;
      });
      if (candidate) {
        attemptsRef.current += 1;
        grabRef.current = { side: candidate };
        fishVelocityRef.current = { x: 0, y: 0 };
        setActiveSide(candidate);
        setHint(t("grabbedHint", { side: t(candidate) }));
      }
    }

    if (now - lastUiRef.current > 70) {
      lastUiRef.current = now;
      setSignals(next);
    }
  }, [drawFish, spawnFish, t]);

  useEffect(() => {
    sessionIdRef.current = crypto.randomUUID();
    startedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (completion) return;
    let disposed = false;
    let video: HTMLVideoElement | null = null;
    async function startCamera() {
      video = videoRef.current;
      if (!video) return;
      setCameraStatus(t("startingCamera"));
      setCameraError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { width: { ideal: 960 }, height: { ideal: 540 }, facingMode: "user" } });
        if (disposed) return stream.getTracks().forEach((track) => track.stop());
        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();
        setCameraStatus(t("loadingTracker"));
        const tracker = await createMotionTracker({ enablePose: false, enableHands: true, maxHands: 2 });
        if (disposed) return tracker.disposeMotionTracker();
        trackerRef.current = tracker;
        setCameraStatus(t("trackingHands"));
        const tick = (now: number) => {
          if (disposed || !videoRef.current) return;
          if (!grabRef.current) moveFish(now);
          if (trackerRef.current && videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) processFrame(getFishingSignals(trackerRef.current.detectMotion(videoRef.current, now)), now);
          frameRef.current = requestAnimationFrame(tick);
        };
        frameRef.current = requestAnimationFrame(tick);
      } catch (error) {
        console.error("Fishing camera setup failed.", error);
        setCameraStatus(t("cameraUnavailable"));
        setCameraError(t("cameraStartFailed"));
      }
    }
    function moveFish(now: number) {
      if (!fishUpdatedAtRef.current) fishUpdatedAtRef.current = now;
      const dt = Math.min((now - fishUpdatedAtRef.current) / 1000, 0.05);
      fishUpdatedAtRef.current = now;
      const current = fishRef.current;
      const target = fishTargetRef.current;
      const gap = distance(current, target);
      if (gap < 0.035) fishTargetRef.current = randomPondPoint();
      const speed = Math.min(0.16, Math.max(0.07, gap * 0.55));
      const desired = gap > 0 ? { x: ((target.x - current.x) / gap) * speed, y: ((target.y - current.y) / gap) * speed } : { x: 0, y: 0 };
      const steering = 1 - Math.exp(-3.2 * dt);
      const velocity = fishVelocityRef.current;
      velocity.x += (desired.x - velocity.x) * steering;
      velocity.y += (desired.y - velocity.y) * steering;
      if (velocity.x < -0.002) fishDirectionRef.current = -1;
      else if (velocity.x > 0.002) fishDirectionRef.current = 1;
      const point = {
        x: Math.max(0.1, Math.min(0.9, current.x + velocity.x * dt)),
        y: Math.max(0.34, Math.min(0.88, current.y + velocity.y * dt)),
      };
      fishRef.current = point;
      drawFish(point, now, Math.max(-10, Math.min(10, velocity.y * 70)));
    }
    void startCamera();
    return () => {
      disposed = true;
      cancelAnimationFrame(frameRef.current);
      trackerRef.current?.disposeMotionTracker();
      trackerRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (video) video.srcObject = null;
    };
  }, [cameraRunId, completion, drawFish, processFrame, t]);

  function saveAndReturn() {
    if (!completion) return;
    setSaveError(null);
    startTransition(async () => {
      const result = await saveCaughtFish(fishRun.reward, { sessionId: completion.sessionId, durationSeconds: (Date.now() - completion.startedAtMs) / 1000, leftRepetitions: requiredSets, rightRepetitions: requiredSets, successfulActions: totalFish, totalAttempts: Math.max(completion.attempts, totalFish) });
      if (!result.ok) return setSaveError(tErrors(result.errorCode));
      router.push("/dashboard");
      router.refresh();
    });
  }

  const rewardAsset = getCatalogAssetBySource("fish", fishRun.reward);

  return <div className="watering-game">
    <header className="watering-header"><div><p>{t("gameLabel")}</p><h1>{t("title")}</h1></div><Link className="watering-secondary-link" href="/dashboard">{t("dashboard")}</Link></header>
    {completion ? <section className="watering-layout watering-layout-single"><div className="watering-main-panel"><div className="fishing-reward"><div className="fishing-reward-fish"><FishModel assetPath={getFishAssetPath(fishRun.reward)} ariaLabel={t("rewardDescription")} /></div><h2>{t("allCaught", { count: totalFish })}</h2>{rewardAsset ? <strong>{tAssets(rewardAsset.nameKey)}</strong> : null}<p>{t("rewardDescription")}</p><button className="watering-primary-link" disabled={isPending} onClick={saveAndReturn} type="button">{isPending ? t("savingFish") : t("addToPond")}</button>{saveError ? <p className="collectbugs-reward-error">{saveError}</p> : null}</div></div></section> :
      <FishingPlayfield activeSide={activeSide} cameraError={cameraError} cameraStatus={cameraStatus} counts={counts} fishAssetPath={getFishAssetPath(fishRun.sequence[Math.min(counts.left + counts.right, totalFish - 1)])} fishElementRef={fishElementRef} hint={hint} onRetry={() => setCameraRunId((value) => value + 1)} signals={signals} videoRef={videoRef} />}
  </div>;
}

function FishingPlayfield({ activeSide, cameraError, cameraStatus, counts, fishAssetPath, fishElementRef, hint, onRetry, signals, videoRef }: { activeSide: MotionSide | null; cameraError: string | null; cameraStatus: string; counts: Counts; fishAssetPath: string; fishElementRef: RefObject<HTMLDivElement | null>; hint: string; onRetry: () => void; signals: FishingSignals; videoRef: RefObject<HTMLVideoElement | null> }) {
  const t = useTranslations("Games.catchFish");
  const caught = counts.left + counts.right;
  return <section className="watering-playfield">
    <div className="watering-camera-column"><section className="watering-camera-panel"><div className="watering-panel-heading"><p>{t("webcam")}</p><h2>{t("showHands")}</h2></div><div className="watering-video-wrap"><video ref={videoRef} className="watering-video" muted playsInline aria-label={t("webcamLabel")} /></div><div className="watering-camera-footer"><span>{cameraStatus}</span>{cameraError ? <button className="watering-text-button" onClick={onRetry} type="button">{t("retryCamera")}</button> : null}</div>{cameraError ? <p className="watering-error">{cameraError}</p> : null}</section></div>
    <section className="watering-sprout-panel"><div className="watering-sprout-heading"><p>{t("pondProgress", { caught, total: totalFish })}</p><h2>{activeSide ? t("dragToNet") : t("catchTheFish")}</h2></div><div className="watering-sprout-stage-shell fishing-game-pond"><FishingNet /><div ref={fishElementRef} className={`fishing-game-fish${activeSide ? " is-grabbed" : ""}`}><FishModel assetPath={fishAssetPath} /></div>{sides.map((side) => signals[side].detected && counts[side] < requiredSets ? <Aim key={side} signal={signals[side]} side={side} /> : null)}<span className="fishing-pond-reeds" aria-hidden="true" /></div><p className="fishing-stage-hint">{hint}</p></section>
    <div className="watering-side-column"><aside className="watering-progress-panel"><div><p className="watering-panel-kicker">{t("exercise")}</p><h2>{t("fishPlaced")}</h2></div><div className="watering-progress-list">{sides.map((side) => <div className="watering-progress-row" key={side}><div><span>{t(side)}</span><strong>{counts[side]}/{requiredSets}</strong></div><div className="watering-progress-track" aria-hidden="true"><span style={{ width: `${(counts[side] / requiredSets) * 100}%` }} /></div><p>{counts[side] >= requiredSets ? t("complete") : activeSide === side ? t("draggingFish") : signals[side].fist ? t("fistRecognised") : t("readyToGrab")}</p></div>)}</div></aside><aside className="watering-guide-panel"><div><p className="watering-panel-kicker">{t("howToPlay")}</p><h2>{t("dragFishToNet")}</h2></div><ol className="watering-guide-steps"><li><span className="collectbugs-guide-icon">1</span><div><strong>{t("closeOverFish")}</strong><p>{t("closeOverFishDescription")}</p></div></li><li><span className="collectbugs-guide-icon">2</span><div><strong>{t("dragToNet")}</strong><p>{t("dragDescription")}</p></div></li><li><span className="collectbugs-guide-icon">3</span><div><strong>{t("openPalm")}</strong><p>{t("openPalmDescription", { count: requiredSets })}</p></div></li></ol><div className="watering-live-hint"><strong>{t("now")}</strong><p>{hint}</p></div></aside></div>
  </section>;
}

function FishingNet() {
  const t = useTranslations("Games.catchFish");
  return <div className="fishing-net" aria-label={t("netTarget")}><span className="fishing-net-rim" /><span className="fishing-net-mesh" /><strong>{t("net")}</strong></div>;
}

function Aim({ signal, side }: { signal: FishingHandSignal; side: MotionSide }) {
  const t = useTranslations("Games.catchFish");
  return <span className={`fishing-hand-cursor fishing-hand-cursor-${side}${signal.fist ? " is-fist" : ""}`} style={{ left: `${signal.x * 100}%`, top: `${signal.y * 100}%` }} aria-label={t("handAim", { side: t(side), state: signal.fist ? t("fistClosed") : t("palmOpen") })}><i /></span>;
}

function randomPondPoint(): Point { return { x: 0.13 + Math.random() * 0.74, y: 0.38 + Math.random() * 0.46 }; }
function randomIndex(length: number) { return Math.floor(Math.random() * Math.max(1, length)); }
function distance(a: Point, b: Point) { return Math.hypot(a.x - b.x, a.y - b.y); }
function isInsideNet(point: Point) { return point.x >= netBounds.left && point.x <= netBounds.right && point.y >= netBounds.top && point.y <= netBounds.bottom; }
