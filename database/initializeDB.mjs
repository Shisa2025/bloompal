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
  `
  CREATE TABLE IF NOT EXISTS users (
    userid VARCHAR(120) PRIMARY KEY,
    useremail VARCHAR(255) NOT NULL UNIQUE,
    userpassword TEXT NOT NULL,
    display_name VARCHAR(120),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS plants (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    userid VARCHAR(120) NOT NULL REFERENCES users(userid) ON DELETE CASCADE,
    nickname VARCHAR(120) NOT NULL,
    species VARCHAR(160),
    watering_interval_days INTEGER NOT NULL DEFAULT 7,
    last_watered_at DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT plants_watering_interval_positive CHECK (watering_interval_days > 0)
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS care_tasks (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    plant_id BIGINT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
    task_type VARCHAR(80) NOT NULL,
    due_at DATE NOT NULL,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
  `,
  "CREATE INDEX IF NOT EXISTS users_useremail_idx ON users(useremail)",
  "CREATE INDEX IF NOT EXISTS plants_userid_idx ON plants(userid)",
  "CREATE INDEX IF NOT EXISTS care_tasks_plant_id_idx ON care_tasks(plant_id)",
  "CREATE INDEX IF NOT EXISTS care_tasks_due_at_idx ON care_tasks(due_at)",
  `
  INSERT INTO users (userid, useremail, userpassword, display_name)
  VALUES
    ('shisa', 'shisa@a.com', '123456', 'Shisa')
  ON CONFLICT (userid) DO UPDATE
  SET
    useremail = EXCLUDED.useremail,
    userpassword = EXCLUDED.userpassword,
    display_name = EXCLUDED.display_name,
    updated_at = NOW()
  `,
  `
  INSERT INTO plants (
    userid,
    nickname,
    species,
    watering_interval_days,
    last_watered_at
  )
  SELECT
    users.userid,
    seed.nickname,
    seed.species,
    seed.watering_interval_days,
    seed.last_watered_at
  FROM users
  CROSS JOIN (
    VALUES
      ('Sunny', 'Monstera deliciosa', 7, CURRENT_DATE - INTERVAL '2 days'),
      ('Mochi', 'Pilea peperomioides', 5, CURRENT_DATE - INTERVAL '1 day'),
      ('Fernie', 'Boston fern', 3, CURRENT_DATE - INTERVAL '3 days')
  ) AS seed(nickname, species, watering_interval_days, last_watered_at)
  WHERE users.userid = 'shisa'
    AND NOT EXISTS (
      SELECT 1
      FROM plants
      WHERE plants.userid = users.userid
        AND plants.nickname = seed.nickname
    )
  `,
  `
  INSERT INTO care_tasks (plant_id, task_type, due_at, notes)
  SELECT
    plants.id,
    'water',
    CURRENT_DATE + plants.watering_interval_days,
    'Generated from seed watering interval.'
  FROM plants
  JOIN users ON users.userid = plants.userid
  WHERE users.userid = 'shisa'
    AND NOT EXISTS (
      SELECT 1
      FROM care_tasks
      WHERE care_tasks.plant_id = plants.id
        AND care_tasks.task_type = 'water'
        AND care_tasks.completed_at IS NULL
    )
  `,
];

for (const statement of statements) {
  await sql.query(statement);
}

console.log("Database initialized.");
