"use server";

import { timingSafeEqual } from "crypto";
import { redirect, RedirectType } from "next/navigation";
import { createAccount, type AccountRole } from "@/database/users";
import { createLoginSession } from "@/lib/auth";
import { accountInputSchema, firstValidationError } from "@/lib/validation";

export async function signupAction(formData: FormData) {
  const role: AccountRole = formData.get("accountRole") === "admin" ? "admin" : "user";
  const parsed = accountInputSchema.safeParse({
    userid: formData.get("userid"),
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    redirectWithError(role, firstValidationError(parsed.error));
  }

  if (role === "admin") {
    const suppliedCode = String(formData.get("adminCode") ?? "");
    const configuredCode = process.env.ADMIN_SIGNUP_CODE ?? "";
    if (!configuredCode || !safeEqual(suppliedCode, configuredCode)) {
      redirectWithError(role, "The Admin registration code is invalid.");
    }
  }

  const account = await createAccount({
    userid: parsed.data.userid,
    displayName: parsed.data.displayName,
    email: parsed.data.email,
    password: parsed.data.password,
    role,
  });

  if (!account) {
    redirectWithError(role, "That User ID or email is already in use.");
  }

  await createLoginSession(account.userid, false);
  redirect(role === "admin" ? "/admin/dashboard" : "/dashboard", RedirectType.replace);
}

function redirectWithError(role: AccountRole, message: string): never {
  redirect(
    `/signup?role=${role}&error=${encodeURIComponent(message)}`,
    RedirectType.replace,
  );
}

function safeEqual(first: string, second: string) {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);
  return firstBuffer.length === secondBuffer.length && timingSafeEqual(firstBuffer, secondBuffer);
}
