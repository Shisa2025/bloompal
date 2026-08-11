"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  ThreeStage,
  disposeObject3D,
  type ThreeStageContext,
  type ThreeStageFrame,
  type ThreeStageResize,
} from "@/app/components/threejs";
import {
  getFishAssetPath,
  getFishHorizontalYaw,
  type FishKind,
} from "@/lib/fish-assets";
import { loadDashboardCharacter } from "./dashboardCharacter";
import {
  defaultDashboardOutfitId,
  type DashboardOutfitId,
} from "./dashboardOutfits";

export const rabbitMerchantModelUrl = "/meshes/characters/rabbit_merchant.glb";

export const courtyardPositions = {
  characterRest: [-0.25, 0, -0.35],
  door: [-4.45, 0, -5.72],
  merchant: [4.15, 0, -2.35],
  pond: [-4.2, 0, -0.85],
} as const;

export const courtyardPondWaterSurfaceY = 0.1575;
export const courtyardFishSwimDepth = {
  baseY: 0.045,
  bobAmount: 0.01,
  surfaceClearance: 0.015,
} as const;
export const courtyardFishTargetLength = 0.38;
const courtyardFishDepthResetRenderOrder = 1;
const courtyardFishRenderOrder = 2;

const courtyardFishOrigins = [
  [-1.2, -0.48],
  [-0.4, -0.5],
  [0.4, -0.48],
  [1.2, -0.5],
  [-1.15, 0.42],
  [-0.38, 0.45],
  [0.38, 0.43],
  [1.15, 0.42],
] as const;

const characterEntryPosition = new THREE.Vector3(-4.2, 0, -5.05);
const characterRestPosition = new THREE.Vector3(...courtyardPositions.characterRest);

type Transform = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  castShadow?: boolean;
  receiveShadow?: boolean;
};

type CourtyardFish = { id: string; fishKind: FishKind };

type DashboardCourtyardSceneProps = {
  fish: CourtyardFish[];
  outfitId?: DashboardOutfitId;
  onMerchantClick?: () => void;
  onPondClick?: () => void;
  onReturnComplete?: () => void;
  onReturnTransitionStart?: () => void;
  onSceneReady?: () => void;
};

function applyTransform(object: THREE.Object3D, transform: Transform = {}) {
  if (transform.position) object.position.set(...transform.position);
  if (transform.rotation) object.rotation.set(...transform.rotation);
  if (transform.scale) object.scale.set(...transform.scale);
}

function createMesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  transform: Transform = {},
) {
  const mesh = new THREE.Mesh(geometry, material);
  applyTransform(mesh, transform);
  mesh.castShadow = Boolean(transform.castShadow);
  mesh.receiveShadow = Boolean(transform.receiveShadow);
  return mesh;
}

function createBox(
  size: [number, number, number],
  material: THREE.Material,
  transform: Transform = {},
) {
  return createMesh(new THREE.BoxGeometry(...size), material, transform);
}

function createCourtyardMaterials() {
  return {
    bark: new THREE.MeshStandardMaterial({ color: "#775238", roughness: 0.92 }),
    bench: new THREE.MeshStandardMaterial({ color: "#9a704f", roughness: 0.78 }),
    fence: new THREE.MeshStandardMaterial({ color: "#b5916c", roughness: 0.88 }),
    grass: new THREE.MeshStandardMaterial({ color: "#9fbd83", roughness: 0.96 }),
    hedge: new THREE.MeshStandardMaterial({ color: "#63825e", roughness: 0.96 }),
    house: new THREE.MeshStandardMaterial({ color: "#e8d6bc", roughness: 0.94 }),
    leaf: new THREE.MeshStandardMaterial({ color: "#6f9568", roughness: 0.95 }),
    roof: new THREE.MeshStandardMaterial({ color: "#9a6249", roughness: 0.87 }),
    stone: new THREE.MeshStandardMaterial({ color: "#c7b9a2", roughness: 0.98 }),
    trim: new THREE.MeshStandardMaterial({ color: "#9b704f", roughness: 0.76 }),
  };
}

export function addCourtyardEnvironment(parent: THREE.Group) {
  const materials = createCourtyardMaterials();
  const environment = new THREE.Group();
  environment.name = "dashboard-courtyard-environment";

  environment.add(
    createMesh(new THREE.PlaneGeometry(19, 15), materials.grass, {
      position: [0, 0, -0.8],
      rotation: [-Math.PI / 2, 0, 0],
      receiveShadow: true,
    }),
    createBox([7.4, 4.9, 0.28], materials.house, {
      position: [-2.85, 2.45, -6.05],
      castShadow: true,
      receiveShadow: true,
    }),
    createBox([7.9, 0.5, 1.2], materials.roof, {
      position: [-2.85, 5.02, -5.92],
      rotation: [0.12, 0, 0],
      castShadow: true,
    }),
    createBox([1.6, 0.12, 1], materials.bench, {
      position: [1.2, 0.72, -3.45],
      castShadow: true,
    }),
    createBox([1.6, 0.12, 0.16], materials.bench, {
      position: [1.2, 1.18, -3.85],
      rotation: [-0.12, 0, 0],
      castShadow: true,
    }),
    createBox([0.12, 0.72, 0.12], materials.bench, {
      position: [0.58, 0.36, -3.68],
      castShadow: true,
    }),
    createBox([0.12, 0.72, 0.12], materials.bench, {
      position: [1.82, 0.36, -3.68],
      castShadow: true,
    }),
  );

  for (let index = 0; index < 7; index += 1) {
    const progress = index / 6;
    environment.add(
      createMesh(new THREE.CylinderGeometry(0.46, 0.55, 0.075, 20), materials.stone, {
        position: [
          THREE.MathUtils.lerp(-4.1, -0.2, progress),
          0.045,
          THREE.MathUtils.lerp(-4.95, -0.1, progress),
        ],
        rotation: [0, index % 2 === 0 ? 0.2 : -0.16, 0],
        scale: [1.25, 1, 0.82],
        receiveShadow: true,
      }),
    );
  }

  for (let index = 0; index < 8; index += 1) {
    const x = -7.1 + index * 2.05;
    environment.add(
      createBox([0.12, 1.15, 0.12], materials.fence, {
        position: [x, 0.58, -6.65],
        castShadow: true,
      }),
      createBox([2.05, 0.12, 0.12], materials.fence, {
        position: [x + 1.02, 0.82, -6.65],
        castShadow: true,
      }),
    );
  }

  [-6.6, 6.65].forEach((x) => {
    for (let index = 0; index < 5; index += 1) {
      environment.add(
        createMesh(new THREE.SphereGeometry(0.62, 18, 14), materials.hedge, {
          position: [x, 0.52, -4.5 + index * 1.55],
          scale: [0.85, 0.8, 1.1],
          castShadow: true,
        }),
      );
    }
  });

  const tree = new THREE.Group();
  tree.name = "dashboard-courtyard-shade-tree";
  tree.position.set(2.8, 0, -4.65);
  tree.add(
    createMesh(new THREE.CylinderGeometry(0.35, 0.48, 3.4, 20), materials.bark, {
      position: [0, 1.7, 0],
      castShadow: true,
    }),
    createMesh(new THREE.SphereGeometry(1.5, 24, 18), materials.leaf, {
      position: [-0.25, 3.7, 0],
      scale: [1.2, 0.86, 0.9],
      castShadow: true,
    }),
    createMesh(new THREE.SphereGeometry(1.2, 22, 16), materials.leaf, {
      position: [0.95, 3.55, -0.1],
      scale: [1, 0.9, 0.95],
      castShadow: true,
    }),
  );
  environment.add(tree);

  parent.add(environment);
  return environment;
}

export function addCourtyardDoor(parent: THREE.Group) {
  const group = new THREE.Group();
  group.name = "dashboard-courtyard-door";
  group.position.set(...courtyardPositions.door);

  const wood = new THREE.MeshStandardMaterial({ color: "#7b5137", roughness: 0.74 });
  const inset = new THREE.MeshStandardMaterial({ color: "#986848", roughness: 0.8 });
  const trim = new THREE.MeshStandardMaterial({ color: "#9b704f", roughness: 0.76 });
  const brass = new THREE.MeshStandardMaterial({
    color: "#c79a43",
    metalness: 0.46,
    roughness: 0.38,
  });
  const roomPreviewMaterial = new THREE.ShaderMaterial({
    depthWrite: true,
    fragmentShader: `
      varying vec2 vUv;
      void main() {
        float floorLine = smoothstep(0.27, 0.39, vUv.y);
        vec3 floorColour = mix(
          vec3(0.48, 0.33, 0.23),
          vec3(0.69, 0.51, 0.35),
          vUv.y * 2.1
        );
        vec3 wallColour = mix(
          vec3(0.88, 0.82, 0.70),
          vec3(0.98, 0.91, 0.77),
          vUv.y
        );
        vec3 colour = mix(floorColour, wallColour, floorLine);

        vec2 rugPoint = (vUv - vec2(0.5, 0.19)) * vec2(1.05, 2.7);
        float rug = 1.0 - smoothstep(0.2, 0.72, dot(rugPoint, rugPoint));
        colour = mix(colour, vec3(0.73, 0.58, 0.42), rug * 0.55);

        float table = smoothstep(0.12, 0.2, vUv.x) *
          (1.0 - smoothstep(0.82, 0.9, vUv.x));
        table *= smoothstep(0.34, 0.4, vUv.y) *
          (1.0 - smoothstep(0.5, 0.57, vUv.y));
        colour = mix(colour, vec3(0.38, 0.25, 0.17), table * 0.82);

        float windowGlow = smoothstep(0.55, 0.63, vUv.x) *
          (1.0 - smoothstep(0.88, 0.94, vUv.x));
        windowGlow *= smoothstep(0.62, 0.69, vUv.y) *
          (1.0 - smoothstep(0.91, 0.96, vUv.y));
        colour = mix(colour, vec3(0.82, 0.92, 0.89), windowGlow * 0.78);

        float warmGlow = exp(
          -dot(vUv - vec2(0.25, 0.58), vUv - vec2(0.25, 0.58)) * 28.0
        );
        colour += vec3(0.16, 0.1, 0.035) * warmGlow;
        gl_FragColor = vec4(colour, 1.0);
      }
    `,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
  });

  const roomPreview = createMesh(
    new THREE.PlaneGeometry(1.34, 2.58),
    roomPreviewMaterial,
    { position: [0, 1.29, -0.055] },
  );
  roomPreview.name = "dashboard-courtyard-room-preview";

  const pivot = new THREE.Group();
  pivot.name = "dashboard-courtyard-door-leaf";
  pivot.position.set(-0.67, 0, 0.08);
  const doorPanel = createBox([1.34, 2.58, 0.12], wood, {
    position: [0.67, 1.29, 0],
    castShadow: true,
  });
  doorPanel.name = "dashboard-courtyard-door-panel";
  pivot.add(
    doorPanel,
    createBox([0.88, 0.78, 0.04], inset, {
      position: [0.67, 1.84, 0.075],
      castShadow: true,
    }),
    createBox([0.88, 0.82, 0.04], inset, {
      position: [0.67, 0.7, 0.075],
      castShadow: true,
    }),
    createMesh(new THREE.SphereGeometry(0.075, 18, 14), brass, {
      position: [1.11, 1.25, 0.12],
      castShadow: true,
    }),
  );

  group.add(
    roomPreview,
    pivot,
    createBox([1.64, 0.17, 0.2], trim, {
      position: [0, 2.65, 0.12],
      castShadow: true,
    }),
    createBox([0.17, 2.72, 0.2], trim, {
      position: [-0.75, 1.31, 0.12],
      castShadow: true,
    }),
    createBox([0.17, 2.72, 0.2], trim, {
      position: [0.75, 1.31, 0.12],
      castShadow: true,
    }),
  );
  parent.add(group);

  return {
    object: group,
    update: (openAmount: number) => {
      pivot.rotation.y = THREE.MathUtils.smoothstep(openAmount, 0, 1) * 1.15;
    },
  };
}

export function addCourtyardPond(parent: THREE.Group, fish: CourtyardFish[]) {
  const pond = new THREE.Group();
  pond.name = "dashboard-courtyard-pond";
  pond.position.set(...courtyardPositions.pond);

  const bank = new THREE.MeshStandardMaterial({ color: "#9a8063", roughness: 0.98 });
  const water = new THREE.MeshStandardMaterial({
    color: "#66a9ad",
    depthWrite: false,
    emissive: "#75b8ba",
    emissiveIntensity: 0.08,
    metalness: 0.04,
    opacity: 0.64,
    roughness: 0.26,
    transparent: true,
  });
  const rock = new THREE.MeshStandardMaterial({ color: "#b4aa99", roughness: 0.96 });
  const reed = new THREE.MeshStandardMaterial({ color: "#688151", roughness: 0.92 });

  pond.add(
    createMesh(new THREE.CylinderGeometry(1.68, 1.76, 0.16, 48), bank, {
      position: [0, 0.02, 0],
      scale: [1.42, 1, 0.92],
      receiveShadow: true,
    }),
    createMesh(new THREE.CylinderGeometry(1.48, 1.52, 0.075, 48), water, {
      position: [0, 0.12, 0],
      scale: [1.42, 1, 0.92],
    }),
  );

  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    pond.add(
      createMesh(new THREE.SphereGeometry(0.24, 16, 12), rock, {
        position: [Math.cos(angle) * 2.25, 0.16, Math.sin(angle) * 1.48],
        scale: [1.15, 0.58, 0.82],
        castShadow: true,
      }),
    );
  }

  [-1.7, 1.65].forEach((x) => {
    for (let index = 0; index < 3; index += 1) {
      pond.add(
        createMesh(new THREE.CylinderGeometry(0.025, 0.035, 0.72, 8), reed, {
          position: [x + index * 0.09, 0.48, -0.65 + index * 0.08],
          rotation: [0, 0, -0.08 + index * 0.08],
          castShadow: true,
        }),
      );
    }
  });

  const fishDepthReset = new THREE.Mesh(
    new THREE.PlaneGeometry(0.001, 0.001),
    new THREE.MeshBasicMaterial({
      colorWrite: false,
      depthTest: false,
      depthWrite: false,
    }),
  );
  fishDepthReset.name = "dashboard-courtyard-pond-depth-reset";
  fishDepthReset.frustumCulled = false;
  fishDepthReset.renderOrder = courtyardFishDepthResetRenderOrder;
  fishDepthReset.visible = false;
  fishDepthReset.onBeforeRender = (renderer) => renderer.clearDepth();
  pond.add(fishDepthReset);

  const loader = new GLTFLoader();
  const fishGroups: {
    group: THREE.Group;
    fishKind: FishKind;
    originX: number;
    originZ: number;
    swimY: number;
  }[] = [];
  let disposed = false;
  let loadVersion = 0;
  let currentFishSignature = "";
  const setFish = (nextFish: CourtyardFish[]) => {
    const visibleFish = nextFish.slice(-8);
    const nextFishSignature = visibleFish
      .map((entry) => `${entry.id}:${entry.fishKind}`)
      .join("|");
    fishDepthReset.visible = visibleFish.length > 0;
    if (nextFishSignature === currentFishSignature) return;
    currentFishSignature = nextFishSignature;
    loadVersion += 1;
    const version = loadVersion;
    fishGroups.splice(0).forEach(({ group }) => {
      pond.remove(group);
      disposeObject3D(group);
    });

    visibleFish.forEach((entry, index) => {
      const fishGroup = new THREE.Group();
      const [originX, originZ] = courtyardFishOrigins[index];
      fishGroup.name = `dashboard-courtyard-fish-${entry.id}`;
      fishGroup.userData.index = index;
      fishGroup.position.set(
        originX,
        courtyardFishSwimDepth.baseY,
        originZ,
      );
      fishGroup.rotation.set(0, getFishHorizontalYaw(entry.fishKind), 0);
      const fishState: (typeof fishGroups)[number] = {
        group: fishGroup,
        fishKind: entry.fishKind,
        originX,
        originZ,
        swimY: courtyardFishSwimDepth.baseY,
      };
      fishGroups.push(fishState);
      pond.add(fishGroup);

      loader.load(
        getFishAssetPath(entry.fishKind),
        (gltf) => {
          if (disposed || version !== loadVersion) {
            disposeObject3D(gltf.scene);
            return;
          }
          const scaledHeight = fitCourtyardFishModel(gltf.scene);
          fishState.swimY = getCourtyardFishSwimY(scaledHeight);
          fishGroup.position.y = fishState.swimY;
          fishGroup.add(gltf.scene);
        },
        undefined,
        (error) =>
          console.error(`Failed to load courtyard fish ${entry.fishKind}.`, error),
      );
    });
  };
  setFish(fish);

  parent.add(pond);

  return {
    dispose: () => {
      disposed = true;
      loadVersion += 1;
    },
    object: pond,
    setFish,
    update: (elapsed: number) => {
      fishGroups.forEach(({ group, fishKind, originX, originZ, swimY }, index) => {
        const phase = elapsed * (0.72 + (index % 3) * 0.07) + index * 0.9;
        const xAmplitude = 0.1 + (index % 2) * 0.02;
        const zAmplitude = 0.045 + (index % 3) * 0.01;
        const zPhase = phase * 0.78 + index * 0.55;
        group.position.x = originX + Math.sin(phase) * xAmplitude;
        group.position.z = originZ + Math.sin(zPhase) * zAmplitude;
        group.position.y =
          swimY +
          Math.sin(phase * 1.4) * courtyardFishSwimDepth.bobAmount;
        group.rotation.set(
          0,
          getFishHorizontalYaw(
            fishKind,
            Math.cos(phase) > 0 ? "right" : "left",
          ),
          0,
        );
      });
    },
  };
}

export function fitCourtyardFishModel(model: THREE.Object3D) {
  const bounds = new THREE.Box3().setFromObject(model);
  const size = bounds.getSize(new THREE.Vector3());
  const centre = bounds.getCenter(new THREE.Vector3());
  const scale =
    courtyardFishTargetLength / Math.max(size.x, size.y, size.z, 0.001);
  model.scale.setScalar(scale);
  model.position.copy(centre).multiplyScalar(-scale);
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.renderOrder = courtyardFishRenderOrder;
    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    materials.forEach((material) => {
      material.depthTest = true;
      material.depthWrite = true;
    });
  });
  return size.y * scale;
}

export function getCourtyardFishSwimY(scaledHeight: number) {
  return (
    courtyardPondWaterSurfaceY -
    courtyardFishSwimDepth.surfaceClearance -
    courtyardFishSwimDepth.bobAmount -
    scaledHeight / 2
  );
}

export function playRabbitMerchantIdle(
  model: THREE.Object3D,
  animations: THREE.AnimationClip[],
) {
  const idleClip =
    THREE.AnimationClip.findByName(animations, "idle") ??
    animations.find((clip) => clip.name.toLowerCase().includes("idle"));
  if (!idleClip) return null;

  const mixer = new THREE.AnimationMixer(model);
  mixer.clipAction(idleClip).reset().setLoop(THREE.LoopRepeat, Infinity).play();
  mixer.update(0);
  return mixer;
}

export function addCourtyardMerchant(
  parent: THREE.Group,
  onSettled?: () => void,
) {
  const merchant = new THREE.Group();
  merchant.name = "dashboard-courtyard-merchant";
  merchant.position.set(...courtyardPositions.merchant);

  const wood = new THREE.MeshStandardMaterial({ color: "#916345", roughness: 0.78 });
  const darkWood = new THREE.MeshStandardMaterial({ color: "#61402f", roughness: 0.84 });
  const canvas = new THREE.MeshStandardMaterial({ color: "#f2dfc3", roughness: 0.92 });
  const green = new THREE.MeshStandardMaterial({ color: "#5f8067", roughness: 0.86 });
  const terracotta = new THREE.MeshStandardMaterial({ color: "#bf6e55", roughness: 0.84 });
  const brass = new THREE.MeshStandardMaterial({
    color: "#d2a84f",
    metalness: 0.34,
    roughness: 0.42,
  });

  const stall = new THREE.Group();
  stall.name = "dashboard-courtyard-merchant-stall";
  stall.position.set(0.28, 0, -0.18);
  stall.add(
    createBox([2.05, 0.15, 0.82], wood, {
      position: [0, 0.94, 0],
      castShadow: true,
      receiveShadow: true,
    }),
    createBox([1.78, 0.12, 0.66], darkWood, {
      position: [0, 0.83, -0.01],
      castShadow: true,
    }),
    createBox([0.13, 0.86, 0.13], darkWood, {
      position: [-0.78, 0.43, -0.24],
      castShadow: true,
    }),
    createBox([0.13, 0.86, 0.13], darkWood, {
      position: [0.78, 0.43, -0.24],
      castShadow: true,
    }),
    createBox([0.11, 1.2, 0.11], darkWood, {
      position: [-0.88, 1.5, -0.26],
      castShadow: true,
    }),
    createBox([0.11, 1.2, 0.11], darkWood, {
      position: [0.88, 1.5, -0.26],
      castShadow: true,
    }),
    createBox([2.2, 0.14, 0.94], canvas, {
      position: [0, 2.08, -0.03],
      rotation: [0.04, 0, 0],
      castShadow: true,
    }),
    createBox([1.28, 0.36, 0.08], green, {
      position: [0, 2.39, 0.01],
      castShadow: true,
    }),
    createMesh(new THREE.CylinderGeometry(0.11, 0.11, 0.04, 28), brass, {
      position: [0, 2.39, 0.065],
      rotation: [Math.PI / 2, 0, 0],
      castShadow: true,
    }),
  );

  for (let index = 0; index < 5; index += 1) {
    stall.add(
      createBox([0.42, 0.26, 0.08], index % 2 === 0 ? green : canvas, {
        position: [-0.84 + index * 0.42, 1.97, 0.45],
        castShadow: true,
      }),
    );
  }

  [terracotta, green, brass].forEach((material, index) => {
    stall.add(
      createMesh(new THREE.CylinderGeometry(0.11, 0.13, 0.28, 18), material, {
        position: [0.35 + index * 0.28, 1.15, 0.03],
        castShadow: true,
      }),
    );
  });

  const rabbitRoot = new THREE.Group();
  rabbitRoot.name = "dashboard-courtyard-rabbit-model";
  rabbitRoot.position.set(-0.52, 0, 0.45);
  merchant.add(stall, rabbitRoot);
  parent.add(merchant);

  const loader = new GLTFLoader();
  let disposed = false;
  let mixer: THREE.AnimationMixer | null = null;
  loader.load(
    rabbitMerchantModelUrl,
    (gltf) => {
      if (disposed) {
        disposeObject3D(gltf.scene);
        return;
      }

      const bounds = new THREE.Box3().setFromObject(gltf.scene);
      const size = bounds.getSize(new THREE.Vector3());
      const targetHeight = 1.82;
      gltf.scene.scale.setScalar(targetHeight / Math.max(size.y, 0.001));
      gltf.scene.updateMatrixWorld(true);

      const scaledBounds = new THREE.Box3().setFromObject(gltf.scene);
      const centre = scaledBounds.getCenter(new THREE.Vector3());
      gltf.scene.position.sub(
        new THREE.Vector3(centre.x, scaledBounds.min.y, centre.z),
      );
      gltf.scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      rabbitRoot.add(gltf.scene);

      mixer = playRabbitMerchantIdle(gltf.scene, gltf.animations);
      if (!mixer) {
        console.warn("rabbit_merchant.glb does not contain an idle animation.");
      }
      onSettled?.();
    },
    undefined,
    (error) => {
      console.error("Failed to load courtyard rabbit merchant.", error);
      onSettled?.();
    },
  );

  return {
    dispose: () => {
      disposed = true;
      if (mixer && rabbitRoot.children[0]) mixer.uncacheRoot(rabbitRoot.children[0]);
    },
    object: merchant,
    update: (delta: number) => mixer?.update(delta),
  };
}

export default function DashboardCourtyardScene({
  fish,
  outfitId = defaultDashboardOutfitId,
  onMerchantClick,
  onPondClick,
  onReturnComplete,
  onReturnTransitionStart,
  onSceneReady,
}: DashboardCourtyardSceneProps) {
  const t = useTranslations("Dashboard");
  const doorHotspotRef = useRef<HTMLButtonElement>(null);
  const merchantHotspotRef = useRef<HTMLButtonElement>(null);
  const pondHotspotRef = useRef<HTMLButtonElement>(null);
  const returnActionRef = useRef<(() => void) | null>(null);
  const pondFishSyncRef = useRef<((nextFish: CourtyardFish[]) => void) | null>(null);
  const initialFishRef = useRef(fish);
  const outfitActionRef = useRef<
    ((outfitId: DashboardOutfitId) => void) | null
  >(null);
  const outfitIdRef = useRef(outfitId);

  useEffect(() => {
    pondFishSyncRef.current?.(fish);
  }, [fish]);

  useEffect(() => {
    outfitIdRef.current = outfitId;
    outfitActionRef.current?.(outfitId);
  }, [outfitId]);

  const setup = useCallback((context: ThreeStageContext) => {
    const { camera, reducedMotion, renderer, scene } = context;
    const root = new THREE.Group();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const cameraBase = new THREE.Vector3(0, 3.65, 9.7);
    const cameraTarget = new THREE.Vector3(0, 1.35, -2.25);
    const doorAnchor = new THREE.Vector3();
    const merchantAnchor = new THREE.Vector3();
    const pondAnchor = new THREE.Vector3();

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    scene.background = new THREE.Color("#dce9dd");
    scene.fog = new THREE.Fog("#dce9dd", 12, 24);
    scene.add(root);
    camera.position.copy(cameraBase);
    camera.lookAt(cameraTarget);

    const ambient = new THREE.HemisphereLight("#fff9e8", "#6d8068", 1.65);
    const sunlight = new THREE.DirectionalLight("#fff0c8", 3.35);
    sunlight.position.set(-2.5, 7.5, 5.5);
    sunlight.castShadow = true;
    sunlight.shadow.mapSize.set(1024, 1024);
    sunlight.shadow.camera.left = -8;
    sunlight.shadow.camera.right = 8;
    sunlight.shadow.camera.top = 7;
    sunlight.shadow.camera.bottom = -7;
    scene.add(ambient, sunlight);

    addCourtyardEnvironment(root);
    const courtyardDoor = addCourtyardDoor(root);
    courtyardDoor.update(reducedMotion ? 0 : 1);
    const courtyardPond = addCourtyardPond(root, initialFishRef.current);
    pondFishSyncRef.current = courtyardPond.setFish;

    let characterSettled = false;
    let merchantSettled = false;
    let sceneReadyReported = false;
    const reportSceneReady = () => {
      if (!sceneReadyReported && characterSettled && merchantSettled) {
        sceneReadyReported = true;
        onSceneReady?.();
      }
    };

    const courtyardMerchant = addCourtyardMerchant(root, () => {
      merchantSettled = true;
      reportSceneReady();
    });

    type CharacterState = "entering" | "idle" | "returning" | "wave";
    let characterState: CharacterState = reducedMotion ? "idle" : "entering";
    let stateElapsed = 0;
    let returnCompleted = false;

    const markCharacterSettled = () => {
      characterSettled = true;
      const object = character.getObject();
      if (object && reducedMotion) {
        object.position.copy(characterRestPosition);
        character.play("idle", { fadeDuration: 0 });
        character.faceCamera(camera);
      }
      reportSceneReady();
    };
    const character = loadDashboardCharacter({
      initialAnimation: reducedMotion ? "idle" : "walk",
      initialOutfitId: outfitIdRef.current,
      name: "dashboard-courtyard-character",
      onError: markCharacterSettled,
      onReady: markCharacterSettled,
      parent: root,
      position: characterEntryPosition,
    });
    outfitActionRef.current = character.setOutfit;

    const beginReturn = () => {
      if (!onReturnComplete || characterState === "returning" || returnCompleted) {
        return;
      }

      onReturnTransitionStart?.();
      doorHotspotRef.current?.setAttribute("disabled", "");
      merchantHotspotRef.current?.setAttribute("disabled", "");
      pondHotspotRef.current?.setAttribute("disabled", "");

      if (reducedMotion || !character.isReady()) {
        returnCompleted = true;
        courtyardDoor.update(1);
        onReturnComplete();
        return;
      }

      characterState = "returning";
      stateElapsed = 0;
      character.play("walk", { fadeDuration: 0.2 });
    };
    returnActionRef.current = beginReturn;

    const readPointer = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
    };
    const isDoorHit = () => raycaster.intersectObject(courtyardDoor.object, true).length > 0;
    const isMerchantHit = () => raycaster.intersectObject(courtyardMerchant.object, true).length > 0;
    const isPondHit = () => raycaster.intersectObject(courtyardPond.object, true).length > 0;
    const isBusy = () => characterState === "entering" || characterState === "returning";

    const onPointerMove = (event: PointerEvent) => {
      if (isBusy()) {
        renderer.domElement.style.cursor = "";
        return;
      }
      readPointer(event);
      renderer.domElement.style.cursor =
        (onReturnComplete && isDoorHit()) ||
        (onMerchantClick && isMerchantHit()) ||
        (onPondClick && isPondHit())
          ? "pointer"
          : "";
    };
    const onPointerDown = (event: PointerEvent) => {
      if (isBusy()) return;
      readPointer(event);

      if (onReturnComplete && isDoorHit()) {
        event.preventDefault();
        beginReturn();
        return;
      }
      if (onMerchantClick && isMerchantHit()) {
        event.preventDefault();
        onMerchantClick();
        return;
      }
      if (onPondClick && isPondHit()) {
        event.preventDefault();
        onPondClick();
      }
    };
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);

    const positionHotspot = (
      hotspot: HTMLButtonElement | null,
      object: THREE.Object3D,
      anchor: THREE.Vector3,
      localPosition: THREE.Vector3,
    ) => {
      if (!hotspot) return;
      anchor.copy(localPosition);
      object.localToWorld(anchor);
      anchor.project(camera);
      const visible =
        Math.abs(anchor.x) <= 1.05 && Math.abs(anchor.y) <= 1.05 && anchor.z <= 1;
      hotspot.hidden = !visible;
      if (!visible) return;
      hotspot.style.left = `${(anchor.x * 0.5 + 0.5) * 100}%`;
      hotspot.style.top = `${(-anchor.y * 0.5 + 0.5) * 100}%`;
      hotspot.dataset.positioned = "true";
    };
    const updateHotspots = () => {
      positionHotspot(
        doorHotspotRef.current,
        courtyardDoor.object,
        doorAnchor,
        new THREE.Vector3(0, 1.35, 0.2),
      );
      positionHotspot(
        merchantHotspotRef.current,
        courtyardMerchant.object,
        merchantAnchor,
        new THREE.Vector3(-0.35, 1.2, 0.4),
      );
      positionHotspot(
        pondHotspotRef.current,
        courtyardPond.object,
        pondAnchor,
        new THREE.Vector3(0, 0.2, 0),
      );
    };

    const onResize = ({ height, width }: ThreeStageResize) => {
      const compact = width / height < 1.35;
      camera.fov = compact ? 47 : 41;
      cameraBase.set(0, compact ? 4.05 : 3.65, compact ? 11 : 9.7);
      camera.position.copy(cameraBase);
      camera.lookAt(cameraTarget);
      camera.updateProjectionMatrix();
      updateHotspots();
    };

    const onFrame = ({ delta, elapsed }: ThreeStageFrame) => {
      const drift = Math.sin(elapsed * 0.16) * 0.08;
      camera.position.set(cameraBase.x + drift, cameraBase.y, cameraBase.z);
      camera.lookAt(cameraTarget);
      character.update(delta);
      courtyardMerchant.update(delta);
      courtyardPond.update(elapsed);

      const object = character.getObject();
      if (object && character.isReady()) {
        stateElapsed += delta;

        if (characterState === "entering") {
          const progress = THREE.MathUtils.smoothstep(stateElapsed / 2.05, 0, 1);
          object.position.lerpVectors(characterEntryPosition, characterRestPosition, progress);
          character.facePoint(characterRestPosition);
          courtyardDoor.update(1 - progress);
          if (progress >= 1) {
            characterState = "wave";
            stateElapsed = 0;
            character.play("wave", { fadeDuration: 0.22, loopOnce: true });
          }
        } else if (characterState === "wave") {
          if (stateElapsed >= 2.65) {
            characterState = "idle";
            stateElapsed = 0;
            character.play("idle", { fadeDuration: 0.22 });
          }
          character.faceCamera(camera);
        } else if (characterState === "idle") {
          character.faceCamera(camera);
        } else if (characterState === "returning") {
          const progress = THREE.MathUtils.smoothstep(stateElapsed / 2.35, 0, 1);
          object.position.lerpVectors(characterRestPosition, characterEntryPosition, progress);
          character.facePoint(characterEntryPosition);
          courtyardDoor.update(
            THREE.MathUtils.clamp((progress - 0.58) / 0.32, 0, 1),
          );
          if (progress >= 1 && !returnCompleted) {
            returnCompleted = true;
            onReturnComplete?.();
          }
        }
      }
      updateHotspots();
    };

    return {
      dispose: () => {
        courtyardMerchant.dispose();
        courtyardPond.dispose();
        if (pondFishSyncRef.current === courtyardPond.setFish) {
          pondFishSyncRef.current = null;
        }
        if (outfitActionRef.current === character.setOutfit) {
          outfitActionRef.current = null;
        }
        character.dispose();
        renderer.domElement.removeEventListener("pointermove", onPointerMove);
        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        if (returnActionRef.current === beginReturn) returnActionRef.current = null;
        scene.remove(root, ambient, sunlight);
        disposeObject3D(root);
      },
      onFrame,
      onResize,
    };
  }, [onMerchantClick, onPondClick, onReturnComplete, onReturnTransitionStart, onSceneReady]);

  return (
    <div className="dashboard-three-layer dashboard-three-layer-interactive">
      <ThreeStage
        className="dashboard-three-stage"
        fallback={<div className="dashboard-courtyard-fallback" />}
        setup={setup}
      />
      <button
        aria-label={t("returnInside")}
        className="dashboard-scene-hotspot dashboard-courtyard-door-hotspot"
        id="dashboard-courtyard-door-trigger"
        onClick={() => returnActionRef.current?.()}
        ref={doorHotspotRef}
        type="button"
      >
        <span>{t("returnInside")}</span>
      </button>
      <button
        aria-label={t("openRabbitShop")}
        className="dashboard-scene-hotspot dashboard-courtyard-merchant-hotspot"
        id="dashboard-courtyard-merchant-trigger"
        onClick={onMerchantClick}
        ref={merchantHotspotRef}
        type="button"
      >
        <span>{t("openRabbitShop")}</span>
      </button>
      <button
        aria-label={t("openCourtyardPond")}
        className="dashboard-scene-hotspot dashboard-courtyard-pond-hotspot"
        id="dashboard-courtyard-pond-trigger"
        onClick={onPondClick}
        ref={pondHotspotRef}
        type="button"
      >
        <span>{t("openCourtyardPond")}</span>
      </button>
    </div>
  );
}
