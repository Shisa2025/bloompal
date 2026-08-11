import { readFileSync } from "node:fs";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { describe, expect, it } from "vitest";
import {
  createDashboardCharacterOutfit,
  leafbackDinosaurSourceMeshNames,
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

  it("builds a head-free leafback dinosaur onesie and preserves the original hair", async () => {
    const gltf = await loadCharacterModel();
    const controller = createDashboardCharacterOutfit(
      gltf.scene,
      "leafback-dinosaur",
    );
    const torso = gltf.scene.getObjectByName(
      "Character005",
    ) as THREE.SkinnedMesh;
    const dinosaurTorso = gltf.scene.getObjectByName(
      "dashboard-outfit-leafback-dinosaur-torso",
    ) as THREE.SkinnedMesh;
    const dinosaurLeg = gltf.scene.getObjectByName(
      "dashboard-outfit-leafback-dinosaur-left-lower-leg",
    ) as THREE.SkinnedMesh;
    const tail = gltf.scene.getObjectByName(
      "dashboard-outfit-leafback-dinosaur-tail",
    ) as THREE.SkinnedMesh;

    expect(controller).toBeTruthy();
    leafbackDinosaurSourceMeshNames.forEach((name) => {
      expect(gltf.scene.getObjectByName(name)?.visible).toBe(false);
    });
    expect(gltf.scene.getObjectByName("Character")?.visible).toBe(true);
    expect(gltf.scene.getObjectByName("Character012")?.visible).toBe(true);
    expect(gltf.scene.getObjectByName("Character013")?.visible).toBe(true);
    expect(dinosaurTorso.skeleton).toBe(torso.skeleton);
    expect(dinosaurLeg.skeleton).toBe(torso.skeleton);
    expect(
      gltf.scene.getObjectByName(
        "dashboard-outfit-leafback-dinosaur-belly",
      ),
    ).toBeInstanceOf(THREE.SkinnedMesh);
    expect(
      gltf.scene.getObjectByName(
        "dashboard-outfit-leafback-dinosaur-back-spike-3",
      ),
    ).toBeInstanceOf(THREE.SkinnedMesh);
    expect(tail).toBeInstanceOf(THREE.SkinnedMesh);

    const dinosaurPartNames: string[] = [];
    gltf.scene.traverse((object) => {
      const prefix = "dashboard-outfit-leafback-dinosaur-";
      if (object.name.startsWith(prefix)) {
        dinosaurPartNames.push(object.name.slice(prefix.length));
      }
    });
    expect(dinosaurPartNames.sort()).toEqual(
      [
        "back-spike-1",
        "back-spike-2",
        "back-spike-3",
        "belly",
        "left-lower-leg",
        "left-lower-sleeve",
        "left-upper-leg",
        "left-upper-sleeve",
        "right-lower-leg",
        "right-lower-sleeve",
        "right-upper-leg",
        "right-upper-sleeve",
        "tail",
        "torso",
      ].sort(),
    );

    tail.geometry.computeBoundingBox();
    expect(tail.geometry.boundingBox?.min.z).toBeLessThan(-1.1);

    for (const outfitId of ["base", "honey-raincoat", "moss-cardigan"] as const) {
      controller?.setOutfit(outfitId);
      expect(gltf.scene.getObjectByName("Character012")?.visible).toBe(true);
      expect(gltf.scene.getObjectByName("Character013")?.visible).toBe(true);
      expect(dinosaurTorso.visible).toBe(false);
      controller?.setOutfit("leafback-dinosaur");
      expect(gltf.scene.getObjectByName("Character012")?.visible).toBe(true);
      expect(gltf.scene.getObjectByName("Character013")?.visible).toBe(true);
    }

    controller?.setOutfit("base");
    leafbackDinosaurSourceMeshNames.forEach((name) => {
      expect(gltf.scene.getObjectByName(name)?.visible).toBe(true);
    });
    expect(dinosaurTorso.visible).toBe(false);
    controller?.dispose();
    expect(gltf.scene.getObjectByName("Character012")?.visible).toBe(true);
    expect(gltf.scene.getObjectByName("Character013")?.visible).toBe(true);
    expect(
      gltf.scene.getObjectByName("dashboard-outfit-leafback-dinosaur-tail"),
    ).toBeUndefined();
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

  it("keeps the dinosaur onesie bound through every character animation", async () => {
    const gltf = await loadCharacterModel();
    const controller = createDashboardCharacterOutfit(
      gltf.scene,
      "leafback-dinosaur",
    )!;
    const torso = gltf.scene.getObjectByName(
      "Character005",
    ) as THREE.SkinnedMesh;
    const dinosaurTorso = gltf.scene.getObjectByName(
      "dashboard-outfit-leafback-dinosaur-torso",
    ) as THREE.SkinnedMesh;
    const tail = gltf.scene.getObjectByName(
      "dashboard-outfit-leafback-dinosaur-tail",
    ) as THREE.SkinnedMesh;
    const mixer = new THREE.AnimationMixer(gltf.scene);

    for (const clip of gltf.animations) {
      mixer.stopAllAction();
      mixer.clipAction(clip).reset().play();
      mixer.setTime(Math.min(clip.duration * 0.5, clip.duration));
      gltf.scene.updateMatrixWorld(true);
      expect(dinosaurTorso.skeleton).toBe(torso.skeleton);
      expect(dinosaurTorso.visible).toBe(true);
      expect(gltf.scene.getObjectByName("Character012")?.visible).toBe(true);
      expect(gltf.scene.getObjectByName("Character013")?.visible).toBe(true);
      expect(tail.visible).toBe(true);
    }

    controller.dispose();
  });
});
