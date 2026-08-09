"use server";

import { getLocale } from "next-intl/server";
import { RedirectType } from "next/navigation";
import { createLoginSession } from "@/lib/auth";
import { verifyUserLogin, type AccountRole } from "@/database/users";
import { redirect } from "@/i18n/navigation";
import { setLocaleCookie } from "@/i18n/locale-cookie";
import { resolveAccountLocale } from "@/i18n/locale";

export async function loginAction(formData: FormData) {
  const currentLocale = await getLocale();
  const identifier = formData.get("identifier");
  const password = formData.get("password");
  const role: AccountRole = formData.get("accountRole") === "admin" ? "admin" : "user";
  let error: import("@/lib/message-codes").ErrorCode = "invalidLogin";

  try {
    const account = await verifyUserLogin({
      identifier: typeof identifier === "string" ? identifier : "",
      password: typeof password === "string" ? password : "",
      expectedRole: role,
    });

    if (account) {
      await createLoginSession(account.userid, formData.get("remember") === "on");
      const destinationLocale = resolveAccountLocale(account.preferredLocale, currentLocale);
      await setLocaleCookie(destinationLocale);
      redirect(
        {
          href: account.mustChangePassword
            ? "/change-password"
            : account.role === "admin"
              ? "/admin/dashboard"
              : "/dashboard",
          locale: destinationLocale,
        },
        RedirectType.replace,
      );
    }
  } catch (caughtError) {
    if (
      typeof caughtError === "object" &&
      caughtError !== null &&
      "digest" in caughtError
    ) {
      throw caughtError;
    }
    console.error("Login failed while checking the database.", caughtError);
    error = "databaseUnavailable";
  }

  redirect(
    { href: { pathname: "/login", query: { role, error } }, locale: currentLocale },
    RedirectType.replace,
  );
}
