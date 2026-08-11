import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  fruitRewardTargetSize,
  prepareFruitRewardModel,
} from "./FruitRewardStage";

describe("FruitRewardStage", () => {
  it("centres and uniformly fits a fruit model for the reward stage", () => {
    const model = new THREE.Group();
    const fruit = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 1));
    fruit.position.set(0.7, 1.4, -0.5);
    model.add(fruit);

    prepareFruitRewardModel(model);

    const bounds = new THREE.Box3().setFromObject(model);
    const centre = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());

    expect(centre.x).toBeCloseTo(0);
    expect(centre.y).toBeCloseTo(0);
    expect(centre.z).toBeCloseTo(0);
    expect(Math.max(size.x, size.y, size.z)).toBeCloseTo(
      fruitRewardTargetSize,
    );
    expect(fruit.castShadow).toBe(true);
    expect(fruit.receiveShadow).toBe(true);
  });
});
