import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PasswordInput from "./PasswordInput";
import { NextIntlClientProvider } from "next-intl";

describe("PasswordInput", () => {
  it("renders hidden by default with an accessible, non-submit toggle", () => {
    const markup = renderToStaticMarkup(
      <NextIntlClientProvider locale="en-SG" messages={{ Common: { showPassword: "Show password", hidePassword: "Hide password" } }}>
        <PasswordInput
          autoComplete="new-password"
          className="custom-input"
          id="account-password"
          minLength={8}
          name="password"
          required
        />
      </NextIntlClientProvider>,
    );

    expect(markup).toContain('type="password"');
    expect(markup).toContain('name="password"');
    expect(markup).toContain('autoComplete="new-password"');
    expect(markup).toContain('minLength="8"');
    expect(markup).toContain('class="password-input-control custom-input"');
    expect(markup).toContain('type="button"');
    expect(markup).toContain('aria-label="Show password"');
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain('aria-controls="account-password"');
  });
});
