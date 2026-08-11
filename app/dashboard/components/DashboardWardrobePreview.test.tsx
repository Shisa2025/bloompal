import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import DashboardWardrobePreview from "./DashboardWardrobePreview";

describe("DashboardWardrobePreview", () => {
  it("renders only the base and owned outfits and marks the current one", () => {
    const markup = renderToStaticMarkup(
      <DashboardWardrobePreview
        isOpen
        onClose={vi.fn()}
        onSelectOutfit={vi.fn()}
        ownedOutfitIds={["moss-cardigan"]}
        selectedOutfitId="moss-cardigan"
      />,
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain("bedroomWardrobe");
    expect(markup).toContain("wardrobeChooseOutfit");
    expect(markup).toContain("dashboard-wardrobe-header");
    expect(markup).toContain('aria-label="close"');
    expect(markup).toContain("outfitOriginal");
    expect(markup).toContain("outfitMossCardigan");
    expect(markup).not.toContain("outfitHoneyRaincoat");
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('aria-pressed="false"');
    expect(
      markup.match(/dashboard-wardrobe-swatch-frame/g),
    ).toHaveLength(2);
  });

  it("does not mount while closed", () => {
    expect(
      renderToStaticMarkup(
        <DashboardWardrobePreview
          isOpen={false}
          onClose={vi.fn()}
          onSelectOutfit={vi.fn()}
          ownedOutfitIds={[]}
          selectedOutfitId="base"
        />,
      ),
    ).toBe("");
  });

  it("shows the honey raincoat after it is owned", () => {
    const markup = renderToStaticMarkup(
      <DashboardWardrobePreview
        isOpen
        onClose={vi.fn()}
        onSelectOutfit={vi.fn()}
        ownedOutfitIds={["honey-raincoat"]}
        selectedOutfitId="honey-raincoat"
      />,
    );

    expect(markup).toContain("outfitHoneyRaincoat");
    expect(markup).not.toContain("outfitMossCardigan");
  });

  it("shows the leafback dinosaur only after it is owned", () => {
    const markup = renderToStaticMarkup(
      <DashboardWardrobePreview
        isOpen
        onClose={vi.fn()}
        onSelectOutfit={vi.fn()}
        ownedOutfitIds={["leafback-dinosaur"]}
        selectedOutfitId="leafback-dinosaur"
      />,
    );

    expect(markup).toContain("outfitLeafbackDinosaur");
    expect(markup).toContain("is-leafback-dinosaur");
    expect(markup).not.toContain("outfitMossCardigan");
  });

  it("locks the wardrobe and exposes a save error while persistence is pending", () => {
    const markup = renderToStaticMarkup(
      <DashboardWardrobePreview
        error="Could not save outfit"
        isOpen
        isPending
        onClose={vi.fn()}
        onSelectOutfit={vi.fn()}
        ownedOutfitIds={[]}
        selectedOutfitId="base"
      />,
    );

    expect(markup).toContain("Could not save outfit");
    expect(markup).toContain('role="alert"');
    expect(markup.match(/disabled=""/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
