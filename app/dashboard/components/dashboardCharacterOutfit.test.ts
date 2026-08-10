import { readFileSync } from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { describe, expect, it } from "vitest";
import {
  createDashboardCharacterOutfit,
  mossCardiganSourceMeshNames,
} from "./dashboardCharacterOutfit";

async function loadCharacterModel() {
  const source = readFileSync("public/meshes/characters/male.glb");
  const data = source.buffer.slice(
    source.byteOffset,
    source.byteOffset + source.byteLength,
  ) as ArrayBuffer;
  return new GLTFLoader().parseAsync(data, "");
}

describe("dashboard character outfit", () => {
  it("builds the cardigan from the registered skinned source meshes", async () => {
    const gltf = await loadCharacterModel();
    const controller = createDashboardCharacterOutfit(
      gltf.scene,
      "moss-cardigan",
    );
    const torso = gltf.scene.getObjectByName(
      "Character005",
    ) as THREE.SkinnedMesh;
    const cardiganTorso = gltf.scene.getObjectByName(
      "dashboard-outfit-moss-cardigan-torso",
    ) as THREE.SkinnedMesh;

    expect(controller).toBeTruthy();
    mossCardiganSourceMeshNames.forEach((name) => {
      expect(gltf.scene.getObjectByName(name)).toBeInstanceOf(THREE.SkinnedMesh);
      expect(gltf.scene.getObjectByName(name)?.visible).toBe(false);
    });
    expect(cardiganTorso).toBeInstanceOf(THREE.SkinnedMesh);
    expect(cardiganTorso.skeleton).toBe(torso.skeleton);
    expect(cardiganTorso.geometry.getAttribute("skinIndex").count).toBe(
      torso.geometry.getAttribute("skinIndex").count,
    );
    expect(
      gltf.scene.getObjectByName("dashboard-outfit-moss-cardigan-placket"),
    ).toBeInstanceOf(THREE.SkinnedMesh);
    expect(
      gltf.scene.getObjectByName("dashboard-outfit-moss-cardigan-button-3"),
    ).toBeInstanceOf(THREE.SkinnedMesh);
  });

  it("switches without duplicating meshes and restores the base outfit", async () => {
    const gltf = await loadCharacterModel();
    const controller = createDashboardCharacterOutfit(gltf.scene, "base")!;
    const countGarments = () => {
      let count = 0;
      gltf.scene.traverse((object) => {
        if (object.name.startsWith("dashboard-outfit-moss-cardigan-")) {
          count += 1;
        }
      });
      return count;
    };

    expect(countGarments()).toBe(11);
    expect(gltf.scene.getObjectByName("Character005")?.visible).toBe(true);
    expect(
      gltf.scene.getObjectByName("dashboard-outfit-moss-cardigan-torso")
        ?.visible,
    ).toBe(false);

    controller.setOutfit("moss-cardigan");
    controller.setOutfit("moss-cardigan");
    expect(countGarments()).toBe(11);
    expect(gltf.scene.getObjectByName("Character005")?.visible).toBe(false);

    controller.setOutfit("base");
    expect(gltf.scene.getObjectByName("Character005")?.visible).toBe(true);
    controller.dispose();
    expect(countGarments()).toBe(0);
    expect(
      gltf.scene.getObjectByName("dashboard-outfit-honey-raincoat-torso"),
    ).toBeUndefined();
  });

  it("builds the honey raincoat with shared skinning and short coat details", async () => {
    const gltf = await loadCharacterModel();
    const controller = createDashboardCharacterOutfit(
      gltf.scene,
      "honey-raincoat",
    );
    const torso = gltf.scene.getObjectByName(
      "Character005",
    ) as THREE.SkinnedMesh;
    const raincoatTorso = gltf.scene.getObjectByName(
      "dashboard-outfit-honey-raincoat-torso",
    ) as THREE.SkinnedMesh;
    const hem = gltf.scene.getObjectByName(
      "dashboard-outfit-honey-raincoat-hem",
    ) as THREE.SkinnedMesh;

    expect(controller).toBeTruthy();
    expect(torso.visible).toBe(false);
    expect(raincoatTorso.skeleton).toBe(torso.skeleton);
    expect(raincoatTorso.geometry.getAttribute("skinWeight").count).toBe(
      torso.geometry.getAttribute("skinWeight").count,
    );
    expect(hem).toBeInstanceOf(THREE.SkinnedMesh);
    hem.geometry.computeBoundingBox();
    expect(hem.geometry.boundingBox?.min.y).toBeGreaterThanOrEqual(0.74);
    expect(
      gltf.scene.getObjectByName("dashboard-outfit-honey-raincoat-left-collar"),
    ).toBeInstanceOf(THREE.SkinnedMesh);
    expect(
      gltf.scene.getObjectByName("dashboard-outfit-honey-raincoat-pocket-2"),
    ).toBeInstanceOf(THREE.SkinnedMesh);
  });

  it("keeps the cardigan bound through every character animation", async () => {
    const gltf = await loadCharacterModel();
    const controller = createDashboardCharacterOutfit(
      gltf.scene,
      "moss-cardigan",
    )!;
    const torso = gltf.scene.getObjectByName(
      "Character005",
    ) as THREE.SkinnedMesh;
    const cardiganTorso = gltf.scene.getObjectByName(
      "dashboard-outfit-moss-cardigan-torso",
    ) as THREE.SkinnedMesh;
    const mixer = new THREE.AnimationMixer(gltf.scene);

    for (const clip of gltf.animations) {
      mixer.stopAllAction();
      mixer.clipAction(clip).reset().play();
      mixer.setTime(Math.min(clip.duration * 0.5, clip.duration));
      gltf.scene.updateMatrixWorld(true);
      expect(cardiganTorso.skeleton).toBe(torso.skeleton);
      expect(cardiganTorso.visible).toBe(true);
    }

    controller.dispose();
  });

  it("keeps the honey raincoat bound through every character animation", async () => {
    const gltf = await loadCharacterModel();
    const controller = createDashboardCharacterOutfit(
      gltf.scene,
      "honey-raincoat",
    )!;
    const torso = gltf.scene.getObjectByName(
      "Character005",
    ) as THREE.SkinnedMesh;
    const raincoatTorso = gltf.scene.getObjectByName(
      "dashboard-outfit-honey-raincoat-torso",
    ) as THREE.SkinnedMesh;
    const mixer = new THREE.AnimationMixer(gltf.scene);

    expect(gltf.animations.map((clip) => clip.name).sort()).toEqual([
      "idle",
      "sit",
      "walk",
      "wave",
    ]);
    for (const clip of gltf.animations) {
      mixer.stopAllAction();
      mixer.clipAction(clip).reset().play();
      mixer.setTime(Math.min(clip.duration * 0.5, clip.duration));
      gltf.scene.updateMatrixWorld(true);
      expect(raincoatTorso.skeleton).toBe(torso.skeleton);
      expect(raincoatTorso.visible).toBe(true);
    }

    controller.dispose();
  });
});
