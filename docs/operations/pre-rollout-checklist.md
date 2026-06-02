# Pre-Rollout Checklist — VeritusOS Search & Enrollment

Use before giving access to Patrícia, Gisele, or Sirley.

## Infrastructure

- [ ] PostgreSQL running (`pg_isready`)
- [ ] API server running (`curl http://localhost:3001/api/health`)
- [ ] Frontend accessible (`http://localhost:5173` or `http://<IP>:5173`)
- [ ] Other computers can reach the server on school WiFi
- [ ] Database backup exists and is recent (`ls ~/workspace/veritus-os/backups/db/`)
- [ ] JWT secret file exists (`server/.jwt-secret`)

## Auth

- [ ] Aleff can login (`aleff@cav.local`)
- [ ] Patrícia can login (`patricia@cav.local`)
- [ ] Gisele can login (`gisele@cav.local`)
- [ ] Sirley can login (`sirley@cav.local`)
- [ ] Wrong password shows "Credenciais inválidas"
- [ ] Rate limiting blocks after 10 failed attempts
- [ ] All temporary passwords have been changed

## Search

- [ ] Search by student name returns results
- [ ] Search by guardian name returns results
- [ ] Search by turma name returns results
- [ ] Search by phone number works
- [ ] CPF is NOT visible in search results
- [ ] Results grouped by entity type (Alunos / Responsáveis)
- [ ] Empty search shows quick actions
- [ ] Search history appears in sidebar after searching

## Student Profile

- [ ] Click student → opens profile
- [ ] Profile shows: name, turma, segmento, turno
- [ ] Profile shows guardians with phone/email
- [ ] Profile shows meal subscriptions by weekday
- [ ] Profile shows allergies highlighted
- [ ] CPF is masked in profile view
- [ ] Back button returns to search

## Editing (admin/secretaria only)

- [ ] Edit button visible for Aleff (admin)
- [ ] Edit button visible for Patrícia (admin)
- [ ] Edit button visible for Gisele (secretaria)
- [ ] Edit button visible for Sirley (secretaria)
- [ ] Edit → change allergy → save → verify change persists
- [ ] Audit log records the change
- [ ] Non-admin users cannot see edit button (if support/readonly users exist)

## Enrollment

- [ ] "Nova Matrícula" button visible for admin/secretaria
- [ ] Fill form: student name, birth date, turma, responsible name, phone
- [ ] Submit → success screen
- [ ] Search for new student → found
- [ ] Duplicate creation blocked (same name + birth date)
- [ ] Missing required fields show error message
- [ ] Cancel button returns to search

## Meal Report

- [ ] Click "Relatório alimentação" → report loads
- [ ] Table shows service types × weekday
- [ ] Subscriber count matches expected (~192)
- [ ] "Baixar XLSX" button downloads file
- [ ] XLSX opens correctly in Excel/Sheets
- [ ] XLSX has all sheets: RESUMO, CONTRATOS, POR TURMA, INFANTIL, FUNDAMENTAL, VALIDAÇÃO

## Saved Queries

- [ ] Search → click star → saved
- [ ] Saved query appears in sidebar under "Favoritos"
- [ ] Click saved query → re-runs search
- [ ] Delete saved query works

## Data Integrity

- [ ] Student count matches expected (385)
- [ ] No orphan records visible
- [ ] Allergies display correctly
- [ ] Class names display correctly
- [ ] Infantil/Fundamental segmentation correct

## Security

- [ ] No login page shows demo button
- [ ] No "Modo local" badge visible
- [ ] JWT secret file is NOT in git
- [ ] `.env` files are NOT in git
- [ ] Backup script runs successfully

## Backup

- [ ] Run `bash server/scripts/backup.sh`
- [ ] Backup file created in `~/workspace/veritus-os/backups/db/`
- [ ] Backup file is not empty
- [ ] Integrity check passes (script reports "OK")

## Staff Training Prep

- [ ] Login credentials printed/shared securely
- [ ] Quick reference card prepared (search, profile, enrollment steps)
- [ ] Aleff available for first-day support
- [ ] Paper fallback available for enrollment if system goes down
