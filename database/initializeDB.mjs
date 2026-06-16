import nextEnv from "@next/env";
import { neon } from "@neondatabase/serverless";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const databaseUrl = process.env.NEONDBAPIKEY;

if (!databaseUrl) {
  throw new Error("Missing NEONDBAPIKEY in .env.local.");
}

const sql = neon(databaseUrl);

const tableRows = await sql.query(`
  SELECT schemaname, tablename
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename
`);

for (const table of tableRows) {
  await sql.query(
    `DROP TABLE IF EXISTS ${quoteIdentifier(table.schemaname)}.${quoteIdentifier(
      table.tablename,
    )} CASCADE`,
  );
}

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

console.log(
  `Deleted ${tableRows.length} existing table(s). User database initialized.`,
);

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}
