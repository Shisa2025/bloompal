import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { queryMock } = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("./connection", () => ({
  sql: { query: queryMock },
  withTransaction: vi.fn(
    (operation: (client: { query: typeof queryMock }) => Promise<unknown>) =>
      operation({ query: queryMock }),
  ),
}));

import {
  ensureShopTables,
  getEquippedDashboardOutfit,
  getShopState,
  purchaseMusic,
  purchaseOutfit,
  sellResource,
  setEquippedDashboardOutfit,
} from "./shop";

describe("shop database operations", () => {
  beforeAll(async () => {
    queryMock.mockResolvedValue([]);
    await ensureShopTables();
  });

  beforeEach(() => {
    queryMock.mockReset();
  });

  it("returns catalog inventory, owned music, and a zero-safe balance", async () => {
    queryMock.mockImplementation(async (text: string) => {
      if (text.includes("SELECT balance FROM user_wallets")) return [];
      if (text.includes("SELECT track_id FROM user_music")) {
        return [{ track_id: "dream" }, { track_id: "removed-track" }];
      }
      if (text.includes("SELECT outfit_id FROM user_outfits")) {
        return [
          { outfit_id: "moss-cardigan" },
          { outfit_id: "removed-outfit" },
        ];
      }
      if (text.includes("UNION ALL")) {
        return [
          { category: "flower", source_value: "flower1.glb", quantity: "2" },
          { category: "fish", source_value: "fish6", quantity: 1 },
          { category: "fruit", source_value: "unknown", quantity: 9 },
        ];
      }
      return [];
    });

    await expect(getShopState("user-1")).resolves.toEqual({
      coinBalance: 0,
      ownedMusicIds: ["dream"],
      ownedOutfitIds: ["moss-cardigan"],
      inventory: [
        { assetId: "flower-rose-puff", category: "flower", quantity: 2 },
        { assetId: "fish-moonfin-blue", category: "fish", quantity: 1 },
      ],
    });
  });

  it("rejects an unknown outfit ID before touching the database", async () => {
    await expect(
      purchaseOutfit({ userid: "user-1", outfitId: "made-up-outfit" }),
    ).resolves.toEqual({ ok: false, reason: "invalid" });
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("returns only a valid equipped outfit that the user owns", async () => {
    queryMock.mockResolvedValue([
      { equipped_outfit_id: "moss-cardigan" },
    ]);

    await expect(getEquippedDashboardOutfit("user-1")).resolves.toBe(
      "moss-cardigan",
    );

    queryMock.mockResolvedValue([{ equipped_outfit_id: "retired-outfit" }]);
    await expect(getEquippedDashboardOutfit("user-1")).resolves.toBeNull();
  });

  it("saves base or an owned outfit and rejects unknown outfits", async () => {
    queryMock.mockImplementation(async (text: string, values?: unknown[]) => {
      if (text.includes("INSERT INTO user_dashboard_settings")) {
        return values?.[1] === "honey-raincoat" || values?.[1] === "base"
          ? [{ equipped_outfit_id: values[1] }]
          : [];
      }
      return [];
    });

    await expect(
      setEquippedDashboardOutfit({
        userid: "user-1",
        outfitId: "honey-raincoat",
      }),
    ).resolves.toBe("honey-raincoat");
    await expect(
      setEquippedDashboardOutfit({
        userid: "user-1",
        outfitId: "base",
      }),
    ).resolves.toBe("base");
    await expect(
      setEquippedDashboardOutfit({
        userid: "user-1",
        outfitId: "moss-cardigan",
      }),
    ).resolves.toBeNull();
    expect(
      callsContaining("VALUES ($1::VARCHAR(120), $2::VARCHAR(80))"),
    ).not.toHaveLength(0);
    await expect(
      setEquippedDashboardOutfit({
        userid: "user-1",
        outfitId: "made-up-outfit",
      }),
    ).resolves.toBeNull();
  });

  it("does not debit an insufficient wallet for an outfit", async () => {
    queryMock.mockImplementation(async (text: string) => {
      if (text.includes("SELECT balance") && text.includes("FOR UPDATE")) {
        return [{ balance: 9 }];
      }
      if (text.includes("SELECT outfit_id FROM user_outfits")) return [];
      return [];
    });

    await expect(
      purchaseOutfit({ userid: "user-1", outfitId: "honey-raincoat" }),
    ).resolves.toEqual({ ok: false, reason: "insufficient_coins" });
    expect(callsContaining("INSERT INTO user_outfits")).toHaveLength(0);
    expect(callsContaining("balance = balance -")).toHaveLength(0);
  });

  it("prevents a duplicate outfit purchase without a second debit", async () => {
    queryMock.mockImplementation(async (text: string) => {
      if (text.includes("SELECT balance") && text.includes("FOR UPDATE")) {
        return [{ balance: 20 }];
      }
      if (text.includes("SELECT outfit_id FROM user_outfits")) {
        return [{ outfit_id: "moss-cardigan" }];
      }
      return [];
    });

    await expect(
      purchaseOutfit({ userid: "user-1", outfitId: "moss-cardigan" }),
    ).resolves.toEqual({ ok: false, reason: "already_owned" });
    expect(callsContaining("balance = balance -")).toHaveLength(0);
  });

  it("purchases an outfit under a wallet lock and writes an audit record", async () => {
    queryMock.mockImplementation(async (text: string) => {
      if (text.includes("SELECT balance") && text.includes("FOR UPDATE")) {
        return [{ balance: 14 }];
      }
      if (text.includes("SELECT outfit_id FROM user_outfits")) return [];
      if (text.includes("UPDATE user_wallets SET balance = balance -")) {
        return [{ balance: 4 }];
      }
      return [];
    });

    await expect(
      purchaseOutfit({ userid: "user-1", outfitId: "honey-raincoat" }),
    ).resolves.toEqual({
      ok: true,
      coinBalance: 4,
      outfitId: "honey-raincoat",
    });
    expect(callsContaining("FOR UPDATE")).toHaveLength(1);
    expect(callsContaining("INSERT INTO user_outfits")).toHaveLength(1);
    expect(callsContaining("INSERT INTO user_dashboard_settings")).toHaveLength(1);
    expect(callsContaining("'purchase_outfit'")[0]?.[1]).toEqual(
      expect.arrayContaining(["user-1", -10, 4, "honey-raincoat"]),
    );
  });

  it("rejects an unknown music ID before touching the database", async () => {
    await expect(
      purchaseMusic({ userid: "user-1", trackId: "made-up-track" }),
    ).resolves.toEqual({ ok: false, reason: "invalid" });
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("does not debit an insufficient wallet", async () => {
    queryMock.mockImplementation(async (text: string) => {
      if (text.includes("SELECT balance") && text.includes("FOR UPDATE")) {
        return [{ balance: 9 }];
      }
      if (text.includes("SELECT track_id FROM user_music")) return [];
      return [];
    });

    await expect(
      purchaseMusic({ userid: "user-1", trackId: "calm-loop" }),
    ).resolves.toEqual({ ok: false, reason: "insufficient_coins" });
    expect(callsContaining("UPDATE user_wallets SET balance = balance -")).toHaveLength(0);
    expect(callsContaining("INSERT INTO user_music")).toHaveLength(0);
  });

  it("prevents a duplicate purchase without a second debit", async () => {
    queryMock.mockImplementation(async (text: string) => {
      if (text.includes("SELECT balance") && text.includes("FOR UPDATE")) {
        return [{ balance: 20 }];
      }
      if (text.includes("SELECT track_id FROM user_music")) {
        return [{ track_id: "dream" }];
      }
      return [];
    });

    await expect(
      purchaseMusic({ userid: "user-1", trackId: "dream" }),
    ).resolves.toEqual({ ok: false, reason: "already_owned" });
    expect(callsContaining("UPDATE user_wallets SET balance = balance -")).toHaveLength(0);
  });

  it("purchases music under a wallet lock and writes an audit record", async () => {
    queryMock.mockImplementation(async (text: string) => {
      if (text.includes("SELECT balance") && text.includes("FOR UPDATE")) {
        return [{ balance: 12 }];
      }
      if (text.includes("SELECT track_id FROM user_music")) return [];
      if (text.includes("UPDATE user_wallets SET balance = balance -")) {
        return [{ balance: 2 }];
      }
      return [];
    });

    await expect(
      purchaseMusic({ userid: "user-1", trackId: "chill-loopable" }),
    ).resolves.toEqual({
      ok: true,
      coinBalance: 2,
      trackId: "chill-loopable",
    });
    expect(callsContaining("FOR UPDATE")).toHaveLength(1);
    expect(callsContaining("INSERT INTO user_music")).toHaveLength(1);
    expect(callsContaining("'purchase_music'")[0]?.[1]).toEqual(
      expect.arrayContaining(["user-1", -10, 2, "chill-loopable"]),
    );
  });

  it("sells one original resource without deleting its reward record", async () => {
    queryMock.mockImplementation(async (text: string) => {
      if (text.includes("SELECT source.id FROM user_plants")) {
        return [{ id: "plant-1" }];
      }
      if (text.includes("SELECT COUNT(*) AS quantity FROM user_plants")) {
        return [{ quantity: 0 }];
      }
      if (text.includes("UPDATE user_wallets SET balance = balance +")) {
        return [{ balance: 1 }];
      }
      return [];
    });

    await expect(
      sellResource({ userid: "user-1", assetId: "flower-rose-puff" }),
    ).resolves.toEqual({
      ok: true,
      assetId: "flower-rose-puff",
      coinBalance: 1,
      remainingQuantity: 0,
    });
    expect(callsContaining("INSERT INTO asset_sales")).toHaveLength(1);
    expect(callsContaining("table_flower_asset = NULL")).toHaveLength(1);
    expect(callsContaining("'sell_asset'")[0]?.[1]).toEqual(
      expect.arrayContaining(["user-1", 1, 1]),
    );
    expect(callsContaining("DELETE FROM user_plants")).toHaveLength(0);
  });

  it("cannot sell a resource the user does not own", async () => {
    queryMock.mockResolvedValue([]);

    await expect(
      sellResource({ userid: "user-1", assetId: "fruit-pear" }),
    ).resolves.toEqual({ ok: false, reason: "not_owned" });
    expect(callsContaining("INSERT INTO asset_sales")).toHaveLength(0);
    expect(callsContaining("balance = balance +")).toHaveLength(0);
  });
});

function callsContaining(fragment: string) {
  return queryMock.mock.calls.filter(([text]) =>
    String(text).includes(fragment),
  );
}
