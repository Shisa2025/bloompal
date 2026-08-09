import { describe, expect, it } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import enMessages from "../messages/en-SG.json";
import zhMessages from "../messages/zh-CN.json";
import { isSupportedLocale, routing } from "./routing";
import { resolveAccountLocale } from "./locale";
import { errorCodes, isErrorCode, isNoticeCode, noticeCodes } from "../lib/message-codes";

const config = {
  matcher: [
    "/((?!api|_next|_vercel|.*\\..*).*)",
    "/([\\w-]+)?/admin/dashboard/users/(.+)",
    "/([\\w-]+)?/admin/dashboard/reports/(.+)",
  ],
};

describe("locale configuration", () => {
  it("supports only the two rollout locales with Chinese fallback", () => {
    expect(routing.locales).toEqual(["en-SG", "zh-CN"]);
    expect(routing.defaultLocale).toBe("zh-CN");
    expect(isSupportedLocale("en-SG")).toBe(true);
    expect(isSupportedLocale("zh-CN")).toBe(true);
    expect(isSupportedLocale("en-US")).toBe(false);
  });

  it("keeps both message dictionaries structurally identical", () => {
    expect(flattenKeys(enMessages)).toEqual(flattenKeys(zhMessages));
  });

  it("maps every typed action code to both dictionaries", () => {
    for (const code of errorCodes) {
      expect(enMessages.Errors[code]).toBeTruthy();
      expect(zhMessages.Errors[code]).toBeTruthy();
      expect(isErrorCode(code)).toBe(true);
    }
    for (const code of noticeCodes) {
      expect(enMessages.Notices[code]).toBeTruthy();
      expect(zhMessages.Notices[code]).toBeTruthy();
      expect(isNoticeCode(code)).toBe(true);
    }
    expect(isErrorCode("English error sentence")).toBe(false);
    expect(isNoticeCode("unknown")).toBe(false);
  });

  it("prefers a saved account locale and otherwise keeps the request locale", () => {
    expect(resolveAccountLocale("en-SG", "zh-CN")).toBe("en-SG");
    expect(resolveAccountLocale(null, "zh-CN")).toBe("zh-CN");
  });
});

describe("locale proxy matcher", () => {
  const matches = (url: string) => unstable_doesMiddlewareMatch({ config, nextConfig: {}, url });

  it("covers prefixed and legacy UI routes, dot IDs, and CSV downloads", () => {
    expect(matches("/")).toBe(true);
    expect(matches("/login")).toBe(true);
    expect(matches("/en-SG/dashboard")).toBe(true);
    expect(matches("/admin/dashboard/users/user.name")).toBe(true);
    expect(matches("/zh-CN/admin/dashboard/users/user.name")).toBe(true);
    expect(matches("/admin/dashboard/reports/users.csv")).toBe(true);
    expect(matches("/en-SG/admin/dashboard/reports/sessions.csv")).toBe(true);
  });

  it("excludes APIs and static assets", () => {
    expect(matches("/api/health")).toBe(false);
    expect(matches("/_next/static/chunk.js")).toBe(false);
    expect(matches("/images/logo.png")).toBe(false);
  });
});

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value)
    .flatMap(([key, child]) => flattenKeys(child, prefix ? `${prefix}.${key}` : key))
    .sort();
}
