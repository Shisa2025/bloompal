import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import DashboardWardrobePreview from "./DashboardWardrobePreview";

describe("DashboardWardrobePreview", () => {
  it("renders an accessible coming-soon dialog", () => {
    const markup = renderToStaticMarkup(
      <DashboardWardrobePreview isOpen onClose={vi.fn()} />,
    );

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain("bedroomWardrobe");
    expect(markup).toContain("wardrobeComingSoon");
    expect(markup).toContain("wardrobeComingSoonHint");
  });

  it("does not mount while closed", () => {
    expect(
      renderToStaticMarkup(
        <DashboardWardrobePreview isOpen={false} onClose={vi.fn()} />,
      ),
    ).toBe("");
  });
});
