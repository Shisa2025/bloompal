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
  CREATE TABLE IF NOT EXISTS users (
    userid VARCHAR(120) PRIMARY KEY,
    useremail VARCHAR(255) NOT NULL UNIQUE,
    userpassword TEXT NOT NULL,
    display_name VARCHAR(120),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
  `,
  "CREATE INDEX IF NOT EXISTS users_useremail_idx ON users(useremail)",
];

for (const statement of statements) {
  await sql.query(statement);
}

console.log("User table created.");
