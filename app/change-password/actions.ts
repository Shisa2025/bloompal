"use server";

import { redirect, RedirectType } from "next/navigation";
import { updateOwnPassword, verifyCurrentPassword } from "@/database/users";
import { requireSignedInAccount, rotateLoginSession } from "@/lib/auth";
import { firstValidationError, passwordSchema } from "@/lib/validation";

export async function changePasswordAction(formData: FormData) {
  const account = await requireSignedInAccount();
  const currentPassword = formData.get("currentPassword");
  const parsed = passwordSchema.safeParse(formData.get("password"));
  const confirmation = formData.get("confirmation");

  if (!parsed.success) {
    redirect(`/change-password?error=${encodeURIComponent(firstValidationError(parsed.error))}`);
  }
  if (confirmation !== parsed.data) {
    redirect("/change-password?error=Passwords%20do%20not%20match.");
  }
  if (
    !account.mustChangePassword &&
    !(await verifyCurrentPassword(
      account.userid,
      typeof currentPassword === "string" ? currentPassword : "",
    ))
  ) {
    redirect("/change-password?error=Current%20password%20is%20incorrect.");
  }

  await updateOwnPassword(account.userid, parsed.data);
  await rotateLoginSession(account.userid);
  redirect(account.role === "admin" ? "/admin/dashboard" : "/dashboard", RedirectType.replace);
}
