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
  CREATE TABLE IF NOT EXISTS user_plants (
    id TEXT PRIMARY KEY,
    userid VARCHAR(120) NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
    seed_key VARCHAR(40) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'selected',
    left_water_count INTEGER NOT NULL DEFAULT 0,
    right_water_count INTEGER NOT NULL DEFAULT 0,
    flower_asset VARCHAR(120),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT user_plants_status_check CHECK (status IN ('selected', 'completed')),
    CONSTRAINT user_plants_seed_key_check CHECK (
      seed_key IN ('mystery-a', 'mystery-b', 'mystery-c')
    )
  )
  `,
  `
  CREATE UNIQUE INDEX IF NOT EXISTS user_plants_one_selected_idx
  ON user_plants(userid)
  WHERE status = 'selected'
  `,
  `
  CREATE INDEX IF NOT EXISTS user_plants_userid_updated_idx
  ON user_plants(userid, updated_at DESC)
  `,
  `
  CREATE TABLE IF NOT EXISTS user_dashboard_settings (
    userid VARCHAR(120) PRIMARY KEY REFERENCES users(userid) ON DELETE CASCADE,
    table_flower_asset VARCHAR(120),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
  `,
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
