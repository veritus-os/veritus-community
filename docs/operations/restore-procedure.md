# Restore Procedure — VeritusOS

## Scenario: Database Lost or Corrupted

**Estimated recovery time:** 15-30 minutes

### Prerequisites

- PostgreSQL installed
- Access to backup file (`*.sql.gz` from `~/workspace/veritus-os/backups/db/`)
- Node.js installed

### Steps

```bash
# 1. Find the latest backup
ls -lt ~/workspace/veritus-os/backups/db/*.sql.gz | head -5

# 2. Create fresh database
dropdb veritus_os 2>/dev/null
createdb veritus_os

# 3. Restore from backup
gunzip -c ~/workspace/veritus-os/backups/db/BACKUP_FILE.sql.gz | psql veritus_os

# 4. Verify data
psql veritus_os -c "
  SELECT 'students' AS tbl, count(*) FROM students WHERE active = true
  UNION ALL SELECT 'guardians', count(*) FROM guardians
  UNION ALL SELECT 'meal_subscriptions', count(*) FROM meal_subscriptions
  UNION ALL SELECT 'staff_users', count(*) FROM staff_users;
"
# Expected: students=385+, guardians=915, meals=1014, users=4

# 5. Start API server
npm run api

# 6. Test login
curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"aleff@cav.local","password":"CavAdmin@2026"}'
# Should return JWT token
```

## Scenario: Hard Drive Failure (No Local Backup)

### If backup exists on USB/external drive:

Follow steps above using the external backup file.

### If no backup exists:

Re-import from Sponte source data:

```bash
# 1. Create database and apply schema
createdb veritus_os
psql veritus_os < server/migrations/001_schema.sql
psql veritus_os < server/migrations/002_saved_queries.sql

# 2. Re-create staff users (passwords must be re-set)
# Use psql with bcrypt — see initial setup docs

# 3. Re-import from Supabase (if still available)
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node server/scripts/import-from-supabase.js

# 4. If Supabase unavailable, re-import from Sponte xlsx files
# Using the importer scripts in scripts/importers/sponte/
```

**Recovery time without backup: 1-2 hours**

## Scenario: Accidental Data Deletion

If a student or record was accidentally deleted/modified:

```bash
# 1. Check audit log for what changed
psql veritus_os -c "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 20;"

# 2. Restore specific data from backup
gunzip -c BACKUP_FILE.sql.gz > /tmp/restore.sql
# Extract the specific INSERT statement for the deleted record
grep "student_name_here" /tmp/restore.sql
# Re-run the INSERT manually
```

## Validation After Any Restore

```bash
psql veritus_os -c "
  SELECT 'students' AS check, count(*) FROM students WHERE active = true
  UNION ALL SELECT 'guardians', count(*) FROM guardians
  UNION ALL SELECT 'families', count(*) FROM families
  UNION ALL SELECT 'meal_subs', count(*) FROM meal_subscriptions
  UNION ALL SELECT 'staff_users', count(*) FROM staff_users
  UNION ALL SELECT 'audit_logs', count(*) FROM audit_logs;
"
```

Then test: login, search, view profile, generate XLSX.
