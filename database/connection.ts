import "server-only";

import { neon } from "@neondatabase/serverless";

type SqlClient = ReturnType<typeof neon>;

let cachedSql: SqlClient | null = null;

export function getSql(): SqlClient {
  if (cachedSql) {
    return cachedSql;
  }

  const databaseUrl = process.env.NEONDBAPIKEY;

  if (!databaseUrl) {
    throw new Error("Missing NEONDBAPIKEY in .env.local.");
  }

  cachedSql = neon(databaseUrl);
  return cachedSql;
}

const lazySql = ((strings: TemplateStringsArray, ...values: unknown[]) =>
  getSql()(strings, ...values)) as SqlClient;

export const sql = new Proxy(lazySql, {
  get(_target, property, receiver) {
    const value = Reflect.get(getSql(), property, receiver);
    return typeof value === "function" ? value.bind(getSql()) : value;
  },
});
