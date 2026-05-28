# Supabase Checkout Cleanup - Audit Report

**Date:** 2026-05-28
**Database:** veritus-os (bnggrjkllpgisdgmnjvm)
**Region:** South America (Sao Paulo)
**Total DB Size:** 129 MB
**Supabase Free Tier Limit:** 500 MB database + 1 GB storage

---

## 1. Database Size by Schema

| Schema | Size | Bytes |
|--------|------|-------|
| public | 132 MB | 138,428,416 |
| extensions | 7,352 kB | 7,528,448 |
| auth | 2,224 kB | 2,277,376 |
| realtime | 376 kB | 385,024 |
| storage | 368 kB | 376,832 |
| supabase_migrations | 144 kB | 147,456 |
| vault | 40 kB | 40,960 |

> **Public schema is 88% of total database storage.**

---

## 2. Top 10 Largest Tables (All in public schema)

| # | Table | Size | Rows | Classification |
|---|-------|------|------|---------------|
| 1 | sponte_raw_contas_receber_parcelas | **56 MB** | 33,369 | REMOVE |
| 2 | sponte_raw_rps | **19 MB** | 15,341 | REMOVE |
| 3 | sponte_raw_contas_receber | **11 MB** | 6,373 | REMOVE |
| 4 | sponte_raw_rps_parcelas | **8,688 kB** | 15,341 | REMOVE |
| 5 | sponte_raw_contratos | **2,016 kB** | 1,397 | REMOVE |
| 6 | sponte_raw_alunos | **1,856 kB** | 760 | KEEP (checkout view) |
| 7 | sponte_raw_responsaveis | **1,840 kB** | 915 | KEEP (checkout view) |
| 8 | sponte_raw_alunos_empresas | **1,600 kB** | 760 | KEEP (checkout view) |
| 9 | sponte_raw_contratos_turmas | **1,464 kB** | 1,399 | REMOVE |
| 10 | sponte_raw_turma_alunos | **1,360 kB** | 1,400 | KEEP (checkout view) |

> **Top 5 removable tables account for ~93 MB** (72% of total DB).

---

## 3. Complete Table Inventory

### KEEP - Required for Checkout (24 tables, ~9.2 MB)

| Table | Size | Rows | Why Keep |
|-------|------|------|----------|
| sponte_raw_alunos | 1,856 kB | 760 | checkout_active_students_snapshot() name fallback |
| sponte_raw_responsaveis | 1,840 kB | 915 | checkout_active_guardians_snapshot() |
| sponte_raw_alunos_empresas | 1,600 kB | 760 | checkout_active_students_snapshot() active filter |
| sponte_raw_turma_alunos | 1,360 kB | 1,400 | checkout_active_classes_snapshot() |
| sponte_raw_alunos_responsaveis | 1,088 kB | 1,264 | checkout_active_guardians_snapshot() |
| sponte_raw_turmas | 312 kB | 128 | checkout_active_classes_snapshot() |
| sponte_raw_cursos | 184 kB | 28 | checkout_active_classes_snapshot() join |
| sponte_raw_salas | 128 kB | 28 | checkout_active_classes_snapshot() join |
| campuses | 112 kB | 2 | Campus reference data |
| sponte_raw_turnos | 96 kB | 4 | checkout_active_classes_snapshot() join |
| import_batches | 80 kB | 1 | FK target for source_import_batch_id |
| student_guardians | 80 kB | 0 | Normalized student-guardian links |
| class_memberships | 72 kB | 0 | Student-class enrollment |
| activity_tags | 64 kB | 6 | Activity reference catalog |
| student_checkout_daily | 56 kB | 0 | Core checkout state |
| student_checkout_logs | 56 kB | 0 | Checkout audit trail |
| classes | 56 kB | 0 | Normalized class data |
| import_normalization_batches | 32 kB | 0 | FK target for normalization tracking |
| students | 32 kB | 0 | FK target for checkout |
| student_activity_tags | 24 kB | 0 | Student-activity links |
| checkout_class_campus_assignments | 24 kB | 0 | Campus-class mapping |
| guardians | 24 kB | 0 | FK target for checkout |
| families | 24 kB | 0 | FK target for students/guardians |
| profiles | 16 kB | 0 | FK target for audit trail |

### REMOVE - Safe to Drop (21 tables, ~99 MB)

| Table | Size | Rows | Category |
|-------|------|------|----------|
| sponte_raw_contas_receber_parcelas | 56 MB | 33,369 | Finance staging |
| sponte_raw_rps | 19 MB | 15,341 | Finance staging |
| sponte_raw_contas_receber | 11 MB | 6,373 | Finance staging |
| sponte_raw_rps_parcelas | 8,688 kB | 15,341 | Finance staging |
| sponte_raw_contratos | 2,016 kB | 1,397 | Finance staging |
| sponte_raw_contratos_turmas | 1,464 kB | 1,399 | Finance staging |
| sponte_raw_multi_empresa | 96 kB | 1 | Company staging |
| sponte_raw_series | 96 kB | 19 | Reference staging |
| schools | 40 kB | 0 | Admin platform |
| import_errors | 40 kB | 0 | Import error logs |
| normalization_errors | 48 kB | 0 | Normalization error logs |
| feature_flags | 32 kB | 0 | Admin platform |
| invoices | 32 kB | 0 | Finance module |
| assets | 32 kB | 0 | Asset tracking |
| pickup_requests | 32 kB | 0 | Pickup module |
| attendance | 32 kB | 0 | Attendance module |
| bug_reports | 32 kB | 0 | Admin platform |
| meal_contracts | 24 kB | 0 | Meal module |
| teacher_contents | 24 kB | 0 | Teacher module |
| teachers | 24 kB | 0 | Teacher module |
| assets_inventory | 24 kB | 0 | Asset tracking |
| financial_summary | 24 kB | 0 | Finance module |
| extra_services | 16 kB | 0 | Meal module |

### UNCERTAIN - None

All tables have been definitively classified. No uncertain cases.

---

## 4. Checkout System Health Verification

| Check | Result | Expected |
|-------|--------|----------|
| checkout_active_students_view | **385 rows** | ~385 |
| checkout_active_classes_view | **37 rows** | ~37 |
| checkout_active_guardians_view | **785 rows** | >0 |
| student_checkout_daily (operational) | 0 rows | OK (no pilot data yet) |
| student_checkout_logs (operational) | 0 rows | OK (no pilot data yet) |

**All three checkout views return correct data.**

---

## 5. Realtime Subscriptions

| Table | In Publication | After Cleanup |
|-------|---------------|---------------|
| student_checkout_daily | Yes | KEEP |
| student_checkout_logs | Yes | KEEP |
| attendance | Yes | REMOVE from publication |

> `attendance` must be removed from `supabase_realtime` publication before dropping the table.

---

## 6. Views

| View | Status | Depends On |
|------|--------|------------|
| checkout_active_students_view | KEEP | checkout_active_students_snapshot() |
| checkout_active_classes_view | KEEP | checkout_active_classes_snapshot() |
| checkout_active_guardians_view | KEEP | checkout_active_guardians_snapshot() |
| family_centric_dashboard | DROP | financial_summary (being removed) |
| family_debt_dashboard | DROP | financial_summary (being removed) |
| view_daily_kitchen_report | DROP | extra_services (being removed) |
| portaria_live_eta | DROP | pickup_requests (being removed) |
| inadimplencia_dashboard | DROP | invoices (being removed) |

> Note: `family_debt_dashboard` exists in live DB but was only defined in seed.sql (not in migration list from earlier). Confirmed present.

---

## 7. Functions

| Function | Status | Reason |
|----------|--------|--------|
| checkout_active_students_snapshot() | KEEP | Powers checkout view |
| checkout_active_classes_snapshot() | KEEP | Powers checkout view |
| checkout_active_guardians_snapshot() | KEEP | Powers checkout view |
| is_school_staff() | KEEP | RLS policies |
| can_operate_student_checkout() | KEEP | RLS policies |
| can_manage_sponte_staging() | KEEP | RLS policies |
| current_app_access_type() | KEEP | Auth helper |
| set_financial_net_value() | DROP | Trigger for financial_summary (being removed) |
| update_parent_location() | DROP | Used by pickup_requests (being removed) |

---

## 8. Auth Impact

**None.** The `auth` schema (2.2 MB) is untouched by this cleanup.
- `profiles` table (FK to `auth.users`) is KEPT
- No auth policies, hooks, or triggers are affected
- All RLS helper functions (`is_school_staff()`, `can_operate_student_checkout()`, `current_app_access_type()`) are KEPT

---

## 9. Storage Impact Estimate

| Metric | Value |
|--------|-------|
| Current total DB size | **129 MB** |
| Removable tables size | **~99 MB** |
| Kept tables size | **~9.2 MB** |
| Non-public schemas (auth, extensions, etc.) | **~10.7 MB** |
| **Estimated DB size after cleanup** | **~30 MB** |
| **Estimated storage recovered** | **~99 MB (77%)** |
| Supabase free tier DB limit | 500 MB |
| **After cleanup: % of free tier used** | **~6%** |

> Cleanup recovers ~77% of current database storage.
> The project will be well within free tier limits after cleanup.

---

## 10. Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Finance data permanently lost | Export CSV backups before dropping (Section 1 of cleanup SQL) |
| Views fail due to missing dependencies | Drop dependent views FIRST (Section 2), before tables |
| Realtime breaks | Remove `attendance` from publication before dropping |
| Future modules need dropped tables | Migration files preserved in Git; can re-run migrations to recreate |
| Import batch FK references break | `import_batches` table is KEPT |

**No high-risk items.** All removable tables either have 0 rows (empty module tables) or contain Sponte finance staging data that can be re-imported from the original backup files.

---

## 11. Recommended Execution Order

1. **Export/backup** finance staging tables (Section 1) - CSV or pg_dump
2. **Remove attendance from realtime** publication
3. **Drop dependent views** (Section 2) - 5 views
4. **Drop tables** (Section 3) - 21 tables
5. **Truncate error logs** (Section 4) - 2 tables
6. **Drop unused functions/enums** (Section 5)
7. **Run verification queries** (Section 6)

**Await explicit approval before executing any destructive section.**
