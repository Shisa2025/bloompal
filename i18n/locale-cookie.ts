import "server-only";

import { cookies } from "next/headers";
import type { SupportedLocale } from "@/i18n/routing";

export async function setLocaleCookie(locale: SupportedLocale) {
  const store = await cookies();
  store.set("NEXT_LOCALE", locale, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  });
}
