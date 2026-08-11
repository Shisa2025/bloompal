export const dashboardOutfits = [
  {
    id: "base",
    nameKey: "outfitOriginal",
    descriptionKey: "outfitOriginalDescription",
    ownable: false,
    buyPrice: null,
  },
  {
    id: "moss-cardigan",
    nameKey: "outfitMossCardigan",
    descriptionKey: "outfitMossCardiganDescription",
    ownable: true,
    buyPrice: 10,
  },
  {
    id: "honey-raincoat",
    nameKey: "outfitHoneyRaincoat",
    descriptionKey: "outfitHoneyRaincoatDescription",
    ownable: true,
    buyPrice: 10,
  },
  {
    id: "leafback-dinosaur",
    nameKey: "outfitLeafbackDinosaur",
    descriptionKey: "outfitLeafbackDinosaurDescription",
    ownable: true,
    buyPrice: 20,
  },
] as const;

export type DashboardOutfitId = (typeof dashboardOutfits)[number]["id"];
export type PurchasableDashboardOutfitId = Exclude<
  DashboardOutfitId,
  "base"
>;

export type DashboardOutfitPreferences = {
  outfitId: DashboardOutfitId;
};

export const defaultDashboardOutfitId = "base" satisfies DashboardOutfitId;

export const purchasableDashboardOutfits = dashboardOutfits.filter(
  (outfit): outfit is Extract<
    (typeof dashboardOutfits)[number],
    { ownable: true }
  > => outfit.ownable,
);

export function isDashboardOutfitId(value: unknown): value is DashboardOutfitId {
  return dashboardOutfits.some((outfit) => outfit.id === value);
}

export function isPurchasableDashboardOutfitId(
  value: unknown,
): value is PurchasableDashboardOutfitId {
  return purchasableDashboardOutfits.some((outfit) => outfit.id === value);
}

export function getPurchasableDashboardOutfit(outfitId: string) {
  return purchasableDashboardOutfits.find((outfit) => outfit.id === outfitId);
}

export function getDashboardOutfitStorageKey(preferenceOwnerId: string) {
  return `bloompal:outfit:v1:${preferenceOwnerId}`;
}

export function parseDashboardOutfitPreferences(
  value: string | null,
  ownedOutfitIds: readonly PurchasableDashboardOutfitId[] = [],
): DashboardOutfitPreferences {
  if (!value) return { outfitId: defaultDashboardOutfitId };

  try {
    const parsed = JSON.parse(value) as { outfitId?: unknown };
    const outfitId = parsed.outfitId;
    if (outfitId === defaultDashboardOutfitId) return { outfitId };
    if (
      isPurchasableDashboardOutfitId(outfitId) &&
      ownedOutfitIds.includes(outfitId)
    ) {
      return { outfitId };
    }
    return { outfitId: defaultDashboardOutfitId };
  } catch {
    return { outfitId: defaultDashboardOutfitId };
  }
}
