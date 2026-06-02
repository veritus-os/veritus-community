-- VeritusOS — Normalized operational schema
-- Run: psql veritus_os < server/migrations/001_schema.sql

BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ============================================================
-- Staff users & auth
-- ============================================================
CREATE TABLE IF NOT EXISTS staff_users (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'readonly' CHECK (role IN ('admin','secretaria','support','readonly')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Core entities
-- ============================================================
CREATE TABLE IF NOT EXISTS families (
  id SERIAL PRIMARY KEY,
  family_code TEXT UNIQUE,
  family_name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  neighborhood TEXT,
  zip_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  family_id INTEGER REFERENCES families(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  birth_date DATE,
  cpf TEXT,
  phone TEXT,
  sex TEXT,
  segment TEXT CHECK (segment IN ('infantil','fundamental')),
  class_name TEXT,
  shift TEXT,
  modality TEXT CHECK (modality IN ('regular','contraturno','integral')),
  allergies TEXT,
  dietary_restrictions TEXT,
  scholarship_type TEXT,
  scholarship_notes TEXT,
  active BOOLEAN DEFAULT true,
  notes TEXT,
  source_sponte_id INTEGER,
  source_import_batch TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_students_name ON students USING gin (to_tsvector('portuguese', full_name));
CREATE INDEX IF NOT EXISTS idx_students_class ON students (class_name);
CREATE INDEX IF NOT EXISTS idx_students_active ON students (active);
CREATE INDEX IF NOT EXISTS idx_students_cpf ON students (cpf) WHERE cpf IS NOT NULL;

CREATE TABLE IF NOT EXISTS guardians (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  cpf TEXT,
  email TEXT,
  phone TEXT,
  phone_home TEXT,
  notes TEXT,
  source_sponte_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guardians_name ON guardians USING gin (to_tsvector('portuguese', full_name));
CREATE INDEX IF NOT EXISTS idx_guardians_cpf ON guardians (cpf) WHERE cpf IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_guardians_phone ON guardians (phone) WHERE phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS student_guardians (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  guardian_id INTEGER NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  relationship TEXT,
  is_financial BOOLEAN DEFAULT false,
  is_didactic BOOLEAN DEFAULT false,
  can_pickup BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (student_id, guardian_id)
);

-- ============================================================
-- Meal subscriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS meal_subscriptions (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  weekday TEXT NOT NULL CHECK (weekday IN ('segunda','terca','quarta','quinta','sexta')),
  service_type TEXT NOT NULL,
  raw_text TEXT,
  source_file TEXT,
  source_row INTEGER,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_subs_student ON meal_subscriptions (student_id);
CREATE INDEX IF NOT EXISTS idx_meal_subs_weekday ON meal_subscriptions (weekday);

-- ============================================================
-- Audit log
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES staff_users(id),
  user_name TEXT,
  module TEXT,
  entity_type TEXT,
  entity_id INTEGER,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Search history
-- ============================================================
CREATE TABLE IF NOT EXISTS search_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES staff_users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  result_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Convenience: full-text search function
-- ============================================================
CREATE OR REPLACE FUNCTION search_all(query TEXT)
RETURNS TABLE (
  entity_type TEXT,
  entity_id INTEGER,
  display_name TEXT,
  detail TEXT,
  rank REAL
) AS $$
  SELECT 'student'::TEXT, id, full_name, class_name,
         ts_rank(to_tsvector('portuguese', coalesce(full_name,'')), plainto_tsquery('portuguese', query))
  FROM students WHERE active = true
    AND (to_tsvector('portuguese', coalesce(full_name,'')) @@ plainto_tsquery('portuguese', query)
         OR cpf ILIKE '%' || query || '%'
         OR phone ILIKE '%' || query || '%')
  UNION ALL
  SELECT 'guardian'::TEXT, id, full_name, phone,
         ts_rank(to_tsvector('portuguese', coalesce(full_name,'')), plainto_tsquery('portuguese', query))
  FROM guardians
    WHERE to_tsvector('portuguese', coalesce(full_name,'')) @@ plainto_tsquery('portuguese', query)
          OR cpf ILIKE '%' || query || '%'
          OR phone ILIKE '%' || query || '%'
          OR email ILIKE '%' || query || '%'
  ORDER BY 5 DESC
  LIMIT 50;
$$ LANGUAGE sql STABLE;

COMMIT;
