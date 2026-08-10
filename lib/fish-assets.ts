export const meshFishKinds = ["fish1", "fish2", "fish3", "fish4", "fish5", "fish6"] as const;
export type FishKind = (typeof meshFishKinds)[number];

const fishAssetPaths: Record<FishKind, string> = {
  fish1: "/meshes/fishes/fish1.glb",
  fish2: "/meshes/fishes/fish2.glb",
  fish3: "/meshes/fishes/fish3.glb",
  fish4: "/meshes/fishes/fish4.glb",
  fish5: "/meshes/fishes/fish5.glb",
  fish6: "/meshes/fishes/fish6.glb",
};

export function getFishAssetPath(kind: FishKind) {
  return fishAssetPaths[kind];
}
