# Day 1 Support Checklist — Aleff

## Before Staff Arrives

- [ ] Mac is on and connected to school WiFi
- [ ] PostgreSQL is running: `pg_isready`
- [ ] API server is running: `npm run api` → check `http://localhost:3001/api/health`
- [ ] Frontend is running: `npm run dev -- --host`
- [ ] Test login with your account: `aleff@cav.local`
- [ ] Test login with each staff account (new passwords)
- [ ] Backup exists from last night: `ls ~/workspace/veritus-os/backups/db/`
- [ ] Staff credentials printed or ready to share verbally

## Staff Arrival

- [ ] Show each person how to open the browser and type the URL
- [ ] Watch them log in for the first time
- [ ] Walk through one search together
- [ ] Walk through opening a student profile
- [ ] Walk through the meal report download
- [ ] Let them try on their own — observe silently
- [ ] Answer questions as they come up

## Common Issues

| Issue | Fix |
|-------|-----|
| "Não foi possível entrar" | Check email spelling (it's `@cav.local`). Check password. |
| "Sistema de pesquisa indisponível" | API server is down. Run `npm run api` in terminal. |
| Page won't load | Check if `npm run dev -- --host` is running. Check WiFi. |
| Search returns nothing | Check query is at least 2 characters. Try a known name. |
| "Sem permissão para editar" | User is readonly or support. Only admin/secretaria can edit. |
| XLSX won't download | API might be down. Check terminal for errors. |
| Very slow | Check if Mac is under heavy load (close other apps). |

## How to Restart

```bash
# Restart API
# Find and kill old process
lsof -ti:3001 | xargs kill
# Start fresh
cd ~/workspace/veritus-os/veritus-community
npm run api

# Restart frontend
# Find and kill old process
lsof -ti:5173 | xargs kill
# Start fresh
npm run dev -- --host
```

## How to Check Database

```bash
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
# Is Postgres running?
pg_isready

# Quick data check
psql veritus_os -c "SELECT count(*) FROM students WHERE active = true;"
# Should be 385+
```

## How to Restore from Backup

```bash
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
# Find latest backup
ls -lt ~/workspace/veritus-os/backups/db/*.sql.gz | head -1

# Restore (DESTRUCTIVE — replaces all data)
dropdb veritus_os
createdb veritus_os
gunzip -c ~/workspace/veritus-os/backups/db/LATEST.sql.gz | psql veritus_os
```

## How to Record Bugs

When staff reports an issue:
1. Note the exact time
2. Note what they were doing (searching, editing, enrolling)
3. Note the exact error message
4. Check the API terminal for error logs
5. Take a screenshot if possible
6. Add to the bug list (paper or notes app)

## How to Change a Password

```bash
cd ~/workspace/veritus-os/veritus-community
node server/scripts/change-password.js <email> <new-password>
# Example:
node server/scripts/change-password.js gisele@cav.local NovaSenha@2026
```

## End of Day

- [ ] Ask staff for feedback: what worked, what was confusing
- [ ] Check API terminal for any error messages
- [ ] Check database counts are reasonable: `psql veritus_os -c "SELECT count(*) FROM students WHERE active = true;"`
- [ ] Verify tonight's backup will run (cron at 22:00)
- [ ] Note any bugs or feature requests for tomorrow
