"use client";

import { useCallback, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  ThreeStage,
  disposeObject3D,
  type ThreeStageContext,
  type ThreeStageFrame,
} from "@/app/components/threejs";
import { prepareFlowerModelForDisplay } from "@/app/components/threejs/flowerModels";

type FlowerRewardStageProps = {
  flowerAsset: string;
};

export default function FlowerRewardStage({
  flowerAsset,
}: FlowerRewardStageProps) {
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const setup = useCallback(
    ({ scene, camera, renderer }: ThreeStageContext) => {
      const root = new THREE.Group();
      const loader = new GLTFLoader();
      let disposed = false;

      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.16;
      setLoadState("loading");
      scene.background = new THREE.Color("#dfe9d9");
      scene.add(root);

      const ambient = new THREE.HemisphereLight("#fff8e8", "#80907c", 1.8);
      const key = new THREE.DirectionalLight("#fff1c4", 2.5);
      const fill = new THREE.DirectionalLight("#d7f0ff", 1.2);
      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(1.8, 64),
        new THREE.MeshStandardMaterial({
          color: "#cdbb9e",
          roughness: 0.86,
        }),
      );

      key.position.set(2.5, 4.5, 3.5);
      fill.position.set(-2.4, 2.8, 2.2);
      floor.position.set(0, -0.015, 0);
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(ambient, key, fill, floor);

      camera.position.set(0, 1.55, 4.2);
      camera.lookAt(0, 1.05, 0);

      loader.load(
        `/meshes/flowers/${flowerAsset}`,
        (gltf) => {
          if (disposed) {
            disposeObject3D(gltf.scene);
            return;
          }

          prepareFlowerModelForDisplay(gltf.scene, {
            flowerAsset,
            maxDiameter: 2.5,
            targetHeight: flowerAsset === "flower3.glb" ? 1.9 : 2.35,
          });
          root.add(gltf.scene);
          setLoadState("ready");
        },
        undefined,
        (error) => {
          console.error("Failed to load flower reward model.", error);
          setLoadState("error");
        },
      );

      const onFrame = ({ elapsed }: ThreeStageFrame) => {
        root.rotation.y = Math.sin(elapsed * 0.55) * 0.28;
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
    [flowerAsset],
  );

  return (
    <div className="watering-reward-stage">
      <ThreeStage
        className="watering-reward-stage-canvas"
        setup={setup}
        fallback={<div className="watering-stage-fallback" />}
      />
      {loadState !== "ready" ? (
        <div className="watering-reward-stage-status" role="status">
          {loadState === "loading" ? "Loading flower mesh" : "Flower mesh failed to load"}
        </div>
      ) : null}
    </div>
  );
}
