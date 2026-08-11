import type { PurchasableDashboardOutfitId } from "./dashboard-outfits";

export const assetCategories = [
  "flower",
  "bug",
  "fish",
  "fruit",
  "character",
  "music",
] as const;

export type AssetCategory = (typeof assetCategories)[number];

export type AssetNameKey =
  | "names.flowerRosePuff"
  | "names.flowerGoldenBell"
  | "names.flowerBlushFan"
  | "names.flowerVioletStar"
  | "names.flowerSunsetDaisy"
  | "names.flowerCrimsonCrown"
  | "names.bugHoneydropBee"
  | "names.bugEmeraldShell"
  | "names.bugSunsetButterfly"
  | "names.bugAzureReedDragonfly"
  | "names.bugRoseDotLadybug"
  | "names.fishSunstripeBlue"
  | "names.fishBerryBubble"
  | "names.fishAmberCloud"
  | "names.fishSkycapMinnow"
  | "names.fishTurquoiseStripe"
  | "names.fishMoonfinBlue"
  | "names.fruitApple"
  | "names.fruitCherry"
  | "names.fruitLemon"
  | "names.fruitPear"
  | "names.fruitStrawberry"
  | "names.characterGardenFriend"
  | "names.characterMooncapMerchant"
  | "names.musicCalmLoop"
  | "names.musicChill"
  | "names.musicDream";

export type CatalogAsset = {
  id: string;
  category: AssetCategory;
  assetPath: string;
  nameKey: AssetNameKey;
  ownable: boolean;
  stackable: boolean;
  sourceValue?: string;
  buyPrice?: number;
  sellPrice?: number;
  artist?: string;
  license?: string;
  sourceUrl?: string;
  previewSeconds?: number;
};

export const flowerCatalog = [
  { id: "flower-rose-puff", category: "flower", assetPath: "/meshes/flowers/flower1.glb", nameKey: "names.flowerRosePuff", ownable: true, stackable: true, sourceValue: "flower1.glb", sellPrice: 1 },
  { id: "flower-golden-bell", category: "flower", assetPath: "/meshes/flowers/flower2.glb", nameKey: "names.flowerGoldenBell", ownable: true, stackable: true, sourceValue: "flower2.glb", sellPrice: 1 },
  { id: "flower-blush-fan", category: "flower", assetPath: "/meshes/flowers/flower3.glb", nameKey: "names.flowerBlushFan", ownable: true, stackable: true, sourceValue: "flower3.glb", sellPrice: 1 },
  { id: "flower-violet-star", category: "flower", assetPath: "/meshes/flowers/flower4.glb", nameKey: "names.flowerVioletStar", ownable: true, stackable: true, sourceValue: "flower4.glb", sellPrice: 1 },
  { id: "flower-sunset-daisy", category: "flower", assetPath: "/meshes/flowers/flower5.glb", nameKey: "names.flowerSunsetDaisy", ownable: true, stackable: true, sourceValue: "flower5.glb", sellPrice: 1 },
  { id: "flower-crimson-crown", category: "flower", assetPath: "/meshes/flowers/flower6.glb", nameKey: "names.flowerCrimsonCrown", ownable: true, stackable: true, sourceValue: "flower6.glb", sellPrice: 1 },
] as const satisfies readonly CatalogAsset[];

export const bugCatalog = [
  { id: "bug-honeydrop-bee", category: "bug", assetPath: "/meshes/bugs/Bee.glb", nameKey: "names.bugHoneydropBee", ownable: true, stackable: true, sourceValue: "Bee.glb", sellPrice: 1 },
  { id: "bug-emerald-shell", category: "bug", assetPath: "/meshes/bugs/Beetle.glb", nameKey: "names.bugEmeraldShell", ownable: true, stackable: true, sourceValue: "Beetle.glb", sellPrice: 1 },
  { id: "bug-sunset-butterfly", category: "bug", assetPath: "/meshes/bugs/Butterfly.glb", nameKey: "names.bugSunsetButterfly", ownable: true, stackable: true, sourceValue: "Butterfly.glb", sellPrice: 1 },
  { id: "bug-azure-reed-dragonfly", category: "bug", assetPath: "/meshes/bugs/Dragonfly.glb", nameKey: "names.bugAzureReedDragonfly", ownable: true, stackable: true, sourceValue: "Dragonfly.glb", sellPrice: 1 },
] as const satisfies readonly CatalogAsset[];

export const fishCatalog = [
  { id: "fish-sunstripe-blue", category: "fish", assetPath: "/meshes/fishes/fish1.glb", nameKey: "names.fishSunstripeBlue", ownable: true, stackable: true, sourceValue: "fish1", sellPrice: 1 },
  { id: "fish-berry-bubble", category: "fish", assetPath: "/meshes/fishes/fish2.glb", nameKey: "names.fishBerryBubble", ownable: true, stackable: true, sourceValue: "fish2", sellPrice: 1 },
  { id: "fish-amber-cloud", category: "fish", assetPath: "/meshes/fishes/fish3.glb", nameKey: "names.fishAmberCloud", ownable: true, stackable: true, sourceValue: "fish3", sellPrice: 1 },
  { id: "fish-skycap-minnow", category: "fish", assetPath: "/meshes/fishes/fish4.glb", nameKey: "names.fishSkycapMinnow", ownable: true, stackable: true, sourceValue: "fish4", sellPrice: 1 },
  { id: "fish-turquoise-stripe", category: "fish", assetPath: "/meshes/fishes/fish5.glb", nameKey: "names.fishTurquoiseStripe", ownable: true, stackable: true, sourceValue: "fish5", sellPrice: 1 },
  { id: "fish-moonfin-blue", category: "fish", assetPath: "/meshes/fishes/fish6.glb", nameKey: "names.fishMoonfinBlue", ownable: true, stackable: true, sourceValue: "fish6", sellPrice: 1 },
] as const satisfies readonly CatalogAsset[];

export const fruitCatalog = [
  { id: "fruit-apple", category: "fruit", assetPath: "/meshes/fruits/apple.glb", nameKey: "names.fruitApple", ownable: true, stackable: true, sourceValue: "apple", sellPrice: 1 },
  { id: "fruit-cherry", category: "fruit", assetPath: "/meshes/fruits/cherry.glb", nameKey: "names.fruitCherry", ownable: true, stackable: true, sourceValue: "cherry", sellPrice: 1 },
  { id: "fruit-lemon", category: "fruit", assetPath: "/meshes/fruits/lemon.glb", nameKey: "names.fruitLemon", ownable: true, stackable: true, sourceValue: "lemon", sellPrice: 1 },
  { id: "fruit-pear", category: "fruit", assetPath: "/meshes/fruits/pear.glb", nameKey: "names.fruitPear", ownable: true, stackable: true, sourceValue: "pear", sellPrice: 1 },
  { id: "fruit-strawberry", category: "fruit", assetPath: "/meshes/fruits/strawberry.glb", nameKey: "names.fruitStrawberry", ownable: true, stackable: true, sourceValue: "strawberry", sellPrice: 1 },
] as const satisfies readonly CatalogAsset[];

export const characterCatalog = [
  { id: "character-garden-friend", category: "character", assetPath: "/meshes/characters/male.glb", nameKey: "names.characterGardenFriend", ownable: false, stackable: false },
  { id: "character-mooncap-merchant", category: "character", assetPath: "/meshes/characters/rabbit_merchant.glb", nameKey: "names.characterMooncapMerchant", ownable: false, stackable: false },
] as const satisfies readonly CatalogAsset[];

export const musicCatalog = [
  { id: "calm-loop", category: "music", assetPath: "/audio/calm-loop.mp3", nameKey: "names.musicCalmLoop", ownable: true, stackable: false, buyPrice: 10, artist: "wipics", license: "CC0 1.0", sourceUrl: "https://opengameart.org/content/calm-loop", previewSeconds: 15 },
  { id: "chill-loopable", category: "music", assetPath: "/audio/chill-loopable.mp3", nameKey: "names.musicChill", ownable: true, stackable: false, buyPrice: 10, artist: "Alex McCulloch / Pro Sensory", license: "CC0 1.0", sourceUrl: "https://opengameart.org/content/chill-loopable", previewSeconds: 15 },
  { id: "dream", category: "music", assetPath: "/audio/dream.mp3", nameKey: "names.musicDream", ownable: true, stackable: false, buyPrice: 10, artist: "jkjkke", license: "CC0 1.0", sourceUrl: "https://opengameart.org/content/mainmenu-music", previewSeconds: 15 },
] as const satisfies readonly CatalogAsset[];

export const assetCatalog = [
  ...flowerCatalog,
  ...bugCatalog,
  ...fishCatalog,
  ...fruitCatalog,
  ...characterCatalog,
  ...musicCatalog,
] as const;

export type AssetId = (typeof assetCatalog)[number]["id"];
export type MusicTrackId = (typeof musicCatalog)[number]["id"];
export type SellableAssetId =
  | (typeof flowerCatalog)[number]["id"]
  | (typeof bugCatalog)[number]["id"]
  | (typeof fishCatalog)[number]["id"]
  | (typeof fruitCatalog)[number]["id"];

export type SellableCatalogAsset = CatalogAsset & {
  category: "flower" | "bug" | "fish" | "fruit";
  sourceValue: string;
  sellPrice: 1;
};

export type ShopInventoryItem = {
  assetId: SellableAssetId;
  category: "flower" | "bug" | "fish" | "fruit";
  quantity: number;
};

export type ShopState = {
  coinBalance: number;
  ownedMusicIds: MusicTrackId[];
  ownedOutfitIds: PurchasableDashboardOutfitId[];
  inventory: ShopInventoryItem[];
};

export function getCatalogAsset(assetId: string): CatalogAsset | undefined {
  return assetCatalog.find((asset) => asset.id === assetId) as
    | CatalogAsset
    | undefined;
}

export function getCatalogAssetBySource(
  category: AssetCategory,
  sourceValue: string,
): CatalogAsset | undefined {
  return assetCatalog.find(
    (asset) =>
      asset.category === category &&
      (asset as CatalogAsset).sourceValue === sourceValue,
  ) as CatalogAsset | undefined;
}

export function getSellableAsset(
  assetId: string,
): SellableCatalogAsset | undefined {
  const asset = getCatalogAsset(assetId);
  return asset?.sellPrice === 1 &&
    asset.sourceValue &&
    ["flower", "bug", "fish", "fruit"].includes(asset.category)
    ? (asset as SellableCatalogAsset)
    : undefined;
}

export function getMusicAsset(trackId: string) {
  return musicCatalog.find((asset) => asset.id === trackId);
}

export function isMusicTrackId(value: unknown): value is MusicTrackId {
  return (
    typeof value === "string" &&
    musicCatalog.some((track) => track.id === value)
  );
}
