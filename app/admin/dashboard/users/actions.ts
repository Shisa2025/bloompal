"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import {
  releaseManagedUser,
  resetManagedUserPassword,
  setManagedUserStatus,
  updateManagedUser,
} from "@/database/admin";
import { createAccount } from "@/database/users";
import { requireAdmin } from "@/lib/auth";
import {
  accountInputSchema,
  displayNameSchema,
  emailSchema,
  firstValidationError,
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

  if (!parsed.success) redirectNew(firstValidationError(parsed.error));
  const account = await createAccount({
    userid: parsed.data.userid,
    displayName: parsed.data.displayName,
    email: parsed.data.email,
    password: parsed.data.password,
    role: "user",
    adminUserid: admin.userid,
    mustChangePassword: true,
  });
  if (!account) redirectNew("That User ID or email is already in use.");

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/dashboard/users");
  redirect(
    `/admin/dashboard/users/${encodeURIComponent(account.userid)}?notice=${encodeURIComponent("User created. They must change the temporary password on first sign-in.")}`,
    RedirectType.replace,
  );
}

export async function updateManagedUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const userid = String(formData.get("userid") ?? "");
  const nameResult = displayNameSchema.safeParse(formData.get("displayName"));
  const emailResult = emailSchema.safeParse(formData.get("email"));

  if (!nameResult.success) redirectUser(userid, "error", firstValidationError(nameResult.error));
  if (!emailResult.success) redirectUser(userid, "error", firstValidationError(emailResult.error));

  const result = await updateManagedUser({
    adminUserid: admin.userid,
    userid,
    displayName: nameResult.data,
    email: emailResult.data,
  });
  if (result === "duplicate") redirectUser(userid, "error", "That email is already in use.");
  if (result === "not_found") redirect("/admin/dashboard/users", RedirectType.replace);

  revalidatePath(`/admin/dashboard/users/${userid}`);
  redirectUser(userid, "notice", "User details updated.");
}

export async function resetManagedPasswordAction(formData: FormData) {
  const admin = await requireAdmin();
  const userid = String(formData.get("userid") ?? "");
  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) redirectUser(userid, "error", firstValidationError(parsed.error));

  const updated = await resetManagedUserPassword(admin.userid, userid, parsed.data);
  if (!updated) redirect("/admin/dashboard/users", RedirectType.replace);
  revalidatePath(`/admin/dashboard/users/${userid}`);
  redirectUser(userid, "notice", "Temporary password reset. Existing sessions were signed out.");
}

export async function setManagedUserStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const userid = String(formData.get("userid") ?? "");
  const status = formData.get("status") === "disabled" ? "disabled" : "active";
  const updated = await setManagedUserStatus(admin.userid, userid, status);
  if (!updated) redirect("/admin/dashboard/users", RedirectType.replace);
  revalidatePath("/admin/dashboard");
  revalidatePath(`/admin/dashboard/users/${userid}`);
  redirectUser(userid, "notice", status === "disabled" ? "User disabled and signed out." : "User enabled.");
}

export async function releaseManagedUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const userid = String(formData.get("userid") ?? "");
  await releaseManagedUser(admin.userid, userid);
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/dashboard/users");
  redirect(
    `/admin/dashboard/users?notice=${encodeURIComponent("User released and is now unassigned.")}`,
    RedirectType.replace,
  );
}

function redirectNew(message: string): never {
  redirect(`/admin/dashboard/users/new?error=${encodeURIComponent(message)}`, RedirectType.replace);
}

function redirectUser(userid: string, kind: "error" | "notice", message: string): never {
  redirect(
    `/admin/dashboard/users/${encodeURIComponent(userid)}?${kind}=${encodeURIComponent(message)}`,
    RedirectType.replace,
  );
}
