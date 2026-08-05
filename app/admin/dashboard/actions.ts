"use server";

import { redirect, RedirectType } from "next/navigation";
import { destroyCurrentSession } from "@/lib/auth";

export async function logoutAction() {
  await destroyCurrentSession();
  redirect("/login", RedirectType.replace);
}
