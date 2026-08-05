import "server-only";

import { Pool, type PoolClient, type QueryResultRow } from "pg";

export type DatabaseClient = {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<T[]>;
};

let cachedPool: Pool | null = null;

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.NEONDBAPIKEY;

  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL (or legacy NEONDBAPIKEY).");
  }

  return databaseUrl;
}

export function getPool(): Pool {
  if (cachedPool) return cachedPool;

  const databaseUrl = getDatabaseUrl();
  const sslMode = process.env.DATABASE_SSL_MODE?.trim().toLowerCase();

  cachedPool = new Pool({
    connectionString: normalizeDatabaseUrl(databaseUrl, sslMode),
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    ssl:
      sslMode === "disable"
        ? false
        : sslMode === "require"
          ? { rejectUnauthorized: false }
          : sslMode === "verify-full"
            ? {
                rejectUnauthorized: true,
                ca: process.env.DATABASE_CA_CERT?.replaceAll("\\n", "\n"),
              }
          : undefined,
  });

  return cachedPool;
}

function normalizeDatabaseUrl(databaseUrl: string, explicitSslMode?: string) {
  try {
    const url = new URL(databaseUrl);

    if (explicitSslMode) {
      url.searchParams.delete("sslmode");
      url.searchParams.delete("uselibpqcompat");
    } else if (
      url.searchParams.get("sslmode") === "require" &&
      !url.searchParams.has("uselibpqcompat")
    ) {
      url.searchParams.set("sslmode", "verify-full");
    }

    return url.toString();
  } catch {
    return databaseUrl;
  }
}

async function queryWith<T extends QueryResultRow = QueryResultRow>(
  client: Pick<Pool, "query"> | Pick<PoolClient, "query">,
  text: string,
  values?: readonly unknown[],
): Promise<T[]> {
  const result = await client.query<T>(text, values ? [...values] : undefined);
  return result.rows;
}

export const sql: DatabaseClient = {
  query: (text, values) => queryWith(getPool(), text, values),
};

export async function withTransaction<T>(
  operation: (client: DatabaseClient) => Promise<T>,
): Promise<T> {
  const poolClient = await getPool().connect();

  try {
    await poolClient.query("BEGIN");
    const result = await operation({
      query: (text, values) => queryWith(poolClient, text, values),
    });
    await poolClient.query("COMMIT");
    return result;
  } catch (error) {
    await poolClient.query("ROLLBACK");
    throw error;
  } finally {
    poolClient.release();
  }
}
