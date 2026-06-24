"use server";

import { cookies } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import { verifyUserLogin, type LoginMode } from "@/database/users";

const sessionCookieMaxAge = 60 * 60 * 24 * 7;

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
      const cookieStore = await cookies();

      cookieStore.set("bloompal_user_id", user.userid, {
        httpOnly: true,
        maxAge: sessionCookieMaxAge,
        path: "/",
        sameSite: "lax",
      });
      cookieStore.set("bloompal_display_name", user.displayName ?? "", {
        httpOnly: true,
        maxAge: sessionCookieMaxAge,
        path: "/",
        sameSite: "lax",
      });

      redirectTarget = "/dashboard";
    }
  } catch (error) {
    console.error("Login failed while checking the database.", error);
    redirectTarget = "/login?error=database";
  }

  redirect(redirectTarget, RedirectType.replace);
}
