import { getRequestConfig } from "next-intl/server";
import { isSupportedLocale, routing } from "./routing";

export default getRequestConfig(async ({ locale, requestLocale }) => {
  const requestedLocale = locale ?? (await requestLocale);
  const resolvedLocale =
    requestedLocale && isSupportedLocale(requestedLocale)
      ? requestedLocale
      : routing.defaultLocale;

  return {
    locale: resolvedLocale,
    messages: (await import(`../messages/${resolvedLocale}.json`)).default,
    timeZone: "Asia/Singapore",
  };
});
