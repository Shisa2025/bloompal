"use client";

import { useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ThreeStage, disposeObject3D, type ThreeStageContext, type ThreeStageFrame } from "@/app/components/threejs";
import { getFishAssetPath, type FishKind } from "@/lib/fish-assets";

const positions = [
  { x: -1.35, y: 0.05, delay: 0.1 }, { x: -0.48, y: 0.38, delay: 1.2 },
  { x: 0.42, y: -0.12, delay: 2.1 }, { x: 1.28, y: 0.3, delay: 3.3 },
  { x: -1.05, y: -0.42, delay: 4.1 }, { x: -0.05, y: 0.02, delay: 5.2 },
  { x: 0.82, y: -0.42, delay: 6.4 }, { x: 1.5, y: -0.18, delay: 7.1 },
] as const;

export default function FishPondStage({ fishKinds }: { fishKinds: FishKind[] }) {
  const assetKey = fishKinds.join("|");
  const setup = useCallback(({ scene, camera, renderer }: ThreeStageContext) => {
    const root = new THREE.Group();
    const fishGroups: THREE.Group[] = [];
    const loader = new GLTFLoader();
    let disposed = false;

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    camera.position.set(0, 0.2, 5.2);
    camera.lookAt(0, 0, 0);
    scene.add(root);

    const ambient = new THREE.HemisphereLight("#fff8df", "#4b8791", 2.5);
    const key = new THREE.DirectionalLight("#fff0c8", 3);
    key.position.set(2.5, 4, 4);
    scene.add(ambient, key);

    fishKinds.forEach((kind, index) => {
      const placement = positions[index % positions.length];
      const group = new THREE.Group();
      group.position.set(placement.x, placement.y, index * 0.015);
      group.userData.baseX = placement.x;
      group.userData.baseY = placement.y;
      group.userData.delay = placement.delay;
      fishGroups.push(group);
      root.add(group);

      loader.load(getFishAssetPath(kind), (gltf) => {
        if (disposed) {
          disposeObject3D(gltf.scene);
          return;
        }
        const model = gltf.scene;
        const bounds = new THREE.Box3().setFromObject(model);
        const size = bounds.getSize(new THREE.Vector3());
        const centre = bounds.getCenter(new THREE.Vector3());
        model.position.sub(centre);
        model.scale.setScalar(0.98 / Math.max(size.x, size.y, size.z, 0.001));
        group.add(model);
      }, undefined, (error) => console.error(`Failed to load pond fish ${kind}.`, error));
    });

    const onFrame = ({ elapsed }: ThreeStageFrame) => {
      fishGroups.forEach((group, index) => {
        const phase = elapsed * (0.75 + (index % 3) * 0.08) + group.userData.delay;
        group.position.x = group.userData.baseX + Math.sin(phase) * 0.2;
        group.position.y = group.userData.baseY + Math.cos(phase * 1.35) * 0.07;
        group.rotation.y = Math.cos(phase) * 0.18;
        group.rotation.z = Math.sin(phase * 1.35) * 0.045;
      });
    };

    return {
      onFrame,
      dispose: () => {
        disposed = true;
        scene.remove(root, ambient, key);
        disposeObject3D(root);
      },
    };
  // Rebuild the single scene only when the visible fish collection changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetKey]);

  return <ThreeStage className="dashboard-pond-fish-stage" setup={setup} fallback={<span />} />;
}
