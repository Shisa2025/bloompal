import "server-only";

import { sql } from "./connection";
import type { SupportedLocale } from "@/i18n/routing";
import type { AccountRole, AccountStatus, AuthenticatedAccount } from "./users";

type SessionAccountRow = {
  userid: string;
  useremail: string;
  display_name: string | null;
  role: AccountRole;
  admin_userid: string | null;
  account_status: AccountStatus;
  must_change_password: boolean;
  preferred_locale: SupportedLocale | null;
};

export async function createStoredSession({
  tokenHash,
  userid,
  expiresAt,
}: {
  tokenHash: string;
  userid: string;
  expiresAt: Date;
}) {
  await sql.query(
    "INSERT INTO auth_sessions (token_hash, userid, expires_at) VALUES ($1, $2, $3)",
    [tokenHash, userid, expiresAt],
  );
}

export async function getSessionAccount(
  tokenHash: string,
): Promise<AuthenticatedAccount | null> {
  const rows = await sql.query<SessionAccountRow>(
    `
    SELECT
      users.userid, users.useremail, users.display_name, users.role,
      users.admin_userid, users.account_status, users.must_change_password,
      users.preferred_locale
    FROM auth_sessions
    JOIN users ON users.userid = auth_sessions.userid
    WHERE auth_sessions.token_hash = $1
      AND auth_sessions.expires_at > NOW()
      AND users.account_status = 'active'
    LIMIT 1
    `,
    [tokenHash],
  );
  const row = rows[0];

  if (!row) return null;
  return {
    userid: row.userid,
    useremail: row.useremail,
    displayName: row.display_name?.trim() || row.userid,
    role: row.role,
    adminUserid: row.admin_userid,
    status: row.account_status,
    mustChangePassword: Boolean(row.must_change_password),
    preferredLocale: row.preferred_locale,
  };
}

export async function deleteStoredSession(tokenHash: string) {
  await sql.query("DELETE FROM auth_sessions WHERE token_hash = $1", [tokenHash]);
}

export async function deleteSessionsForUser(userid: string) {
  await sql.query("DELETE FROM auth_sessions WHERE userid = $1", [userid]);
}

export async function deleteExpiredSessions() {
  await sql.query("DELETE FROM auth_sessions WHERE expires_at <= NOW()");
}
