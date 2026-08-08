"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { FruitArt, type FruitArtKind } from "@/app/components/FruitArt";
import { createMotionTracker } from "@/mediapipe/motion";
import type { MotionSide, MotionTracker } from "@/mediapipe/types";
import { completeFruitPlucking } from "./actions";
import { getClawSignals, type ClawSignals } from "./pluckRules";

const fruits: FruitArtKind[] = ["apple", "pear", "orange", "plum", "peach"];
type Fruit = FruitArtKind;
type Phase = "choosing" | "playing" | "saving" | "reward";
const sides: MotionSide[] = ["left", "right"];
const requiredRepetitions = 5;
const totalFruits = requiredRepetitions * sides.length;
const emptyCounts = { left: 0, right: 0 };
const emptySignals: ClawSignals = {
  left: { detected: false, claw: false, confidence: 0, x: 0.5, y: 0.5 },
  right: { detected: false, claw: false, confidence: 0, x: 0.5, y: 0.5 },
};
const fruitTargets = [
  { x: 0.28, y: 0.18 }, { x: 0.50, y: 0.14 }, { x: 0.72, y: 0.20 },
  { x: 0.17, y: 0.34 }, { x: 0.39, y: 0.32 }, { x: 0.61, y: 0.33 }, { x: 0.83, y: 0.35 },
  { x: 0.27, y: 0.50 }, { x: 0.50, y: 0.48 }, { x: 0.73, y: 0.51 },
] as const;

export default function PluckFruitGameClient({ initialChoices }: { initialChoices: string[] }) {
  const choices = initialChoices.filter((fruit): fruit is Fruit => fruits.includes(fruit as Fruit)).slice(0, 3);
  const [selected, setSelected] = useState<Fruit | null>(null);
  const [phase, setPhase] = useState<Phase>("choosing");
  const [counts, setCounts] = useState(emptyCounts);
  const [pluckedTargets, setPluckedTargets] = useState<boolean[]>(() => fruitTargets.map(() => false));
  const [signals, setSignals] = useState(emptySignals);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackerRef = useRef<MotionTracker | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef(0);
  const countsRef = useRef(emptyCounts);
  const pluckedTargetsRef = useRef<boolean[]>(fruitTargets.map(() => false));
  const closedRef = useRef({ left: false, right: false });
  const lastCountRef = useRef({ left: 0, right: 0 });
  const sessionRef = useRef(crypto.randomUUID());
  const startedRef = useRef(0);

  const process = useCallback((next: ClawSignals, time: number) => {
    sides.forEach((side) => {
      if (!next[side].detected) { closedRef.current[side] = false; return; }
      if (next[side].claw && !closedRef.current[side]) {
        closedRef.current[side] = true;
        const targetIndex = findTouchedFruit(next[side], pluckedTargetsRef.current);
        if (targetIndex >= 0 && countsRef.current[side] < requiredRepetitions && time - lastCountRef.current[side] > 650) {
          lastCountRef.current[side] = time;
          const updatedTargets = pluckedTargetsRef.current.map((plucked, index) => plucked || index === targetIndex);
          pluckedTargetsRef.current = updatedTargets;
          setPluckedTargets(updatedTargets);
          setCounts((current) => {
            const updated = { ...current, [side]: current[side] + 1 };
            countsRef.current = updated;
            return updated;
          });
        }
      } else if (!next[side].claw) closedRef.current[side] = false;
    });
    setSignals(next);
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    let disposed = false;
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 960, height: 540, facingMode: "user" }, audio: false });
        if (disposed || !videoRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        trackerRef.current = await createMotionTracker({ delegate: "GPU", enableHands: true, enablePose: false, maxHands: 2 })
          .catch(() => createMotionTracker({ delegate: "CPU", enableHands: true, enablePose: false, maxHands: 2 }));
        const tick = () => {
          if (disposed || !trackerRef.current || !videoRef.current) return;
          if (videoRef.current.readyState >= 2) {
            const time = performance.now();
            process(getClawSignals(trackerRef.current.detectMotion(videoRef.current, time)), time);
          }
          frameRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch (cause) { setError(cause instanceof Error ? cause.message : "Camera unavailable."); }
    };
    void start();
    return () => {
      disposed = true;
      cancelAnimationFrame(frameRef.current);
      trackerRef.current?.disposeMotionTracker();
      trackerRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [phase, process]);

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
        else { setError(result.error); setPhase("playing"); }
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [counts, phase, selected]);

  const choose = (fruit: Fruit) => {
    setSelected(fruit);
    setCounts(emptyCounts);
    countsRef.current = emptyCounts;
    const resetTargets = fruitTargets.map(() => false);
    setPluckedTargets(resetTargets);
    pluckedTargetsRef.current = resetTargets;
    startedRef.current = Date.now();
    setPhase("playing");
  };

  return <div className="watering-game fruit-game">
    <header className="watering-header"><div><p>BloomPal Game</p><h1>Fruit Plucking</h1></div><Link className="watering-secondary-link" href="/dashboard">Dashboard</Link></header>
    {phase === "choosing" ? <MysteryPicker choices={choices} onChoose={choose} /> : phase === "reward" && selected ? <Reward fruit={selected} /> : <Playfield fruit={selected!} counts={counts} pluckedTargets={pluckedTargets} signals={signals} videoRef={videoRef} saving={phase === "saving"} error={error} />}
  </div>;
}

function MysteryPicker({ choices, onChoose }: { choices: readonly Fruit[]; onChoose: (fruit: Fruit) => void }) {
  return <section className="watering-layout watering-layout-single"><div className="watering-main-panel"><div className="watering-seed-stage"><div className="watering-stage-copy"><p>Mystery fruits</p><h2>Choose one fruit</h2></div><div className="watering-seed-grid">{choices.map((fruit, index) => <button className="watering-seed-card fruit-mystery-card" key={fruit} onClick={() => onChoose(fruit)} type="button"><FruitArt kind={fruit} /><span className="fruit-mystery-cover">?</span><strong>Mystery fruit {index + 1}</strong></button>)}</div></div></div></section>;
}

function findTouchedFruit(signal: ClawSignals[MotionSide], pluckedTargets: boolean[]) {
  if (!signal.detected) return -1;
  let closestIndex = -1;
  let closestDistance = 0.13;
  fruitTargets.forEach((target, index) => {
    if (pluckedTargets[index]) return;
    const targetDistance = Math.hypot(signal.x - target.x, signal.y - target.y);
    if (targetDistance <= closestDistance) {
      closestDistance = targetDistance;
      closestIndex = index;
    }
  });
  return closestIndex;
}

function Playfield({ fruit, counts, pluckedTargets, signals, videoRef, saving, error }: { fruit: Fruit; counts: typeof emptyCounts; pluckedTargets: boolean[]; signals: ClawSignals; videoRef: RefObject<HTMLVideoElement | null>; saving: boolean; error: string | null }) {
  const plucked = counts.left + counts.right;
  return <section className="fruit-playfield">
    <div className="watering-camera-panel"><div className="watering-panel-heading"><p>Webcam</p><h2>Aim, then make a hook claw</h2></div><div className="watering-video-wrap"><video ref={videoRef} className="watering-video" muted playsInline />{saving ? <div className="watering-overlay-message">Saving fruit</div> : null}</div>{error ? <p className="watering-error">{error}</p> : null}</div>
    <div className="fruit-tree-panel">
      <div className="fruit-tree-crown" />
      {fruitTargets.map((target, index) => {
        const touching = sides.some((side) => counts[side] < requiredRepetitions && signals[side].detected && Math.hypot(signals[side].x - target.x, signals[side].y - target.y) <= 0.13);
        return <span className={`fruit-tree-fruit ${pluckedTargets[index] ? "is-plucked" : ""} ${!pluckedTargets[index] && touching ? "is-targeted" : ""}`} key={index} style={{ left: `${target.x * 100}%`, top: `${target.y * 100}%` }}><FruitArt kind={fruit} /></span>;
      })}
      <div className="fruit-tree-trunk" />
      {sides.map((side) => signals[side].detected ? <span className={`fruit-hand-target fruit-hand-target-${side} ${signals[side].claw ? "is-claw" : ""}`} key={side} style={{ left: `${signals[side].x * 100}%`, top: `${signals[side].y * 100}%` }}><span />{side === "left" ? "L" : "R"}</span> : null)}
      <div className="fruit-aim-instruction">Keep the large knuckles straight. Bend the middle and end finger joints.</div>
    </div>
    <aside className="watering-progress-panel"><p className="watering-panel-kicker">Basket progress</p><h2>{plucked}/{totalFruits} fruits</h2>{sides.map((side) => { const touching = findTouchedFruit(signals[side], pluckedTargets) >= 0; return <div className="watering-progress-row" key={side}><div><span>{side === "left" ? "Left hand" : "Right hand"}</span><strong>{counts[side]}/{requiredRepetitions}</strong></div><div className="watering-progress-track"><span style={{ width: `${(counts[side] / requiredRepetitions) * 100}%` }} /></div><p>{counts[side] >= requiredRepetitions ? "Complete" : !signals[side].detected ? "Show your hand" : !touching ? "Aim at any fruit" : signals[side].claw ? "Fruit plucked! Open again" : "On target — bend into a hook claw"}</p></div>; })}<div className="fruit-gesture-tip"><strong>Aim → hook claw → open</strong><p>Keep the large knuckles straight while bending the middle and end joints. Pluck {requiredRepetitions} fruits with each hand.</p></div></aside>
  </section>;
}

function Reward({ fruit }: { fruit: Fruit }) {
  return <section className="watering-layout watering-layout-single"><div className="watering-main-panel watering-reward-main-panel"><div className="fruit-reward-panel"><div className="fruit-reward-stage"><div className="fruit-reward-ground" aria-hidden="true" /><FruitArt kind={fruit} label={`${fruit} reward`} /></div><div className="watering-reward-copy fruit-reward-copy"><p>Fruit reward</p><h2>{fruit[0].toUpperCase() + fruit.slice(1)}</h2><Link className="watering-primary-link" href="/dashboard">See my basket</Link></div></div></div></section>;
}
