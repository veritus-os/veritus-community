# New Supabase Project — Bootstrap Guide

## Overview

This guide covers setting up a fresh Supabase project for Veritus OS Student Checkout.
It assumes the previous project (`bnggrjkllpgisdgmnjvm`) is decommissioned or over quota.

---

## 1. Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Create new project:
   - **Name:** `veritus-os` (or `veritus-prod`)
   - **Region:** South America (Sao Paulo) — `sa-east-1`
   - **Database password:** Generate strong, save in `~/workspace/veritus-os/backups/credentials/`
   - **Plan:** Free (500 MB DB, 5 GB bandwidth, 50 MB storage)
3. Note down:
   - Project URL: `https://<ref>.supabase.co`
   - Anon key: from Settings > API
   - Service role key: save securely, never in frontend code

---

## 2. Run Migrations

From the repo root:

```bash
supabase link --project-ref <new-ref>
supabase db push
```

This applies all 16 migrations in order:

| # | Migration | Purpose |
|---|-----------|---------|
| 01 | `01_initial_schema.sql` | families, students, guardians, financial_summary |
| 02 | `02_assets_inventory.sql` | assets tables (empty, kept for schema) |
| 03 | `03_family_dashboard_view.sql` | family view + proof_of_residency column |
| 04 | `04_mvp_read_policies.sql` | Initial RLS policies |
| 05 | `20260413_teacher_services_v2.sql` | teachers, attendance, extra_services |
| 06 | `20260414_realtime_pickup_roles_and_finance.sql` | profiles, pickup, invoices, meals |
| 07 | `20260511_admin_platform.sql` | schools, feature_flags, bug_reports |
| 08 | `20260518_student_checkout_monitor.sql` | checkout_daily, checkout_logs, activity_tags |
| 09 | `20260519_student_checkout_pilot_hardening.sql` | RLS hardening, is_school_staff(), realtime |
| 10 | `2026052001_sponte_import_tracking.sql` | import_batches, import_errors |
| 11 | `2026052002_sponte_raw_staging.sql` | 17 sponte_raw_* staging tables |
| 12 | `2026052003_normalized_checkout_mvp.sql` | campuses, classes, class_memberships, student_guardians |
| 13 | `2026052004_checkout_operational_read_model.sql` | checkout views + snapshot functions |
| 14 | `2026052005_checkout_operational_state.sql` | Additional checkout columns |
| 15 | `2026052006_checkout_pilot_roles.sql` | Extended role support |
| 16 | `2026052007_checkout_active_students_name_fix.sql` | Student name fallback |

**Important:** If you want to skip the cleanup tables (finance staging dropped in previous project), they will be created by the migrations but remain empty. This is fine — empty tables use minimal space.

---

## 3. Import Operational Data

The checkout system reads from Sponte raw tables via database views. You must import the Sponte data needed for checkout.

### Required data (checkout-critical)

| Table | Source | Rows | Purpose |
|-------|--------|------|---------|
| `sponte_raw_alunos` | escola.rar export | ~760 | Student names |
| `sponte_raw_alunos_empresas` | escola.rar export | ~760 | Active student filter |
| `sponte_raw_responsaveis` | escola.rar export | ~915 | Guardian data |
| `sponte_raw_alunos_responsaveis` | escola.rar export | ~1264 | Student-guardian links |
| `sponte_raw_turmas` | escola.rar export | ~128 | Classes |
| `sponte_raw_turma_alunos` | escola.rar export | ~1400 | Class memberships |
| `sponte_raw_cursos` | escola.rar export | ~28 | Course names |
| `sponte_raw_turnos` | escola.rar export | ~4 | Shift names |
| `sponte_raw_salas` | escola.rar export | ~28 | Room names |
| `import_batches` | Manual insert | 1 | FK target |
| `campuses` | Seed (in migration 2026052003) | 2 | Sede Infantil + Fundamental |

### Import process

```bash
# 1. Create an import batch record
supabase db query --linked "
  INSERT INTO import_batches (source_system, source_path, status)
  VALUES ('sponte', 'escola.rar', 'completed')
  RETURNING id;
"

# 2. Run the Sponte importer
node scripts/importers/sponte/import-raw.js
```

### Not required for checkout (skip these)

- `sponte_raw_contratos` — finance only
- `sponte_raw_contratos_turmas` — finance only
- `sponte_raw_contas_receber` — finance only
- `sponte_raw_contas_receber_parcelas` — finance only
- `sponte_raw_rps` — finance only
- `sponte_raw_rps_parcelas` — finance only
- `sponte_raw_multi_empresa` — company data
- `sponte_raw_series` — reference only

---

## 4. Create Campus Assignments

After importing class data, assign classes to campuses:

```sql
-- Map each class to a campus (Infantil or Fundamental)
-- This populates checkout_class_campus_assignments
INSERT INTO checkout_class_campus_assignments (source_class_id, campus_id, needs_review)
SELECT t.turma_id, c.id, false
FROM sponte_raw_turmas t
CROSS JOIN campuses c
WHERE c.code = CASE
  WHEN (t.raw_payload->>'turma_nome') ILIKE '%infantil%' THEN 'INF'
  ELSE 'FUN'
END
ON CONFLICT (source_class_id) DO NOTHING;
```

---

## 5. Create Auth Users

In Supabase Dashboard > Authentication > Add User:

| Email | Password | user_metadata |
|-------|----------|--------------|
| `recepcao@cav.com` | strong | `{"full_name":"Recepção","access_type":"reception"}` |
| `infantil@cav.com` | strong | `{"full_name":"Coordenação Infantil","access_type":"infantil_coordination"}` |
| `fundamental@cav.com` | strong | `{"full_name":"Coordenação Fundamental","access_type":"fundamental_coordination"}` |
| `suporte@cav.com` | strong | `{"full_name":"Suporte","access_type":"support"}` |

Enable "Auto Confirm" for each user.

---

## 6. Configure Frontend

Update `.env.local`:

```env
VITE_SUPABASE_URL=https://<new-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<new-anon-key>
VITE_CHECKOUT_SUPABASE_LOW_EGRESS=true
```

---

## 7. Verify

```bash
supabase db query --linked --output csv "
SELECT 'students' AS check, count(*) AS n FROM checkout_active_students_view
UNION ALL SELECT 'classes', count(*) FROM checkout_active_classes_view
UNION ALL SELECT 'guardians', count(*) FROM checkout_active_guardians_view;
"
```

Expected: ~385 students, ~37 classes, ~785 guardians.

Then run `npm run dev -- --host` and test login.

---

## 8. Estimated New Project Size

| Data | Size |
|------|------|
| Schema (empty) | ~5 MB |
| Checkout-required Sponte data | ~9 MB |
| Auth users | <1 MB |
| Extensions (PostGIS, pgcrypto) | ~8 MB |
| **Total** | **~22 MB** (4% of 500 MB free tier) |
