# Backup Strategy — VeritusOS

## Overview

- **Database:** PostgreSQL 17 (local)
- **Data:** 385 students, 915 guardians, 1,014 meal subscriptions
- **Estimated dump size:** ~2-5 MB compressed

## Daily Backup

Run every evening after school hours:

```bash
bash server/scripts/backup.sh
```

Backups saved to: `~/workspace/veritus-os/backups/db/`

Format: `veritus_os_YYYYMMDD_HHMMSS.sql.gz`

### Schedule with cron (Mac)

```bash
crontab -e
# Add:
0 22 * * * cd /Users/aleffemanuel/workspace/veritus-os/veritus-community && bash server/scripts/backup.sh >> /tmp/veritus-backup.log 2>&1
```

### Schedule with Task Scheduler (future Windows)

```
schtasks /create /tn "VeritusBackup" /tr "pg_dump veritus_os | gzip > C:\backups\veritus_os_%date%.sql.gz" /sc daily /st 22:00
```

## Retention

| Period | Retention |
|--------|-----------|
| Daily backups | Keep 30 days |
| Weekly snapshots | Keep 12 weeks (manual) |
| Pre-migration snapshots | Keep indefinitely |

The backup script auto-deletes backups older than 30 days.

## Weekly Manual Backup

Every Friday, copy the latest daily backup to an external USB or cloud:

```bash
cp ~/workspace/veritus-os/backups/db/$(ls -t ~/workspace/veritus-os/backups/db/*.sql.gz | head -1) /Volumes/USB_BACKUP/
```

## Pre-Migration Backup

Before any schema change or data import:

```bash
BACKUP_DIR=~/workspace/veritus-os/backups/db/pre-migration bash server/scripts/backup.sh
```

## Backup Verification

Monthly: test that the latest backup can be restored:

```bash
createdb veritus_test
gunzip -c ~/workspace/veritus-os/backups/db/LATEST.sql.gz | psql veritus_test
psql veritus_test -c "SELECT count(*) FROM students WHERE active = true;"
# Should return 385+
dropdb veritus_test
```

## What Is NOT Backed Up

- Sponte raw exports → stored in `veritus-data-private` repo
- XLSX generated reports → regenerated from database
- JWT secret → in `server/.jwt-secret` (regenerates if lost, but invalidates all sessions)
