import type { SupportedLocale } from "@/i18n/routing";

export function resolveAccountLocale(
  preferredLocale: SupportedLocale | null,
  requestLocale: SupportedLocale,
): SupportedLocale {
  return preferredLocale ?? requestLocale;
}
