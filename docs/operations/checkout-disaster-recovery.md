# Student Checkout — Disaster Recovery

## Failure Scenarios

### 1. Supabase Unreachable (egress quota, outage, network)

**Symptoms:** Board doesn't load, login fails, "Sincronizacao indisponivel" banner.

**Immediate response (< 2 min):**
1. Switch to local mode:
   ```bash
   cp .env.local-checkout .env.local
   npm run local:server &
   npm run local:dev
   ```
2. Staff log in with `@cav.local` test credentials
3. Checkout continues with 50 sample students (demo quality, not real data)

**Limitation:** Local mode uses sample data, not real 385 students.

**Recovery:**
1. Check Supabase status at https://status.supabase.com
2. Check project usage at Supabase Dashboard > Settings > Billing
3. If egress quota: wait for monthly reset or upgrade plan
4. Restore `.env.local` with Supabase config when resolved

---

### 2. Supabase Data Corrupted or Deleted

**Recovery from backups:**

All Sponte raw data lives in:
```
~/workspace/veritus-os/backups/sponte-raw/
  Projeto software escola.rar    # Original Sponte export (1.3 GB)
  Extracao_72776_7291.zip        # Secondary extraction
```

Dropped finance tables backed up in:
```
~/workspace/veritus-os/backups/supabase-exports/
  supabase_cleanup_backups/run_20260528_125014/
    sponte_raw_contratos.csv
    sponte_raw_contratos_turmas.csv
    sponte_raw_contas_receber.csv
    sponte_raw_contas_receber_parcelas.csv
    sponte_raw_rps.csv
    sponte_raw_rps_parcelas.csv
```

**Re-import steps:**
1. Create new Supabase project (see `new-supabase-bootstrap.md`)
2. Run migrations: `supabase db push`
3. Re-import Sponte data from `escola.rar`
4. Re-create auth users
5. Update `.env.local` with new project credentials

---

### 3. Auth Users Broken (wrong roles, locked out)

**Fix via Supabase Dashboard:**
1. Go to Authentication > Users
2. Find the affected user
3. Edit user_metadata JSON:
   ```json
   {"full_name":"Recepção","access_type":"reception"}
   ```
4. Or reset password if locked out

**Fix via SQL (faster):**
```sql
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"access_type":"reception"}'::jsonb
WHERE email = 'recepcao@cav.com';
```

---

### 4. Checkout State Corrupted (stuck students, wrong statuses)

**Admin reset:**
1. Login as admin/secretaria
2. Click "Resetar dia" in checkout page
3. All students return to "Na escola"

**SQL reset (emergency):**
```sql
DELETE FROM student_checkout_daily WHERE checkout_date = current_date;
```

---

### 5. Complete System Failure During Checkout

**Paper fallback procedure:**
1. Announce: "Sistema temporariamente indisponivel"
2. Use printed student list (keep one at front desk)
3. Manual checkmarks for exits
4. Record guardian name and time on paper
5. After system recovers, backfill via admin interface

---

## Backup Schedule

| What | Where | Frequency |
|------|-------|-----------|
| Sponte raw export | `~/workspace/veritus-os/backups/sponte-raw/` | On each new Sponte export |
| Supabase data export | `~/workspace/veritus-os/backups/supabase-exports/` | Before any destructive DB operation |
| Git repository | GitHub `veritus-os/veritus-community` | On every commit |
| Migration files | In repo `supabase/migrations/` | Always tracked |

## Contact Chain

| Issue | Who | How |
|-------|-----|-----|
| System down | Dev support | WhatsApp group |
| Staff can't login | Admin (reset password) | Supabase Dashboard |
| Supabase quota | Dev team | Check usage dashboard, switch to local mode |
| Data corruption | Dev team | Re-import from backups |
