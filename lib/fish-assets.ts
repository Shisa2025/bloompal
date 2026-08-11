import { fishCatalog } from "./asset-catalog";

export type FishKind = (typeof fishCatalog)[number]["sourceValue"];
export type FishFacing = "left" | "right";
export const meshFishKinds = fishCatalog.map((asset) => asset.sourceValue);

const rightFacingYawByKind = {
  fish1: -Math.PI / 2,
  fish2: -Math.PI / 2,
  fish3: -Math.PI / 2,
  fish4: Math.PI / 2,
  fish5: Math.PI / 2,
  fish6: Math.PI / 2,
} as const satisfies Record<FishKind, number>;

export function getFishHorizontalYaw(
  kind: FishKind,
  facing: FishFacing = "right",
) {
  const rightFacingYaw = rightFacingYawByKind[kind];

  return facing === "right" ? rightFacingYaw : -rightFacingYaw;
}

export function getFishAssetPath(kind: FishKind) {
  return fishCatalog.find((asset) => asset.sourceValue === kind)!.assetPath;
}
