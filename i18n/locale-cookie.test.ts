import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: mocks.get, set: mocks.set })),
}));

import {
  hasSelectedLoginLanguage,
  LOGIN_LANGUAGE_SELECTED_COOKIE,
  setLoginLanguageChoiceCookies,
} from "./locale-cookie";

describe("login language cookies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes the locale and one-year first-visit marker together", async () => {
    await setLoginLanguageChoiceCookies("en-SG");

    expect(mocks.set).toHaveBeenNthCalledWith(
      1,
      "NEXT_LOCALE",
      "en-SG",
      expect.objectContaining({ maxAge: 31_536_000, path: "/", sameSite: "lax" }),
    );
    expect(mocks.set).toHaveBeenNthCalledWith(
      2,
      LOGIN_LANGUAGE_SELECTED_COOKIE,
      "1",
      expect.objectContaining({ maxAge: 31_536_000, path: "/", sameSite: "lax" }),
    );
  });

  it("only treats the explicit marker value as a completed choice", async () => {
    mocks.get.mockReturnValueOnce({ value: "1" }).mockReturnValueOnce(undefined);

    await expect(hasSelectedLoginLanguage()).resolves.toBe(true);
    await expect(hasSelectedLoginLanguage()).resolves.toBe(false);
    expect(mocks.get).toHaveBeenCalledWith(LOGIN_LANGUAGE_SELECTED_COOKIE);
  });
});
