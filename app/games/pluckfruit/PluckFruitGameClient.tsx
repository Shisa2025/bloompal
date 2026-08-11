"use client";

import { Link } from "@/i18n/navigation";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { FruitArt, type FruitArtKind } from "@/app/components/FruitArt";
import type { MotionSide, MotionTracker } from "@/mediapipe/types";
import { completeFruitPlucking } from "./actions";
import { getClawSignals, type ClawSignals } from "./pluckRules";
import { getCatalogAssetBySource } from "@/lib/asset-catalog";
import {
  findClosestPluckTarget,
  hasPluckUiStateChanged,
  isPluckGestureStart,
  pluckGrabFlashDurationMs,
  shouldRunPluckInference,
  smoothPluckPoint,
  type PluckAnimationPoint,
  type PluckUiState,
} from "./pluckAnimation";

const FruitRewardStage = dynamic(() => import("./FruitRewardStage"), {
  ssr: false,
  loading: () => <div className="fruit-reward-stage"><div className="watering-stage-fallback" /></div>,
});
const fruitGameStyle = {
  "--fruit-grab-flash-duration": `${pluckGrabFlashDurationMs}ms`,
} as CSSProperties;

const fruits: FruitArtKind[] = ["apple", "cherry", "lemon", "pear", "strawberry"];
type Fruit = FruitArtKind;
type Phase = "choosing" | "playing" | "saving" | "reward";
type Counts = Record<MotionSide, number>;
type AimPosition = PluckAnimationPoint & { initialized: boolean };
type AimElementSetters = Record<MotionSide, (element: HTMLSpanElement | null) => void>;
const sides: MotionSide[] = ["left", "right"];
const requiredRepetitions = 5;
const totalFruits = requiredRepetitions * sides.length;
const hitRadius = 0.13;
const emptyCounts: Counts = { left: 0, right: 0 };
const emptySignals: ClawSignals = {
  left: { detected: false, claw: false, confidence: 0, x: 0.5, y: 0.5 },
  right: { detected: false, claw: false, confidence: 0, x: 0.5, y: 0.5 },
};
const emptyUiState: PluckUiState = {
  left: { detected: false, claw: false, targetIndex: -1 },
  right: { detected: false, claw: false, targetIndex: -1 },
};
const fruitTargets = [
  { x: 0.28, y: 0.18 }, { x: 0.50, y: 0.14 }, { x: 0.72, y: 0.20 },
  { x: 0.17, y: 0.34 }, { x: 0.39, y: 0.32 }, { x: 0.61, y: 0.33 }, { x: 0.83, y: 0.35 },
  { x: 0.27, y: 0.50 }, { x: 0.50, y: 0.48 }, { x: 0.73, y: 0.51 },
] as const;

export default function PluckFruitGameClient({ initialChoices }: { initialChoices: string[] }) {
  const t = useTranslations("Games.pluckFruit");
  const tErrors = useTranslations("Errors");
  const choices = initialChoices.filter((fruit): fruit is Fruit => fruits.includes(fruit as Fruit)).slice(0, 3);
  const [selected, setSelected] = useState<Fruit | null>(null);
  const [phase, setPhase] = useState<Phase>("choosing");
  const [counts, setCounts] = useState(emptyCounts);
  const [pluckedTargets, setPluckedTargets] = useState<boolean[]>(() => fruitTargets.map(() => false));
  const [handUi, setHandUi] = useState(emptyUiState);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackerRef = useRef<MotionTracker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef(0);
  const treeElementRef = useRef<HTMLDivElement>(null);
  const treeSizeRef = useRef({ width: 0, height: 0 });
  const aimElementRefs = useRef<Record<MotionSide, HTMLSpanElement | null>>({ left: null, right: null });
  const aimPositionsRef = useRef<Record<MotionSide, AimPosition>>({
    left: { x: emptySignals.left.x, y: emptySignals.left.y, initialized: false },
    right: { x: emptySignals.right.x, y: emptySignals.right.y, initialized: false },
  });
  const latestSignalsRef = useRef<ClawSignals>(emptySignals);
  const handUiRef = useRef<PluckUiState>(emptyUiState);
  const countsRef = useRef(emptyCounts);
  const pluckedTargetsRef = useRef<boolean[]>(fruitTargets.map(() => false));
  const closedRef = useRef({ left: false, right: false });
  const lastCountRef = useRef({ left: Number.NEGATIVE_INFINITY, right: Number.NEGATIVE_INFINITY });
  const sessionRef = useRef(crypto.randomUUID());
  const startedRef = useRef(0);
  const aimElementSetters = useMemo<AimElementSetters>(() => ({
    left: (element) => { aimElementRefs.current.left = element; },
    right: (element) => { aimElementRefs.current.right = element; },
  }), []);

  const processFrame = useCallback((next: ClawSignals, time: number) => {
    sides.forEach((side) => {
      if (!next[side].detected) { closedRef.current[side] = false; return; }
      if (isPluckGestureStart(closedRef.current[side], next[side])) {
        closedRef.current[side] = true;
        const aimPosition = aimPositionsRef.current[side];
        const targetIndex = aimPosition.initialized
          ? findClosestPluckTarget(aimPosition, fruitTargets, pluckedTargetsRef.current, hitRadius)
          : -1;
        if (targetIndex >= 0 && countsRef.current[side] < requiredRepetitions && time - lastCountRef.current[side] > 650) {
          lastCountRef.current[side] = time;
          const updatedTargets = pluckedTargetsRef.current.map((plucked, index) => plucked || index === targetIndex);
          pluckedTargetsRef.current = updatedTargets;
          setPluckedTargets(updatedTargets);
          const updatedCounts = { ...countsRef.current, [side]: countsRef.current[side] + 1 };
          countsRef.current = updatedCounts;
          setCounts(updatedCounts);
        }
      } else if (!next[side].claw) closedRef.current[side] = false;
    });
  }, []);

  const drawAims = useCallback((next: ClawSignals, deltaSeconds: number) => {
    const { width, height } = treeSizeRef.current;
    if (width <= 0 || height <= 0) return;

    sides.forEach((side) => {
      const aimElement = aimElementRefs.current[side];
      const signal = next[side];
      const position = aimPositionsRef.current[side];
      if (!signal.detected) {
        position.initialized = false;
        if (aimElement) aimElement.style.opacity = "0";
        return;
      }

      const target = { x: signal.x, y: signal.y };
      const smoothed = position.initialized
        ? smoothPluckPoint(position, target, deltaSeconds)
        : target;
      position.x = smoothed.x;
      position.y = smoothed.y;
      position.initialized = true;
      if (!aimElement) return;
      aimElement.style.opacity = "1";
      aimElement.style.transform = `translate3d(${position.x * width}px, ${position.y * height}px, 0) translate(-50%, -50%)`;
    });
  }, []);

  const publishHandUi = useCallback((next: ClawSignals) => {
    const nextUi = Object.fromEntries(sides.map((side) => {
      const signal = next[side];
      const position = aimPositionsRef.current[side];
      const targetIndex = signal.detected && position.initialized && countsRef.current[side] < requiredRepetitions
        ? findClosestPluckTarget(position, fruitTargets, pluckedTargetsRef.current, hitRadius)
        : -1;
      return [side, { detected: signal.detected, claw: signal.claw, targetIndex }];
    })) as PluckUiState;

    if (!hasPluckUiStateChanged(handUiRef.current, nextUi)) return;
    handUiRef.current = nextUi;
    setHandUi(nextUi);
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    const treeElement = treeElementRef.current;
    if (!treeElement) return;

    const updateTreeSize = () => {
      const bounds = treeElement.getBoundingClientRect();
      treeSizeRef.current = { width: bounds.width, height: bounds.height };
      drawAims(latestSignalsRef.current, 0);
    };
    const resizeObserver = new ResizeObserver(updateTreeSize);
    updateTreeSize();
    resizeObserver.observe(treeElement);

    return () => resizeObserver.disconnect();
  }, [drawAims, phase]);

  useEffect(() => {
    if (phase !== "playing") return;
    let disposed = false;
    let activeTracker: MotionTracker | null = null;
    let video: HTMLVideoElement | null = null;
    let lastVideoTime = -1;
    let lastInferenceAtMs = Number.NEGATIVE_INFINITY;
    let lastAnimationAtMs = 0;
    const aimPositions = aimPositionsRef.current;
    const aimElements = aimElementRefs.current;

    latestSignalsRef.current = emptySignals;
    handUiRef.current = emptyUiState;
    closedRef.current = { left: false, right: false };

    const releaseResources = () => {
      activeTracker?.disposeMotionTracker();
      activeTracker = null;
      trackerRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (video) video.srcObject = null;
    };

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 360 }, facingMode: "user" },
          audio: false,
        });
        video = videoRef.current;
        if (disposed || !video) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();

        const { createMotionTracker } = await import("@/mediapipe/motion");
        if (disposed) return;
        try {
          activeTracker = await createMotionTracker({ delegate: "GPU", enableHands: true, enablePose: false, maxHands: 2 });
        } catch {
          if (disposed) return;
          activeTracker = await createMotionTracker({ delegate: "CPU", enableHands: true, enablePose: false, maxHands: 2 });
        }
        if (disposed) {
          activeTracker.disposeMotionTracker();
          activeTracker = null;
          return;
        }
        trackerRef.current = activeTracker;

        const tick = (now: number) => {
          const currentVideo = videoRef.current;
          if (disposed || !currentVideo) return;
          const deltaSeconds = lastAnimationAtMs
            ? Math.min((now - lastAnimationAtMs) / 1000, 0.05)
            : 0;
          lastAnimationAtMs = now;

          if (
            trackerRef.current &&
            currentVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
            shouldRunPluckInference({
              videoTime: currentVideo.currentTime,
              lastVideoTime,
              timestampMs: now,
              lastInferenceAtMs,
            })
          ) {
            lastVideoTime = currentVideo.currentTime;
            lastInferenceAtMs = now;
            const next = getClawSignals(trackerRef.current.detectMotion(currentVideo, now));
            latestSignalsRef.current = next;
            drawAims(next, deltaSeconds);
            processFrame(next, now);
          } else {
            drawAims(latestSignalsRef.current, deltaSeconds);
          }
          publishHandUi(latestSignalsRef.current);
          frameRef.current = requestAnimationFrame(tick);
        };
        frameRef.current = requestAnimationFrame(tick);
      } catch (cause) {
        if (disposed) return;
        releaseResources();
        console.error("Fruit Plucking camera setup failed.", cause);
        setError(t("cameraUnavailable"));
      }
    };
    void start();
    return () => {
      disposed = true;
      cancelAnimationFrame(frameRef.current);
      releaseResources();
      sides.forEach((side) => {
        aimPositions[side].initialized = false;
        if (aimElements[side]) aimElements[side].style.opacity = "0";
      });
    };
  }, [drawAims, phase, processFrame, publishHandUi, t]);

  useEffect(() => {
    if (phase !== "playing" || !selected || counts.left < requiredRepetitions || counts.right < requiredRepetitions) return;
    const timer = window.setTimeout(() => {
      setPhase("saving");
      void completeFruitPlucking(selected, {
        sessionId: sessionRef.current,
        durationSeconds: (Date.now() - startedRef.current) / 1000,
        leftRepetitions: requiredRepetitions,
        rightRepetitions: requiredRepetitions,
        successfulActions: totalFruits,
        totalAttempts: totalFruits,
      }).then((result) => {
        if (result.ok) setPhase("reward");
        else { setError(tErrors(result.errorCode)); setPhase("playing"); }
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [counts, phase, selected, tErrors]);

  const choose = (fruit: Fruit) => {
    setSelected(fruit);
    setCounts(emptyCounts);
    countsRef.current = emptyCounts;
    setHandUi(emptyUiState);
    handUiRef.current = emptyUiState;
    latestSignalsRef.current = emptySignals;
    closedRef.current = { left: false, right: false };
    lastCountRef.current = { left: Number.NEGATIVE_INFINITY, right: Number.NEGATIVE_INFINITY };
    sides.forEach((side) => { aimPositionsRef.current[side].initialized = false; });
    const resetTargets = fruitTargets.map(() => false);
    setPluckedTargets(resetTargets);
    pluckedTargetsRef.current = resetTargets;
    setError(null);
    startedRef.current = Date.now();
    setPhase("playing");
  };

  return <div className="watering-game fruit-game" style={fruitGameStyle}>
    <header className="watering-header"><div><p>{t("gameLabel")}</p><h1>{t("title")}</h1></div><Link className="watering-secondary-link" href="/dashboard">{t("dashboard")}</Link></header>
    {phase === "choosing" ? <MysteryPicker choices={choices} onChoose={choose} /> : phase === "reward" && selected ? <Reward fruit={selected} /> : <Playfield aimElementSetters={aimElementSetters} counts={counts} error={error} fruit={selected!} handUi={handUi} pluckedTargets={pluckedTargets} saving={phase === "saving"} treeElementRef={treeElementRef} videoRef={videoRef} />}
  </div>;
}

function MysteryPicker({ choices, onChoose }: { choices: readonly Fruit[]; onChoose: (fruit: Fruit) => void }) {
  const t = useTranslations("Games.pluckFruit");
  return <section className="watering-layout watering-layout-single"><div className="watering-main-panel"><div className="watering-seed-stage"><div className="watering-stage-copy"><p>{t("mysteryFruits")}</p><h2>{t("chooseFruit")}</h2></div><div className="watering-seed-grid">{choices.map((fruit, index) => <button className="watering-seed-card fruit-mystery-card" key={fruit} onClick={() => onChoose(fruit)} type="button"><FruitArt kind={fruit} /><span className="fruit-mystery-cover">?</span><strong>{t("mysteryFruitNumber", { number: index + 1 })}</strong></button>)}</div></div></div></section>;
}

function Playfield({ aimElementSetters, fruit, counts, pluckedTargets, handUi, treeElementRef, videoRef, saving, error }: { aimElementSetters: AimElementSetters; fruit: Fruit; counts: Counts; pluckedTargets: boolean[]; handUi: PluckUiState; treeElementRef: RefObject<HTMLDivElement | null>; videoRef: RefObject<HTMLVideoElement | null>; saving: boolean; error: string | null }) {
  const t = useTranslations("Games.pluckFruit");
  const plucked = counts.left + counts.right;
  return <section className="fruit-playfield">
    <div className="watering-camera-panel"><div className="watering-panel-heading"><p>{t("webcam")}</p><h2>{t("aimHookClaw")}</h2></div><div className="watering-video-wrap"><video ref={videoRef} className="watering-video" muted playsInline aria-label={t("webcamLabel")} />{saving ? <div className="watering-overlay-message">{t("savingFruit")}</div> : null}</div>{error ? <p className="watering-error">{error}</p> : null}</div>
    <div ref={treeElementRef} className="fruit-tree-panel">
      <div className="fruit-tree-crown" />
      {fruitTargets.map((target, index) => {
        const touching = sides.some((side) => handUi[side].targetIndex === index);
        return <span className={`fruit-tree-fruit ${pluckedTargets[index] ? "is-plucked" : ""} ${!pluckedTargets[index] && touching ? "is-targeted" : ""}`} key={index} style={{ left: `${target.x * 100}%`, top: `${target.y * 100}%` }}><FruitArt kind={fruit} /></span>;
      })}
      <div className="fruit-tree-trunk" />
      {sides.map((side) => <span ref={aimElementSetters[side]} aria-hidden={!handUi[side].detected} aria-label={t("handTarget", { side: t(side) })} className={`fruit-hand-target fruit-hand-target-${side} ${handUi[side].claw ? "is-claw" : ""}`} key={side}><span aria-hidden="true" />{side === "left" ? t("leftShort") : t("rightShort")}</span>)}
      <div className="fruit-aim-instruction">{t("knuckleInstruction")}</div>
    </div>
    <aside className="watering-progress-panel"><p className="watering-panel-kicker">{t("basketProgress")}</p><h2>{t("fruitProgress", { count: plucked, total: totalFruits })}</h2>{sides.map((side) => { const touching = handUi[side].targetIndex >= 0; return <div className="watering-progress-row" key={side}><div><span>{t(side)}</span><strong>{counts[side]}/{requiredRepetitions}</strong></div><div className="watering-progress-track"><span style={{ width: `${(counts[side] / requiredRepetitions) * 100}%` }} /></div><p>{counts[side] >= requiredRepetitions ? t("complete") : !handUi[side].detected ? t("showHand") : !touching ? t("aimFruit") : handUi[side].claw ? t("pluckedOpen") : t("onTarget")}</p></div>; })}<div className="fruit-gesture-tip"><strong>{t("aimClawOpen")}</strong><p>{t("gestureDescription", { count: requiredRepetitions })}</p></div></aside>
  </section>;
}

function Reward({ fruit }: { fruit: Fruit }) {
  const t = useTranslations("Games.pluckFruit");
  const tAssets = useTranslations("Assets");
  const catalogAsset = getCatalogAssetBySource("fruit", fruit);
  const fruitLabel = catalogAsset ? tAssets(catalogAsset.nameKey) : fruit;
  return <section className="watering-layout watering-layout-single"><div className="watering-main-panel watering-reward-main-panel"><div className="fruit-reward-panel"><FruitRewardStage ariaLabel={t("rewardLabel", { fruit: fruitLabel })} assetPath={catalogAsset?.assetPath ?? `/meshes/fruits/${fruit}.glb`} /><div className="watering-reward-copy fruit-reward-copy"><p>{t("fruitReward")}</p><h2>{fruitLabel}</h2><Link className="watering-primary-link" href="/dashboard">{t("seeBasket")}</Link></div></div></div></section>;
}
