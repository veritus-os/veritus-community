# Student Checkout — Rollout Checklist

Use this checklist for each new deployment or Supabase migration.

---

## Pre-Rollout (before going live)

### Infrastructure
- [ ] Supabase project created and accessible
- [ ] All 16 migrations applied (`supabase db push`)
- [ ] Sponte data imported (9 checkout-critical tables)
- [ ] Campus assignments configured (`checkout_class_campus_assignments`)
- [ ] `checkout_active_students_view` returns ~385 rows
- [ ] `checkout_active_classes_view` returns ~37 rows
- [ ] `checkout_active_guardians_view` returns ~785 rows
- [ ] `student_checkout_daily` accepts inserts
- [ ] `student_checkout_logs` accepts inserts

### Auth
- [ ] 4 staff users created in Supabase Auth
- [ ] Each user has correct `access_type` in user_metadata
- [ ] Each user can log in and lands on `/checkout`
- [ ] Passwords communicated to staff securely

### Frontend
- [ ] `.env.local` configured with correct Supabase URL + key
- [ ] `VITE_CHECKOUT_SUPABASE_LOW_EGRESS=true` set
- [ ] `VITE_CHECKOUT_LOCAL_MODE` not set (or `false`)
- [ ] `npm run build` completes without errors
- [ ] No demo button visible on login page
- [ ] No "Modo local" badge visible

### Devices
- [ ] Reception tablet/phone ready
- [ ] Infantil coordination tablet/phone ready
- [ ] Fundamental coordination tablet/phone ready
- [ ] Support phone ready (optional)
- [ ] All devices can reach app URL on same WiFi

---

## Go-Live Smoke Test

### Login
- [ ] `recepcao@cav.com` → lands on `/checkout` (reception view)
- [ ] `infantil@cav.com` → lands on `/checkout` (classroom view)
- [ ] `fundamental@cav.com` → lands on `/checkout` (classroom view)
- [ ] `suporte@cav.com` → lands on `/checkout` (support view)

### Board
- [ ] Student list loads (~385 students)
- [ ] Campus filter works (Sede Infantil / Sede Fundamental)
- [ ] Search by student name works
- [ ] Shift filter works

### Happy Path Flow
- [ ] Reception: search student
- [ ] Reception: select authorized guardian
- [ ] Reception: click "Chamar" — student turns orange
- [ ] Coordination: sees student in queue within 15 seconds
- [ ] Coordination: click "Preparando liberacao"
- [ ] Coordination: click "Pronto para buscar"
- [ ] Coordination: click "Liberado pela sala" — student turns blue/green
- [ ] Reception: sees "Liberado pela sala"
- [ ] Reception: click "Confirmar saida" — confirmation dialog appears
- [ ] Reception: confirm — student turns green ("Saiu")

### Exceptional Flow
- [ ] Reception: call student without selecting guardian
- [ ] Type manual person name
- [ ] System requires "Necessita verificacao" + mandatory note
- [ ] Status shows "Verificacao" (red badge)

### Logs
- [ ] Switch to support/logs view
- [ ] Recent transitions visible
- [ ] Click student → history panel shows individual logs

### Reset
- [ ] Login as admin or secretaria
- [ ] "Resetar dia" button visible
- [ ] Click reset → all students back to "Na escola"

### Error Recovery
- [ ] Disconnect WiFi briefly
- [ ] Reconnect — board recovers within 15 seconds
- [ ] No infinite retry loops in browser console

---

## Post-Rollout

- [ ] Staff debriefed — any issues?
- [ ] Any bugs reported? Document in WhatsApp group
- [ ] Supabase usage checked (bandwidth consumption ok?)
- [ ] Decision: continue supervised or go autonomous?

---

## Rollback

If critical failure during rollout:

1. Announce to staff: "Voltando ao modo manual"
2. Use paper student list for remaining exits
3. After hours: investigate, fix, re-test
4. If Supabase unrecoverable: switch to local mode (`cp .env.local-checkout .env.local`)
