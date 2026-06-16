-- PostgreSQL
-- Run this after connecting to the bloompal database.

CREATE TABLE IF NOT EXISTS users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plants (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname VARCHAR(120) NOT NULL,
  species VARCHAR(160),
  watering_interval_days INTEGER NOT NULL DEFAULT 7,
  last_watered_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT plants_watering_interval_positive CHECK (watering_interval_days > 0)
);

CREATE TABLE IF NOT EXISTS care_tasks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  plant_id BIGINT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  task_type VARCHAR(80) NOT NULL,
  due_at DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS plants_user_id_idx ON plants(user_id);
CREATE INDEX IF NOT EXISTS care_tasks_plant_id_idx ON care_tasks(plant_id);
CREATE INDEX IF NOT EXISTS care_tasks_due_at_idx ON care_tasks(due_at);
