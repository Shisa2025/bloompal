import "server-only";

import { sql } from "./connection";

export type LoginMode = "userid" | "useremail";

export type AuthenticatedUser = {
  userid: string;
  useremail: string;
  displayName: string | null;
};

type UserRow = {
  userid: string;
  useremail: string;
  display_name: string | null;
};

export async function createUser({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthenticatedUser | null> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !password || !name) {
    return null;
  }

  // Generate userid from email (e.g., "john.doe@example.com" -> "john.doe")
  const userid = normalizedEmail.split("@")[0];

  try {
    const rows = (await sql.query(
      `
      INSERT INTO users (userid, useremail, userpassword, display_name)
      VALUES ($1, $2, $3, $4)
      RETURNING userid, useremail, display_name
      `,
      [userid, normalizedEmail, password, name],
    )) as UserRow[];

    const user = rows[0];

    if (!user) {
      return null;
    }

    return {
      userid: user.userid,
      useremail: user.useremail,
      displayName: user.display_name,
    };
  } catch (error) {
    console.error("Error creating user:", error);
    return null;
  }
}

export async function verifyUserLogin({
  mode,
  identifier,
  password,
}: {
  mode: LoginMode;
  identifier: string;
  password: string;
}): Promise<AuthenticatedUser | null> {
  const normalizedIdentifier = identifier.trim();

  if (!normalizedIdentifier || !password) {
    return null;
  }

  const rows = (await sql.query(
    mode === "useremail"
      ? `
        SELECT userid, useremail, display_name
        FROM users
        WHERE LOWER(useremail) = LOWER($1)
          AND userpassword = $2
        LIMIT 1
        `
      : `
        SELECT userid, useremail, display_name
        FROM users
        WHERE userid = $1
          AND userpassword = $2
        LIMIT 1
        `,
    [normalizedIdentifier, password],
  )) as UserRow[];

  const user = rows[0];

  if (!user) {
    return null;
  }

  return {
    userid: user.userid,
    useremail: user.useremail,
    displayName: user.display_name,
  };
}
