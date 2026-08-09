"use server";

import { timingSafeEqual } from "crypto";
import { getLocale } from "next-intl/server";
import { RedirectType } from "next/navigation";
import {
  createAccount,
  isAssignableAdmin,
  type AccountRole,
} from "@/database/users";
import { createLoginSession } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import type { SupportedLocale } from "@/i18n/routing";
import { setLocaleCookie } from "@/i18n/locale-cookie";
import {
  accountInputSchema,
  firstValidationErrorCode,
  organizationSchema,
  useridSchema,
} from "@/lib/validation";

export async function signupAction(formData: FormData) {
  const locale = await getLocale();
  const role: AccountRole = formData.get("accountRole") === "admin" ? "admin" : "user";
  const parsed = accountInputSchema.safeParse({
    userid: formData.get("userid"),
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirectWithError(locale, role, firstValidationErrorCode(parsed.error));
  }

  let organization: string | null = null;
  let adminUserid: string | null = null;

  if (role === "admin") {
    const parsedOrganization = organizationSchema.safeParse(
      formData.get("organization"),
    );
    if (!parsedOrganization.success) {
      redirectWithError(locale, role, firstValidationErrorCode(parsedOrganization.error));
    }
    organization = parsedOrganization.data;

    const suppliedCode = String(formData.get("adminCode") ?? "");
    const configuredCode = process.env.ADMIN_SIGNUP_CODE ?? "";
    if (!configuredCode || !safeEqual(suppliedCode, configuredCode)) {
      redirectWithError(locale, role, "invalidAdminCode");
    }
  } else {
    const suppliedAdminUserid = String(
      formData.get("adminUserid") ?? "",
    ).trim();

    if (suppliedAdminUserid) {
      const parsedAdminUserid = useridSchema.safeParse(suppliedAdminUserid);
      if (
        !parsedAdminUserid.success ||
        !(await isAssignableAdmin(parsedAdminUserid.data))
      ) {
        redirectWithError(
          locale,
          role,
          "chooseActiveAdmin",
        );
      }
      adminUserid = parsedAdminUserid.data;
    }
  }

  let account: Awaited<ReturnType<typeof createAccount>>;
  try {
    account = await createAccount({
      userid: parsed.data.userid,
      displayName: parsed.data.displayName,
      email: parsed.data.email,
      password: parsed.data.password,
      role,
      organization,
      adminUserid,
      preferredLocale: locale,
    });
  } catch (error) {
    if (role === "user" && isUnavailableAdminError(error)) {
      redirectWithError(
        locale,
        role,
        "adminInactive",
      );
    }
    throw error;
  }

  if (!account) {
    redirectWithError(locale, role, "duplicateAccount");
  }

  await createLoginSession(account.userid, false);
  await setLocaleCookie(locale);
  redirect(
    { href: role === "admin" ? "/admin/dashboard" : "/dashboard", locale },
    RedirectType.replace,
  );
}

function redirectWithError(locale: SupportedLocale, role: AccountRole, error: import("@/lib/message-codes").ErrorCode): never {
  return redirect(
    { href: { pathname: "/signup", query: { role, error } }, locale },
    RedirectType.replace,
  );
}

function safeEqual(first: string, second: string) {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);
  return firstBuffer.length === secondBuffer.length && timingSafeEqual(firstBuffer, secondBuffer);
}

function isUnavailableAdminError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23514" &&
    "constraint" in error &&
    error.constraint === "users_admin_assignment_active_check"
  );
}
