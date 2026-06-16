#!/bin/bash
# VeritusOS — Unified daily backup (database + config) for the physical school server.
#
# Backs up the single shared Postgres DB (Search + Checkout) and the irreplaceable
# config (JWT secret, env files). Safe to run unattended from Task Scheduler / cron / pm2.
#
#   bash server/scripts/backup-all.sh
#
# Schedule (Linux/Mac cron, daily 22:00):
#   0 22 * * * cd /path/to/veritus-community && bash server/scripts/backup-all.sh >> ~/veritus-backup.log 2>&1
#
# Restore (full DB):
#   gunzip -c <backup>.sql.gz | psql veritus_os
# Restore into a fresh DB:
#   createdb veritus_os && gunzip -c <backup>.sql.gz | psql veritus_os

set -euo pipefail

DB_NAME="${DB_NAME:-veritus_os}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/veritus-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPO_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

# Locate pg_dump (Homebrew Mac, Linux PATH, or Windows via Git-Bash PATH all work)
PGDUMP="$(command -v pg_dump || echo /opt/homebrew/opt/postgresql@17/bin/pg_dump)"

DB_DIR="$BACKUP_DIR/db"
CFG_DIR="$BACKUP_DIR/config"
mkdir -p "$DB_DIR" "$CFG_DIR"

# --- 1. Database dump (gzipped) ---
DB_FILE="$DB_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"
echo "[$(date)] Dumping $DB_NAME -> $DB_FILE"
"$PGDUMP" "${DATABASE_URL:-$DB_NAME}" | gzip > "$DB_FILE"
echo "[$(date)] DB backup: $(ls -lh "$DB_FILE" | awk '{print $5}')"

# --- 2. Verify integrity ---
if ! gzip -t "$DB_FILE" 2>/dev/null; then
  echo "[$(date)] ERROR: DB backup integrity check FAILED"; exit 1
fi
echo "[$(date)] DB integrity: OK"

# --- 3. Config snapshot (JWT secret + env files; never lose these) ---
CFG_FILE="$CFG_DIR/config_${TIMESTAMP}.tar.gz"
tar -czf "$CFG_FILE" -C "$REPO_DIR" \
  $( [ -f "$REPO_DIR/server/.jwt-secret" ] && echo server/.jwt-secret ) \
  $( ls "$REPO_DIR"/.env* 2>/dev/null | sed "s#$REPO_DIR/##" ) 2>/dev/null || true
echo "[$(date)] Config backup: $CFG_FILE"

# --- 4. Retention ---
DEL_DB=$(find "$DB_DIR" -name '*.sql.gz' -mtime +$RETENTION_DAYS -delete -print 2>/dev/null | wc -l | tr -d ' ')
DEL_CFG=$(find "$CFG_DIR" -name '*.tar.gz' -mtime +$RETENTION_DAYS -delete -print 2>/dev/null | wc -l | tr -d ' ')
echo "[$(date)] Retention ${RETENTION_DAYS}d: removed $DEL_DB db + $DEL_CFG config old backups"
echo "[$(date)] Done. Latest DB backup: $DB_FILE"
