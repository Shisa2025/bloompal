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
