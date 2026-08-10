import { fishCatalog } from "./asset-catalog";

export type FishKind = (typeof fishCatalog)[number]["sourceValue"];
export const meshFishKinds = fishCatalog.map((asset) => asset.sourceValue);

export function getFishAssetPath(kind: FishKind) {
  return fishCatalog.find((asset) => asset.sourceValue === kind)!.assetPath;
}
