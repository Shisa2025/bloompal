"use client";

import { useCallback } from "react";
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
const characterLookTarget = new THREE.Vector3();
const tablePotPosition = new THREE.Vector3(-3.12, 1.2, -3.35);

type DashboardHomeSceneProps = {
  caughtBugs?: DashboardBug[];
  embedded?: boolean;
  wallSnapshot?: { id: string; imageData: string } | null;
  onSnapshotClick?: () => void;
  tableFlowerAsset?: string | null;
  onBugClick?: (bugId: string) => void;
  onTablePotClick?: () => void;
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
}: {
  camera: THREE.PerspectiveCamera;
  root: THREE.Group;
  mixers: THREE.AnimationMixer[];
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

export default function DashboardHomeScene({
  caughtBugs = [],
  embedded = false,
  wallSnapshot = null,
  onSnapshotClick,
  tableFlowerAsset = null,
  onBugClick,
  onTablePotClick,
}: DashboardHomeSceneProps) {
  const setup = useCallback((context: ThreeStageContext) => {
    const { scene, camera, renderer } = context;
    const root = new THREE.Group();
    const materials = createMaterials();
    const mixers: THREE.AnimationMixer[] = [];
    const cameraBase = new THREE.Vector3(0, 3.2, 8.25);
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    scene.background = new THREE.Color("#f7ead7");
    scene.fog = new THREE.Fog("#f7ead7", 11, 21);
    scene.add(root);

    camera.position.copy(cameraBase);
    camera.lookAt(cameraTarget);

    const hemisphereLight = new THREE.HemisphereLight("#fff7e6", "#8c735e", 1.2);
    const windowLight = new THREE.DirectionalLight("#fff1c9", 3.6);

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
    const tablePot = addTablePot({ parent: root, materials, tableFlowerAsset });
    const mountedWallSnapshot = addWallSnapshot({ parent: root, imageData: wallSnapshot?.imageData });
    const maleCharacter = loadMaleCharacter({ camera, root, mixers });
    const orbitingBugs = loadOrbitingBugs({ parent: root, caughtBugs });

    const readPointer = (event: PointerEvent) => {
      const bounds = renderer.domElement.getBoundingClientRect();

      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    };

    const isTablePotHit = () => {
      raycaster.setFromCamera(pointer, camera);

      return raycaster.intersectObject(tablePot.object, true).length > 0;
    };
    const isSnapshotHit = () => raycaster.intersectObject(mountedWallSnapshot, true).length > 0;

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
      if (!onTablePotClick && !onBugClick && !onSnapshotClick) {
        return;
      }

      readPointer(event);
      renderer.domElement.style.cursor = getBugHit() || (onTablePotClick && isTablePotHit()) || (onSnapshotClick && isSnapshotHit()) ? "pointer" : "";
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!onTablePotClick && !onBugClick && !onSnapshotClick) {
        return;
      }

      readPointer(event);

      const bugId = getBugHit();
      if (bugId && onBugClick) {
        event.preventDefault();
        onBugClick(bugId);
        return;
      }

      if (onSnapshotClick && isSnapshotHit()) {
        event.preventDefault();
        onSnapshotClick();
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

      camera.fov = compact ? 43 : 38;
      cameraBase.set(0, compact ? 3.45 : 3.2, compact ? 9.5 : 8.25);
      camera.position.copy(cameraBase);
      camera.lookAt(cameraTarget);
      camera.updateProjectionMatrix();
      maleCharacter.face();
    };

    const onFrame = ({ delta, elapsed }: ThreeStageFrame) => {
      const cameraDrift = Math.sin(elapsed * 0.18) * 0.12;

      camera.position.set(cameraBase.x + cameraDrift, cameraBase.y, cameraBase.z);
      camera.lookAt(cameraTarget);
      maleCharacter.face();
      mixers.forEach((mixer) => mixer.update(delta));
      orbitingBugs.update(elapsed);
    };

    return {
      onFrame,
      onResize,
      dispose: () => {
        maleCharacter.dispose();
        orbitingBugs.dispose();
        tablePot.dispose();
        renderer.domElement.removeEventListener("pointermove", onPointerMove);
        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        scene.remove(root, hemisphereLight, windowLight);
        disposeObject3D(root);
      },
    };
  }, [caughtBugs, onBugClick, onSnapshotClick, onTablePotClick, tableFlowerAsset, wallSnapshot]);

  return (
    <div
      className={[
        "dashboard-three-layer",
        embedded ? "dashboard-three-layer-embedded" : "",
        onTablePotClick || onBugClick || onSnapshotClick ? "dashboard-three-layer-interactive" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden="true"
    >
      <ThreeStage
        className="dashboard-three-stage"
        setup={setup}
        preserveDrawingBuffer={embedded}
        fallback={<div className="dashboard-three-fallback" />}
      />
    </div>
  );
}
