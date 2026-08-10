import { describe, expect, it } from "vitest";
import {
  dashboardOutfits,
  getDashboardOutfitStorageKey,
  parseDashboardOutfitPreferences,
  purchasableDashboardOutfits,
} from "./dashboardOutfits";

describe("dashboard outfits", () => {
  it("registers the base outfit and both purchasable outfits exactly once", () => {
    expect(dashboardOutfits.map((outfit) => outfit.id)).toEqual([
      "base",
      "moss-cardigan",
      "honey-raincoat",
    ]);
    expect(new Set(dashboardOutfits.map((outfit) => outfit.id)).size).toBe(
      dashboardOutfits.length,
    );
    expect(
      purchasableDashboardOutfits.map(({ buyPrice, id }) => ({ buyPrice, id })),
    ).toEqual([
      { buyPrice: 10, id: "moss-cardigan" },
      { buyPrice: 10, id: "honey-raincoat" },
    ]);
    dashboardOutfits.forEach((outfit) => {
      expect(outfit).not.toHaveProperty("assetPath");
    });
  });

  it("requires database ownership before accepting a stored outfit", () => {
    expect(
      parseDashboardOutfitPreferences('{"outfitId":"moss-cardigan"}', [
        "moss-cardigan",
      ]),
    ).toEqual({ outfitId: "moss-cardigan" });
    expect(
      parseDashboardOutfitPreferences('{"outfitId":"honey-raincoat"}', []),
    ).toEqual({ outfitId: "base" });
    expect(parseDashboardOutfitPreferences('{"outfitId":"retired"}')).toEqual(
      { outfitId: "base" },
    );
    expect(parseDashboardOutfitPreferences("broken")).toEqual({
      outfitId: "base",
    });
    expect(parseDashboardOutfitPreferences(null)).toEqual({ outfitId: "base" });
  });

  it("uses a versioned per-user storage key", () => {
    expect(getDashboardOutfitStorageKey("user-42")).toBe(
      "bloompal:outfit:v1:user-42",
    );
  });
});
