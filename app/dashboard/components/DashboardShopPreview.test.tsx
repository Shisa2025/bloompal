import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import messages from "../../../messages/en-SG.json";

vi.mock("../actions", () => ({
  buyDashboardOutfit: vi.fn(),
  buyMusicTrack: vi.fn(),
  sellShopResources: vi.fn(),
}));

import DashboardShopPreview, {
  DashboardShopOutfitList,
} from "./DashboardShopPreview";

describe("DashboardShopPreview", () => {
  it("renders the registered music catalog, prices, ownership, and tabs", () => {
    const markup = renderToStaticMarkup(
      <NextIntlClientProvider
        locale="en-SG"
        messages={messages}
        timeZone="Asia/Singapore"
      >
        <DashboardShopPreview
          isOpen
          onClose={vi.fn()}
          onOutfitPurchased={vi.fn()}
          onPreviewTrack={vi.fn()}
          previewError={false}
          previewTrackId={null}
          shopState={{
            coinBalance: 10,
            ownedMusicIds: ["dream"],
            ownedOutfitIds: [],
            inventory: [
              {
                assetId: "flower-rose-puff",
                category: "flower",
                quantity: 2,
              },
            ],
          }}
          selectedOutfitId="base"
        />
      </NextIntlClientProvider>,
    );

    expect(markup).toContain('role="dialog"');
    expect(markup.match(/<article/g)).toHaveLength(3);
    expect(markup).toContain("Calm Loop");
    expect(markup).toContain("Chill");
    expect(markup).toContain("Dream");
    expect(markup.match(/Preview 15 seconds/g)).toHaveLength(3);
    expect(markup).toContain("Owned");
    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('aria-controls="dashboard-shop-sell-panel"');
    expect(markup).toContain('aria-controls="dashboard-shop-outfits-panel"');
    expect(markup).toContain("Buy outfits");
    expect(markup).toContain("10 coins");
    expect(markup).toContain("/assets/shop-thumbnails/character-rabbit_merchant.webp");
  });

  it("does not mount a dialog while closed", () => {
    const markup = renderToStaticMarkup(
      <NextIntlClientProvider
        locale="en-SG"
        messages={messages}
        timeZone="Asia/Singapore"
      >
        <DashboardShopPreview
          isOpen={false}
          onClose={vi.fn()}
          onOutfitPurchased={vi.fn()}
          onPreviewTrack={vi.fn()}
          previewError={false}
          previewTrackId={null}
          selectedOutfitId="base"
          shopState={{
            coinBalance: 0,
            ownedMusicIds: [],
            ownedOutfitIds: [],
            inventory: [],
          }}
        />
      </NextIntlClientProvider>,
    );

    expect(markup).toBe("");
  });

  it("renders purchasable outfits with ownership, price, and equip state", () => {
    const markup = renderToStaticMarkup(
      <NextIntlClientProvider
        locale="en-SG"
        messages={messages}
        timeZone="Asia/Singapore"
      >
        <DashboardShopOutfitList
          coinBalance={10}
          isPending={false}
          onPurchase={vi.fn()}
          ownedOutfitIds={["moss-cardigan"]}
          selectedOutfitId="moss-cardigan"
        />
      </NextIntlClientProvider>,
    );

    expect(markup.match(/<article/g)).toHaveLength(3);
    expect(markup).toContain("Sage green cardigan");
    expect(markup).toContain("Honey yellow raincoat");
    expect(markup).toContain("Leafback Dinosaur Onesie");
    expect(markup).toContain("Wearing now");
    expect(markup).toContain("Buy for 10 coins");
    expect(markup).toContain("Not enough coins");
  });
});
