import "server-only";

import bcrypt from "bcryptjs";
import { sql, type DatabaseClient } from "./connection";

export type LoginMode = "userid" | "useremail";
export type AccountRole = "admin" | "user";
export type AccountStatus = "active" | "disabled";

export type AuthenticatedAccount = {
  userid: string;
  useremail: string;
  displayName: string;
  role: AccountRole;
  adminUserid: string | null;
  status: AccountStatus;
  mustChangePassword: boolean;
};

type AccountRow = {
  userid: string;
  useremail: string;
  display_name: string | null;
  password_hash: string;
  role: AccountRole;
  admin_userid: string | null;
  account_status: AccountStatus;
  must_change_password: boolean;
};

const accountColumns = `
  userid, useremail, display_name, password_hash, role, admin_userid,
  account_status, must_change_password
`;

export async function createAccount({
  userid,
  email,
  password,
  displayName,
  role,
  adminUserid = null,
  mustChangePassword = false,
  client = sql,
}: {
  userid: string;
  email: string;
  password: string;
  displayName: string;
  role: AccountRole;
  adminUserid?: string | null;
  mustChangePassword?: boolean;
  client?: DatabaseClient;
}): Promise<AuthenticatedAccount | null> {
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const rows = await client.query<AccountRow>(
      `
      INSERT INTO users (
        userid, useremail, password_hash, display_name, role, admin_userid,
        must_change_password
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING ${accountColumns}
      `,
      [
        userid,
        email.trim().toLowerCase(),
        passwordHash,
        displayName.trim(),
        role,
        adminUserid,
        mustChangePassword,
      ],
    );

    return toAccount(rows[0]);
  } catch (error) {
    if (isUniqueViolation(error)) return null;
    throw error;
  }
}

export async function verifyUserLogin({
  mode,
  identifier,
  password,
  expectedRole,
}: {
  mode: LoginMode;
  identifier: string;
  password: string;
  expectedRole: AccountRole;
}): Promise<AuthenticatedAccount | null> {
  const normalizedIdentifier = identifier.trim();
  if (!normalizedIdentifier || !password) return null;

  const rows = await sql.query<AccountRow>(
    `
    SELECT ${accountColumns}
    FROM users
    WHERE ${mode === "useremail" ? "LOWER(useremail) = LOWER($1)" : "userid = LOWER($1)"}
      AND role = $2
      AND account_status = 'active'
    LIMIT 1
    `,
    [normalizedIdentifier, expectedRole],
  );
  const row = rows[0];

  if (!row || !(await bcrypt.compare(password, row.password_hash))) return null;

  await sql.query("UPDATE users SET last_login_at = NOW() WHERE userid = $1", [
    row.userid,
  ]);
  return toAccount(row);
}

export async function updateOwnPassword(userid: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 12);
  await sql.query(
    `
    UPDATE users
    SET password_hash = $2, must_change_password = FALSE, updated_at = NOW()
    WHERE userid = $1 AND account_status = 'active'
    `,
    [userid, passwordHash],
  );
}

export async function verifyCurrentPassword(userid: string, password: string) {
  if (!password) return false;
  const rows = await sql.query<{ password_hash: string }>(
    `
    SELECT password_hash FROM users
    WHERE userid = $1 AND account_status = 'active'
    LIMIT 1
    `,
    [userid],
  );
  return Boolean(rows[0] && (await bcrypt.compare(password, rows[0].password_hash)));
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

function toAccount(row: AccountRow | undefined): AuthenticatedAccount | null {
  if (!row) return null;
  return {
    userid: row.userid,
    useremail: row.useremail,
    displayName: row.display_name?.trim() || row.userid,
    role: row.role,
    adminUserid: row.admin_userid,
    status: row.account_status,
    mustChangePassword: Boolean(row.must_change_password),
  };
}

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}
