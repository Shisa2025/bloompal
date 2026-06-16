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
  "DROP TABLE IF EXISTS care_tasks",
  "DROP TABLE IF EXISTS plants",
  "DROP TABLE IF EXISTS users",
];

for (const statement of statements) {
  await sql.query(statement);
}

console.log("Database tables deleted.");
