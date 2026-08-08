import nextEnv from "@next/env";
import bcrypt from "bcryptjs";
import pg from "pg";
import { getDatabasePoolConfig } from "./pool-config.mjs";

const { loadEnvConfig } = nextEnv;
const { Pool } = pg;

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL ?? process.env.NEONDBAPIKEY;

if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL (or legacy NEONDBAPIKEY).");
}

const pool = new Pool(getDatabasePoolConfig(databaseUrl));
const client = await pool.connect();

try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(42420001)");

  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      userid VARCHAR(120) PRIMARY KEY,
      useremail VARCHAR(255) NOT NULL UNIQUE,
      userpassword TEXT,
      display_name VARCHAR(120),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_hash TEXT,
      ADD COLUMN IF NOT EXISTS role VARCHAR(16) NOT NULL DEFAULT 'user',
      ADD COLUMN IF NOT EXISTS admin_userid VARCHAR(120),
      ADD COLUMN IF NOT EXISTS account_status VARCHAR(16) NOT NULL DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ
  `);

  const passwordColumns = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name IN ('userpassword', 'password_hash')
  `);
  const hasLegacyPassword = passwordColumns.rows.some(
    (row) => row.column_name === "userpassword",
  );
  const passwordRows = await client.query(
    hasLegacyPassword
      ? "SELECT userid, userpassword, password_hash FROM users"
      : "SELECT userid, NULL::text AS userpassword, password_hash FROM users",
  );

  for (const row of passwordRows.rows) {
    if (row.password_hash) continue;
    if (!row.userpassword) {
      throw new Error(`Account ${row.userid} has no password to migrate.`);
    }
    const passwordHash = row.userpassword.startsWith("$2")
      ? row.userpassword
      : await bcrypt.hash(row.userpassword, 12);
    await client.query(
      "UPDATE users SET password_hash = $1 WHERE userid = $2",
      [passwordHash, row.userid],
    );
  }

  await client.query("ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL");
  if (hasLegacyPassword) {
    await client.query("ALTER TABLE users DROP COLUMN userpassword");
  }
  await client.query(`
    DO $$ BEGIN
      ALTER TABLE users ADD CONSTRAINT users_role_check
        CHECK (role IN ('admin', 'user'));
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);
  await client.query(`
    DO $$ BEGIN
      ALTER TABLE users ADD CONSTRAINT users_account_status_check
        CHECK (account_status IN ('active', 'disabled'));
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);
  await client.query(`
    DO $$ BEGIN
      ALTER TABLE users ADD CONSTRAINT users_admin_shape_check
        CHECK (role = 'user' OR admin_userid IS NULL);
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);
  await client.query(`
    DO $$ BEGIN
      ALTER TABLE users ADD CONSTRAINT users_admin_userid_fkey
        FOREIGN KEY (admin_userid) REFERENCES users(userid) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `);
  await client.query(`
    CREATE OR REPLACE FUNCTION validate_user_admin_assignment()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.admin_userid IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM users
        WHERE userid = NEW.admin_userid AND role = 'admin'
      ) THEN
        RAISE EXCEPTION 'admin_userid must reference an admin account';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await client.query("DROP TRIGGER IF EXISTS users_validate_admin_assignment ON users");
  await client.query(`
    CREATE TRIGGER users_validate_admin_assignment
    BEFORE INSERT OR UPDATE OF admin_userid, role ON users
    FOR EACH ROW EXECUTE FUNCTION validate_user_admin_assignment()
  `);
  await client.query("CREATE UNIQUE INDEX IF NOT EXISTS users_useremail_lower_idx ON users (LOWER(useremail))");
  await client.query("CREATE INDEX IF NOT EXISTS users_admin_userid_idx ON users(admin_userid)");

  await client.query(`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      token_hash CHAR(64) PRIMARY KEY,
      userid VARCHAR(120) NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    )
  `);
  await client.query("CREATE INDEX IF NOT EXISTS auth_sessions_userid_idx ON auth_sessions(userid)");
  await client.query("CREATE INDEX IF NOT EXISTS auth_sessions_expires_idx ON auth_sessions(expires_at)");

  await client.query(`
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
      completed_at TIMESTAMPTZ
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS user_dashboard_settings (
      userid VARCHAR(120) PRIMARY KEY REFERENCES users(userid) ON DELETE CASCADE,
      table_flower_asset VARCHAR(120),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS user_bugs (
      id TEXT PRIMARY KEY,
      userid VARCHAR(120) NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
      bug_asset VARCHAR(120) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      is_active BOOLEAN NOT NULL DEFAULT FALSE
    )
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS user_snapshots (
      id TEXT PRIMARY KEY,
      userid VARCHAR(120) NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
      image_data TEXT,
      storage_provider VARCHAR(24) NOT NULL DEFAULT 'database',
      storage_key TEXT,
      is_active BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query("ALTER TABLE user_snapshots ADD COLUMN IF NOT EXISTS storage_provider VARCHAR(24) NOT NULL DEFAULT 'database'");
  await client.query("ALTER TABLE user_snapshots ADD COLUMN IF NOT EXISTS storage_key TEXT");
  await client.query(`
    CREATE TABLE IF NOT EXISTS user_fish (
      id TEXT PRIMARY KEY,
      userid VARCHAR(120) NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
      fish_kind VARCHAR(32) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT user_fish_kind_check CHECK (
        fish_kind IN ('goldfish', 'bluefish', 'koi', 'angelfish')
      )
    )
  `);
  await client.query("CREATE INDEX IF NOT EXISTS user_fish_userid_created_idx ON user_fish(userid, created_at ASC)");
  await client.query(`
    CREATE TABLE IF NOT EXISTS user_fruits (
      id TEXT PRIMARY KEY,
      userid VARCHAR(120) NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
      fruit_kind VARCHAR(24) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT user_fruits_kind_check CHECK (
        fruit_kind IN ('apple', 'pear', 'orange', 'plum', 'peach')
      )
    )
  `);
  await client.query("CREATE INDEX IF NOT EXISTS user_fruits_userid_created_idx ON user_fruits(userid, created_at ASC)");

  await client.query(`
    CREATE TABLE IF NOT EXISTS game_sessions (
      id TEXT PRIMARY KEY,
      userid VARCHAR(120) NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
      activity_type VARCHAR(32) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'completed',
      started_at TIMESTAMPTZ NOT NULL,
      completed_at TIMESTAMPTZ NOT NULL,
      duration_seconds INTEGER,
      left_repetitions INTEGER,
      right_repetitions INTEGER,
      successful_actions INTEGER,
      total_attempts INTEGER,
      source_record_id TEXT NOT NULL,
      result_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT game_sessions_activity_check CHECK (
        activity_type IN ('watering', 'collect_bugs', 'snapshot', 'catch_fish')
      ),
      CONSTRAINT game_sessions_status_check CHECK (status IN ('completed', 'failed')),
      CONSTRAINT game_sessions_duration_check CHECK (
        duration_seconds IS NULL OR duration_seconds BETWEEN 1 AND 7200
      ),
      CONSTRAINT game_sessions_counts_check CHECK (
        (left_repetitions IS NULL OR left_repetitions >= 0)
        AND (right_repetitions IS NULL OR right_repetitions >= 0)
        AND (successful_actions IS NULL OR successful_actions >= 0)
        AND (total_attempts IS NULL OR total_attempts >= 0)
      ),
      UNIQUE (activity_type, source_record_id)
    )
  `);
  await client.query("ALTER TABLE game_sessions DROP CONSTRAINT IF EXISTS game_sessions_activity_check");
  await client.query("ALTER TABLE game_sessions ADD CONSTRAINT game_sessions_activity_check CHECK (activity_type IN ('watering', 'collect_bugs', 'snapshot', 'catch_fish', 'pluck_fruit'))");
  await client.query("CREATE INDEX IF NOT EXISTS game_sessions_user_started_idx ON game_sessions(userid, started_at DESC)");
  await client.query("CREATE INDEX IF NOT EXISTS game_sessions_activity_started_idx ON game_sessions(activity_type, started_at DESC)");

  await client.query(`
    INSERT INTO game_sessions (
      id, userid, activity_type, status, started_at, completed_at,
      left_repetitions, right_repetitions, successful_actions,
      source_record_id, result_metadata
    )
    SELECT
      'legacy-watering-' || id, userid, 'watering', 'completed', created_at,
      COALESCE(completed_at, updated_at), left_water_count, right_water_count,
      left_water_count + right_water_count, id,
      jsonb_build_object('plantId', id, 'flowerAsset', flower_asset, 'backfilled', TRUE)
    FROM user_plants
    WHERE status = 'completed'
    ON CONFLICT (activity_type, source_record_id) DO NOTHING
  `);
  await client.query(`
    INSERT INTO game_sessions (
      id, userid, activity_type, status, started_at, completed_at,
      source_record_id, result_metadata
    )
    SELECT
      'legacy-bug-' || id, userid, 'collect_bugs', 'completed', created_at,
      created_at, id,
      jsonb_build_object('bugId', id, 'bugAsset', bug_asset, 'backfilled', TRUE)
    FROM user_bugs
    ON CONFLICT (activity_type, source_record_id) DO NOTHING
  `);
  await client.query(`
    INSERT INTO game_sessions (
      id, userid, activity_type, status, started_at, completed_at,
      source_record_id, result_metadata
    )
    SELECT
      'legacy-snapshot-' || id, userid, 'snapshot', 'completed', created_at,
      created_at, id,
      jsonb_build_object('snapshotId', id, 'backfilled', TRUE)
    FROM user_snapshots
    ON CONFLICT (activity_type, source_record_id) DO NOTHING
  `);

  await client.query("COMMIT");
  console.log(`Database migration complete. Preserved ${passwordRows.rowCount} account(s).`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
