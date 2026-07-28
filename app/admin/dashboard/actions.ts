"use server";

import { cookies } from "next/headers";
import { redirect, RedirectType } from "next/navigation";

export async function logoutAction() {
  const cookieStore = await cookies();

  cookieStore.delete("bloompal_user_id");
  cookieStore.delete("bloompal_display_name");

  redirect("/login", RedirectType.replace);
}
