import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";

const loaderMock = vi.hoisted(() => ({ load: vi.fn() }));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/app/components/threejs", () => ({
  ThreeStage: () => null,
  disposeObject3D: vi.fn(),
}));

vi.mock("@/lib/fish-assets", () => ({
  getFishAssetPath: (kind: string) => `/meshes/fishes/${kind}.glb`,
}));

vi.mock("./dashboardCharacter", () => ({
  loadDashboardCharacter: vi.fn(),
}));

vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: class {
    load(...args: unknown[]) {
      loaderMock.load(...args);
    }
  },
}));

import {
  addCourtyardDoor,
  addCourtyardEnvironment,
  addCourtyardPond,
  courtyardPositions,
  courtyardFishSwimDepth,
  courtyardPondWaterSurfaceY,
  playRabbitMerchantIdle,
  rabbitMerchantModelUrl,
} from "./DashboardCourtyardScene";

describe("dashboard courtyard", () => {
  it("lays out the pond and merchant on opposite sides of the activity centre", () => {
    const parent = new THREE.Group();
    const environment = addCourtyardEnvironment(parent);
    const door = addCourtyardDoor(parent);

    expect(parent.children).toContain(environment);
    expect(parent.children).toContain(door.object);
    expect(courtyardPositions.pond[0]).toBeLessThan(0);
    expect(courtyardPositions.merchant[0]).toBeGreaterThan(0);
    expect(
      environment.getObjectByName("dashboard-courtyard-shade-tree"),
    ).toBeTruthy();
  });

  it("shows a soft room preview behind the open courtyard door", () => {
    const parent = new THREE.Group();
    const door = addCourtyardDoor(parent);
    const preview = door.object.getObjectByName(
      "dashboard-courtyard-room-preview",
    ) as THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
    const panel = door.object.getObjectByName(
      "dashboard-courtyard-door-panel",
    );

    expect(preview).toBeTruthy();
    expect(preview.material).toBeInstanceOf(THREE.ShaderMaterial);
    expect(preview.geometry.parameters.width).toBeCloseTo(1.34);
    expect(preview.geometry.parameters.height).toBeCloseTo(2.58);
    expect(preview.position.z).toBeLessThan(0.08);
    expect(preview.position.z).toBeGreaterThan(-0.19);
    expect(preview.material.fragmentShader).toContain("windowGlow");
    expect(preview.material.fragmentShader).toContain("table");

    door.update(1);
    expect(panel?.parent?.rotation.y).toBeGreaterThan(1);
  });

  it("loads the user-provided rabbit merchant and loops its idle animation", () => {
    expect(rabbitMerchantModelUrl).toBe(
      "/meshes/characters/rabbit_merchant.glb",
    );

    const rabbit = new THREE.Group();
    const idle = new THREE.AnimationClip("idle", 1, [
      new THREE.NumberKeyframeTrack(".rotation[y]", [0, 1], [0, 0.4]),
    ]);
    const mixer = playRabbitMerchantIdle(rabbit, [idle]);
    const action = mixer?.existingAction(idle);

    expect(mixer).toBeTruthy();
    expect(action?.isRunning()).toBe(true);
    mixer?.update(0.5);
    expect(rabbit.rotation.y).toBeGreaterThan(0);
  });

  it("shows at most the eight most recent fish and can refresh in place", () => {
    loaderMock.load.mockClear();
    const parent = new THREE.Group();
    const fish = Array.from({ length: 10 }, (_, index) => ({
      id: `fish-${index}`,
      fishKind: "fish1" as const,
    }));
    const pond = addCourtyardPond(parent, fish);

    expect(loaderMock.load).toHaveBeenCalledTimes(8);
    pond.update(1.8);
    pond.object.children
      .filter((child) => child.name.startsWith("dashboard-courtyard-fish-"))
      .forEach((fishGroup) => {
        expect(fishGroup.position.y).toBeLessThan(
          courtyardPondWaterSurfaceY - 0.09,
        );
        expect(fishGroup.position.y).toBeGreaterThanOrEqual(
          courtyardFishSwimDepth.baseY - courtyardFishSwimDepth.bobAmount,
        );
      });
    pond.setFish([{ id: "new-fish", fishKind: "fish2" }]);
    expect(loaderMock.load).toHaveBeenCalledTimes(9);
    expect(parent.children).toContain(pond.object);
  });
});
