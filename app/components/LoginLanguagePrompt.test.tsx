import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import LoginLanguagePrompt from "./LoginLanguagePrompt";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("role=admin&error=invalidLogin"),
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/login",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/app/locale-actions", () => ({
  saveLoginLanguageChoice: vi.fn(),
}));

const messages = {
  Auth: {
    closeLanguagePrompt: "Close language selection",
    languagePromptTitle: "选择语言 / Choose a language",
    languagePromptDescription: "Choose a language.",
    savingLanguage: "Saving your language…",
    languageSelectionFailed: "Could not save your language.",
  },
};

describe("LoginLanguagePrompt", () => {
  it("renders an accessible first-visit prompt with both language choices", () => {
    const markup = renderPrompt(true);

    expect(markup).toContain('role="dialog"');
    expect(markup).toContain('aria-modal="true"');
    expect(markup).toContain('aria-labelledby="login-language-title"');
    expect(markup).toContain('data-locale="zh-CN"');
    expect(markup).toContain('data-locale="en-SG"');
    expect(markup).toContain("中文");
    expect(markup).toContain("English");
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("inert");
  });

  it("does not render the prompt after a language choice has been remembered", () => {
    const markup = renderPrompt(false);

    expect(markup).not.toContain('role="dialog"');
    expect(markup).toContain("Login form");
  });
});

function renderPrompt(initiallyOpen: boolean) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en-SG" messages={messages}>
      <LoginLanguagePrompt initiallyOpen={initiallyOpen}>
        <main>Login form</main>
      </LoginLanguagePrompt>
    </NextIntlClientProvider>,
  );
}
