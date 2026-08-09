import { getLocale } from "next-intl/server";
import { getPathname } from "@/i18n/navigation";
import type { SupportedLocale } from "@/i18n/routing";

export async function getLocalizedPath(href: string) {
  const locale = (await getLocale()) as SupportedLocale;
  return getPathname({ href, locale });
}
