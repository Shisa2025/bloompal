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
  getFishHorizontalYaw: (
    kind: string,
    facing: "left" | "right" = "right",
  ) => {
    const rightFacingYaw = ["fish1", "fish2", "fish3"].includes(kind)
      ? -Math.PI / 2
      : Math.PI / 2;
    return facing === "right" ? rightFacingYaw : -rightFacingYaw;
  },
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
  courtyardFishTargetLength,
  courtyardPondWaterSurfaceY,
  fitCourtyardFishModel,
  getCourtyardFishSwimY,
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

  it("centres each fish and keeps its highest bob below the water surface", () => {
    const model = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 4));
    body.position.set(0.6, 0.4, -1.2);
    model.add(body);

    const scaledHeight = fitCourtyardFishModel(model);
    const fittedBounds = new THREE.Box3().setFromObject(model);
    const fittedCentre = fittedBounds.getCenter(new THREE.Vector3());
    const swimY = getCourtyardFishSwimY(scaledHeight);
    const highestY =
      swimY + courtyardFishSwimDepth.bobAmount + scaledHeight / 2;

    expect(fittedCentre.x).toBeCloseTo(0);
    expect(fittedCentre.y).toBeCloseTo(0);
    expect(fittedCentre.z).toBeCloseTo(0);
    expect(Math.max(...fittedBounds.getSize(new THREE.Vector3()).toArray()))
      .toBeCloseTo(courtyardFishTargetLength);
    expect(body.renderOrder).toBe(2);
    expect((body.material as THREE.Material).depthTest).toBe(true);
    expect((body.material as THREE.Material).depthWrite).toBe(true);
    expect(highestY).toBeCloseTo(
      courtyardPondWaterSurfaceY - courtyardFishSwimDepth.surfaceClearance,
    );
    expect(highestY).toBeLessThan(courtyardPondWaterSurfaceY);
  });

  it("uses a transparent non-depth-writing water surface", () => {
    const parent = new THREE.Group();
    const pond = addCourtyardPond(parent, []);
    const water = pond.object.children[1] as THREE.Mesh<
      THREE.CylinderGeometry,
      THREE.MeshStandardMaterial
    >;

    expect(water.material.transparent).toBe(true);
    expect(water.material.opacity).toBeCloseTo(0.64);
    expect(water.material.depthWrite).toBe(false);
  });

  it("clears pond depth before drawing depth-tested fish", () => {
    const parent = new THREE.Group();
    const pond = addCourtyardPond(parent, []);
    const depthReset = pond.object.getObjectByName(
      "dashboard-courtyard-pond-depth-reset",
    ) as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
    const clearDepth = vi.fn();

    expect(depthReset).toBeTruthy();
    expect(depthReset.visible).toBe(false);
    expect(depthReset.frustumCulled).toBe(false);
    expect(depthReset.renderOrder).toBe(1);
    expect(depthReset.material.colorWrite).toBe(false);
    expect(depthReset.material.depthTest).toBe(false);
    expect(depthReset.material.depthWrite).toBe(false);

    const beforeRender = depthReset.onBeforeRender as unknown as (
      renderer: Pick<THREE.WebGLRenderer, "clearDepth">,
    ) => void;
    beforeRender({ clearDepth });
    expect(clearDepth).toHaveBeenCalledOnce();

    pond.setFish([{ id: "visible-fish", fishKind: "fish1" }]);
    expect(depthReset.visible).toBe(true);
    pond.setFish([]);
    expect(depthReset.visible).toBe(false);
  });

  it("keeps each fish in a separate activity zone", () => {
    loaderMock.load.mockClear();
    const parent = new THREE.Group();
    const fish = Array.from({ length: 8 }, (_, index) => ({
      id: `spacing-fish-${index}`,
      fishKind: "fish1" as const,
    }));
    const pond = addCourtyardPond(parent, fish);
    const fishGroups = pond.object.children.filter((child) =>
      child.name.startsWith("dashboard-courtyard-fish-spacing-fish-"),
    );

    expect(fishGroups).toHaveLength(8);
    [0, 0.75, 1.5, 2.25, 3, 4.5, 6, 8].forEach((elapsed) => {
      pond.update(elapsed);
      fishGroups.forEach((fishGroup, index) => {
        fishGroups.slice(index + 1).forEach((otherFishGroup) => {
          const planarDistance = Math.hypot(
            fishGroup.position.x - otherFishGroup.position.x,
            fishGroup.position.z - otherFishGroup.position.z,
          );
          expect(planarDistance).toBeGreaterThan(0.5);
        });
      });
    });
  });

  it.each([
    ["fish1", -1],
    ["fish4", 1],
  ] as const)(
    "keeps %s horizontal and facing its direction of travel",
    (fishKind, headAxisZ) => {
      loaderMock.load.mockClear();
      const parent = new THREE.Group();
      const pond = addCourtyardPond(parent, [
        { id: "direction-fish", fishKind },
      ]);
      const fishGroup = pond.object.getObjectByName(
        "dashboard-courtyard-fish-direction-fish",
      );
      if (!fishGroup) throw new Error("Courtyard fish group was not created.");

      const expectFishToFace = (
        elapsed: number,
        expectedDirection: "left" | "right",
      ) => {
        pond.update(elapsed);
        const headDirection = new THREE.Vector3(0, 0, headAxisZ)
          .applyEuler(fishGroup.rotation)
          .normalize();

        expect(headDirection.y).toBeCloseTo(0);
        expect(headDirection.z).toBeCloseTo(0);
        expect(headDirection.x).toBeCloseTo(
          expectedDirection === "right" ? 1 : -1,
        );
        expect(fishGroup.rotation.x).toBeCloseTo(0);
        expect(fishGroup.rotation.z).toBeCloseTo(0);
      };

      expectFishToFace(0, "right");
      expectFishToFace(Math.PI / 0.72, "left");
    },
  );
});
