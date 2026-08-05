import nextEnv from "@next/env";
import pg from "pg";
import { getDatabasePoolConfig } from "./pool-config.mjs";

const { loadEnvConfig } = nextEnv;
const { Pool } = pg;

loadEnvConfig(process.cwd());

if (process.env.ALLOW_DATABASE_RESET !== "yes-reset-bloompal") {
  throw new Error(
    "Database deletion refused. Set ALLOW_DATABASE_RESET=yes-reset-bloompal only for a disposable development database.",
  );
}

const databaseUrl = process.env.DATABASE_URL ?? process.env.NEONDBAPIKEY;

if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL (or legacy NEONDBAPIKEY).");
}

const pool = new Pool(getDatabasePoolConfig(databaseUrl));

const tableRows = await pool.query(`
  SELECT schemaname, tablename
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename
`);

for (const table of tableRows.rows) {
  await pool.query(
    `DROP TABLE IF EXISTS ${quoteIdentifier(table.schemaname)}.${quoteIdentifier(
      table.tablename,
    )} CASCADE`,
  );
}

await pool.end();

console.log(`Deleted ${tableRows.rowCount} database table(s).`);

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}
