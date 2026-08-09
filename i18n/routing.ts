import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en-SG", "zh-CN"],
  defaultLocale: "zh-CN",
  localePrefix: "always",
});

export type SupportedLocale = (typeof routing.locales)[number];

export function isSupportedLocale(value: string): value is SupportedLocale {
  return routing.locales.some((locale) => locale === value);
}
