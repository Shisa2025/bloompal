export function getDatabasePoolConfig(databaseUrl) {
  const sslMode = process.env.DATABASE_SSL_MODE?.trim().toLowerCase();

  return {
    connectionString: normalizeDatabaseUrl(databaseUrl, sslMode),
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
  };
}

function normalizeDatabaseUrl(databaseUrl, explicitSslMode) {
  try {
    const url = new URL(databaseUrl);

    if (explicitSslMode) {
      url.searchParams.delete("sslmode");
      url.searchParams.delete("uselibpqcompat");
    } else if (
      url.searchParams.get("sslmode") === "require" &&
      !url.searchParams.has("uselibpqcompat")
    ) {
      // pg v8 treats `require` as verify-full. Keep that secure behavior explicit
      // so the pg v9 libpq-compatibility change cannot weaken it silently.
      url.searchParams.set("sslmode", "verify-full");
    }

    return url.toString();
  } catch {
    return databaseUrl;
  }
}
