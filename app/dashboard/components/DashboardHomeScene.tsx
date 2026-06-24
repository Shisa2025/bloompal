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

const maleModelUrl = "/meshes/characters/male.glb";
const characterFacingOffset = 0;

type Transform = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  castShadow?: boolean;
  receiveShadow?: boolean;
};

type LeafMesh = THREE.Mesh & {
  userData: {
    baseRotationZ?: number;
    phase?: number;
  };
};

const cameraTarget = new THREE.Vector3(0, 1.7, -2.6);
const characterPosition = new THREE.Vector3(0.2, 0, 1.25);
const characterLookTarget = new THREE.Vector3();

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

function createLeaf(
  material: THREE.Material,
  transform: Transform & { phase: number },
) {
  const leaf = createMesh(
    new THREE.SphereGeometry(0.42, 18, 12),
    material,
    transform,
  ) as LeafMesh;

  leaf.userData.baseRotationZ = leaf.rotation.z;
  leaf.userData.phase = transform.phase;

  return leaf;
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
    createBox([0.1, 2.12, 0.13], materials.wood, {
      position: [0, 0, 0.02],
      castShadow: true,
    }),
    createBox([2.48, 0.1, 0.13], materials.wood, {
      position: [0, 0, 0.02],
      castShadow: true,
    }),
    createMesh(new THREE.PlaneGeometry(2.24, 1.9), materials.glass, {
      position: [0, 0, 0.04],
    }),
  );

  parent.add(frame);
}

function addPlant(
  parent: THREE.Group,
  materials: Record<string, THREE.Material>,
  animatedLeaves: LeafMesh[],
  transform: { x: number; z: number; scale: number; phase: number; pot: string },
) {
  const plant = new THREE.Group();
  plant.position.set(transform.x, 0, transform.z);
  plant.scale.setScalar(transform.scale);

  plant.add(
    createMesh(new THREE.CylinderGeometry(0.5, 0.62, 0.68, 28), materials[transform.pot], {
      position: [0, 0.36, 0],
      castShadow: true,
      receiveShadow: true,
    }),
    createMesh(new THREE.CylinderGeometry(0.48, 0.48, 0.08, 28), materials.soil, {
      position: [0, 0.73, 0],
      receiveShadow: true,
    }),
    createMesh(new THREE.CylinderGeometry(0.68, 0.76, 0.08, 28), materials.ceramicLip, {
      position: [0, 0.72, 0],
      castShadow: true,
    }),
  );

  for (let index = 0; index < 7; index += 1) {
    const angle = index * 0.92;
    const radius = 0.2 + (index % 3) * 0.06;
    const height = 0.98 + (index % 4) * 0.17;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius * 0.7;

    plant.add(
      createMesh(new THREE.CylinderGeometry(0.025, 0.035, height - 0.62, 8), materials.stem, {
        position: [x * 0.5, 0.83 + (height - 0.62) / 2, z * 0.5],
        rotation: [0, 0, Math.cos(angle) * 0.18],
        castShadow: true,
      }),
    );

    const leaf = createLeaf(materials.leaf, {
      position: [x, height, z],
      rotation: [0.38, angle, Math.sin(angle) * 0.55],
      scale: [0.48, 0.12, 0.88 + (index % 2) * 0.22],
      castShadow: true,
      phase: transform.phase + index * 0.55,
    });

    animatedLeaves.push(leaf);
    plant.add(leaf);
  }

  parent.add(plant);
}

function addTrailingPlant(
  parent: THREE.Group,
  materials: Record<string, THREE.Material>,
  animatedLeaves: LeafMesh[],
) {
  const plant = new THREE.Group();
  plant.position.set(3.75, 1.92, -4.88);
  plant.scale.setScalar(0.72);

  plant.add(
    createMesh(new THREE.CylinderGeometry(0.42, 0.48, 0.5, 28), materials.potRose, {
      position: [0, 0.25, 0],
      castShadow: true,
    }),
    createMesh(new THREE.CylinderGeometry(0.4, 0.4, 0.06, 28), materials.soil, {
      position: [0, 0.52, 0],
    }),
  );

  for (let index = 0; index < 9; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const y = 0.56 - index * 0.13;
    const x = side * (0.18 + index * 0.025);
    const z = 0.08 * Math.sin(index);

    plant.add(
      createMesh(new THREE.CylinderGeometry(0.014, 0.018, 0.48, 8), materials.stem, {
        position: [x * 0.5, y + 0.08, z],
        rotation: [0, 0, side * 0.45],
        castShadow: true,
      }),
    );

    const leaf = createLeaf(materials.leafLight, {
      position: [x, y, z],
      rotation: [0.5, side * 0.9, side * 0.8],
      scale: [0.28, 0.09, 0.45],
      castShadow: true,
      phase: 2.4 + index * 0.45,
    });

    animatedLeaves.push(leaf);
    plant.add(leaf);
  }

  parent.add(plant);
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

function addFurniture(
  parent: THREE.Group,
  materials: Record<string, THREE.Material>,
  animatedLeaves: LeafMesh[],
) {
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
    createBox([3.4, 0.14, 0.62], materials.wood, {
      position: [3.45, 2.1, -5.58],
      castShadow: true,
      receiveShadow: true,
    }),
    createBox([2.75, 0.16, 0.52], materials.wood, {
      position: [3.25, 3.0, -5.58],
      castShadow: true,
      receiveShadow: true,
    }),
    createMesh(new THREE.CylinderGeometry(0.06, 0.06, 1.15, 16), materials.lampMetal, {
      position: [4.92, 0.62, -2.92],
      castShadow: true,
    }),
    createMesh(new THREE.CylinderGeometry(0.36, 0.55, 0.58, 28, 1, true), materials.lampShade, {
      position: [4.92, 1.37, -2.92],
      castShadow: true,
    }),
  );

  addPlant(parent, materials, animatedLeaves, {
    x: -3.72,
    z: -3.38,
    scale: 0.82,
    phase: 0,
    pot: "potRose",
  });
  addPlant(parent, materials, animatedLeaves, {
    x: -1.82,
    z: -3.35,
    scale: 0.68,
    phase: 1.1,
    pot: "potGold",
  });
  addPlant(parent, materials, animatedLeaves, {
    x: 1.15,
    z: 0.65,
    scale: 1.18,
    phase: 1.9,
    pot: "potClay",
  });
  addPlant(parent, materials, animatedLeaves, {
    x: 4.05,
    z: -0.25,
    scale: 0.92,
    phase: 3.2,
    pot: "potGold",
  });
  addTrailingPlant(parent, materials, animatedLeaves);
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
    ceramicLip: new THREE.MeshStandardMaterial({
      color: "#f2d3a5",
      roughness: 0.58,
    }),
    floor: new THREE.MeshStandardMaterial({
      color: "#d8b994",
      roughness: 0.86,
    }),
    glass: new THREE.MeshStandardMaterial({
      color: "#cfe7f0",
      transparent: true,
      opacity: 0.52,
      roughness: 0.12,
      metalness: 0.02,
    }),
    lampMetal: new THREE.MeshStandardMaterial({
      color: "#b48a55",
      metalness: 0.25,
      roughness: 0.36,
    }),
    lampShade: new THREE.MeshStandardMaterial({
      color: "#f8d9a7",
      emissive: "#f0aa54",
      emissiveIntensity: 0.24,
      roughness: 0.55,
      side: THREE.DoubleSide,
    }),
    leaf: new THREE.MeshStandardMaterial({
      color: "#4f875c",
      roughness: 0.75,
    }),
    leafLight: new THREE.MeshStandardMaterial({
      color: "#83ad78",
      roughness: 0.72,
    }),
    potClay: new THREE.MeshStandardMaterial({
      color: "#c57f5b",
      roughness: 0.72,
    }),
    potGold: new THREE.MeshStandardMaterial({
      color: "#dfb960",
      roughness: 0.62,
    }),
    potRose: new THREE.MeshStandardMaterial({
      color: "#df8aa5",
      roughness: 0.66,
    }),
    rug: new THREE.MeshStandardMaterial({
      color: "#d8908d",
      roughness: 0.88,
    }),
    sideWall: new THREE.MeshStandardMaterial({
      color: "#efe2cf",
      roughness: 0.92,
    }),
    soil: new THREE.MeshStandardMaterial({
      color: "#4a3528",
      roughness: 0.95,
    }),
    stem: new THREE.MeshStandardMaterial({
      color: "#507344",
      roughness: 0.82,
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
  };
}

export default function DashboardHomeScene() {
  const setup = useCallback((context: ThreeStageContext) => {
    const { scene, camera, renderer } = context;
    const root = new THREE.Group();
    const materials = createMaterials();
    const animatedLeaves: LeafMesh[] = [];
    const mixers: THREE.AnimationMixer[] = [];
    const cameraBase = new THREE.Vector3(0, 3.2, 8.25);

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    scene.background = new THREE.Color("#f7ead7");
    scene.fog = new THREE.Fog("#f7ead7", 11, 21);
    scene.add(root);

    camera.position.copy(cameraBase);
    camera.lookAt(cameraTarget);

    const hemisphereLight = new THREE.HemisphereLight("#fff7e6", "#8c735e", 1.2);
    const windowLight = new THREE.DirectionalLight("#fff1c9", 3.6);
    const lampLight = new THREE.PointLight("#ffcf8a", 2.1, 7.5, 1.9);

    windowLight.position.set(3.8, 6.2, 2.3);
    windowLight.castShadow = true;
    windowLight.shadow.mapSize.set(1024, 1024);
    windowLight.shadow.camera.near = 0.5;
    windowLight.shadow.camera.far = 18;
    windowLight.shadow.camera.left = -7;
    windowLight.shadow.camera.right = 7;
    windowLight.shadow.camera.top = 6;
    windowLight.shadow.camera.bottom = -6;

    lampLight.position.set(4.92, 1.38, -2.92);

    scene.add(hemisphereLight, windowLight, lampLight);
    addRoom(root, materials);
    addFurniture(root, materials, animatedLeaves);
    const maleCharacter = loadMaleCharacter({ camera, root, mixers });

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
      lampLight.intensity = 2 + Math.sin(elapsed * 0.8) * 0.08;
      maleCharacter.face();
      mixers.forEach((mixer) => mixer.update(delta));

      animatedLeaves.forEach((leaf, index) => {
        const baseRotationZ = leaf.userData.baseRotationZ ?? 0;
        const phase = leaf.userData.phase ?? index;

        leaf.rotation.z = baseRotationZ + Math.sin(elapsed * 0.78 + phase) * 0.055;
      });
    };

    return {
      onFrame,
      onResize,
      dispose: () => {
        maleCharacter.dispose();
        scene.remove(root, hemisphereLight, windowLight, lampLight);
        disposeObject3D(root);
      },
    };
  }, []);

  return (
    <div className="dashboard-three-layer" aria-hidden="true">
      <ThreeStage
        className="dashboard-three-stage"
        setup={setup}
        fallback={<div className="dashboard-three-fallback" />}
      />
    </div>
  );
}
