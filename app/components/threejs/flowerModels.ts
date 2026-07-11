import * as THREE from "three";

type FlowerDisplayOptions = {
  flowerAsset: string;
  targetHeight: number;
  maxDiameter: number;
};

type FlowerDisplayMetrics = {
  scale: number;
  size: THREE.Vector3;
};

const fallbackPetalColors: Record<string, string> = {
  "flower1.glb": "#d95b78",
  "flower2.glb": "#d9b638",
  "flower3.glb": "#d76f9f",
  "flower4.glb": "#8d6bd6",
  "flower5.glb": "#f18a4f",
  "flower6.glb": "#cf4d68",
};

export function prepareFlowerModelForDisplay(
  model: THREE.Object3D,
  options: FlowerDisplayOptions,
): FlowerDisplayMetrics | null {
  applyFlowerAssetOrientation(model, options.flowerAsset);
  configureFlowerMaterials(model, options.flowerAsset);

  return normalizeFlowerModel(model, options);
}

function applyFlowerAssetOrientation(model: THREE.Object3D, flowerAsset: string) {
  if (flowerAsset === "flower3.glb") {
    model.rotation.y += Math.PI / 2;
    model.updateMatrixWorld(true);
  }
}

function normalizeFlowerModel(
  model: THREE.Object3D,
  { maxDiameter, targetHeight }: FlowerDisplayOptions,
): FlowerDisplayMetrics | null {
  model.updateMatrixWorld(true);

  const sourceBox = new THREE.Box3().setFromObject(model);

  if (sourceBox.isEmpty()) {
    return null;
  }

  const sourceSize = sourceBox.getSize(new THREE.Vector3());
  const horizontalSize = Math.max(sourceSize.x, sourceSize.z, 0.001);
  const heightSize = Math.max(sourceSize.y, 0.001);
  const scale = Math.min(targetHeight / heightSize, maxDiameter / horizontalSize);

  model.scale.multiplyScalar(scale);
  model.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(model);
  const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

  model.position.sub(
    new THREE.Vector3(scaledCenter.x, scaledBox.min.y, scaledCenter.z),
  );
  model.updateMatrixWorld(true);

  return {
    scale,
    size: scaledBox.getSize(new THREE.Vector3()),
  };
}

function configureFlowerMaterials(model: THREE.Object3D, flowerAsset: string) {
  model.traverse((child) => {
    const mesh = child as THREE.Mesh;

    if (!mesh.isMesh) {
      return;
    }

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((material) =>
        configureMaterial(material, flowerAsset, mesh.name),
      );
      return;
    }

    if (mesh.material) {
      configureMaterial(mesh.material, flowerAsset, mesh.name);
    }
  });
}

function configureMaterial(
  material: THREE.Material,
  flowerAsset: string,
  meshName: string,
) {
  material.side = THREE.DoubleSide;

  const standardMaterial = material as THREE.MeshStandardMaterial;
  const semantic = getMaterialSemantic(material.name, meshName);

  if (standardMaterial.color && !standardMaterial.map && isNearWhite(standardMaterial.color)) {
    standardMaterial.color.set(getFallbackColor(flowerAsset, semantic));
  }

  if (typeof standardMaterial.metalness === "number") {
    standardMaterial.metalness = 0;
  }

  if (typeof standardMaterial.roughness === "number") {
    standardMaterial.roughness = Math.max(standardMaterial.roughness, 0.58);
  }

  material.needsUpdate = true;
}

function getMaterialSemantic(materialName: string, meshName: string) {
  const name = `${materialName} ${meshName}`.toLowerCase();

  if (name.includes("stem") || name.includes("leaf")) {
    return "leaf";
  }

  if (name.includes("bud")) {
    return "bud";
  }

  return "petal";
}

function getFallbackColor(flowerAsset: string, semantic: string) {
  if (semantic === "leaf") {
    return "#4f875c";
  }

  if (semantic === "bud") {
    return "#d8b63f";
  }

  return fallbackPetalColors[flowerAsset] ?? "#d76f9f";
}

function isNearWhite(color: THREE.Color) {
  return color.r > 0.82 && color.g > 0.82 && color.b > 0.82;
}
