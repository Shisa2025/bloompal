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

type BugCaughtStageProps = {
  bugAsset: string;
};

export default function BugCaughtStage({ bugAsset }: BugCaughtStageProps) {
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  const setup = useCallback(({ scene, camera, renderer }: ThreeStageContext) => {
    const root = new THREE.Group();
    const loader = new GLTFLoader();
    let disposed = false;

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    scene.background = new THREE.Color("#dfe9d9");
    scene.add(root);

    const ambient = new THREE.HemisphereLight("#fff8e8", "#80907c", 2);
    const key = new THREE.DirectionalLight("#fff1c4", 2.7);
    const fill = new THREE.DirectionalLight("#d7f0ff", 1.25);
    key.position.set(2.5, 4.5, 3.5);
    fill.position.set(-2.4, 2.8, 2.2);
    scene.add(ambient, key, fill);

    camera.position.set(0, 0, 4.2);
    camera.lookAt(0, 0, 0);

    loader.load(
      `/meshes/bugs/${bugAsset}`,
      (gltf) => {
        if (disposed) {
          disposeObject3D(gltf.scene);
          return;
        }

        const model = gltf.scene;
        const modelRoot = new THREE.Group();
        const bounds = new THREE.Box3().setFromObject(model);
        const size = bounds.getSize(new THREE.Vector3());
        const centre = bounds.getCenter(new THREE.Vector3());
        const largestDimension = Math.max(size.x, size.y, size.z, 0.001);

        model.position.sub(centre);
        model.rotation.set(0.18, -0.32, 0);
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) child.castShadow = true;
        });
        modelRoot.add(model);
        modelRoot.scale.setScalar(1.7 / largestDimension);
        root.add(modelRoot);
        setLoadState("ready");
      },
      undefined,
      (error) => {
        console.error("Failed to load caught bug model.", error);
        setLoadState("error");
      },
    );

    const onFrame = ({ elapsed }: ThreeStageFrame) => {
      root.position.y = Math.sin(elapsed * 2.1) * 0.05;
      root.rotation.y = Math.sin(elapsed * 0.7) * 0.35;
    };

    return {
      onFrame,
      dispose: () => {
        disposed = true;
        scene.remove(root, ambient, key, fill);
        disposeObject3D(root);
      },
    };
  }, [bugAsset]);

  return (
    <div className="watering-reward-stage">
      <ThreeStage className="watering-reward-stage-canvas" setup={setup} fallback={<div className="watering-stage-fallback" />} />
      {loadState !== "ready" ? <div className="watering-reward-stage-status" role="status">{loadState === "loading" ? "Loading bug mesh" : "Bug mesh failed to load"}</div> : null}
    </div>
  );
}
