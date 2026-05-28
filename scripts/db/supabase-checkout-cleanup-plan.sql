-- =============================================================================
-- SUPABASE CHECKOUT CLEANUP PLAN
-- =============================================================================
-- Purpose: Remove all tables/views not required for the Student Checkout pilot.
-- Context: Supabase free tier storage exceeded due to Sponte backup import.
-- Date:    2026-05-28
--
-- INSTRUCTIONS:
--   1. Run SECTION 0 first to audit current sizes
--   2. Run SECTION 1 to export/backup data before deletion
--   3. Run SECTION 2 to drop views that depend on tables being removed
--   4. Run SECTION 3 to drop tables (finance staging, modules, admin)
--   5. Run SECTION 4 to truncate error log tables (keep structure)
--   6. Run SECTION 5 to drop unused functions/triggers/enums
--   7. Run SECTION 6 to verify checkout still works
--
-- WARNING: DO NOT RUN THIS SCRIPT BLINDLY.
--          Execute section by section, verify each step.
-- =============================================================================


-- =============================================================================
-- SECTION 0: PRE-CLEANUP AUDIT (run this first, share results)
-- =============================================================================

-- 0a. Table sizes and row counts
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size,
  pg_total_relation_size(schemaname || '.' || tablename) AS total_bytes,
  (SELECT reltuples::bigint FROM pg_class WHERE oid = (schemaname || '.' || tablename)::regclass) AS estimated_rows
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;

-- 0b. Total database size
SELECT pg_size_pretty(pg_database_size(current_database())) AS total_db_size;

-- 0c. Size of tables marked for removal (estimated savings)
SELECT
  'TOTAL TO REMOVE' AS label,
  pg_size_pretty(SUM(pg_total_relation_size(schemaname || '.' || tablename))) AS total_savings
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    -- Finance staging (Sponte raw)
    'sponte_raw_contratos',
    'sponte_raw_contratos_turmas',
    'sponte_raw_contas_receber',
    'sponte_raw_contas_receber_parcelas',
    'sponte_raw_rps',
    'sponte_raw_rps_parcelas',
    -- Other staging
    'sponte_raw_multi_empresa',
    'sponte_raw_series',
    -- Finance module
    'financial_summary',
    'invoices',
    -- Teacher module
    'teachers',
    'teacher_contents',
    -- Other modules
    'attendance',
    'extra_services',
    'meal_contracts',
    'pickup_requests',
    -- Admin platform
    'schools',
    'feature_flags',
    'bug_reports',
    -- Assets
    'assets',
    'assets_inventory',
    -- Error logs (truncate only)
    'import_errors',
    'normalization_errors'
  );

-- 0d. Size of tables we are KEEPING
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size('public.' || tablename)) AS total_size,
  (SELECT reltuples::bigint FROM pg_class WHERE oid = ('public.' || tablename)::regclass) AS estimated_rows
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'students', 'guardians', 'families', 'profiles',
    'student_checkout_daily', 'student_checkout_logs',
    'activity_tags', 'student_activity_tags',
    'campuses', 'checkout_class_campus_assignments',
    'classes', 'class_memberships', 'student_guardians',
    'import_batches', 'import_normalization_batches',
    'sponte_raw_turmas', 'sponte_raw_turma_alunos',
    'sponte_raw_alunos_empresas', 'sponte_raw_alunos',
    'sponte_raw_responsaveis', 'sponte_raw_alunos_responsaveis',
    'sponte_raw_cursos', 'sponte_raw_turnos', 'sponte_raw_salas'
  )
ORDER BY pg_total_relation_size('public.' || tablename) DESC;


-- =============================================================================
-- SECTION 1: BACKUP / EXPORT BEFORE DELETION
-- =============================================================================
-- Run these COPY commands from psql or use Supabase SQL Editor to CSV export.
-- Alternatively, use pg_dump --table for each table.
--
-- If using Supabase Dashboard: Table Editor > Export to CSV for each table.
-- If using psql:
--   \copy sponte_raw_contratos TO '/tmp/backup_sponte_raw_contratos.csv' CSV HEADER;
--   \copy sponte_raw_contratos_turmas TO '/tmp/backup_sponte_raw_contratos_turmas.csv' CSV HEADER;
--   \copy sponte_raw_contas_receber TO '/tmp/backup_sponte_raw_contas_receber.csv' CSV HEADER;
--   \copy sponte_raw_contas_receber_parcelas TO '/tmp/backup_sponte_raw_contas_receber_parcelas.csv' CSV HEADER;
--   \copy sponte_raw_rps TO '/tmp/backup_sponte_raw_rps.csv' CSV HEADER;
--   \copy sponte_raw_rps_parcelas TO '/tmp/backup_sponte_raw_rps_parcelas.csv' CSV HEADER;
--   \copy sponte_raw_multi_empresa TO '/tmp/backup_sponte_raw_multi_empresa.csv' CSV HEADER;
--   \copy sponte_raw_series TO '/tmp/backup_sponte_raw_series.csv' CSV HEADER;
--   \copy financial_summary TO '/tmp/backup_financial_summary.csv' CSV HEADER;
--   \copy invoices TO '/tmp/backup_invoices.csv' CSV HEADER;
--   \copy teachers TO '/tmp/backup_teachers.csv' CSV HEADER;
--   \copy teacher_contents TO '/tmp/backup_teacher_contents.csv' CSV HEADER;
--   \copy attendance TO '/tmp/backup_attendance.csv' CSV HEADER;
--   \copy extra_services TO '/tmp/backup_extra_services.csv' CSV HEADER;
--   \copy meal_contracts TO '/tmp/backup_meal_contracts.csv' CSV HEADER;
--   \copy pickup_requests TO '/tmp/backup_pickup_requests.csv' CSV HEADER;
--   \copy schools TO '/tmp/backup_schools.csv' CSV HEADER;
--   \copy feature_flags TO '/tmp/backup_feature_flags.csv' CSV HEADER;
--   \copy bug_reports TO '/tmp/backup_bug_reports.csv' CSV HEADER;
--   \copy assets TO '/tmp/backup_assets.csv' CSV HEADER;
--   \copy assets_inventory TO '/tmp/backup_assets_inventory.csv' CSV HEADER;
--   \copy import_errors TO '/tmp/backup_import_errors.csv' CSV HEADER;
--   \copy normalization_errors TO '/tmp/backup_normalization_errors.csv' CSV HEADER;


-- =============================================================================
-- SECTION 2: DROP VIEWS THAT DEPEND ON TABLES BEING REMOVED
-- =============================================================================
-- These views reference tables we are about to drop.
-- They must be dropped first to avoid dependency errors.

DROP VIEW IF EXISTS public.family_centric_dashboard CASCADE;
DROP VIEW IF EXISTS public.family_debt_dashboard CASCADE;
DROP VIEW IF EXISTS public.view_daily_kitchen_report CASCADE;
DROP VIEW IF EXISTS public.portaria_live_eta CASCADE;
DROP VIEW IF EXISTS public.inadimplencia_dashboard CASCADE;


-- =============================================================================
-- SECTION 3: DROP TABLES - SAFE TO REMOVE
-- =============================================================================
-- These tables are NOT used by the checkout system at runtime.
-- Migration files are preserved in Git for future re-creation.

-- 3a. Sponte raw FINANCE staging tables (biggest storage consumers)
--     Not referenced by any checkout view or function.
DROP TABLE IF EXISTS public.sponte_raw_rps_parcelas CASCADE;
DROP TABLE IF EXISTS public.sponte_raw_rps CASCADE;
DROP TABLE IF EXISTS public.sponte_raw_contas_receber_parcelas CASCADE;
DROP TABLE IF EXISTS public.sponte_raw_contas_receber CASCADE;
DROP TABLE IF EXISTS public.sponte_raw_contratos_turmas CASCADE;
DROP TABLE IF EXISTS public.sponte_raw_contratos CASCADE;

-- 3b. Other Sponte raw staging (not used by checkout views)
DROP TABLE IF EXISTS public.sponte_raw_multi_empresa CASCADE;
DROP TABLE IF EXISTS public.sponte_raw_series CASCADE;

-- 3c. Finance module tables
DROP TABLE IF EXISTS public.financial_summary CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;

-- 3d. Teacher module tables
DROP TABLE IF EXISTS public.teacher_contents CASCADE;
DROP TABLE IF EXISTS public.teachers CASCADE;

-- 3e. Other module tables not used by checkout
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.extra_services CASCADE;
DROP TABLE IF EXISTS public.meal_contracts CASCADE;
DROP TABLE IF EXISTS public.pickup_requests CASCADE;

-- 3f. Admin platform tables (not wired to checkout)
DROP TABLE IF EXISTS public.feature_flags CASCADE;
DROP TABLE IF EXISTS public.bug_reports CASCADE;
DROP TABLE IF EXISTS public.schools CASCADE;

-- 3g. Asset tracking tables
DROP TABLE IF EXISTS public.assets CASCADE;
DROP TABLE IF EXISTS public.assets_inventory CASCADE;


-- =============================================================================
-- SECTION 4: TRUNCATE ERROR LOG TABLES (keep structure, free space)
-- =============================================================================
-- These tables log import errors. Data is no longer needed post-import,
-- but we keep the table structure for future imports.

TRUNCATE TABLE public.normalization_errors CASCADE;
TRUNCATE TABLE public.import_errors CASCADE;


-- =============================================================================
-- SECTION 5: DROP UNUSED FUNCTIONS, TRIGGERS, AND ENUMS
-- =============================================================================

-- 5a. Functions tied to removed tables
DROP FUNCTION IF EXISTS public.update_parent_location(bigint, double precision, double precision, integer) CASCADE;
DROP FUNCTION IF EXISTS public.set_financial_net_value() CASCADE;

-- 5b. Enums tied only to removed tables
--     Only drop if no remaining table uses them.
--     attendance_status_enum -> used by attendance (dropped)
--     teacher_content_status_enum -> used by teacher_contents (dropped)
--     extra_service_type_enum -> used by extra_services (dropped)
--     extra_service_frequency_enum -> used by extra_services (dropped)
--     pickup_status_enum -> used by pickup_requests (dropped)
--     meal_contract_type_enum -> used by meal_contracts (dropped)
--     meal_contract_plan_enum -> used by meal_contracts (dropped)
--     invoice_payment_method_enum -> used by invoices (dropped)
--     invoice_status_enum -> used by invoices (dropped)
--     bug_report_status_enum -> used by bug_reports (dropped)
--     bug_report_priority_enum -> used by bug_reports (dropped)

DROP TYPE IF EXISTS public.attendance_status_enum CASCADE;
DROP TYPE IF EXISTS public.teacher_content_status_enum CASCADE;
DROP TYPE IF EXISTS public.extra_service_type_enum CASCADE;
DROP TYPE IF EXISTS public.extra_service_frequency_enum CASCADE;
DROP TYPE IF EXISTS public.pickup_status_enum CASCADE;
DROP TYPE IF EXISTS public.meal_contract_type_enum CASCADE;
DROP TYPE IF EXISTS public.meal_contract_plan_enum CASCADE;
DROP TYPE IF EXISTS public.invoice_payment_method_enum CASCADE;
DROP TYPE IF EXISTS public.invoice_status_enum CASCADE;
DROP TYPE IF EXISTS public.bug_report_status_enum CASCADE;
DROP TYPE IF EXISTS public.bug_report_priority_enum CASCADE;

-- 5c. Remove realtime publication for dropped tables
ALTER PUBLICATION supabase_realtime DROP TABLE IF EXISTS public.attendance;


-- =============================================================================
-- SECTION 6: POST-CLEANUP VERIFICATION
-- =============================================================================

-- 6a. Verify checkout_active_students_view still works (~385 expected)
SELECT count(*) AS active_students FROM checkout_active_students_view;

-- 6b. Verify checkout_active_classes_view still works (~37 expected)
SELECT count(*) AS active_classes FROM checkout_active_classes_view;

-- 6c. Verify checkout_active_guardians_view still works
SELECT count(*) AS active_guardians FROM checkout_active_guardians_view;

-- 6d. Verify student_checkout_daily is operational
SELECT count(*) AS checkout_records_today
FROM student_checkout_daily
WHERE checkout_date = current_date;

-- 6e. Verify student_checkout_logs is accessible
SELECT count(*) AS recent_logs
FROM student_checkout_logs
WHERE created_at >= now() - interval '7 days';

-- 6f. Verify realtime subscriptions still configured
SELECT * FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';

-- 6g. Verify remaining table count and total size
SELECT count(*) AS remaining_tables
FROM pg_tables WHERE schemaname = 'public';

SELECT pg_size_pretty(pg_database_size(current_database())) AS total_db_size_after;

-- 6h. Verify all kept tables exist
SELECT tablename, 'EXISTS' AS status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'students', 'guardians', 'families', 'profiles',
    'student_checkout_daily', 'student_checkout_logs',
    'activity_tags', 'student_activity_tags',
    'campuses', 'checkout_class_campus_assignments',
    'classes', 'class_memberships', 'student_guardians',
    'import_batches', 'import_normalization_batches',
    'import_errors', 'normalization_errors',
    'sponte_raw_turmas', 'sponte_raw_turma_alunos',
    'sponte_raw_alunos_empresas', 'sponte_raw_alunos',
    'sponte_raw_responsaveis', 'sponte_raw_alunos_responsaveis',
    'sponte_raw_cursos', 'sponte_raw_turnos', 'sponte_raw_salas'
  )
ORDER BY tablename;

-- 6i. Verify no dropped table still exists
SELECT tablename, 'SHOULD NOT EXIST' AS status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'sponte_raw_contratos', 'sponte_raw_contratos_turmas',
    'sponte_raw_contas_receber', 'sponte_raw_contas_receber_parcelas',
    'sponte_raw_rps', 'sponte_raw_rps_parcelas',
    'sponte_raw_multi_empresa', 'sponte_raw_series',
    'financial_summary', 'invoices',
    'teachers', 'teacher_contents',
    'attendance', 'extra_services', 'meal_contracts',
    'pickup_requests', 'schools', 'feature_flags',
    'bug_reports', 'assets', 'assets_inventory'
  );

-- 6j. Verify checkout views still exist
SELECT viewname, 'EXISTS' AS status
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN (
    'checkout_active_students_view',
    'checkout_active_classes_view',
    'checkout_active_guardians_view'
  );

-- 6k. Verify checkout functions still exist
SELECT routine_name, 'EXISTS' AS status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'checkout_active_students_snapshot',
    'checkout_active_classes_snapshot',
    'checkout_active_guardians_snapshot',
    'is_school_staff',
    'can_operate_student_checkout',
    'can_manage_sponte_staging',
    'current_app_access_type'
  );
