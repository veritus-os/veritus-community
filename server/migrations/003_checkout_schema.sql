-- VeritusOS — Checkout module schema (unified local server)
-- Run: psql veritus_os < server/migrations/003_checkout_schema.sql
--
-- Design: ONE database (veritus_os). Search/Secretaria owns the shared core
-- tables (students, guardians, student_guardians, families) in `public`.
-- Checkout READS those and owns only its daily operational state + audit logs,
-- isolated in a dedicated `checkout` schema. No student/guardian data is
-- duplicated. Auth is shared via public.staff_users (extended below).

BEGIN;

CREATE SCHEMA IF NOT EXISTS checkout;

-- ============================================================
-- Shared auth: extend staff_users for checkout roles + per-module access
-- (backward compatible: existing search users keep role + get modules='{search}')
-- ============================================================
ALTER TABLE public.staff_users DROP CONSTRAINT IF EXISTS staff_users_role_check;
ALTER TABLE public.staff_users ADD CONSTRAINT staff_users_role_check
  CHECK (role IN (
    'super_admin','admin','secretaria','support','readonly',       -- search/secretaria
    'reception','infantil_coordination','fundamental_coordination','professor' -- checkout
  ));

ALTER TABLE public.staff_users
  ADD COLUMN IF NOT EXISTS modules TEXT[] NOT NULL DEFAULT '{search}';

-- existing rows predate checkout → they are search users
UPDATE public.staff_users SET modules = '{search}' WHERE modules IS NULL OR modules = '{}';

-- ============================================================
-- Daily checkout state — one row per (student, day). Reset = new day / explicit.
-- ============================================================
CREATE TABLE IF NOT EXISTS checkout.checkout_daily (
  id                          BIGSERIAL PRIMARY KEY,
  student_id                  INTEGER NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  checkout_date               DATE NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  status                      TEXT NOT NULL DEFAULT 'at_school'
                                CHECK (status IN ('at_school','absent','guardian_arrived','preparing_release',
                                                  'ready_for_pickup','released_from_classroom','left_school','needs_verification')),
  campus_name                 TEXT,
  class_name_snapshot         TEXT,
  pickup_guardian_id          INTEGER REFERENCES public.guardians(id) ON DELETE SET NULL,
  pickup_guardian_name        TEXT,
  pickup_person_name          TEXT,
  note                        TEXT,
  verification_note           TEXT,
  guardian_arrived_at         TIMESTAMPTZ,
  guardian_arrived_by_name    TEXT,
  ready_for_pickup_at         TIMESTAMPTZ,
  ready_for_pickup_by_name    TEXT,
  released_from_classroom_at  TIMESTAMPTZ,
  released_from_classroom_by_name TEXT,
  left_school_at              TIMESTAMPTZ,
  left_school_by_name         TEXT,
  device_label                TEXT,
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by_name             TEXT,
  UNIQUE (student_id, checkout_date)
);
CREATE INDEX IF NOT EXISTS idx_checkout_daily_date ON checkout.checkout_daily (checkout_date);
CREATE INDEX IF NOT EXISTS idx_checkout_daily_status ON checkout.checkout_daily (checkout_date, status);

-- ============================================================
-- Immutable audit log — every transition, preserved across daily resets.
-- ============================================================
CREATE TABLE IF NOT EXISTS checkout.checkout_logs (
  id                BIGSERIAL PRIMARY KEY,
  student_id        INTEGER NOT NULL,
  student_name      TEXT NOT NULL,
  checkout_date     DATE NOT NULL,
  previous_status   TEXT,
  new_status        TEXT NOT NULL,
  changed_by_name   TEXT,
  changed_by_user_id TEXT,
  campus_name       TEXT,
  class_name        TEXT,
  device_label      TEXT,
  note              TEXT,
  pickup_guardian_id   INTEGER,
  pickup_guardian_name TEXT,
  pickup_person_name   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_checkout_logs_date ON checkout.checkout_logs (checkout_date);
CREATE INDEX IF NOT EXISTS idx_checkout_logs_student ON checkout.checkout_logs (student_id, created_at DESC);

-- ============================================================
-- Board view — assembles the live monitor from SHARED data + today's state.
-- Campus derives from segment; authorized guardians come from student_guardians
-- where can_pickup. This is the single source the /api/checkout/board reads.
-- ============================================================
CREATE OR REPLACE VIEW checkout.v_board AS
SELECT
  s.id                                              AS student_id,
  s.family_id,
  s.full_name,
  s.full_name                                       AS student_name,
  s.full_name                                       AS display_name,
  COALESCE(initcap(s.shift), '')                    AS shift_name,
  COALESCE(s.class_name, 'Sem turma')               AS class_name,
  s.segment,
  CASE s.segment WHEN 'infantil' THEN 'Sede Infantil'
                 WHEN 'fundamental' THEN 'Sede Fundamental'
                 ELSE 'Sede' END                    AS campus,
  COALESCE(f.family_name, 'Família')                AS family_name,
  CASE WHEN cd.status = 'absent' THEN 'absent' ELSE 'present' END AS attendance_status,
  COALESCE(cd.status, 'at_school')                  AS status,
  COALESCE((
    SELECT json_agg(json_build_object(
      'id', g.id,
      'full_name', g.full_name,
      'authorized_to_pickup', true,
      'phone', COALESCE(g.phone, g.phone_home, ''),
      'email', COALESCE(g.email, ''),
      'relationship_type_label', COALESCE(sg.relationship, ''),
      'is_financial_responsible', COALESCE(sg.is_financial, false),
      'is_primary_contact', COALESCE(sg.is_primary, false)
    ) ORDER BY sg.is_primary DESC, g.full_name)
    FROM public.student_guardians sg
    JOIN public.guardians g ON g.id = sg.guardian_id
    WHERE sg.student_id = s.id AND COALESCE(sg.can_pickup, true)
  ), '[]'::json)                                    AS authorized_guardians,
  cd.pickup_person_name, cd.pickup_guardian_id, cd.pickup_guardian_name,
  cd.note, cd.verification_note,
  cd.guardian_arrived_at, cd.guardian_arrived_by_name,
  cd.ready_for_pickup_at, cd.ready_for_pickup_by_name,
  cd.released_from_classroom_at, cd.released_from_classroom_by_name,
  cd.left_school_at, cd.left_school_by_name,
  cd.updated_at, cd.updated_by_name
FROM public.students s
LEFT JOIN public.families f ON f.id = s.family_id
LEFT JOIN checkout.checkout_daily cd
       ON cd.student_id = s.id
      AND cd.checkout_date = (now() AT TIME ZONE 'America/Sao_Paulo')::date
WHERE s.active;

COMMIT;
