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

console.log(`Deleted ${tableRows.length} database table(s).`);

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}
