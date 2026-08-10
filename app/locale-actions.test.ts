import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  setLoginLanguageChoiceCookies: vi.fn(),
}));

vi.mock("@/i18n/locale-cookie", () => ({
  setLocaleCookie: vi.fn(),
  setLoginLanguageChoiceCookies: mocks.setLoginLanguageChoiceCookies,
}));

vi.mock("@/i18n/routing", () => ({
  isSupportedLocale: (locale: string) => locale === "zh-CN" || locale === "en-SG",
}));

vi.mock("@/database/users", () => ({
  updatePreferredLocale: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentAccount: vi.fn(),
}));

import { saveLoginLanguageChoice } from "./locale-actions";

describe("saveLoginLanguageChoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(["zh-CN", "en-SG"])("saves a supported locale (%s)", async (locale) => {
    await expect(saveLoginLanguageChoice(locale)).resolves.toEqual({ ok: true });
    expect(mocks.setLoginLanguageChoiceCookies).toHaveBeenCalledWith(locale);
  });

  it("rejects unsupported locale values without writing cookies", async () => {
    await expect(saveLoginLanguageChoice("en-US")).resolves.toEqual({ ok: false });
    expect(mocks.setLoginLanguageChoiceCookies).not.toHaveBeenCalled();
  });
});
