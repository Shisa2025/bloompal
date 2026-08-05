import nextEnv from "@next/env";
import pg from "pg";
import { getDatabasePoolConfig } from "./pool-config.mjs";

const { loadEnvConfig } = nextEnv;
const { Pool } = pg;

loadEnvConfig(process.cwd());

if (process.env.ALLOW_DATABASE_RESET !== "yes-reset-bloompal") {
  throw new Error(
    "Database reset refused. Set ALLOW_DATABASE_RESET=yes-reset-bloompal only for a disposable development database.",
  );
}

const databaseUrl = process.env.DATABASE_URL ?? process.env.NEONDBAPIKEY;
if (!databaseUrl) throw new Error("Missing DATABASE_URL (or legacy NEONDBAPIKEY).");
const pool = new Pool(getDatabasePoolConfig(databaseUrl));
const tables = await pool.query(`
  SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
`);

for (const { tablename } of tables.rows) {
  await pool.query(`DROP TABLE IF EXISTS public.${quoteIdentifier(tablename)} CASCADE`);
}
await pool.end();

console.log(`Dropped ${tables.rowCount} development table(s). Rebuilding...`);
await import("./migrate.mjs");

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}
