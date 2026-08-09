"use server";

import { getLocale } from "next-intl/server";
import { RedirectType } from "next/navigation";
import { updateOwnPassword, verifyCurrentPassword } from "@/database/users";
import { requireSignedInAccount, rotateLoginSession } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { firstValidationErrorCode, passwordSchema } from "@/lib/validation";

export async function changePasswordAction(formData: FormData) {
  const account = await requireSignedInAccount();
  const locale = await getLocale();
  const currentPassword = formData.get("currentPassword");
  const parsed = passwordSchema.safeParse(formData.get("password"));
  const confirmation = formData.get("confirmation");

  if (!parsed.success) {
    return redirect({ href: { pathname: "/change-password", query: { error: firstValidationErrorCode(parsed.error) } }, locale });
  }
  if (confirmation !== parsed.data) {
    redirect({ href: { pathname: "/change-password", query: { error: "passwordsMismatch" } }, locale });
  }
  if (
    !account.mustChangePassword &&
    !(await verifyCurrentPassword(
      account.userid,
      typeof currentPassword === "string" ? currentPassword : "",
    ))
  ) {
    redirect({ href: { pathname: "/change-password", query: { error: "currentPasswordIncorrect" } }, locale });
  }

  await updateOwnPassword(account.userid, parsed.data);
  await rotateLoginSession(account.userid);
  redirect({ href: account.role === "admin" ? "/admin/dashboard" : "/dashboard", locale }, RedirectType.replace);
}
