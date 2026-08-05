import "server-only";

import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { redirect, RedirectType } from "next/navigation";
import {
  createStoredSession,
  deleteExpiredSessions,
  deleteSessionsForUser,
  deleteStoredSession,
  getSessionAccount,
} from "@/database/auth-sessions";
import type { AccountRole, AuthenticatedAccount } from "@/database/users";

const sessionCookieName = "bloompal_session";
const standardSessionSeconds = 60 * 60 * 12;
const rememberedSessionSeconds = 60 * 60 * 24 * 7;

export async function getCurrentAccount(): Promise<AuthenticatedAccount | null> {
  const rawToken = (await cookies()).get(sessionCookieName)?.value;
  if (!rawToken) return null;

  return getSessionAccount(hashToken(rawToken));
}

export async function createLoginSession(userid: string, remember: boolean) {
  const rawToken = randomBytes(32).toString("base64url");
  const lifetime = remember ? rememberedSessionSeconds : standardSessionSeconds;
  const expiresAt = new Date(Date.now() + lifetime * 1000);

  await deleteExpiredSessions();
  await createStoredSession({
    tokenHash: hashToken(rawToken),
    userid,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, rawToken, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    ...(remember ? { maxAge: rememberedSessionSeconds } : {}),
  });
  cookieStore.delete("bloompal_user_id");
  cookieStore.delete("bloompal_display_name");
}

export async function destroyCurrentSession() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(sessionCookieName)?.value;

  if (rawToken) await deleteStoredSession(hashToken(rawToken));
  cookieStore.delete(sessionCookieName);
  cookieStore.delete("bloompal_user_id");
  cookieStore.delete("bloompal_display_name");
}

export async function rotateLoginSession(userid: string, remember = false) {
  await deleteSessionsForUser(userid);
  await createLoginSession(userid, remember);
}

export async function requireSignedInAccount() {
  const account = await getCurrentAccount();
  if (!account) redirect("/login", RedirectType.replace);
  return account;
}

export async function requireRole(role: AccountRole) {
  const account = await requireSignedInAccount();

  if (account.role !== role) {
    redirect(
      account.role === "admin" ? "/admin/dashboard" : "/dashboard",
      RedirectType.replace,
    );
  }
  if (account.mustChangePassword) {
    redirect("/change-password", RedirectType.replace);
  }

  return account;
}

export const requireUser = () => requireRole("user");
export const requireAdmin = () => requireRole("admin");

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
