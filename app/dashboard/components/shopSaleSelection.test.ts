import { describe, expect, it } from "vitest";
import type { ShopInventoryItem } from "@/lib/asset-catalog";
import {
  buildShopSaleLines,
  mergeShopInventory,
  reconcileShopSaleSelection,
  setShopSaleQuantity,
  summarizeShopSale,
  toggleShopSaleItem,
} from "./shopSaleSelection";

const inventory: ShopInventoryItem[] = [
  { assetId: "flower-rose-puff", category: "flower", quantity: 3 },
  { assetId: "fruit-pear", category: "fruit", quantity: 2 },
];

describe("shop sale selection", () => {
  it("merges duplicate inventory rows by exact asset ID", () => {
    expect(
      mergeShopInventory([
        ...inventory,
        { assetId: "flower-rose-puff", category: "flower", quantity: 2 },
      ]),
    ).toEqual([
      { assetId: "flower-rose-puff", category: "flower", quantity: 5 },
      { assetId: "fruit-pear", category: "fruit", quantity: 2 },
    ]);
  });

  it("toggles a stack at one and clamps quantity to available stock", () => {
    const selected = toggleShopSaleItem({}, inventory[0]);
    expect(selected).toEqual({ "flower-rose-puff": 1 });
    expect(
      setShopSaleQuantity(selected, "flower-rose-puff", 99, 3),
    ).toEqual({ "flower-rose-puff": 3 });
    expect(
      setShopSaleQuantity(selected, "flower-rose-puff", 0, 3),
    ).toEqual({});
  });

  it("preserves valid choices while dropping missing stock", () => {
    expect(
      reconcileShopSaleSelection(
        { "flower-rose-puff": 5, "fruit-pear": 1 },
        [{ ...inventory[0], quantity: 2 }],
      ),
    ).toEqual({ "flower-rose-puff": 2 });
  });

  it("builds one line per stack and totals server-derived prices", () => {
    const lines = buildShopSaleLines(
      { "flower-rose-puff": 2, "fruit-pear": 1 },
      inventory,
    );
    expect(lines).toEqual([
      { assetId: "flower-rose-puff", quantity: 2 },
      { assetId: "fruit-pear", quantity: 1 },
    ]);
    expect(summarizeShopSale(lines)).toEqual({
      selectedQuantity: 3,
      earnedCoins: 3,
    });
  });
});
