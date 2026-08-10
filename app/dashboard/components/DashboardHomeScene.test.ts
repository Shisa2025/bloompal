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
  dashboardTableDisplayPositions,
} from "./DashboardHomeScene";

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
