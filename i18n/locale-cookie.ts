import "server-only";

import { cookies } from "next/headers";
import type { SupportedLocale } from "@/i18n/routing";

export const LOGIN_LANGUAGE_SELECTED_COOKIE = "BLOOMPAL_LOGIN_LANGUAGE_SELECTED";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

const localeCookieOptions = {
  httpOnly: false,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: ONE_YEAR_IN_SECONDS,
  path: "/",
};

export async function setLocaleCookie(locale: SupportedLocale) {
  const store = await cookies();
  store.set("NEXT_LOCALE", locale, localeCookieOptions);
}

export async function setLoginLanguageChoiceCookies(locale: SupportedLocale) {
  const store = await cookies();
  store.set("NEXT_LOCALE", locale, localeCookieOptions);
  store.set(LOGIN_LANGUAGE_SELECTED_COOKIE, "1", localeCookieOptions);
}

export async function hasSelectedLoginLanguage() {
  const store = await cookies();
  return store.get(LOGIN_LANGUAGE_SELECTED_COOKIE)?.value === "1";
}
