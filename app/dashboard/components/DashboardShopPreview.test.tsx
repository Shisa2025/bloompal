import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import messages from "../../../messages/en-SG.json";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("../actions", () => ({
  buyMusicTrack: vi.fn(),
  sellShopResource: vi.fn(),
}));

import DashboardShopPreview from "./DashboardShopPreview";

describe("DashboardShopPreview", () => {
  it("renders the registered music catalog, prices, ownership, and tabs", () => {
    const markup = renderToStaticMarkup(
      <NextIntlClientProvider locale="en-SG" messages={messages}>
        <DashboardShopPreview
          isOpen
          onClose={vi.fn()}
          onPreviewTrack={vi.fn()}
          previewError={false}
          previewTrackId={null}
          shopState={{
            coinBalance: 10,
            ownedMusicIds: ["dream"],
            inventory: [
              {
                assetId: "flower-rose-puff",
                category: "flower",
                quantity: 2,
              },
            ],
          }}
        />
      </NextIntlClientProvider>,
    );

    expect(markup).toContain('role="dialog"');
    expect(markup.match(/dashboard-shop-music-card/g)).toHaveLength(3);
    expect(markup).toContain("Calm Loop");
    expect(markup).toContain("Chill");
    expect(markup).toContain("Dream");
    expect(markup.match(/Preview 15 seconds/g)).toHaveLength(3);
    expect(markup).toContain("Owned");
    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('aria-controls="dashboard-shop-sell-panel"');
    expect(markup).toContain("10 coins");
  });

  it("does not mount a dialog while closed", () => {
    const markup = renderToStaticMarkup(
      <NextIntlClientProvider locale="en-SG" messages={messages}>
        <DashboardShopPreview
          isOpen={false}
          onClose={vi.fn()}
          onPreviewTrack={vi.fn()}
          previewError={false}
          previewTrackId={null}
          shopState={{ coinBalance: 0, ownedMusicIds: [], inventory: [] }}
        />
      </NextIntlClientProvider>,
    );

    expect(markup).toBe("");
  });
});
