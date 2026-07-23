"use client";

import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  ThreeStage,
  disposeObject3D,
  type ThreeStageContext,
  type ThreeStageFrame,
} from "@/app/components/threejs";

type MovingBugStageProps = {
  bugAsset: string;
  position: number;
};

export default function MovingBugStage({ bugAsset, position }: MovingBugStageProps) {
  const positionRef = useRef(position);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const setup = useCallback(({ scene, camera, renderer }: ThreeStageContext) => {
    const root = new THREE.Group();
    const loader = new GLTFLoader();
    let disposed = false;

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    camera.position.set(0, 0.65, 4.8);
    camera.lookAt(0, 0.45, 0);
    scene.add(root);

    const ambient = new THREE.HemisphereLight("#fff9e8", "#75926e", 2.2);
    const key = new THREE.DirectionalLight("#fff0c7", 2.8);
    const fill = new THREE.DirectionalLight("#d5efff", 1.15);
    key.position.set(2.8, 4.2, 3.8);
    fill.position.set(-2.6, 1.8, 2.2);
    scene.add(ambient, key, fill);

    loader.load(
      `/meshes/bugs/${bugAsset}`,
      (gltf) => {
        if (disposed) {
          disposeObject3D(gltf.scene);
          return;
        }

        const model = gltf.scene;
        const bounds = new THREE.Box3().setFromObject(model);
        const size = bounds.getSize(new THREE.Vector3());
        const centre = bounds.getCenter(new THREE.Vector3());
        const largestDimension = Math.max(size.x, size.y, size.z, 0.001);

        model.position.sub(centre);
        model.scale.setScalar(0.82 / largestDimension);
        model.rotation.set(0.18, -0.28, 0);
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
          }
        });
        root.add(model);
      },
      undefined,
      (error) => console.error("Failed to load mystery bug model.", error),
    );

    const onFrame = ({ elapsed }: ThreeStageFrame) => {
      root.position.x = positionRef.current * 1.48;
      root.position.y = 0.08 + Math.sin(elapsed * 5.4) * 0.045;
      root.rotation.y = Math.sin(elapsed * 2.8) * 0.12;
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

  return <ThreeStage className="collectbugs-bug-model-stage" setup={setup} fallback={<div />} />;
}
