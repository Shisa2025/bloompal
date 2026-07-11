"use client";

import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import {
  ThreeStage,
  disposeObject3D,
  type ThreeStageContext,
  type ThreeStageFrame,
} from "@/app/components/threejs";
import type { MotionSide } from "@/mediapipe/types";

type WaterBurst = {
  id: number;
  side: MotionSide;
};

type SproutFeedbackStageProps = {
  progress: number;
  waterBursts: WaterBurst[];
};

type SproutParts = {
  stem: THREE.Mesh;
  leftLeaf: THREE.Mesh;
  rightLeaf: THREE.Mesh;
  secondLeftLeaf: THREE.Mesh;
  secondRightLeaf: THREE.Mesh;
  bud: THREE.Mesh;
  glow: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
};

export default function SproutFeedbackStage({
  progress,
  waterBursts,
}: SproutFeedbackStageProps) {
  const progressRef = useRef(progress);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  const setup = useCallback(({ scene, camera, renderer }: ThreeStageContext) => {
    const root = new THREE.Group();
    const materials = createSproutMaterials();
    const parts = createSprout(root, materials);
    let displayedProgress = progressRef.current;

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    scene.background = new THREE.Color("#f8efe2");
    scene.add(root);

    const ambient = new THREE.HemisphereLight("#fff8e8", "#8ea184", 1.65);
    const key = new THREE.DirectionalLight("#fff1c4", 2.45);

    key.position.set(2.8, 4.6, 3.4);
    scene.add(ambient, key);

    camera.position.set(0, 1.45, 4.35);
    camera.lookAt(0, 0.95, 0);

    const onFrame = ({ elapsed }: ThreeStageFrame) => {
      displayedProgress += (progressRef.current - displayedProgress) * 0.12;
      updateSprout(parts, displayedProgress, elapsed);
      root.rotation.y = Math.sin(elapsed * 0.32) * 0.16;
    };

    return {
      onFrame,
      dispose: () => {
        scene.remove(root, ambient, key);
        disposeObject3D(root);
      },
    };
  }, []);

  return (
    <div className="watering-sprout-stage-shell">
      <ThreeStage
        className="watering-sprout-stage"
        setup={setup}
        fallback={<div className="watering-stage-fallback" />}
      />
      {waterBursts.map((burst) => (
        <span
          className={`watering-drop watering-drop-${burst.side}`}
          key={burst.id}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function createSproutMaterials() {
  return {
    pot: new THREE.MeshStandardMaterial({
      color: "#c9825d",
      roughness: 0.78,
    }),
    potLip: new THREE.MeshStandardMaterial({
      color: "#e5b486",
      roughness: 0.68,
    }),
    soil: new THREE.MeshStandardMaterial({
      color: "#4a3528",
      roughness: 0.95,
    }),
    stem: new THREE.MeshStandardMaterial({
      color: "#5c8f58",
      roughness: 0.74,
    }),
    leaf: new THREE.MeshStandardMaterial({
      color: "#6cae69",
      roughness: 0.72,
    }),
    leafLight: new THREE.MeshStandardMaterial({
      color: "#8fc978",
      roughness: 0.7,
    }),
    bud: new THREE.MeshStandardMaterial({
      color: "#f0a4bc",
      roughness: 0.64,
    }),
    glow: new THREE.MeshBasicMaterial({
      color: "#fff1a8",
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  };
}

function createSprout(
  root: THREE.Group,
  materials: ReturnType<typeof createSproutMaterials>,
): SproutParts {
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.92, 0.84, 36),
    materials.pot,
  );
  pot.position.y = 0.42;
  pot.castShadow = true;
  pot.receiveShadow = true;

  const potLip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.98, 0.12, 36),
    materials.potLip,
  );
  potLip.position.y = 0.86;
  potLip.castShadow = true;

  const soil = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 0.08, 36),
    materials.soil,
  );
  soil.position.y = 0.93;
  soil.receiveShadow = true;

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 1, 12), materials.stem);
  stem.castShadow = true;

  const leftLeaf = createLeaf(materials.leaf);
  const rightLeaf = createLeaf(materials.leaf);
  const secondLeftLeaf = createLeaf(materials.leafLight);
  const secondRightLeaf = createLeaf(materials.leafLight);

  const bud = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), materials.bud);
  bud.castShadow = true;

  const glow = new THREE.Mesh(new THREE.CircleGeometry(1.75, 48), materials.glow);
  glow.position.set(0, 1.3, -0.35);

  root.add(glow, pot, potLip, soil, stem, leftLeaf, rightLeaf, secondLeftLeaf, secondRightLeaf, bud);

  return {
    stem,
    leftLeaf,
    rightLeaf,
    secondLeftLeaf,
    secondRightLeaf,
    bud,
    glow,
  };
}

function createLeaf(material: THREE.Material) {
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 12), material);

  leaf.castShadow = true;
  leaf.scale.set(0.1, 0.035, 0.1);

  return leaf;
}

function updateSprout(parts: SproutParts, progress: number, elapsed: number) {
  const normalized = THREE.MathUtils.clamp(progress / 10, 0, 1);
  const stemHeight = 0.18 + normalized * 1.35;
  const topY = 0.92 + stemHeight;
  const sway = Math.sin(elapsed * 1.45) * 0.035 * normalized;

  parts.stem.visible = progress > 0.2;
  parts.stem.scale.set(1, Math.max(stemHeight, 0.001), 1);
  parts.stem.position.set(sway * 0.25, 0.92 + stemHeight / 2, 0);
  parts.stem.rotation.z = sway;

  updateLeaf(parts.leftLeaf, normalized, 0.18, {
    progressStart: 0.2,
    position: [-0.22, 1.18 + normalized * 0.38, 0],
    rotation: [0.34, 0.2, 0.72 + sway],
    scale: [0.62, 0.14, 0.28],
  });
  updateLeaf(parts.rightLeaf, normalized, 0.28, {
    progressStart: 0.34,
    position: [0.24, 1.28 + normalized * 0.4, 0.02],
    rotation: [0.34, -0.2, -0.72 + sway],
    scale: [0.62, 0.14, 0.28],
  });
  updateLeaf(parts.secondLeftLeaf, normalized, 0.46, {
    progressStart: 0.52,
    position: [-0.18, 1.58 + normalized * 0.42, 0.02],
    rotation: [0.34, 0.15, 0.55 + sway],
    scale: [0.5, 0.12, 0.24],
  });
  updateLeaf(parts.secondRightLeaf, normalized, 0.58, {
    progressStart: 0.66,
    position: [0.18, 1.68 + normalized * 0.42, 0.03],
    rotation: [0.34, -0.15, -0.55 + sway],
    scale: [0.5, 0.12, 0.24],
  });

  const budScale = THREE.MathUtils.smoothstep(normalized, 0.76, 1);

  parts.bud.visible = budScale > 0.01;
  parts.bud.position.set(sway * 1.5, topY + 0.08, 0);
  parts.bud.scale.setScalar(0.25 + budScale * 0.82);

  parts.glow.scale.setScalar(0.8 + normalized * 0.45 + Math.sin(elapsed * 2.2) * 0.02);
  parts.glow.material.opacity = 0.08 + normalized * 0.16;
}

function updateLeaf(
  leaf: THREE.Mesh,
  normalized: number,
  wobblePhase: number,
  config: {
    progressStart: number;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  },
) {
  const leafProgress = THREE.MathUtils.smoothstep(
    normalized,
    config.progressStart,
    Math.min(config.progressStart + 0.18, 1),
  );

  leaf.visible = leafProgress > 0.01;
  leaf.position.set(...config.position);
  leaf.rotation.set(...config.rotation);
  leaf.rotation.z += Math.sin(normalized * 8 + wobblePhase) * 0.04;
  leaf.scale.set(
    config.scale[0] * leafProgress,
    config.scale[1] * leafProgress,
    config.scale[2] * leafProgress,
  );
}
