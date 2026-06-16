"use server";

import { redirect, RedirectType } from "next/navigation";
import { verifyUserLogin, type LoginMode } from "@/database/users";

export async function loginAction(formData: FormData) {
  const loginMode = formData.get("loginMode");
  const identifier = formData.get("identifier");
  const password = formData.get("password");

  const mode: LoginMode = loginMode === "useremail" ? "useremail" : "userid";
  let redirectTarget = "/login?error=invalid";

  try {
    const user = await verifyUserLogin({
      mode,
      identifier: typeof identifier === "string" ? identifier : "",
      password: typeof password === "string" ? password : "",
    });

    if (user) {
      redirectTarget = "/dashboard";
    }
  } catch (error) {
    console.error("Login failed while checking the database.", error);
    redirectTarget = "/login?error=database";
  }

  redirect(redirectTarget, RedirectType.replace);
}
