import "server-only";

import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.NEONDBAPIKEY;

if (!databaseUrl) {
  throw new Error("Missing NEONDBAPIKEY in .env.local.");
}

export const sql = neon(databaseUrl);
