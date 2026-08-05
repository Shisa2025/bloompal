import nextEnv from "@next/env";
import bcrypt from "bcryptjs";
import pg from "pg";
import { getDatabasePoolConfig } from "./pool-config.mjs";

const { loadEnvConfig } = nextEnv;
const { Pool } = pg;

loadEnvConfig(process.cwd());
const databaseUrl = process.env.DATABASE_URL ?? process.env.NEONDBAPIKEY;
if (!databaseUrl) throw new Error("Missing DATABASE_URL (or legacy NEONDBAPIKEY).");

const pool = new Pool(getDatabasePoolConfig(databaseUrl));
const passwordHash = await bcrypt.hash("123456a", 12);

await pool.query(
  `
  INSERT INTO users (
    userid, useremail, password_hash, display_name, role,
    account_status, must_change_password
  )
  VALUES ('shisa', 'shisa@a.com', $1, 'Shisa', 'user', 'active', FALSE)
  ON CONFLICT (userid) DO UPDATE
  SET useremail = EXCLUDED.useremail,
      password_hash = EXCLUDED.password_hash,
      display_name = EXCLUDED.display_name,
      updated_at = NOW()
  `,
  [passwordHash],
);

await pool.end();
console.log("Development seed account inserted (shisa / 123456a).");
