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
import { prepareFlowerModelForDisplay } from "@/app/components/threejs/flowerModels";
import { loadDashboardCharacter } from "./dashboardCharacter";

const bugModelBaseUrl = "/meshes/bugs/";
const flowerModelBaseUrl = "/meshes/flowers/";
const fruitModelBaseUrl = "/meshes/fruits/";

type Transform = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  castShadow?: boolean;
  receiveShadow?: boolean;
};

const cameraTarget = new THREE.Vector3(0, 1.7, -2.6);
const characterPosition = new THREE.Vector3(0.2, 0, 1.25);
const snapshotCameraTarget = new THREE.Vector3(characterPosition.x, 1.55, characterPosition.z);
export const dashboardTableDisplayPositions = {
  gramophone: [-4.05, 1.19, -3.38],
  flowerPot: [-2.65, 1.2, -3.35],
  fruitBasket: [-1.25, 1.25, -3.36],
} as const;
export const dashboardRabbitMerchantPosition = [4.8, 0, -4.15] as const;
export const dashboardRoomDoorPosition = [7.02, 0, -3.65] as const;
const tablePotPosition = new THREE.Vector3(...dashboardTableDisplayPositions.flowerPot);

type DashboardHomeSceneProps = {
  caughtBugs?: DashboardBug[];
  embedded?: boolean;
  wallSnapshot?: { id: string; imageData: string } | null;
  onSnapshotClick?: () => void;
  tableFlowerAsset?: string | null;
  onBugClick?: (bugId: string) => void;
  onTablePotClick?: () => void;
  fruits?: { id: string; fruitKind: string }[];
  onFruitBasketClick?: () => void;
  isMusicPlaying?: boolean;
  onGramophoneClick?: () => void;
  onDoorTransitionStart?: () => void;
  onEnterCourtyard?: () => void;
  onSceneReady?: () => void;
};

type DashboardBug = {
  id: string;
  bugAsset: string;
};

function applyTransform(object: THREE.Object3D, transform: Transform = {}) {
  if (transform.position) {
    object.position.set(...transform.position);
  }

  if (transform.rotation) {
    object.rotation.set(...transform.rotation);
  }

  if (transform.scale) {
    object.scale.set(...transform.scale);
  }
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

function addWindow(parent: THREE.Group, materials: Record<string, THREE.Material>) {
  const frameDepth = -5.92;
  const frame = new THREE.Group();
  frame.position.set(2.9, 3.55, frameDepth);

  frame.add(
    createBox([2.55, 0.14, 0.12], materials.wood, {
      position: [0, 1.04, 0],
      castShadow: true,
    }),
    createBox([2.55, 0.14, 0.12], materials.wood, {
      position: [0, -1.04, 0],
      castShadow: true,
    }),
    createBox([0.14, 2.2, 0.12], materials.wood, {
      position: [-1.28, 0, 0],
      castShadow: true,
    }),
    createBox([0.14, 2.2, 0.12], materials.wood, {
      position: [1.28, 0, 0],
      castShadow: true,
    }),
    createMesh(new THREE.PlaneGeometry(2.24, 1.9), materials.glass, {
      position: [0, 0, 0.04],
    }),
  );

  parent.add(frame);
}

function addRoom(parent: THREE.Group, materials: Record<string, THREE.Material>) {
  parent.add(
    createMesh(new THREE.PlaneGeometry(17, 13), materials.floor, {
      position: [0, 0, -0.8],
      rotation: [-Math.PI / 2, 0, 0],
      receiveShadow: true,
    }),
    createBox([16, 6.8, 0.12], materials.wall, {
      position: [0, 3.4, -6],
      receiveShadow: true,
    }),
    createBox([0.12, 6.8, 12], materials.sideWall, {
      position: [-7.1, 3.4, -1.1],
      receiveShadow: true,
    }),
    createBox([0.12, 6.8, 12], materials.sideWall, {
      position: [7.1, 3.4, -1.1],
      receiveShadow: true,
    }),
    createBox([15.7, 0.18, 0.16], materials.wood, {
      position: [0, 0.33, -5.86],
      castShadow: true,
    }),
    createMesh(new THREE.CylinderGeometry(1, 1, 0.035, 64), materials.rug, {
      position: [-1.15, 0.035, 1.05],
      scale: [2.55, 1, 1.28],
      receiveShadow: true,
    }),
    createMesh(new THREE.PlaneGeometry(3.15, 4.8), materials.sunPatch, {
      position: [2.08, 0.052, -1.3],
      rotation: [-Math.PI / 2, 0, -0.36],
    }),
  );

  addWindow(parent, materials);
}

function addFurniture(parent: THREE.Group, materials: Record<string, THREE.Material>) {
  parent.add(
    createBox([3.9, 0.22, 1.25], materials.wood, {
      position: [-2.55, 1.08, -3.38],
      castShadow: true,
      receiveShadow: true,
    }),
    createBox([0.18, 1.05, 0.18], materials.wood, {
      position: [-4.15, 0.55, -3.88],
      castShadow: true,
    }),
    createBox([0.18, 1.05, 0.18], materials.wood, {
      position: [-0.95, 0.55, -3.88],
      castShadow: true,
    }),
    createBox([0.18, 1.05, 0.18], materials.wood, {
      position: [-4.15, 0.55, -2.9],
      castShadow: true,
    }),
    createBox([0.18, 1.05, 0.18], materials.wood, {
      position: [-0.95, 0.55, -2.9],
      castShadow: true,
    }),
  );
}

export function addRoomDoor(
  parent: THREE.Group,
  materials: Record<string, THREE.Material>,
) {
  const door = new THREE.Group();
  door.name = "dashboard-room-door";
  door.position.set(...dashboardRoomDoorPosition);
  door.rotation.y = -Math.PI / 2;

  const portalMaterial = new THREE.ShaderMaterial({
    depthWrite: true,
    fragmentShader: `
      varying vec2 vUv;
      void main() {
        vec3 sky = mix(vec3(0.83, 0.91, 0.88), vec3(0.98, 0.90, 0.70), 1.0 - vUv.y);
        float horizon = smoothstep(0.42, 0.55, vUv.y);
        vec3 grass = mix(vec3(0.42, 0.61, 0.38), vec3(0.66, 0.75, 0.48), vUv.y * 1.7);
        vec3 colour = mix(grass, sky, horizon);
        vec2 leftTreePoint = (vUv - vec2(0.20, 0.58)) * vec2(1.2, 0.72);
        vec2 rightTreePoint = (vUv - vec2(0.83, 0.63)) * vec2(1.0, 0.68);
        float leftTree = exp(-dot(leftTreePoint, leftTreePoint) * 19.0);
        float rightTree = exp(-dot(rightTreePoint, rightTreePoint) * 23.0);
        colour = mix(colour, vec3(0.28, 0.48, 0.31), (leftTree + rightTree) * 0.72);
        float glow = exp(-dot(vUv - vec2(0.68, 0.82), vUv - vec2(0.68, 0.82)) * 30.0);
        colour += vec3(0.18, 0.14, 0.07) * glow;
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
  const doorMaterial = new THREE.MeshStandardMaterial({
    color: "#7b5137",
    roughness: 0.72,
  });
  const insetMaterial = new THREE.MeshStandardMaterial({
    color: "#986848",
    roughness: 0.78,
  });
  const handleMaterial = new THREE.MeshStandardMaterial({
    color: "#c79a43",
    metalness: 0.46,
    roughness: 0.38,
  });

  const portal = createMesh(
    new THREE.PlaneGeometry(1.34, 2.58),
    portalMaterial,
    { position: [0, 1.29, 0.055] },
  );
  portal.name = "dashboard-room-door-outdoor-preview";

  const leafPivot = new THREE.Group();
  leafPivot.name = "dashboard-room-door-leaf";
  leafPivot.position.set(-0.67, 0, 0.08);

  const leaf = createBox([1.34, 2.58, 0.12], doorMaterial, {
    position: [0.67, 1.29, 0],
    castShadow: true,
  });
  const upperInset = createBox([0.88, 0.78, 0.04], insetMaterial, {
    position: [0.67, 1.84, 0.075],
    castShadow: true,
  });
  const lowerInset = createBox([0.88, 0.82, 0.04], insetMaterial, {
    position: [0.67, 0.7, 0.075],
    castShadow: true,
  });
  const handle = createMesh(
    new THREE.SphereGeometry(0.075, 18, 14),
    handleMaterial,
    { position: [1.11, 1.25, 0.12], castShadow: true },
  );
  leafPivot.add(leaf, upperInset, lowerInset, handle);

  const frameTop = createBox([1.64, 0.17, 0.2], materials.wood, {
    position: [0, 2.65, 0.12],
    castShadow: true,
  });
  const frameLeft = createBox([0.17, 2.72, 0.2], materials.wood, {
    position: [-0.75, 1.31, 0.12],
    castShadow: true,
  });
  const frameRight = createBox([0.17, 2.72, 0.2], materials.wood, {
    position: [0.75, 1.31, 0.12],
    castShadow: true,
  });

  door.add(portal, leafPivot, frameTop, frameLeft, frameRight);
  parent.add(door);

  return {
    object: door,
    update: (openAmount: number) => {
      const eased = THREE.MathUtils.smoothstep(openAmount, 0, 1);
      leafPivot.rotation.y = -eased * 1.18;
    },
  };
}

function addTablePot({
  parent,
  materials,
  tableFlowerAsset,
}: {
  parent: THREE.Group;
  materials: Record<string, THREE.Material>;
  tableFlowerAsset?: string | null;
}) {
  const pot = new THREE.Group();
  pot.name = "dashboard-table-pot";
  pot.position.copy(tablePotPosition);

  const body = createMesh(
    new THREE.CylinderGeometry(0.18, 0.14, 0.34, 32),
    materials.potClay,
    {
      position: [0, 0.17, 0],
      castShadow: true,
      receiveShadow: true,
    },
  );
  const rim = createMesh(
    new THREE.CylinderGeometry(0.22, 0.2, 0.07, 32),
    materials.potRim,
    {
      position: [0, 0.35, 0],
      castShadow: true,
      receiveShadow: true,
    },
  );
  const soil = createMesh(
    new THREE.CylinderGeometry(0.19, 0.19, 0.025, 32),
    materials.soil,
    {
      position: [0, 0.392, 0],
      receiveShadow: true,
    },
  );

  pot.add(body, rim, soil);
  parent.add(pot);

  const flowerLoader = tableFlowerAsset
    ? loadTableFlower({ pot, flowerAsset: tableFlowerAsset })
    : null;

  return {
    object: pot,
    dispose: () => {
      flowerLoader?.dispose();
    },
  };
}

function loadTableFlower({
  pot,
  flowerAsset,
}: {
  pot: THREE.Group;
  flowerAsset: string;
}) {
  const loader = new GLTFLoader();
  const flowerRoot = new THREE.Group();
  let disposed = false;

  flowerRoot.name = "dashboard-table-flower";
  flowerRoot.position.set(0, 0.405, 0);
  pot.add(flowerRoot);

  loader.load(
    `${flowerModelBaseUrl}${flowerAsset}`,
    (gltf) => {
      if (disposed) {
        disposeObject3D(gltf.scene);
        return;
      }

      prepareFlowerModelForDisplay(gltf.scene, {
        flowerAsset,
        maxDiameter: flowerAsset === "flower3.glb" ? 0.56 : 0.46,
        targetHeight: flowerAsset === "flower3.glb" ? 0.48 : 0.58,
      });
      flowerRoot.add(gltf.scene);
    },
    undefined,
    (error) => {
      console.error("Failed to load dashboard table flower.", error);
    },
  );

  return {
    dispose: () => {
      disposed = true;
    },
  };
}

function addWallSnapshot({ parent, imageData }: { parent: THREE.Group; imageData?: string | null }) {
  const frame = new THREE.Group();
  frame.name = "dashboard-wall-snapshot";
  frame.userData.isSnapshot = true;
  // Hang the picture on the back wall, centred above the table rather than
  // floating in the middle of the room.
  frame.position.set(-2.55, 3.25, -5.91);
  const frameMaterial = new THREE.MeshStandardMaterial({ color: "#8a5a32", roughness: 0.72 });
  const photoMaterial = new THREE.MeshBasicMaterial({ color: "#edf1e8" });
  if (imageData) {
    new THREE.TextureLoader().load(imageData, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      photoMaterial.map = texture;
      photoMaterial.needsUpdate = true;
    });
  }
  frame.add(
    // The captured image is 480 × 270 (16:9), so keep the displayed photo
    // and its surrounding frame in the same landscape proportion.
    createBox([2.64, 1.485, 0.12], frameMaterial, { position: [0, 0, 0] }),
    createMesh(new THREE.PlaneGeometry(2.38, 1.339), photoMaterial, { position: [0, 0, 0.071] }),
  );
  parent.add(frame);
  return frame;
}

function loadOrbitingBugs({
  parent,
  caughtBugs,
}: {
  parent: THREE.Group;
  caughtBugs: DashboardBug[];
}) {
  const loader = new GLTFLoader();
  const entries = caughtBugs.map((bug, index) => {
    const root = new THREE.Group();
    root.name = `dashboard-bug-${bug.id}`;
    root.userData.bugId = bug.id;
    parent.add(root);
    return { root, index, bug };
  });
  let disposed = false;

  entries.forEach(({ root, bug }) => {
    loader.load(
      `${bugModelBaseUrl}${bug.bugAsset}`,
      (gltf) => {
        if (disposed) {
          disposeObject3D(gltf.scene);
          return;
        }

        const model = gltf.scene;
        const modelRoot = new THREE.Group();
        const bounds = new THREE.Box3().setFromObject(model);
        const size = bounds.getSize(new THREE.Vector3());
        const centre = bounds.getCenter(new THREE.Vector3());
        const scale = 0.46 / Math.max(size.x, size.y, size.z, 0.001);

        model.position.sub(centre);
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        modelRoot.add(model);
        modelRoot.scale.setScalar(scale);
        root.add(modelRoot);
      },
      undefined,
      (error) => console.error("Failed to load dashboard bug.", error),
    );
  });

  return {
    objects: entries.map((entry) => entry.root),
    update: (elapsed: number) => {
      entries.forEach(({ root, index }) => {
        const angle = elapsed * 0.42 + index * ((Math.PI * 2) / Math.max(entries.length, 1));
        const radius = 0.98;
        root.position.set(
          characterPosition.x + Math.cos(angle) * radius,
          1.22 + Math.sin(elapsed * 1.35 + index * 0.8) * 0.07,
          characterPosition.z + Math.sin(angle) * radius * 0.54,
        );
        // Turn on the ground plane only. `lookAt` can roll an object while it
        // crosses behind its target, which made some bug models flip upside down.
        const directionX = characterPosition.x - root.position.x;
        const directionZ = characterPosition.z - root.position.z;
        root.rotation.set(0, Math.atan2(directionX, directionZ), 0);
      });
    },
    dispose: () => {
      disposed = true;
      entries.forEach(({ root }) => parent.remove(root));
    },
  };
}

function createMaterials() {
  return {
    floor: new THREE.MeshStandardMaterial({
      color: "#d8b994",
      roughness: 0.86,
    }),
    glass: new THREE.MeshStandardMaterial({
      color: "#8fc8f2",
      emissive: "#4a90d6",
      emissiveIntensity: 0.12,
      transparent: true,
      opacity: 0.7,
      roughness: 0.18,
      metalness: 0.02,
    }),
    rug: new THREE.MeshStandardMaterial({
      color: "#d8908d",
      roughness: 0.88,
    }),
    sideWall: new THREE.MeshStandardMaterial({
      color: "#efe2cf",
      roughness: 0.92,
    }),
    sunPatch: new THREE.MeshBasicMaterial({
      color: "#ffe4a0",
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    wall: new THREE.MeshStandardMaterial({
      color: "#f4ead9",
      roughness: 0.9,
    }),
    wood: new THREE.MeshStandardMaterial({
      color: "#9b704f",
      roughness: 0.68,
    }),
    potClay: new THREE.MeshStandardMaterial({
      color: "#b7654d",
      roughness: 0.74,
    }),
    potRim: new THREE.MeshStandardMaterial({
      color: "#d08a65",
      roughness: 0.7,
    }),
    soil: new THREE.MeshStandardMaterial({
      color: "#3b2a21",
      roughness: 0.9,
    }),
  };
}

export function addGramophone(parent: THREE.Group) {
  const gramophone = new THREE.Group();
  gramophone.name = "dashboard-gramophone";
  gramophone.position.set(...dashboardTableDisplayPositions.gramophone);

  const cabinetMaterial = new THREE.MeshStandardMaterial({
    color: "#70452f",
    roughness: 0.66,
  });
  const cabinetEdgeMaterial = new THREE.MeshStandardMaterial({
    color: "#4d2d20",
    roughness: 0.72,
  });
  const brassMaterial = new THREE.MeshStandardMaterial({
    color: "#c79a43",
    metalness: 0.48,
    roughness: 0.35,
    side: THREE.DoubleSide,
  });
  const recordMaterial = new THREE.MeshStandardMaterial({
    color: "#191b1a",
    metalness: 0.2,
    roughness: 0.42,
  });
  const labelMaterial = new THREE.MeshStandardMaterial({
    color: "#bb6652",
    roughness: 0.65,
  });

  const cabinet = createBox([1, 0.18, 0.7], cabinetMaterial, {
    position: [0, 0.09, 0],
    castShadow: true,
    receiveShadow: true,
  });
  const cabinetEdge = createBox([1.04, 0.08, 0.74], cabinetEdgeMaterial, {
    position: [0, 0.035, 0],
    castShadow: true,
  });
  const platter = createMesh(
    new THREE.CylinderGeometry(0.33, 0.33, 0.045, 40),
    cabinetEdgeMaterial,
    { position: [-0.17, 0.205, 0.02], castShadow: true },
  );
  const record = createMesh(
    new THREE.CylinderGeometry(0.29, 0.29, 0.025, 48),
    recordMaterial,
    { position: [-0.17, 0.245, 0.02], castShadow: true },
  );
  record.name = "dashboard-gramophone-record";
  const recordLabel = createMesh(
    new THREE.CylinderGeometry(0.075, 0.075, 0.029, 32),
    labelMaterial,
    { position: [-0.17, 0.263, 0.02], castShadow: true },
  );
  recordLabel.name = "dashboard-gramophone-record-label";
  const spindle = createMesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.075, 16),
    brassMaterial,
    { position: [-0.17, 0.285, 0.02], castShadow: true },
  );

  const tonearmCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0.24, 0.31, 0.2),
    new THREE.Vector3(0.1, 0.4, 0.12),
    new THREE.Vector3(-0.02, 0.29, 0.04),
  );
  const tonearm = createMesh(
    new THREE.TubeGeometry(tonearmCurve, 18, 0.018, 8, false),
    brassMaterial,
    { castShadow: true },
  );
  const needle = createBox([0.08, 0.035, 0.055], cabinetEdgeMaterial, {
    position: [-0.035, 0.285, 0.04],
    rotation: [0, 0.22, 0],
    castShadow: true,
  });

  const hornStem = createMesh(
    new THREE.CylinderGeometry(0.055, 0.07, 0.42, 20),
    brassMaterial,
    { position: [0.29, 0.39, -0.14], castShadow: true },
  );
  const hornBell = createMesh(
    new THREE.CylinderGeometry(0.34, 0.075, 0.52, 36, 1, true),
    brassMaterial,
    { position: [0.29, 0.79, -0.14], castShadow: true },
  );
  const hornRim = createMesh(
    new THREE.TorusGeometry(0.34, 0.025, 10, 36),
    brassMaterial,
    {
      position: [0.29, 1.05, -0.14],
      rotation: [Math.PI / 2, 0, 0],
      castShadow: true,
    },
  );

  gramophone.add(
    cabinetEdge,
    cabinet,
    platter,
    record,
    recordLabel,
    spindle,
    tonearm,
    needle,
    hornStem,
    hornBell,
    hornRim,
  );
  parent.add(gramophone);

  return {
    object: gramophone,
    update: (delta: number) => {
      record.rotation.y += delta * 1.7;
      recordLabel.rotation.y = record.rotation.y;
    },
  };
}

export function addRabbitMerchant(parent: THREE.Group) {
  const merchant = new THREE.Group();
  merchant.name = "dashboard-rabbit-merchant";
  merchant.position.set(...dashboardRabbitMerchantPosition);

  const stall = new THREE.Group();
  stall.name = "dashboard-rabbit-merchant-stall";

  const rabbit = new THREE.Group();
  rabbit.name = "dashboard-rabbit-merchant-rabbit";
  rabbit.position.set(-0.42, -0.09, 0.46);

  const wood = new THREE.MeshStandardMaterial({
    color: "#916345",
    roughness: 0.76,
  });
  const darkWood = new THREE.MeshStandardMaterial({
    color: "#61402f",
    roughness: 0.82,
  });
  const canvas = new THREE.MeshStandardMaterial({
    color: "#f2dfc3",
    roughness: 0.9,
  });
  const gardenGreen = new THREE.MeshStandardMaterial({
    color: "#5f8067",
    roughness: 0.84,
  });
  const apronFabric = new THREE.MeshStandardMaterial({
    color: "#4f6e58",
    roughness: 0.92,
  });
  const apronTrim = new THREE.MeshStandardMaterial({
    color: "#d8b16b",
    roughness: 0.78,
  });
  const terracotta = new THREE.MeshStandardMaterial({
    color: "#bf6e55",
    roughness: 0.82,
  });
  const brass = new THREE.MeshStandardMaterial({
    color: "#d2a84f",
    metalness: 0.34,
    roughness: 0.42,
  });
  const fur = new THREE.MeshStandardMaterial({
    color: "#ead8bd",
    roughness: 0.94,
  });
  const creamFur = new THREE.MeshStandardMaterial({
    color: "#f6ead7",
    roughness: 0.96,
  });
  const innerEar = new THREE.MeshStandardMaterial({
    color: "#d89b98",
    roughness: 0.9,
  });
  const face = new THREE.MeshStandardMaterial({
    color: "#342925",
    roughness: 0.72,
  });
  const hatVelvet = new THREE.MeshStandardMaterial({
    color: "#2f2441",
    roughness: 0.68,
  });
  const hatBand = new THREE.MeshStandardMaterial({
    color: "#79557f",
    roughness: 0.76,
  });

  const stallX = 0.32;
  stall.add(
    createBox([1.82, 0.14, 0.76], wood, {
      position: [stallX, 0.92, 0],
      castShadow: true,
      receiveShadow: true,
    }),
    createBox([1.58, 0.12, 0.62], darkWood, {
      position: [stallX, 0.82, -0.01],
      castShadow: true,
    }),
    createBox([0.12, 0.84, 0.12], darkWood, {
      position: [stallX - 0.72, 0.42, -0.22],
      castShadow: true,
    }),
    createBox([0.12, 0.84, 0.12], darkWood, {
      position: [stallX + 0.72, 0.42, -0.22],
      castShadow: true,
    }),
    createBox([0.1, 1.12, 0.1], darkWood, {
      position: [stallX - 0.78, 1.47, -0.24],
      castShadow: true,
    }),
    createBox([0.1, 1.12, 0.1], darkWood, {
      position: [stallX + 0.78, 1.47, -0.24],
      castShadow: true,
    }),
    createBox([1.92, 0.13, 0.88], canvas, {
      position: [stallX, 2.02, -0.02],
      rotation: [0.04, 0, 0],
      castShadow: true,
    }),
    createBox([1.18, 0.34, 0.08], gardenGreen, {
      position: [stallX, 2.31, 0.01],
      castShadow: true,
    }),
    createMesh(new THREE.CylinderGeometry(0.105, 0.105, 0.035, 28), brass, {
      position: [stallX, 2.31, 0.065],
      rotation: [Math.PI / 2, 0, 0],
      castShadow: true,
    }),
  );

  for (let index = 0; index < 5; index += 1) {
    stall.add(
      createBox(
        [0.37, 0.25, 0.08],
        index % 2 === 0 ? gardenGreen : canvas,
        {
          position: [stallX - 0.74 + index * 0.37, 1.91, 0.42],
          castShadow: true,
        },
      ),
    );
  }

  const wares = [terracotta, gardenGreen, brass];
  wares.forEach((material, index) => {
    stall.add(
      createMesh(
        new THREE.CylinderGeometry(0.1, 0.12, 0.25 + index * 0.025, 18),
        material,
        {
          position: [stallX + 0.28 + index * 0.25, 1.1, 0.02],
          castShadow: true,
        },
      ),
    );
  });

  const leftEar = new THREE.Group();
  leftEar.name = "dashboard-rabbit-merchant-left-ear";
  leftEar.position.set(-0.14, 1.58, 0.01);
  leftEar.rotation.z = 0.1;
  leftEar.add(
    createMesh(new THREE.SphereGeometry(0.18, 24, 18), fur, {
      position: [0, 0.28, 0],
      scale: [0.62, 1.8, 0.56],
      castShadow: true,
    }),
    createMesh(new THREE.SphereGeometry(0.12, 20, 16), innerEar, {
      position: [0, 0.3, 0.1],
      scale: [0.52, 1.7, 0.3],
    }),
  );

  const rightEar = new THREE.Group();
  rightEar.name = "dashboard-rabbit-merchant-right-ear";
  rightEar.position.set(0.14, 1.58, 0.01);
  rightEar.rotation.z = -0.08;
  rightEar.add(
    createMesh(new THREE.SphereGeometry(0.18, 24, 18), fur, {
      position: [0, 0.28, 0],
      scale: [0.62, 1.8, 0.56],
      castShadow: true,
    }),
    createMesh(new THREE.SphereGeometry(0.12, 20, 16), innerEar, {
      position: [0, 0.3, 0.1],
      scale: [0.52, 1.7, 0.3],
    }),
  );

  const body = createMesh(new THREE.SphereGeometry(0.42, 28, 22), fur, {
    position: [0, 0.72, 0],
    scale: [0.78, 1.08, 0.72],
    castShadow: true,
  });
  const belly = createMesh(
    new THREE.SphereGeometry(0.3, 24, 18),
    creamFur,
    {
      position: [0, 0.69, 0.25],
      scale: [0.72, 1, 0.32],
    },
  );
  const head = createMesh(new THREE.SphereGeometry(0.34, 28, 22), fur, {
    position: [0, 1.38, 0.03],
    scale: [0.98, 0.9, 0.9],
    castShadow: true,
  });
  const tail = createMesh(new THREE.SphereGeometry(0.17, 20, 16), creamFur, {
    position: [0.28, 0.63, -0.25],
    castShadow: true,
  });
  const leftFoot = createMesh(new THREE.SphereGeometry(0.2, 22, 16), fur, {
    position: [-0.19, 0.19, 0.2],
    scale: [0.72, 0.48, 1.16],
    castShadow: true,
  });
  const rightFoot = createMesh(new THREE.SphereGeometry(0.2, 22, 16), fur, {
    position: [0.19, 0.19, 0.2],
    scale: [0.72, 0.48, 1.16],
    castShadow: true,
  });
  const leftArm = createMesh(new THREE.SphereGeometry(0.17, 22, 16), fur, {
    position: [-0.31, 0.83, 0.22],
    rotation: [0.08, 0, -0.28],
    scale: [0.65, 1.42, 0.62],
    castShadow: true,
  });
  const rightArm = createMesh(new THREE.SphereGeometry(0.17, 22, 16), fur, {
    position: [0.31, 0.83, 0.22],
    rotation: [0.08, 0, 0.28],
    scale: [0.65, 1.42, 0.62],
    castShadow: true,
  });
  const apron = new THREE.Group();
  apron.name = "dashboard-rabbit-merchant-apron";

  const apronSkirtShape = new THREE.Shape();
  apronSkirtShape.moveTo(-0.29, -0.29);
  apronSkirtShape.lineTo(0.29, -0.29);
  apronSkirtShape.lineTo(0.22, 0.29);
  apronSkirtShape.lineTo(-0.22, 0.29);
  apronSkirtShape.closePath();

  const apronBibShape = new THREE.Shape();
  apronBibShape.moveTo(-0.17, -0.15);
  apronBibShape.lineTo(0.17, -0.15);
  apronBibShape.lineTo(0.145, 0.15);
  apronBibShape.lineTo(-0.145, 0.15);
  apronBibShape.closePath();

  const pocketShape = new THREE.Shape();
  pocketShape.moveTo(-0.12, 0.075);
  pocketShape.lineTo(0.12, 0.075);
  pocketShape.lineTo(0.1, -0.095);
  pocketShape.lineTo(-0.1, -0.095);
  pocketShape.closePath();

  const apronExtrudeSettings: THREE.ExtrudeGeometryOptions = {
    depth: 0.035,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.012,
    bevelThickness: 0.01,
  };
  const apronSkirt = createMesh(
    new THREE.ExtrudeGeometry(apronSkirtShape, apronExtrudeSettings),
    apronFabric,
    {
      position: [0, 0.69, 0.315],
      rotation: [-0.035, 0, 0],
      castShadow: true,
    },
  );
  const apronBib = createMesh(
    new THREE.ExtrudeGeometry(apronBibShape, apronExtrudeSettings),
    apronFabric,
    {
      position: [0, 1, 0.285],
      rotation: [-0.1, 0, 0],
      castShadow: true,
    },
  );
  const leftApronStrap = createBox([0.055, 0.34, 0.035], apronFabric, {
    position: [-0.13, 1.22, 0.17],
    rotation: [-0.16, 0, -0.2],
    castShadow: true,
  });
  const rightApronStrap = createBox([0.055, 0.34, 0.035], apronFabric, {
    position: [0.13, 1.22, 0.17],
    rotation: [-0.16, 0, 0.2],
    castShadow: true,
  });
  const apronWaist = createBox([0.5, 0.075, 0.055], apronTrim, {
    position: [0, 0.91, 0.365],
    castShadow: true,
  });
  const leftApronTie = createBox([0.18, 0.055, 0.04], apronTrim, {
    position: [-0.32, 0.91, 0.18],
    rotation: [0, 0, -0.16],
    castShadow: true,
  });
  const rightApronTie = createBox([0.18, 0.055, 0.04], apronTrim, {
    position: [0.32, 0.91, 0.18],
    rotation: [0, 0, 0.16],
    castShadow: true,
  });
  const apronHem = createBox([0.53, 0.055, 0.05], apronTrim, {
    position: [0, 0.405, 0.355],
    castShadow: true,
  });
  const apronPocket = createMesh(
    new THREE.ExtrudeGeometry(pocketShape, {
      depth: 0.025,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.01,
      bevelThickness: 0.008,
    }),
    terracotta,
    {
      position: [0, 0.64, 0.37],
      castShadow: true,
    },
  );
  const apronPocketFlap = createBox([0.225, 0.045, 0.035], terracotta, {
    position: [0, 0.72, 0.398],
    castShadow: true,
  });
  const apronPocketButton = createMesh(
    new THREE.CylinderGeometry(0.024, 0.024, 0.018, 16),
    brass,
    {
      position: [0, 0.685, 0.422],
      rotation: [Math.PI / 2, 0, 0],
      castShadow: true,
    },
  );

  apron.add(
    apronSkirt,
    apronBib,
    leftApronStrap,
    rightApronStrap,
    apronWaist,
    leftApronTie,
    rightApronTie,
    apronHem,
    apronPocket,
    apronPocketFlap,
    apronPocketButton,
  );
  const satchel = createBox([0.27, 0.31, 0.16], terracotta, {
    position: [0.33, 0.61, 0.21],
    rotation: [0, 0.12, -0.06],
    castShadow: true,
  });
  const leftEye = createMesh(new THREE.SphereGeometry(0.04, 16, 12), face, {
    position: [-0.12, 1.43, 0.31],
    scale: [0.88, 1.15, 0.55],
  });
  const rightEye = createMesh(new THREE.SphereGeometry(0.04, 16, 12), face, {
    position: [0.12, 1.43, 0.31],
    scale: [0.88, 1.15, 0.55],
  });
  const leftMuzzle = createMesh(
    new THREE.SphereGeometry(0.105, 18, 14),
    creamFur,
    {
      position: [-0.065, 1.3, 0.31],
      scale: [1, 0.72, 0.56],
    },
  );
  const rightMuzzle = createMesh(
    new THREE.SphereGeometry(0.105, 18, 14),
    creamFur,
    {
      position: [0.065, 1.3, 0.31],
      scale: [1, 0.72, 0.56],
    },
  );
  const nose = createMesh(new THREE.SphereGeometry(0.045, 16, 12), innerEar, {
    position: [0, 1.34, 0.385],
    scale: [1.1, 0.72, 0.5],
  });

  const topHat = new THREE.Group();
  topHat.name = "dashboard-rabbit-merchant-top-hat";
  topHat.position.set(0.08, 1.67, 0.03);

  const hatStarShape = new THREE.Shape();
  for (let index = 0; index < 10; index += 1) {
    const radius = index % 2 === 0 ? 0.072 : 0.032;
    const angle = Math.PI / 2 + (index * Math.PI) / 5;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;

    if (index === 0) hatStarShape.moveTo(x, y);
    else hatStarShape.lineTo(x, y);
  }
  hatStarShape.closePath();

  topHat.add(
    createMesh(new THREE.CylinderGeometry(0.29, 0.29, 0.055, 32), hatVelvet, {
      castShadow: true,
    }),
    createMesh(
      new THREE.CylinderGeometry(0.19, 0.225, 0.4, 32),
      hatVelvet,
      {
        position: [0, 0.22, 0],
        castShadow: true,
      },
    ),
    createMesh(new THREE.CylinderGeometry(0.228, 0.228, 0.075, 32), hatBand, {
      position: [0, 0.075, 0],
      castShadow: true,
    }),
    createMesh(new THREE.ShapeGeometry(hatStarShape), brass, {
      position: [0, 0.075, 0.231],
      castShadow: true,
    }),
  );

  rabbit.add(
    tail,
    body,
    belly,
    head,
    leftEar,
    rightEar,
    leftFoot,
    rightFoot,
    leftArm,
    rightArm,
    apron,
    satchel,
    leftEye,
    rightEye,
    leftMuzzle,
    rightMuzzle,
    nose,
    topHat,
  );

  merchant.add(stall, rabbit);
  parent.add(merchant);

  return {
    object: merchant,
    update: (elapsed: number) => {
      const earSway = Math.sin(elapsed * 0.9);
      leftEar.rotation.z = 0.1 + earSway * 0.035;
      rightEar.rotation.z = -0.08 - earSway * 0.025;
    },
  };
}

function addFruitBasket(parent: THREE.Group, fruits: { id: string; fruitKind: string }[], onReady?: () => void) {
  const group = new THREE.Group();
  group.name = "dashboard-fruit-basket";
  group.position.set(...dashboardTableDisplayPositions.fruitBasket);

  const wicker = new THREE.MeshStandardMaterial({ color: "#b97a3f", roughness: 0.82 });
  const darkWicker = new THREE.MeshStandardMaterial({ color: "#805027", roughness: 0.88 });
  const basket = createMesh(new THREE.SphereGeometry(0.5, 24, 14, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58), wicker, {
    position: [0, 0.03, 0], scale: [1, 0.72, 0.62], castShadow: true,
  });
  const rim = createMesh(new THREE.TorusGeometry(0.42, 0.045, 10, 32), darkWicker, {
    position: [0, 0.18, 0], rotation: [Math.PI / 2, 0, 0], castShadow: true,
  });
  const handle = createMesh(new THREE.TorusGeometry(0.38, 0.035, 10, 28, Math.PI), darkWicker, {
    position: [0, 0.2, 0], rotation: [0, 0, 0], castShadow: true,
  });
  group.add(basket, rim, handle);

  const loader = new GLTFLoader();
  let disposed = false;
  const visibleFruits = fruits.slice(-5);
  let remainingModels = visibleFruits.length;
  const settleModel = () => {
    remainingModels -= 1;
    if (remainingModels === 0 && !disposed) onReady?.();
  };
  visibleFruits.forEach((fruit, index) => {
    const slot = new THREE.Group();
    slot.position.set(
      -0.22 + (index % 3) * 0.22,
      0.14 + Math.floor(index / 3) * 0.15,
      -0.08 + (index % 2) * 0.025,
    );
    group.add(slot);
    loader.load(
      `${fruitModelBaseUrl}${fruit.fruitKind}.glb`,
      (gltf) => {
        if (disposed) {
          disposeObject3D(gltf.scene);
          return;
        }
        const model = gltf.scene;
        const bounds = new THREE.Box3().setFromObject(model);
        const size = bounds.getSize(new THREE.Vector3());
        const scale = 0.27 / Math.max(size.x, size.y, size.z, 0.001);
        model.scale.setScalar(scale);
        model.updateMatrixWorld(true);
        const scaledBounds = new THREE.Box3().setFromObject(model);
        const scaledCenter = scaledBounds.getCenter(new THREE.Vector3());
        model.position.sub(
          new THREE.Vector3(scaledCenter.x, scaledBounds.min.y, scaledCenter.z),
        );
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        slot.add(model);
        settleModel();
      },
      undefined,
      (error) => {
        console.error(`Failed to load dashboard ${fruit.fruitKind} fruit.`, error);
        settleModel();
      },
    );
  });
  parent.add(group);
  return { object: group, dispose: () => { disposed = true; } };
}

export default function DashboardHomeScene({
  caughtBugs = [],
  embedded = false,
  wallSnapshot = null,
  onSnapshotClick,
  tableFlowerAsset = null,
  onBugClick,
  onTablePotClick,
  fruits = [],
  onFruitBasketClick,
  isMusicPlaying = false,
  onGramophoneClick,
  onDoorTransitionStart,
  onEnterCourtyard,
  onSceneReady,
}: DashboardHomeSceneProps) {
  const t = useTranslations("Dashboard");
  const gramophoneHotspotRef = useRef<HTMLButtonElement>(null);
  const doorHotspotRef = useRef<HTMLButtonElement>(null);
  const doorActionRef = useRef<(() => void) | null>(null);
  const isMusicPlayingRef = useRef(isMusicPlaying);

  useEffect(() => {
    isMusicPlayingRef.current = isMusicPlaying;
  }, [isMusicPlaying]);

  const setup = useCallback((context: ThreeStageContext) => {
    const { scene, camera, reducedMotion, renderer } = context;
    const root = new THREE.Group();
    const materials = createMaterials();
    const viewTarget = embedded ? snapshotCameraTarget : cameraTarget;
    const cameraBase = embedded
      ? new THREE.Vector3(characterPosition.x, 3.35, 12.4)
      : new THREE.Vector3(0, 3.2, 8.25);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const gramophoneAnchor = new THREE.Vector3();
    const doorAnchor = new THREE.Vector3();
    const exitStart = characterPosition.clone();
    const exitControl = new THREE.Vector3(3.8, 0, -0.55);
    const exitEnd = new THREE.Vector3(6.72, 0, -3.65);
    const targetQuaternion = new THREE.Quaternion();

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = embedded ? 0.82 : 1.05;
    scene.background = new THREE.Color("#f7ead7");
    scene.fog = new THREE.Fog("#f7ead7", 11, 21);
    scene.add(root);

    camera.position.copy(cameraBase);
    camera.lookAt(viewTarget);

    const hemisphereLight = new THREE.HemisphereLight(
      "#fff7e6",
      "#8c735e",
      embedded ? 0.9 : 1.2,
    );
    const windowLight = new THREE.DirectionalLight(
      "#fff1c9",
      embedded ? 2.25 : 3.6,
    );

    windowLight.position.set(3.8, 6.2, 2.3);
    windowLight.castShadow = true;
    windowLight.shadow.mapSize.set(1024, 1024);
    windowLight.shadow.camera.near = 0.5;
    windowLight.shadow.camera.far = 18;
    windowLight.shadow.camera.left = -7;
    windowLight.shadow.camera.right = 7;
    windowLight.shadow.camera.top = 6;
    windowLight.shadow.camera.bottom = -6;

    scene.add(hemisphereLight, windowLight);
    addRoom(root, materials);
    addFurniture(root, materials);
    const roomDoor = addRoomDoor(root, materials);
    let characterReady = false;
    let fruitModelsReady = fruits.length === 0;
    const reportSceneReady = () => {
      if (characterReady && fruitModelsReady) onSceneReady?.();
    };
    const tablePot = addTablePot({ parent: root, materials, tableFlowerAsset });
    const mountedWallSnapshot = addWallSnapshot({ parent: root, imageData: wallSnapshot?.imageData });
    const markCharacterReady = () => {
      characterReady = true;
      reportSceneReady();
    };
    const maleCharacter = loadDashboardCharacter({
      initialAnimation: "sit",
      name: "dashboard-sitting-character",
      onError: markCharacterReady,
      onReady: markCharacterReady,
      parent: root,
      position: characterPosition,
    });
    const orbitingBugs = loadOrbitingBugs({ parent: root, caughtBugs });
    const fruitBasket = addFruitBasket(root, fruits, () => { fruitModelsReady = true; reportSceneReady(); });
    const gramophone = addGramophone(root);

    let exitState: {
      elapsed: number;
      startQuaternion: THREE.Quaternion;
      started: boolean;
      walking: boolean;
    } | null = null;
    let exitCompleted = false;

    const beginDoorTransition = () => {
      if (!onEnterCourtyard || exitState || exitCompleted) return;

      onDoorTransitionStart?.();
      doorHotspotRef.current?.setAttribute("disabled", "");
      gramophoneHotspotRef.current?.setAttribute("disabled", "");

      if (reducedMotion || !maleCharacter.isReady()) {
        exitCompleted = true;
        roomDoor.update(1);
        onEnterCourtyard();
        return;
      }

      exitState = {
        elapsed: 0,
        startQuaternion: new THREE.Quaternion(),
        started: false,
        walking: false,
      };
    };
    doorActionRef.current = beginDoorTransition;

    const readPointer = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();

      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
    };

    const isTablePotHit = () => raycaster.intersectObject(tablePot.object, true).length > 0;
    const isSnapshotHit = () => raycaster.intersectObject(mountedWallSnapshot, true).length > 0;
    const isFruitBasketHit = () => raycaster.intersectObject(fruitBasket.object, true).length > 0;
    const isGramophoneHit = () => raycaster.intersectObject(gramophone.object, true).length > 0;
    const isDoorHit = () => raycaster.intersectObject(roomDoor.object, true).length > 0;

    const getBugHit = () => {
      const intersections = raycaster.intersectObjects(orbitingBugs.objects, true);

      for (const intersection of intersections) {
        let object: THREE.Object3D | null = intersection.object;

        while (object) {
          const bugId = object.userData.bugId as string | undefined;
          if (bugId) return bugId;
          object = object.parent;
        }
      }

      return null;
    };

    const onPointerMove = (event: PointerEvent) => {
      if (exitState || exitCompleted) {
        renderer.domElement.style.cursor = "";
        return;
      }

      if (!onTablePotClick && !onBugClick && !onSnapshotClick && !onFruitBasketClick && !onGramophoneClick && !onEnterCourtyard) {
        return;
      }

      readPointer(event);
      renderer.domElement.style.cursor = getBugHit() || (onTablePotClick && isTablePotHit()) || (onSnapshotClick && isSnapshotHit()) || (onFruitBasketClick && isFruitBasketHit()) || (onGramophoneClick && isGramophoneHit()) || (onEnterCourtyard && isDoorHit()) ? "pointer" : "";
    };

    const onPointerDown = (event: PointerEvent) => {
      if (exitState || exitCompleted) return;

      if (!onTablePotClick && !onBugClick && !onSnapshotClick && !onFruitBasketClick && !onGramophoneClick && !onEnterCourtyard) {
        return;
      }

      readPointer(event);

      if (onEnterCourtyard && isDoorHit()) {
        event.preventDefault();
        beginDoorTransition();
        return;
      }

      const bugId = getBugHit();
      if (bugId && onBugClick) {
        event.preventDefault();
        onBugClick(bugId);
        return;
      }

      if (onGramophoneClick && isGramophoneHit()) {
        event.preventDefault();
        onGramophoneClick();
        return;
      }

      if (onSnapshotClick && isSnapshotHit()) {
        event.preventDefault();
        onSnapshotClick();
        return;
      }

      if (onFruitBasketClick && isFruitBasketHit()) {
        event.preventDefault();
        onFruitBasketClick();
        return;
      }

      if (!onTablePotClick || !isTablePotHit()) {
        return;
      }

      event.preventDefault();
      onTablePotClick();
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

      const isVisible =
        Math.abs(anchor.x) <= 1.05 &&
        Math.abs(anchor.y) <= 1.05 &&
        anchor.z <= 1;
      hotspot.hidden = !isVisible;
      if (!isVisible) return;

      hotspot.style.left = `${(anchor.x * 0.5 + 0.5) * 100}%`;
      hotspot.style.top = `${(-anchor.y * 0.5 + 0.5) * 100}%`;
      hotspot.dataset.positioned = "true";
    };

    const updateHotspots = () => {
      positionHotspot(
        gramophoneHotspotRef.current,
        gramophone.object,
        gramophoneAnchor,
        new THREE.Vector3(0, 0.55, 0),
      );
      positionHotspot(
        doorHotspotRef.current,
        roomDoor.object,
        doorAnchor,
        new THREE.Vector3(0, 1.35, 0.2),
      );
    };

    const onResize = ({ width, height }: ThreeStageResize) => {
      const compact = width / height < 1.35;

      camera.fov = embedded ? (compact ? 48 : 44) : (compact ? 43 : 38);
      if (embedded) {
        cameraBase.set(characterPosition.x, compact ? 3.55 : 3.35, compact ? 13.2 : 12.4);
      } else {
        cameraBase.set(0, compact ? 3.45 : 3.2, compact ? 9.5 : 8.25);
      }
      camera.position.copy(cameraBase);
      camera.lookAt(viewTarget);
      camera.updateProjectionMatrix();
      if (!exitState && !exitCompleted) maleCharacter.faceCamera(camera);
      updateHotspots();
    };

    const onFrame = ({ delta, elapsed }: ThreeStageFrame) => {
      const cameraDrift = Math.sin(elapsed * 0.18) * 0.12;

      camera.position.set(cameraBase.x + cameraDrift, cameraBase.y, cameraBase.z);
      camera.lookAt(viewTarget);
      maleCharacter.update(delta);

      const character = maleCharacter.getObject();
      if (exitState && character && maleCharacter.isReady()) {
        if (!exitState.started) {
          exitState.started = true;
          exitState.startQuaternion.copy(character.quaternion);
          const facingHelper = new THREE.Object3D();
          facingHelper.position.copy(character.position);
          facingHelper.lookAt(exitEnd);
          targetQuaternion.copy(facingHelper.quaternion);
          maleCharacter.play("idle", { fadeDuration: 0.55 });
        }

        exitState.elapsed += delta;
        const turnProgress = THREE.MathUtils.smoothstep(
          exitState.elapsed / 0.55,
          0,
          1,
        );
        character.quaternion.slerpQuaternions(
          exitState.startQuaternion,
          targetQuaternion,
          turnProgress,
        );

        if (exitState.elapsed >= 0.5 && !exitState.walking) {
          exitState.walking = true;
          maleCharacter.play("walk", { fadeDuration: 0.18 });
        }

        const walkProgress = THREE.MathUtils.clamp(
          (exitState.elapsed - 0.5) / 2.65,
          0,
          1,
        );
        const inverse = 1 - walkProgress;
        character.position.set(
          inverse * inverse * exitStart.x +
            2 * inverse * walkProgress * exitControl.x +
            walkProgress * walkProgress * exitEnd.x,
          0,
          inverse * inverse * exitStart.z +
            2 * inverse * walkProgress * exitControl.z +
            walkProgress * walkProgress * exitEnd.z,
        );
        roomDoor.update(
          THREE.MathUtils.clamp((walkProgress - 0.58) / 0.32, 0, 1),
        );

        if (walkProgress >= 1 && !exitCompleted) {
          exitCompleted = true;
          onEnterCourtyard?.();
        }
      } else if (!exitState && !exitCompleted) {
        maleCharacter.faceCamera(camera);
      }

      orbitingBugs.update(elapsed);
      if (isMusicPlayingRef.current) gramophone.update(delta);
      updateHotspots();
    };

    return {
      onFrame,
      onResize,
      dispose: () => {
        maleCharacter.dispose();
        orbitingBugs.dispose();
        tablePot.dispose();
        fruitBasket.dispose();
        renderer.domElement.removeEventListener("pointermove", onPointerMove);
        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        if (doorActionRef.current === beginDoorTransition) {
          doorActionRef.current = null;
        }
        scene.remove(root, hemisphereLight, windowLight);
        disposeObject3D(root);
      },
    };
  }, [caughtBugs, embedded, fruits, onBugClick, onDoorTransitionStart, onEnterCourtyard, onFruitBasketClick, onGramophoneClick, onSceneReady, onSnapshotClick, onTablePotClick, tableFlowerAsset, wallSnapshot]);

  return (
    <div
      className={[
        "dashboard-three-layer",
        embedded ? "dashboard-three-layer-embedded" : "",
        onTablePotClick || onBugClick || onSnapshotClick || onFruitBasketClick || onGramophoneClick || onEnterCourtyard ? "dashboard-three-layer-interactive" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <ThreeStage
        className="dashboard-three-stage"
        setup={setup}
        preserveDrawingBuffer={embedded}
        fallback={<div className="dashboard-three-fallback" />}
      />
      {onGramophoneClick ? (
        <button
          aria-label={t("openMusicPlayer")}
          className="dashboard-scene-hotspot dashboard-gramophone-hotspot"
          id="dashboard-gramophone-trigger"
          onClick={onGramophoneClick}
          ref={gramophoneHotspotRef}
          type="button"
        >
          <span>{t("openMusicPlayer")}</span>
        </button>
      ) : null}
      {onEnterCourtyard && !embedded ? (
        <button
          aria-label={t("openCourtyard")}
          className="dashboard-scene-hotspot dashboard-door-hotspot"
          id="dashboard-room-door-trigger"
          onClick={() => doorActionRef.current?.()}
          ref={doorHotspotRef}
          type="button"
        >
          <span>{t("openCourtyard")}</span>
        </button>
      ) : null}
    </div>
  );
}
