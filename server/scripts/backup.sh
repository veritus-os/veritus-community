#!/bin/bash
# VeritusOS — Daily database backup
# Usage: bash server/scripts/backup.sh
# Schedule with cron: 0 22 * * * cd /path/to/veritus-community && bash server/scripts/backup.sh

set -euo pipefail

DB_NAME="${DB_NAME:-veritus_os}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/workspace/veritus-os/backups/db}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
PGBIN="${PGBIN:-/opt/homebrew/opt/postgresql@17/bin}"

mkdir -p "$BACKUP_DIR"

BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "[$(date)] Starting backup of $DB_NAME..."
"$PGBIN/pg_dump" "$DB_NAME" | gzip > "$BACKUP_FILE"
SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
echo "[$(date)] Backup saved: $BACKUP_FILE ($SIZE)"

# Retention: delete backups older than N days
DELETED=$(find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
echo "[$(date)] Cleaned $DELETED old backups (retention: ${RETENTION_DAYS} days)"

# Verify backup is readable
if gzip -t "$BACKUP_FILE" 2>/dev/null; then
  echo "[$(date)] Backup integrity: OK"
else
  echo "[$(date)] ERROR: Backup integrity check failed!"
  exit 1
fi

echo "[$(date)] Done."
