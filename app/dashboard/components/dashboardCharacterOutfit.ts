import * as THREE from "three";
import {
  defaultDashboardOutfitId,
  type DashboardOutfitId,
} from "./dashboardOutfits";

export const mossCardiganSourceMeshNames = [
  "Character005",
  "Character006",
  "Character007",
  "Character009",
  "Character010",
] as const;

export const honeyRaincoatSourceMeshNames = mossCardiganSourceMeshNames;

const mossCardiganPartDefinitions = [
  {
    sourceName: "Character005",
    slot: "torso",
    colour: "#71866f",
    expansion: [1.04, 1.025, 1.05],
  },
  {
    sourceName: "Character006",
    slot: "left-lower-sleeve",
    colour: "#82977a",
    expansion: [1.01, 1.05, 1.05],
  },
  {
    sourceName: "Character007",
    slot: "left-upper-sleeve",
    colour: "#71866f",
    expansion: [1.01, 1.05, 1.05],
  },
  {
    sourceName: "Character009",
    slot: "right-lower-sleeve",
    colour: "#82977a",
    expansion: [1.01, 1.05, 1.05],
  },
  {
    sourceName: "Character010",
    slot: "right-upper-sleeve",
    colour: "#71866f",
    expansion: [1.01, 1.05, 1.05],
  },
] as const;

const honeyRaincoatPartDefinitions = [
  {
    sourceName: "Character005",
    slot: "torso",
    colour: "#dba536",
    expansion: [1.08, 1.04, 1.08],
  },
  {
    sourceName: "Character006",
    slot: "left-lower-sleeve",
    colour: "#d5a03a",
    expansion: [1.035, 1.055, 1.065],
  },
  {
    sourceName: "Character007",
    slot: "left-upper-sleeve",
    colour: "#dba536",
    expansion: [1.035, 1.055, 1.065],
  },
  {
    sourceName: "Character009",
    slot: "right-lower-sleeve",
    colour: "#d5a03a",
    expansion: [1.035, 1.055, 1.065],
  },
  {
    sourceName: "Character010",
    slot: "right-upper-sleeve",
    colour: "#dba536",
    expansion: [1.035, 1.055, 1.065],
  },
] as const;

export type DashboardCharacterOutfitController = {
  dispose: () => void;
  setOutfit: (outfitId: DashboardOutfitId) => void;
};

export function createDashboardCharacterOutfit(
  model: THREE.Object3D,
  initialOutfitId: DashboardOutfitId = defaultDashboardOutfitId,
): DashboardCharacterOutfitController | null {
  const sourceMeshes = mossCardiganPartDefinitions.map((definition) => {
    const object = model.getObjectByName(definition.sourceName);
    return object instanceof THREE.SkinnedMesh ? object : null;
  });
  if (sourceMeshes.some((mesh) => !mesh)) return null;

  const typedSourceMeshes = sourceMeshes as THREE.SkinnedMesh[];
  const referenceMesh = typedSourceMeshes[0];
  const parent = referenceMesh.parent;
  if (!parent) return null;
  if (
    typedSourceMeshes.some(
      (mesh) => mesh.parent !== parent || mesh.skeleton !== referenceMesh.skeleton,
    )
  ) {
    return null;
  }

  const originalVisibility = typedSourceMeshes.map((mesh) => mesh.visible);
  const cardiganMeshes: THREE.SkinnedMesh[] = [];
  const raincoatMeshes: THREE.SkinnedMesh[] = [];
  const garmentMeshes: THREE.SkinnedMesh[] = [];
  const materials = new Set<THREE.Material>();
  const registerGarment = (
    collection: THREE.SkinnedMesh[],
    garment: THREE.SkinnedMesh,
  ) => {
    parent.add(garment);
    collection.push(garment);
    garmentMeshes.push(garment);
  };

  try {
    mossCardiganPartDefinitions.forEach((definition, index) => {
      const source = typedSourceMeshes[index];
      const material = new THREE.MeshStandardMaterial({
        color: definition.colour,
        metalness: 0.02,
        roughness: 0.94,
      });
      materials.add(material);
      const geometry = source.geometry.clone();
      expandGeometry(geometry, definition.expansion);
      const garment = createBoundMesh({
        geometry,
        material,
        name: `dashboard-outfit-moss-cardigan-${definition.slot}`,
        source,
      });
      registerGarment(cardiganMeshes, garment);
    });

    const trimMaterial = new THREE.MeshStandardMaterial({
      color: "#eee2c9",
      metalness: 0,
      roughness: 0.98,
    });
    const buttonMaterial = new THREE.MeshStandardMaterial({
      color: "#8b5d3d",
      metalness: 0.04,
      roughness: 0.88,
    });
    materials.add(trimMaterial);
    materials.add(buttonMaterial);

    const placketGeometry = new THREE.BoxGeometry(0.09, 0.58, 0.055);
    placketGeometry.translate(0, 1.11, 0.3);
    const placket = createRigidGarmentMesh({
      boneName: "Torso",
      geometry: placketGeometry,
      material: trimMaterial,
      name: "dashboard-outfit-moss-cardigan-placket",
      source: referenceMesh,
    });
    registerGarment(cardiganMeshes, placket);

    [0.93, 1.11, 1.29].forEach((y, index) => {
      const buttonGeometry = new THREE.SphereGeometry(0.038, 12, 8);
      buttonGeometry.translate(0, y, 0.34);
      const button = createRigidGarmentMesh({
        boneName: "Torso",
        geometry: buttonGeometry,
        material: buttonMaterial,
        name: `dashboard-outfit-moss-cardigan-button-${index + 1}`,
        source: referenceMesh,
      });
      registerGarment(cardiganMeshes, button);
    });

    const cuffs = [
      { boneName: "LowerArmL", x: 1.285, side: "left" },
      { boneName: "LowerArmR", x: -1.285, side: "right" },
    ] as const;
    cuffs.forEach(({ boneName, side, x }) => {
      const cuffGeometry = new THREE.BoxGeometry(0.13, 0.45, 0.57);
      cuffGeometry.translate(x, 1.337, -0.064);
      const cuff = createRigidGarmentMesh({
        boneName,
        geometry: cuffGeometry,
        material: trimMaterial,
        name: `dashboard-outfit-moss-cardigan-${side}-cuff`,
        source: referenceMesh,
      });
      registerGarment(cardiganMeshes, cuff);
    });

    honeyRaincoatPartDefinitions.forEach((definition, index) => {
      const source = typedSourceMeshes[index];
      const material = new THREE.MeshStandardMaterial({
        color: definition.colour,
        metalness: 0.015,
        roughness: 0.9,
      });
      materials.add(material);
      const geometry = source.geometry.clone();
      expandGeometry(geometry, definition.expansion);
      const garment = createBoundMesh({
        geometry,
        material,
        name: `dashboard-outfit-honey-raincoat-${definition.slot}`,
        source,
      });
      registerGarment(raincoatMeshes, garment);
    });

    const raincoatCream = new THREE.MeshStandardMaterial({
      color: "#f2e2bd",
      metalness: 0,
      roughness: 0.96,
    });
    const raincoatCaramel = new THREE.MeshStandardMaterial({
      color: "#93613b",
      metalness: 0.015,
      roughness: 0.9,
    });
    const raincoatWood = new THREE.MeshStandardMaterial({
      color: "#765035",
      metalness: 0.03,
      roughness: 0.86,
    });
    const raincoatHem = new THREE.MeshStandardMaterial({
      color: "#d39a2e",
      metalness: 0.01,
      roughness: 0.92,
    });
    [raincoatCream, raincoatCaramel, raincoatWood, raincoatHem].forEach(
      (material) => materials.add(material),
    );

    const raincoatPlacketGeometry = new THREE.BoxGeometry(0.1, 0.62, 0.06);
    raincoatPlacketGeometry.translate(0, 1.11, 0.325);
    registerGarment(
      raincoatMeshes,
      createRigidGarmentMesh({
        boneName: "Torso",
        geometry: raincoatPlacketGeometry,
        material: raincoatCream,
        name: "dashboard-outfit-honey-raincoat-placket",
        source: referenceMesh,
      }),
    );

    [0.95, 1.14, 1.33].forEach((y, index) => {
      const toggleGeometry = new THREE.BoxGeometry(0.14, 0.055, 0.055);
      toggleGeometry.translate(0, y, 0.365);
      registerGarment(
        raincoatMeshes,
        createRigidGarmentMesh({
          boneName: "Torso",
          geometry: toggleGeometry,
          material: raincoatWood,
          name: `dashboard-outfit-honey-raincoat-toggle-${index + 1}`,
          source: referenceMesh,
        }),
      );
    });

    [
      { side: "left", x: -0.18, rotation: -0.28 },
      { side: "right", x: 0.18, rotation: 0.28 },
    ].forEach(({ rotation, side, x }) => {
      const collarGeometry = new THREE.BoxGeometry(0.34, 0.13, 0.075);
      collarGeometry.rotateZ(rotation);
      collarGeometry.translate(x, 1.42, 0.29);
      registerGarment(
        raincoatMeshes,
        createRigidGarmentMesh({
          boneName: "Torso",
          geometry: collarGeometry,
          material: raincoatCaramel,
          name: `dashboard-outfit-honey-raincoat-${side}-collar`,
          source: referenceMesh,
        }),
      );
    });

    [-0.3, 0.3].forEach((x, index) => {
      const pocketGeometry = new THREE.BoxGeometry(0.29, 0.2, 0.055);
      pocketGeometry.translate(x, 0.91, 0.355);
      registerGarment(
        raincoatMeshes,
        createRigidGarmentMesh({
          boneName: "Torso",
          geometry: pocketGeometry,
          material: raincoatCaramel,
          name: `dashboard-outfit-honey-raincoat-pocket-${index + 1}`,
          source: referenceMesh,
        }),
      );
    });

    const hemGeometry = new THREE.BoxGeometry(1.12, 0.12, 0.82);
    hemGeometry.translate(0, 0.81, -0.095);
    registerGarment(
      raincoatMeshes,
      createRigidGarmentMesh({
        boneName: "Torso",
        geometry: hemGeometry,
        material: raincoatHem,
        name: "dashboard-outfit-honey-raincoat-hem",
        source: referenceMesh,
      }),
    );

    cuffs.forEach(({ boneName, side, x }) => {
      const cuffGeometry = new THREE.BoxGeometry(0.14, 0.46, 0.59);
      cuffGeometry.translate(x, 1.337, -0.064);
      registerGarment(
        raincoatMeshes,
        createRigidGarmentMesh({
          boneName,
          geometry: cuffGeometry,
          material: raincoatCaramel,
          name: `dashboard-outfit-honey-raincoat-${side}-cuff`,
          source: referenceMesh,
        }),
      );
    });
  } catch {
    garmentMeshes.forEach(disposeGarmentMesh);
    materials.forEach((material) => material.dispose());
    return null;
  }

  const setOutfit = (outfitId: DashboardOutfitId) => {
    const showCustomOutfit = outfitId !== defaultDashboardOutfitId;
    typedSourceMeshes.forEach((mesh, index) => {
      mesh.visible = showCustomOutfit ? false : originalVisibility[index];
    });
    cardiganMeshes.forEach((mesh) => {
      mesh.visible = outfitId === "moss-cardigan";
    });
    raincoatMeshes.forEach((mesh) => {
      mesh.visible = outfitId === "honey-raincoat";
    });
  };
  setOutfit(initialOutfitId);

  return {
    dispose: () => {
      typedSourceMeshes.forEach((mesh, index) => {
        mesh.visible = originalVisibility[index];
      });
      garmentMeshes.forEach(disposeGarmentMesh);
      materials.forEach((material) => material.dispose());
    },
    setOutfit,
  };
}

function expandGeometry(
  geometry: THREE.BufferGeometry,
  expansion: readonly [number, number, number],
) {
  const positions = geometry.getAttribute("position");
  geometry.computeBoundingBox();
  const center = geometry.boundingBox?.getCenter(new THREE.Vector3());
  if (!positions || !center) throw new Error("Outfit geometry has no positions.");

  for (let index = 0; index < positions.count; index += 1) {
    positions.setXYZ(
      index,
      center.x + (positions.getX(index) - center.x) * expansion[0],
      center.y + (positions.getY(index) - center.y) * expansion[1],
      center.z + (positions.getZ(index) - center.z) * expansion[2],
    );
  }
  positions.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}

function createBoundMesh({
  geometry,
  material,
  name,
  source,
}: {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  name: string;
  source: THREE.SkinnedMesh;
}) {
  const mesh = new THREE.SkinnedMesh(geometry, material);
  mesh.name = name;
  mesh.position.copy(source.position);
  mesh.quaternion.copy(source.quaternion);
  mesh.scale.copy(source.scale);
  mesh.bindMode = source.bindMode;
  mesh.bind(source.skeleton, source.bindMatrix);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

function createRigidGarmentMesh({
  boneName,
  geometry,
  material,
  name,
  source,
}: {
  boneName: string;
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  name: string;
  source: THREE.SkinnedMesh;
}) {
  const boneIndex = source.skeleton.bones.findIndex(
    (bone) => bone.name === boneName,
  );
  if (boneIndex < 0) throw new Error(`Missing outfit bone: ${boneName}`);

  const vertexCount = geometry.getAttribute("position").count;
  const skinIndices = new Uint16Array(vertexCount * 4);
  const skinWeights = new Float32Array(vertexCount * 4);
  for (let index = 0; index < vertexCount; index += 1) {
    skinIndices[index * 4] = boneIndex;
    skinWeights[index * 4] = 1;
  }
  geometry.setAttribute(
    "skinIndex",
    new THREE.Uint16BufferAttribute(skinIndices, 4),
  );
  geometry.setAttribute(
    "skinWeight",
    new THREE.Float32BufferAttribute(skinWeights, 4),
  );
  return createBoundMesh({ geometry, material, name, source });
}

function disposeGarmentMesh(mesh: THREE.SkinnedMesh) {
  mesh.parent?.remove(mesh);
  mesh.geometry.dispose();
}
