import {
  getSellableAsset,
  type SellableAssetId,
  type ShopInventoryItem,
  type ShopSaleRequestLine,
} from "@/lib/asset-catalog";

export type ShopSaleSelection = Partial<Record<SellableAssetId, number>>;

export function mergeShopInventory(
  inventory: readonly ShopInventoryItem[],
): ShopInventoryItem[] {
  const merged = new Map<SellableAssetId, ShopInventoryItem>();

  inventory.forEach((item) => {
    const existing = merged.get(item.assetId);
    merged.set(item.assetId, {
      ...item,
      quantity: Math.max(0, item.quantity) + (existing?.quantity ?? 0),
    });
  });

  return [...merged.values()];
}

export function setShopSaleQuantity(
  selection: ShopSaleSelection,
  assetId: SellableAssetId,
  requestedQuantity: number,
  availableQuantity: number,
): ShopSaleSelection {
  const quantity = Math.min(
    Math.max(0, Math.trunc(requestedQuantity)),
    Math.max(0, Math.trunc(availableQuantity)),
  );
  const next = { ...selection };

  if (quantity === 0) {
    delete next[assetId];
  } else {
    next[assetId] = quantity;
  }

  return next;
}

export function toggleShopSaleItem(
  selection: ShopSaleSelection,
  item: ShopInventoryItem,
): ShopSaleSelection {
  return setShopSaleQuantity(
    selection,
    item.assetId,
    selection[item.assetId] ? 0 : 1,
    item.quantity,
  );
}

export function reconcileShopSaleSelection(
  selection: ShopSaleSelection,
  inventory: readonly ShopInventoryItem[],
): ShopSaleSelection {
  return inventory.reduce<ShopSaleSelection>((next, item) => {
    const requested = selection[item.assetId] ?? 0;
    if (requested > 0 && item.quantity > 0) {
      next[item.assetId] = Math.min(requested, item.quantity);
    }
    return next;
  }, {});
}

export function buildShopSaleLines(
  selection: ShopSaleSelection,
  inventory: readonly ShopInventoryItem[],
): ShopSaleRequestLine[] {
  return inventory.flatMap((item) => {
    const quantity = selection[item.assetId] ?? 0;
    return quantity > 0 ? [{ assetId: item.assetId, quantity }] : [];
  });
}

export function summarizeShopSale(lines: readonly ShopSaleRequestLine[]) {
  return lines.reduce(
    (summary, line) => {
      const price = getSellableAsset(line.assetId)?.sellPrice ?? 0;
      summary.selectedQuantity += line.quantity;
      summary.earnedCoins += line.quantity * price;
      return summary;
    },
    { selectedQuantity: 0, earnedCoins: 0 },
  );
}
