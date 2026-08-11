import { renderToStaticMarkup } from "react-dom/server";
import * as THREE from "three";
import { describe, expect, it, vi } from "vitest";
import type {
  ThreeStageContext,
  ThreeStageLifecycle,
} from "@/app/components/threejs";
import {
  getFishHorizontalYaw,
  type FishKind,
} from "@/lib/fish-assets";

const threeStageMock = vi.hoisted(() => ({
  continuous: true,
  setup: null as unknown,
}));

vi.mock("@/app/components/threejs", () => ({
  ThreeStage: ({ continuous, setup }: { continuous?: boolean; setup: unknown }) => {
    threeStageMock.continuous = continuous ?? true;
    threeStageMock.setup = setup;
    return null;
  },
  disposeObject3D: vi.fn(),
}));

vi.mock("three/examples/jsm/loaders/GLTFLoader.js", () => ({
  GLTFLoader: class {
    load() {}
  },
}));

import FishModel from "./FishModel";

const fishHeadAxes = [
  ["fish1", -1],
  ["fish2", -1],
  ["fish3", -1],
  ["fish4", 1],
  ["fish5", 1],
  ["fish6", 1],
] as const satisfies readonly (readonly [FishKind, -1 | 1])[];

describe("FishModel", () => {
  it.each(fishHeadAxes)(
    "projects %s's head-to-tail axis horizontally and faces right",
    (fishKind, headAxisZ) => {
      renderToStaticMarkup(<FishModel fishKind={fishKind} />);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera();
      const context: ThreeStageContext = {
        scene,
        camera,
        renderer: {} as THREE.WebGLRenderer,
        container: {} as HTMLDivElement,
        clock: new THREE.Clock(),
        reducedMotion: false,
        requestRender: vi.fn(),
      };
      const setup = threeStageMock.setup as (
        context: ThreeStageContext,
      ) => ThreeStageLifecycle;
      const lifecycle = setup(context);
      const modelRoot = scene.children.find(
        (child): child is THREE.Group => child instanceof THREE.Group,
      );
      if (!modelRoot) throw new Error("Fish model root was not created.");

      lifecycle.onFrame?.({ ...context, delta: 0, elapsed: 0 });
      const horizontalYaw = getFishHorizontalYaw(fishKind);
      const headDirection = new THREE.Vector3(0, 0, headAxisZ).applyEuler(
        modelRoot.rotation,
      );

      expect(modelRoot.rotation.y).toBeCloseTo(horizontalYaw);
      expect(modelRoot.rotation.z).toBeCloseTo(0);
      expect(headDirection.x).toBeGreaterThan(0.99);
      expect(headDirection.y).toBeCloseTo(0);

      lifecycle.onFrame?.({
        ...context,
        delta: 0,
        elapsed: Math.PI / (2 * 1.8),
      });
      expect(modelRoot.rotation.y).toBeCloseTo(
        horizontalYaw + 0.08,
      );
      expect(modelRoot.rotation.z).toBeCloseTo(0);
    },
  );

  it("can disable continuous WebGL rendering for externally animated fish", () => {
    renderToStaticMarkup(<FishModel fishKind="fish1" animated={false} />);

    expect(threeStageMock.continuous).toBe(false);
  });
});
