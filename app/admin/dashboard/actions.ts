"use server";

import { getLocale } from "next-intl/server";
import { RedirectType } from "next/navigation";
import { destroyCurrentSession } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";

export async function logoutAction() {
  const locale = await getLocale();
  await destroyCurrentSession();
  redirect({ href: "/login", locale }, RedirectType.replace);
}
