"use server";

import { timingSafeEqual } from "crypto";
import { redirect, RedirectType } from "next/navigation";
import {
  createAccount,
  isAssignableAdmin,
  type AccountRole,
} from "@/database/users";
import { createLoginSession } from "@/lib/auth";
import {
  accountInputSchema,
  firstValidationError,
  organizationSchema,
  useridSchema,
} from "@/lib/validation";

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

  let organization: string | null = null;
  let adminUserid: string | null = null;

  if (role === "admin") {
    const parsedOrganization = organizationSchema.safeParse(
      formData.get("organization"),
    );
    if (!parsedOrganization.success) {
      redirectWithError(role, firstValidationError(parsedOrganization.error));
    }
    organization = parsedOrganization.data;

    const suppliedCode = String(formData.get("adminCode") ?? "");
    const configuredCode = process.env.ADMIN_SIGNUP_CODE ?? "";
    if (!configuredCode || !safeEqual(suppliedCode, configuredCode)) {
      redirectWithError(role, "The Admin registration code is invalid.");
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
          role,
          "Choose an active Admin from the list or continue without one.",
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
    });
  } catch (error) {
    if (role === "user" && isUnavailableAdminError(error)) {
      redirectWithError(
        role,
        "That Admin is no longer active. Choose another Admin or continue without one.",
      );
    }
    throw error;
  }

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
