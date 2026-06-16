<#
  VeritusOS — Unified daily backup for Windows (database + config).
  Windows-native (no Git-Bash needed). Mirrors backup-all.sh.

  Run manually:
    powershell -ExecutionPolicy Bypass -File server\scripts\backup-all.ps1

  Schedule daily (Task Scheduler, see physical-server-setup.md):
    Program:   powershell.exe
    Arguments: -ExecutionPolicy Bypass -File C:\veritus\veritus-community\server\scripts\backup-all.ps1

  Restore a backup:
    & "$env:PGBIN\psql.exe" -d veritus_os -f (expanded .sql)   # or pipe the gunzipped file
#>
param(
  [string]$DbName        = $(if ($env:DB_NAME) { $env:DB_NAME } else { 'veritus_os' }),
  [string]$BackupDir     = $(if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { 'C:\veritus\backups' }),
  [int]   $RetentionDays = $(if ($env:RETENTION_DAYS) { [int]$env:RETENTION_DAYS } else { 30 }),
  [string]$PgBin         = $(if ($env:PGBIN) { $env:PGBIN } else { 'C:\Program Files\PostgreSQL\17\bin' })
)
$ErrorActionPreference = 'Stop'
$ts       = Get-Date -Format 'yyyyMMdd_HHmmss'
$repoDir  = (Resolve-Path "$PSScriptRoot\..\..").Path
$dbDir    = Join-Path $BackupDir 'db'
$cfgDir   = Join-Path $BackupDir 'config'
New-Item -ItemType Directory -Force -Path $dbDir, $cfgDir | Out-Null

# --- 1. Database dump ---
$dbFile = Join-Path $dbDir "${DbName}_${ts}.sql"
Write-Host "[$(Get-Date)] Dumping $DbName -> $dbFile"
& "$PgBin\pg_dump.exe" $DbName > $dbFile
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed (exit $LASTEXITCODE)" }
# compress to .zip and drop the raw .sql
$zip = "$dbFile.zip"
Compress-Archive -Path $dbFile -DestinationPath $zip -Force
Remove-Item $dbFile
$sizeKB = [math]::Round((Get-Item $zip).Length / 1KB)
Write-Host "[$(Get-Date)] DB backup OK: $zip (${sizeKB} KB)"

# --- 2. Config snapshot (JWT secret + env files) ---
$cfgZip = Join-Path $cfgDir "config_${ts}.zip"
$cfgItems = @()
if (Test-Path "$repoDir\server\.jwt-secret") { $cfgItems += "$repoDir\server\.jwt-secret" }
$cfgItems += (Get-ChildItem "$repoDir\.env*" -File -ErrorAction SilentlyContinue | ForEach-Object FullName)
if ($cfgItems.Count -gt 0) {
  Compress-Archive -Path $cfgItems -DestinationPath $cfgZip -Force
  Write-Host "[$(Get-Date)] Config backup: $cfgZip"
}

# --- 3. Retention ---
$cutoff = (Get-Date).AddDays(-$RetentionDays)
$old = Get-ChildItem $dbDir, $cfgDir -File | Where-Object { $_.LastWriteTime -lt $cutoff }
$old | Remove-Item -Force
Write-Host "[$(Get-Date)] Retention ${RetentionDays}d: removed $($old.Count) old backups"
Write-Host "[$(Get-Date)] Done."
