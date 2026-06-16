import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const databaseUrl = process.env.NEONDBAPIKEY;

if (!databaseUrl) {
  throw new Error("Missing NEONDBAPIKEY in .env.local.");
}

const sql = neon(databaseUrl);

const statements = [
  `
  INSERT INTO users (userid, useremail, userpassword, display_name)
  VALUES
    ('shisa', 'shisa@a.com', '123456', 'Shisa')
  ON CONFLICT (userid) DO UPDATE
  SET
    useremail = EXCLUDED.useremail,
    userpassword = EXCLUDED.userpassword,
    display_name = EXCLUDED.display_name,
    updated_at = NOW()
  `,
];

for (const statement of statements) {
  await sql.query(statement);
}

console.log("User seed data inserted.");
