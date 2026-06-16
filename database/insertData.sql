-- PostgreSQL
-- Seed data for local development. Run this after initializeDB.sql.

INSERT INTO users (email, password_hash, display_name)
VALUES
  ('demo@bloompal.local', 'replace-with-a-real-password-hash', 'Demo User')
ON CONFLICT (email) DO NOTHING;

INSERT INTO plants (
  user_id,
  nickname,
  species,
  watering_interval_days,
  last_watered_at
)
SELECT
  users.id,
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
WHERE users.email = 'demo@bloompal.local'
  AND NOT EXISTS (
    SELECT 1
    FROM plants
    WHERE plants.user_id = users.id
      AND plants.nickname = seed.nickname
  );

INSERT INTO care_tasks (plant_id, task_type, due_at, notes)
SELECT
  plants.id,
  'water',
  CURRENT_DATE + plants.watering_interval_days,
  'Generated from seed watering interval.'
FROM plants
JOIN users ON users.id = plants.user_id
WHERE users.email = 'demo@bloompal.local'
  AND NOT EXISTS (
    SELECT 1
    FROM care_tasks
    WHERE care_tasks.plant_id = plants.id
      AND care_tasks.task_type = 'water'
      AND care_tasks.completed_at IS NULL
  );
