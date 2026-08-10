import * as THREE from "three";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/app/components/threejs", () => ({
  ThreeStage: () => null,
  disposeObject3D: vi.fn(),
}));

vi.mock("./dashboardCharacter", () => ({
  loadDashboardCharacter: vi.fn(),
}));

import DashboardBedroomScene, {
  addBedroomDoor,
  addBedroomEnvironment,
  bedroomBedInteraction,
  bedroomPositions,
} from "./DashboardBedroomScene";
import {
  dashboardBedroomDoorOpenAngle,
  dashboardBedroomDoorStyle,
} from "./dashboardBedroomDoor";

describe("dashboard bedroom", () => {
  it("balances the bed, wardrobe, and right-wall return door", () => {
    const parent = new THREE.Group();
    const environment = addBedroomEnvironment(parent);
    const door = addBedroomDoor(parent);

    expect(parent.children).toContain(environment.object);
    expect(parent.children).toContain(door.object);
    expect(environment.bed.position.toArray()).toEqual(bedroomPositions.bed);
    expect(environment.wardrobe.position.toArray()).toEqual(
      bedroomPositions.wardrobe,
    );
    expect(bedroomPositions.bed[0]).toBeLessThan(0);
    expect(bedroomPositions.wardrobe[0]).toBeGreaterThan(0);
    expect(bedroomPositions.door[0]).toBeGreaterThan(5.5);
    expect(
      environment.object.getObjectByName("dashboard-bedroom-window"),
    ).toBeTruthy();
    expect(
      environment.object.getObjectByName("dashboard-bedroom-nightstand"),
    ).toBeTruthy();
    expect(
      environment.object.getObjectByName("dashboard-bedroom-plant"),
    ).toBeTruthy();
  });

  it("uses a single horizontal bed with its head and window on the left wall", () => {
    const parent = new THREE.Group();
    const environment = addBedroomEnvironment(parent);
    const frame = environment.bed.getObjectByName(
      "dashboard-bedroom-bed-frame",
    ) as THREE.Mesh<THREE.BoxGeometry>;
    const headboard = environment.bed.getObjectByName(
      "dashboard-bedroom-bed-headboard",
    );
    const pillows = environment.bed.children.filter((child) =>
      child.name.startsWith("dashboard-bedroom-bed-pillow"),
    );
    const window = environment.object.getObjectByName(
      "dashboard-bedroom-window",
    );

    expect(frame.geometry.parameters.width).toBeCloseTo(3.6);
    expect(frame.geometry.parameters.depth).toBeCloseTo(2);
    expect(frame.geometry.parameters.width).toBeGreaterThan(
      frame.geometry.parameters.depth * 1.5,
    );
    expect(headboard?.position.x).toBeLessThan(-1.7);
    expect(pillows).toHaveLength(1);
    expect(window?.position.toArray()).toEqual(bedroomPositions.window);
    expect(window?.rotation.y).toBeCloseTo(Math.PI / 2);
    expect(window?.position.x).toBeLessThan(-6);
  });

  it("keeps the moved plant and nightstand clear of the widened bed", () => {
    const parent = new THREE.Group();
    const environment = addBedroomEnvironment(parent);
    const door = addBedroomDoor(parent);
    const plant = environment.object.getObjectByName(
      "dashboard-bedroom-plant",
    )!;
    const nightstand = environment.object.getObjectByName(
      "dashboard-bedroom-nightstand",
    )!;
    parent.updateMatrixWorld(true);

    const plantBox = new THREE.Box3().setFromObject(plant);
    const wardrobeBox = new THREE.Box3().setFromObject(environment.wardrobe);
    const bedBox = new THREE.Box3().setFromObject(environment.bed);
    const doorBox = new THREE.Box3().setFromObject(door.object);
    const nightstandBox = new THREE.Box3().setFromObject(nightstand);

    expect(plant.position.toArray()).toEqual(bedroomPositions.plant);
    expect(plantBox.intersectsBox(wardrobeBox)).toBe(false);
    expect(plantBox.intersectsBox(bedBox)).toBe(false);
    expect(plantBox.intersectsBox(doorBox)).toBe(false);
    expect(nightstand.position.toArray()).toEqual(bedroomPositions.nightstand);
    expect(nightstandBox.intersectsBox(bedBox)).toBe(false);
    expect(bedBox.min.x).toBeGreaterThan(-6.04);
    expect(bedBox.min.z).toBeGreaterThan(-5.19);
  });

  it("uses separate approach and raised bed-edge sitting positions", () => {
    const parent = new THREE.Group();
    const environment = addBedroomEnvironment(parent);
    parent.updateMatrixWorld(true);
    const bedBox = new THREE.Box3().setFromObject(environment.bed);
    const mattress = environment.bed.getObjectByName(
      "dashboard-bedroom-bed-mattress",
    )!;
    const mattressBox = new THREE.Box3().setFromObject(mattress);
    const approach = new THREE.Vector3(...bedroomBedInteraction.approach);
    const seated = new THREE.Vector3(...bedroomBedInteraction.seated);
    const hips = seated
      .clone()
      .add(new THREE.Vector3(...bedroomBedInteraction.sitHipsOffset));

    expect(bedBox.containsPoint(approach)).toBe(false);
    expect(approach.z).toBeGreaterThan(bedBox.max.z);
    expect(seated.y).toBeGreaterThan(0.7);
    expect(hips.y).toBeGreaterThan(0.89);
    expect(hips.z).toBeLessThan(mattressBox.max.z);
    expect(hips.z).toBeGreaterThan(mattressBox.min.z);
  });

  it("opens the return door around its hinge without exposing a wall", () => {
    const parent = new THREE.Group();
    const door = addBedroomDoor(parent);
    const leaf = door.object.getObjectByName(
      "dashboard-bedroom-return-door-leaf",
    );

    expect(
      door.object.getObjectByName("dashboard-bedroom-room-preview"),
    ).toBeTruthy();
    const panel = door.object.getObjectByName(
      "dashboard-bedroom-return-door-panel",
    ) as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
    expect(
      door.object.getObjectByName(
        "dashboard-bedroom-return-door-moon-emblem",
      ),
    ).toBeTruthy();
    expect(`#${panel.material.color.getHexString()}`).toBe(
      dashboardBedroomDoorStyle.leaf,
    );
    door.update(1);
    expect(leaf?.rotation.y).toBeCloseTo(-dashboardBedroomDoorOpenAngle);
  });

  it("renders keyboard hotspots for returning, resting, and the future wardrobe", () => {
    const markup = renderToStaticMarkup(
      <DashboardBedroomScene
        onReturnComplete={vi.fn()}
        onWardrobeClick={vi.fn()}
      />,
    );

    expect(markup).toContain('id="dashboard-bedroom-door-trigger"');
    expect(markup).toContain('id="dashboard-bedroom-bed-trigger"');
    expect(markup).toContain('id="dashboard-bedroom-wardrobe-trigger"');
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain("restOnBed");
    expect(markup).toContain("openWardrobe");
  });
});
