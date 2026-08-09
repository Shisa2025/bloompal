"use server";

import { redirect, RedirectType } from "next/navigation";
import { createLoginSession } from "@/lib/auth";
import { verifyUserLogin, type AccountRole } from "@/database/users";

export async function loginAction(formData: FormData) {
  const identifier = formData.get("identifier");
  const password = formData.get("password");
  const role: AccountRole = formData.get("accountRole") === "admin" ? "admin" : "user";
  let error = "invalid";

  try {
    const account = await verifyUserLogin({
      identifier: typeof identifier === "string" ? identifier : "",
      password: typeof password === "string" ? password : "",
      expectedRole: role,
    });

    if (account) {
      await createLoginSession(account.userid, formData.get("remember") === "on");
      redirect(
        account.mustChangePassword
          ? "/change-password"
          : account.role === "admin"
            ? "/admin/dashboard"
            : "/dashboard",
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
    error = "database";
  }

  redirect(`/login?role=${role}&error=${error}`, RedirectType.replace);
}
