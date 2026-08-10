"use client";

import { useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ThreeStage, disposeObject3D, type ThreeStageContext, type ThreeStageFrame } from "@/app/components/threejs";

export default function FishModel({ assetPath, ariaLabel, className = "" }: { assetPath: string; ariaLabel?: string; className?: string }) {
  const setup = useCallback(({ scene, camera, renderer }: ThreeStageContext) => {
    const root = new THREE.Group();
    const loader = new GLTFLoader();
    let disposed = false;

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    camera.position.set(0, 0.05, 3.25);
    camera.lookAt(0, 0, 0);
    scene.add(root);

    const ambient = new THREE.HemisphereLight("#fff8df", "#56909a", 2.4);
    const key = new THREE.DirectionalLight("#fff0c8", 3.1);
    const fill = new THREE.DirectionalLight("#bdeeff", 1.35);
    key.position.set(3, 4, 4);
    fill.position.set(-3, 1.5, 3);
    scene.add(ambient, key, fill);

    loader.load(assetPath, (gltf) => {
      if (disposed) {
        disposeObject3D(gltf.scene);
        return;
      }
      const model = gltf.scene;
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const centre = bounds.getCenter(new THREE.Vector3());
      model.position.sub(centre);
      model.scale.setScalar(1.65 / Math.max(size.x, size.y, size.z, 0.001));
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) child.castShadow = true;
      });
      root.add(model);
    }, undefined, (error) => console.error(`Failed to load fish model ${assetPath}.`, error));

    const onFrame = ({ elapsed }: ThreeStageFrame) => {
      root.position.y = Math.sin(elapsed * 2.4) * 0.035;
      root.rotation.y = Math.sin(elapsed * 1.8) * 0.08;
    };

    return {
      onFrame,
      dispose: () => {
        disposed = true;
        scene.remove(root, ambient, key, fill);
        disposeObject3D(root);
      },
    };
  }, [assetPath]);

  return <ThreeStage className={`fish-model-stage ${className}`.trim()} setup={setup} ariaLabel={ariaLabel} fallback={<span className="fish-model-fallback" aria-hidden="true" />} />;
}
