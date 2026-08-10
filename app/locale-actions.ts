"use server";

import { updatePreferredLocale } from "@/database/users";
import { isSupportedLocale } from "@/i18n/routing";
import { getCurrentAccount } from "@/lib/auth";
import {
  setLocaleCookie,
  setLoginLanguageChoiceCookies,
} from "@/i18n/locale-cookie";

export async function saveLocalePreference(locale: string) {
  if (!isSupportedLocale(locale)) return { ok: false } as const;

  await setLocaleCookie(locale);
  const account = await getCurrentAccount();
  if (account) await updatePreferredLocale(account.userid, locale);

  return { ok: true } as const;
}

export async function saveLoginLanguageChoice(locale: string) {
  if (!isSupportedLocale(locale)) return { ok: false } as const;

  await setLoginLanguageChoiceCookies(locale);
  return { ok: true } as const;
}
