import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/app/components/threejs", () => ({
  ThreeStage: () => null,
  disposeObject3D: vi.fn(),
}));

vi.mock("@/app/components/threejs/flowerModels", () => ({
  prepareFlowerModelForDisplay: vi.fn(),
}));

import {
  addGramophone,
  addRoomDoor,
  dashboardBedroomDoorPosition,
  dashboardBedroomExitPath,
  dashboardRoomDoorPosition,
  dashboardTableDisplayPositions,
  getDashboardHomeSceneViewConfig,
} from "./DashboardHomeScene";
import { dashboardBedroomDoorStyle } from "./dashboardBedroomDoor";

describe("dashboard room capture view", () => {
  it("uses the normal dashboard camera and lighting for wide snapshots", () => {
    expect(getDashboardHomeSceneViewConfig("dashboard", false)).toEqual({
      cameraPosition: [0, 3.2, 8.25],
      fov: 38,
      hemisphereIntensity: 1.2,
      target: [0, 1.7, -2.6],
      toneMappingExposure: 1.05,
      windowLightIntensity: 3.6,
    });
  });

  it("keeps the old portrait framing available independently of embedding", () => {
    const dashboardView = getDashboardHomeSceneViewConfig("dashboard", false);
    const portraitView = getDashboardHomeSceneViewConfig("portrait", false);

    expect(portraitView.cameraPosition).not.toEqual(
      dashboardView.cameraPosition,
    );
    expect(portraitView.toneMappingExposure).toBeLessThan(
      dashboardView.toneMappingExposure,
    );
  });
});

describe("dashboard gramophone", () => {
  it("mounts at the left side of the rear table and spins both record layers", () => {
    const parent = new THREE.Group();
    const gramophone = addGramophone(parent);
    const record = gramophone.object.getObjectByName("dashboard-gramophone-record");
    const label = gramophone.object.getObjectByName("dashboard-gramophone-record-label");

    expect(parent.children).toContain(gramophone.object);
    expect(gramophone.object.position.toArray()).toEqual(
      dashboardTableDisplayPositions.gramophone,
    );
    expect(record).toBeTruthy();
    expect(label).toBeTruthy();

    gramophone.update(0.5);
    expect(record?.rotation.y).toBeCloseTo(0.85);
    expect(label?.rotation.y).toBeCloseTo(record?.rotation.y ?? 0);
  });

  it("keeps the gramophone, flower, and fruit basket evenly spaced", () => {
    const gramophoneX = dashboardTableDisplayPositions.gramophone[0];
    const flowerX = dashboardTableDisplayPositions.flowerPot[0];
    const fruitBasketX = dashboardTableDisplayPositions.fruitBasket[0];

    expect(flowerX - gramophoneX).toBeCloseTo(1.4);
    expect(fruitBasketX - flowerX).toBeCloseTo(1.4);
  });
});

describe("dashboard room door", () => {
  it("mounts the courtyard door on the room's right-hand wall", () => {
    const parent = new THREE.Group();
    const door = addRoomDoor(parent, {
      wood: new THREE.MeshStandardMaterial(),
    });

    expect(parent.children).toContain(door.object);
    expect(door.object.position.toArray()).toEqual(dashboardRoomDoorPosition);
    expect(dashboardRoomDoorPosition[0]).toBeGreaterThan(6.5);
    expect(door.object.rotation.y).toBeCloseTo(-Math.PI / 2);
    expect(door.object.getObjectByName("dashboard-room-door-leaf")).toBeTruthy();
    expect(
      door.object.getObjectByName("dashboard-room-door-outdoor-preview"),
    ).toBeTruthy();
  });

  it("opens the right-wall door around its hinge", () => {
    const parent = new THREE.Group();
    const door = addRoomDoor(parent, {
      wood: new THREE.MeshStandardMaterial(),
    });
    const leaf = door.object.getObjectByName("dashboard-room-door-leaf");

    door.update(1);
    expect(leaf?.rotation.y).toBeCloseTo(-1.18);
  });

  it("mounts a mirrored bedroom door on the left wall with a warm preview", () => {
    const parent = new THREE.Group();
    const door = addRoomDoor(
      parent,
      { wood: new THREE.MeshStandardMaterial() },
      "bedroom",
    );

    expect(door.object.position.toArray()).toEqual(dashboardBedroomDoorPosition);
    expect(dashboardBedroomDoorPosition[0]).toBeLessThan(-6.5);
    expect(door.object.rotation.y).toBeCloseTo(Math.PI / 2);
    expect(
      door.object.getObjectByName("dashboard-room-bedroom-door-leaf"),
    ).toBeTruthy();
    expect(
      door.object.getObjectByName("dashboard-room-bedroom-preview"),
    ).toBeTruthy();

    const leaf = door.object.getObjectByName(
      "dashboard-room-bedroom-door-leaf",
    );
    const panel = door.object.getObjectByName(
      "dashboard-room-bedroom-door-panel",
    );
    const handle = door.object.getObjectByName(
      "dashboard-room-bedroom-door-handle",
    );
    const courtyardParent = new THREE.Group();
    const courtyardDoor = addRoomDoor(courtyardParent, {
      wood: new THREE.MeshStandardMaterial(),
    });
    const courtyardPanel = courtyardDoor.object.getObjectByName(
      "dashboard-room-door-panel",
    ) as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
    const bedroomPanel = panel as THREE.Mesh<
      THREE.BoxGeometry,
      THREE.MeshStandardMaterial
    >;
    expect(leaf?.position.x).toBeCloseTo(0.67);
    expect(panel?.position.x).toBeCloseTo(-0.67);
    expect(handle?.position.x).toBeCloseTo(-1.11);
    expect(
      door.object.getObjectByName(
        "dashboard-room-bedroom-door-moon-emblem",
      ),
    ).toBeTruthy();
    expect(`#${bedroomPanel.material.color.getHexString()}`).toBe(
      dashboardBedroomDoorStyle.leaf,
    );
    expect(bedroomPanel.material.color.equals(courtyardPanel.material.color)).toBe(
      false,
    );
    door.update(1);
    expect(leaf?.rotation.y).toBeCloseTo(-THREE.MathUtils.degToRad(81));
  });

  it("opens the bedroom door before the centered path crosses the left wall", () => {
    const parent = new THREE.Group();
    const door = addRoomDoor(
      parent,
      { wood: new THREE.MeshStandardMaterial() },
      "bedroom",
    );
    door.update(1);
    parent.updateMatrixWorld(true);

    const obstructions = [
      "dashboard-room-bedroom-door-panel",
      "dashboard-room-bedroom-door-frame-left",
      "dashboard-room-bedroom-door-frame-right",
    ].map(
      (name) =>
        new THREE.Box3().setFromObject(door.object.getObjectByName(name)!),
    );
    const start = new THREE.Vector3(0.2, 0, 1.25);
    const control = new THREE.Vector3(...dashboardBedroomExitPath.control);
    const end = new THREE.Vector3(...dashboardBedroomExitPath.end);

    for (const progress of [0.9, 0.92, 0.94, 0.96, 0.98, 1]) {
      const inverse = 1 - progress;
      const center = new THREE.Vector3(
        inverse * inverse * start.x +
          2 * inverse * progress * control.x +
          progress * progress * end.x,
        0,
        inverse * inverse * start.z +
          2 * inverse * progress * control.z +
          progress * progress * end.z,
      );
      const characterBox = new THREE.Box3(
        new THREE.Vector3(center.x - 0.24, 0.02, center.z - 0.26),
        new THREE.Vector3(center.x + 0.24, 1.9, center.z + 0.26),
      );

      for (const obstruction of obstructions) {
        expect(characterBox.intersectsBox(obstruction)).toBe(false);
      }
    }

    expect(
      dashboardBedroomExitPath.doorOpenStart +
        dashboardBedroomExitPath.doorOpenDuration,
    ).toBeLessThan(0.9);
    expect(end.x).toBeLessThan(-7.1);
    expect(end.z).toBeCloseTo(dashboardBedroomDoorPosition[2]);
  });

  it("overlaps the door leaf and frame edges so no wall gap is visible", () => {
    const parent = new THREE.Group();
    const door = addRoomDoor(
      parent,
      { wood: new THREE.MeshStandardMaterial() },
      "bedroom",
    );
    const leafPivot = door.object.getObjectByName(
      "dashboard-room-bedroom-door-leaf",
    );
    const leaf = leafPivot?.children[0] as THREE.Mesh;
    const frameSides = door.object.children.filter(
      (child) => Math.abs(child.position.x) > 0.7,
    ) as THREE.Mesh[];
    const leafWidth = (leaf.geometry as THREE.BoxGeometry).parameters.width;
    const frameWidth = (frameSides[0].geometry as THREE.BoxGeometry).parameters.width;
    const innerFrameEdge = Math.abs(frameSides[0].position.x) - frameWidth / 2;

    expect(innerFrameEdge).toBeLessThanOrEqual(leafWidth / 2);
  });
});
