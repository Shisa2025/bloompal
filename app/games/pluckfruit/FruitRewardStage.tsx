"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  ThreeStage,
  disposeObject3D,
  type ThreeStageContext,
  type ThreeStageFrame,
} from "@/app/components/threejs";

export const fruitRewardTargetSize = 2.2;

type FruitRewardStageProps = {
  ariaLabel: string;
  assetPath: string;
};

export function prepareFruitRewardModel(model: THREE.Object3D) {
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const scale =
    fruitRewardTargetSize / Math.max(size.x, size.y, size.z, 0.001);

  model.scale.multiplyScalar(scale);
  model.updateMatrixWorld(true);

  const fittedBounds = new THREE.Box3().setFromObject(model);
  const fittedCentre = fittedBounds.getCenter(new THREE.Vector3());
  model.position.sub(fittedCentre);
  model.updateMatrixWorld(true);
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
  });
}

export default function FruitRewardStage({
  ariaLabel,
  assetPath,
}: FruitRewardStageProps) {
  const t = useTranslations("Common");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const setup = useCallback(
    ({ scene, camera, renderer }: ThreeStageContext) => {
      const root = new THREE.Group();
      const loader = new GLTFLoader();
      let disposed = false;

      setLoadState("loading");
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.16;
      scene.background = new THREE.Color("#dfe9d9");

      root.position.y = 1.18;
      scene.add(root);

      const ambient = new THREE.HemisphereLight("#fff8e8", "#80907c", 1.9);
      const key = new THREE.DirectionalLight("#fff1c4", 2.8);
      const fill = new THREE.DirectionalLight("#d7f0ff", 1.25);
      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(1.75, 64),
        new THREE.MeshStandardMaterial({
          color: "#cdbb9e",
          roughness: 0.86,
        }),
      );

      key.position.set(2.6, 4.5, 3.5);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      fill.position.set(-2.4, 2.8, 2.2);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(ambient, key, fill, floor);

      camera.position.set(0, 1.45, 4.6);
      camera.lookAt(0, 1.15, 0);

      loader.load(
        assetPath,
        (gltf) => {
          if (disposed) {
            disposeObject3D(gltf.scene);
            return;
          }

          prepareFruitRewardModel(gltf.scene);
          root.add(gltf.scene);
          setLoadState("ready");
        },
        undefined,
        (error) => {
          if (disposed) return;
          console.error("Failed to load fruit reward model.", error);
          setLoadState("error");
        },
      );

      const onFrame = ({ elapsed }: ThreeStageFrame) => {
        root.position.y = 1.18 + Math.sin(elapsed * 1.4) * 0.045;
        root.rotation.y = elapsed * 0.38;
      };

      return {
        onFrame,
        dispose: () => {
          disposed = true;
          scene.remove(root, ambient, key, fill, floor);
          disposeObject3D(root);
          floor.geometry.dispose();
          floor.material.dispose();
        },
      };
    },
    [assetPath],
  );

  return (
    <div className="fruit-reward-stage">
      <ThreeStage
        ariaLabel={ariaLabel}
        className="fruit-reward-stage-canvas"
        fallback={<div className="watering-stage-fallback" />}
        setup={setup}
      />
      {loadState !== "ready" ? (
        <div className="watering-reward-stage-status" role="status">
          {loadState === "loading" ? t("loading3d") : t("sceneLoadFailed")}
        </div>
      ) : null}
    </div>
  );
}
