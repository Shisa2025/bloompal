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

const maleModelUrl = "/meshes/characters/male.glb";
const bugModelBaseUrl = "/meshes/bugs/";
const flowerModelBaseUrl = "/meshes/flowers/";
const fruitModelBaseUrl = "/meshes/fruits/";
const characterFacingOffset = 0;

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
const characterLookTarget = new THREE.Vector3();
export const dashboardTableDisplayPositions = {
  gramophone: [-4.05, 1.19, -3.38],
  flowerPot: [-2.65, 1.2, -3.35],
  fruitBasket: [-1.25, 1.25, -3.36],
} as const;
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

function frameCharacterModel(model: THREE.Object3D) {
  const sourceBox = new THREE.Box3().setFromObject(model);
  const sourceSize = sourceBox.getSize(new THREE.Vector3());
  const targetHeight = 1.92;
  const scale = targetHeight / Math.max(sourceSize.y, 0.001);

  model.scale.setScalar(scale);
  model.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(model);
  const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

  model.position.sub(new THREE.Vector3(scaledCenter.x, scaledBox.min.y, scaledCenter.z));
}

function configureCharacterModel(model: THREE.Object3D) {
  model.traverse((child) => {
    const mesh = child as THREE.Mesh;

    if (!mesh.isObject3D || !mesh.type.includes("Mesh")) {
      return;
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;
  });
}

function faceCharacterToCamera(
  character: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
) {
  characterLookTarget.set(camera.position.x, character.position.y, camera.position.z);
  character.lookAt(characterLookTarget);
  character.rotateY(characterFacingOffset);
}

function loadMaleCharacter({
  camera,
  root,
  mixers,
  onReady,
}: {
  camera: THREE.PerspectiveCamera;
  root: THREE.Group;
  mixers: THREE.AnimationMixer[];
  onReady?: () => void;
}) {
  const loader = new GLTFLoader();
  let disposed = false;
  let character: THREE.Group | null = null;

  loader.load(
    maleModelUrl,
    (gltf) => {
      if (disposed) {
        disposeObject3D(gltf.scene);
        return;
      }

      character = new THREE.Group();
      character.name = "dashboard-sitting-character";
      character.position.copy(characterPosition);

      configureCharacterModel(gltf.scene);
      frameCharacterModel(gltf.scene);
      character.add(gltf.scene);
      root.add(character);
      faceCharacterToCamera(character, camera);
      onReady?.();

      const mixer = new THREE.AnimationMixer(gltf.scene);
      const sitClip =
        THREE.AnimationClip.findByName(gltf.animations, "sit") ??
        gltf.animations.find((clip) => clip.name.toLowerCase().includes("sit"));

      if (sitClip) {
        mixer.clipAction(sitClip).reset().setLoop(THREE.LoopRepeat, Infinity).play();
        mixer.update(0);
        mixers.push(mixer);
      } else {
        console.warn("male.glb does not contain a sit animation.");
      }
    },
    undefined,
    (error) => {
      console.error("Failed to load male character model.", error);
    },
  );

  return {
    face: () => {
      if (character) {
        faceCharacterToCamera(character, camera);
      }
    },
    dispose: () => {
      disposed = true;
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
  onSceneReady,
}: DashboardHomeSceneProps) {
  const t = useTranslations("Dashboard");
  const gramophoneHotspotRef = useRef<HTMLButtonElement>(null);
  const isMusicPlayingRef = useRef(isMusicPlaying);

  useEffect(() => {
    isMusicPlayingRef.current = isMusicPlaying;
  }, [isMusicPlaying]);

  const setup = useCallback((context: ThreeStageContext) => {
    const { scene, camera, renderer } = context;
    const root = new THREE.Group();
    const materials = createMaterials();
    const mixers: THREE.AnimationMixer[] = [];
    const viewTarget = embedded ? snapshotCameraTarget : cameraTarget;
    const cameraBase = embedded
      ? new THREE.Vector3(characterPosition.x, 3.35, 12.4)
      : new THREE.Vector3(0, 3.2, 8.25);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const gramophoneAnchor = new THREE.Vector3();

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
    let characterReady = false;
    let fruitModelsReady = fruits.length === 0;
    const reportSceneReady = () => {
      if (characterReady && fruitModelsReady) onSceneReady?.();
    };
    const tablePot = addTablePot({ parent: root, materials, tableFlowerAsset });
    const mountedWallSnapshot = addWallSnapshot({ parent: root, imageData: wallSnapshot?.imageData });
    const maleCharacter = loadMaleCharacter({ camera, root, mixers, onReady: () => { characterReady = true; reportSceneReady(); } });
    const orbitingBugs = loadOrbitingBugs({ parent: root, caughtBugs });
    const fruitBasket = addFruitBasket(root, fruits, () => { fruitModelsReady = true; reportSceneReady(); });
    const gramophone = addGramophone(root);

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
      if (!onTablePotClick && !onBugClick && !onSnapshotClick && !onFruitBasketClick && !onGramophoneClick) {
        return;
      }

      readPointer(event);
      renderer.domElement.style.cursor = getBugHit() || (onTablePotClick && isTablePotHit()) || (onSnapshotClick && isSnapshotHit()) || (onFruitBasketClick && isFruitBasketHit()) || (onGramophoneClick && isGramophoneHit()) ? "pointer" : "";
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!onTablePotClick && !onBugClick && !onSnapshotClick && !onFruitBasketClick && !onGramophoneClick) {
        return;
      }

      readPointer(event);

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
      maleCharacter.face();
      updateGramophoneHotspot();
    };

    const updateGramophoneHotspot = () => {
      const hotspot = gramophoneHotspotRef.current;
      if (!hotspot) return;

      gramophoneAnchor.set(0, 0.55, 0);
      gramophone.object.localToWorld(gramophoneAnchor);
      gramophoneAnchor.project(camera);

      const isVisible = Math.abs(gramophoneAnchor.x) <= 1.05 && Math.abs(gramophoneAnchor.y) <= 1.05 && gramophoneAnchor.z <= 1;
      hotspot.hidden = !isVisible;
      if (!isVisible) return;

      hotspot.style.left = `${(gramophoneAnchor.x * 0.5 + 0.5) * 100}%`;
      hotspot.style.top = `${(-gramophoneAnchor.y * 0.5 + 0.5) * 100}%`;
      hotspot.dataset.positioned = "true";
    };

    const onFrame = ({ delta, elapsed }: ThreeStageFrame) => {
      const cameraDrift = Math.sin(elapsed * 0.18) * 0.12;

      camera.position.set(cameraBase.x + cameraDrift, cameraBase.y, cameraBase.z);
      camera.lookAt(viewTarget);
      maleCharacter.face();
      mixers.forEach((mixer) => mixer.update(delta));
      orbitingBugs.update(elapsed);
      if (isMusicPlayingRef.current) gramophone.update(delta);
      updateGramophoneHotspot();
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
        scene.remove(root, hemisphereLight, windowLight);
        disposeObject3D(root);
      },
    };
  }, [caughtBugs, embedded, fruits, onBugClick, onFruitBasketClick, onGramophoneClick, onSceneReady, onSnapshotClick, onTablePotClick, tableFlowerAsset, wallSnapshot]);

  return (
    <div
      className={[
        "dashboard-three-layer",
        embedded ? "dashboard-three-layer-embedded" : "",
        onTablePotClick || onBugClick || onSnapshotClick || onFruitBasketClick || onGramophoneClick ? "dashboard-three-layer-interactive" : "",
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
          className="dashboard-gramophone-hotspot"
          id="dashboard-gramophone-trigger"
          onClick={onGramophoneClick}
          ref={gramophoneHotspotRef}
          type="button"
        >
          <span>{t("openMusicPlayer")}</span>
        </button>
      ) : null}
    </div>
  );
}
