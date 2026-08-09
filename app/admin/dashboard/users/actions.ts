"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { RedirectType } from "next/navigation";
import {
  releaseManagedUser,
  resetManagedUserPassword,
  setManagedUserStatus,
  updateManagedUser,
} from "@/database/admin";
import { createAccount } from "@/database/users";
import { requireAdmin } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getLocalizedPath } from "@/i18n/server";
import type { ErrorCode, NoticeCode } from "@/lib/message-codes";
import {
  accountInputSchema,
  displayNameSchema,
  emailSchema,
  firstValidationErrorCode,
  passwordSchema,
} from "@/lib/validation";

export async function createManagedUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = accountInputSchema.safeParse({
    userid: formData.get("userid"),
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) return redirectNew(firstValidationErrorCode(parsed.error));
  const account = await createAccount({
    userid: parsed.data.userid,
    displayName: parsed.data.displayName,
    email: parsed.data.email,
    password: parsed.data.password,
    role: "user",
    adminUserid: admin.userid,
    mustChangePassword: true,
  });
  if (!account) return redirectNew("duplicateAccount");

  const locale = await getLocale();
  revalidatePath(await getLocalizedPath("/admin/dashboard"));
  revalidatePath(await getLocalizedPath("/admin/dashboard/users"));
  redirect(
    { href: { pathname: `/admin/dashboard/users/${encodeURIComponent(account.userid)}`, query: { notice: "managedUserCreated" } }, locale },
    RedirectType.replace,
  );
}

export async function updateManagedUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const userid = String(formData.get("userid") ?? "");
  const nameResult = displayNameSchema.safeParse(formData.get("displayName"));
  const emailResult = emailSchema.safeParse(formData.get("email"));

  if (!nameResult.success) return redirectUser(userid, "error", firstValidationErrorCode(nameResult.error));
  if (!emailResult.success) return redirectUser(userid, "error", firstValidationErrorCode(emailResult.error));

  const result = await updateManagedUser({
    adminUserid: admin.userid,
    userid,
    displayName: nameResult.data,
    email: emailResult.data,
  });
  if (result === "duplicate") return redirectUser(userid, "error", "duplicateEmail");
  if (result === "not_found") return redirectToUsers();

  revalidatePath(await getLocalizedPath(`/admin/dashboard/users/${userid}`));
  await redirectUser(userid, "notice", "managedUserUpdated");
}

export async function resetManagedPasswordAction(formData: FormData) {
  const admin = await requireAdmin();
  const userid = String(formData.get("userid") ?? "");
  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) return redirectUser(userid, "error", firstValidationErrorCode(parsed.error));

  const updated = await resetManagedUserPassword(admin.userid, userid, parsed.data);
  if (!updated) return redirectToUsers();
  revalidatePath(await getLocalizedPath(`/admin/dashboard/users/${userid}`));
  await redirectUser(userid, "notice", "managedPasswordReset");
}

export async function setManagedUserStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const userid = String(formData.get("userid") ?? "");
  const status = formData.get("status") === "disabled" ? "disabled" : "active";
  const updated = await setManagedUserStatus(admin.userid, userid, status);
  if (!updated) return redirectToUsers();
  revalidatePath(await getLocalizedPath("/admin/dashboard"));
  revalidatePath(await getLocalizedPath(`/admin/dashboard/users/${userid}`));
  await redirectUser(userid, "notice", status === "disabled" ? "managedUserDisabled" : "managedUserEnabled");
}

export async function releaseManagedUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const userid = String(formData.get("userid") ?? "");
  await releaseManagedUser(admin.userid, userid);
  const locale = await getLocale();
  revalidatePath(await getLocalizedPath("/admin/dashboard"));
  revalidatePath(await getLocalizedPath("/admin/dashboard/users"));
  redirect(
    { href: { pathname: "/admin/dashboard/users", query: { notice: "managedUserReleased" } }, locale },
    RedirectType.replace,
  );
}

async function redirectNew(error: ErrorCode): Promise<never> {
  const locale = await getLocale();
  return redirect({ href: { pathname: "/admin/dashboard/users/new", query: { error } }, locale }, RedirectType.replace);
}

async function redirectUser(userid: string, kind: "error", code: ErrorCode): Promise<never>;
async function redirectUser(userid: string, kind: "notice", code: NoticeCode): Promise<never>;
async function redirectUser(userid: string, kind: "error" | "notice", code: ErrorCode | NoticeCode): Promise<never> {
  const locale = await getLocale();
  return redirect({ href: { pathname: `/admin/dashboard/users/${encodeURIComponent(userid)}`, query: { [kind]: code } }, locale }, RedirectType.replace);
}

async function redirectToUsers(): Promise<never> {
  const locale = await getLocale();
  return redirect({ href: "/admin/dashboard/users", locale }, RedirectType.replace);
}
