# Student Checkout — Production Release Guide

**Version:** 1.0
**Date:** 2026-05-28
**Status:** Approved for controlled production release

---

## 1. Production Configuration

### Environment Variables

```env
VITE_SUPABASE_URL=https://bnggrjkllpgisdgmnjvm.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_CHECKOUT_SUPABASE_LOW_EGRESS=true
```

Low-egress mode is the recommended default for production on the Supabase free tier. It:
- Disables Supabase Realtime subscriptions (saves egress)
- Caches student/class data for 5 minutes
- Polls only checkout daily state every 12 seconds
- Loads audit logs on demand, not on every poll
- Uses column projection to minimize payload sizes

### Available Modes

| Mode | Use Case | Env Flags |
|------|----------|-----------|
| **Low-Egress Supabase** (production) | Real data, free tier safe | `VITE_CHECKOUT_SUPABASE_LOW_EGRESS=true` |
| Normal Supabase | Pro tier with full realtime | No low-egress flag |
| Local Checkout | Offline testing/fallback | `VITE_CHECKOUT_LOCAL_MODE=true` |

---

## 2. User Setup in Supabase Auth

### Creating Staff Users

In the Supabase Dashboard > Authentication > Users > Add User:

| Field | Value |
|-------|-------|
| Email | `recepcao@colegioaltavista.com.br` |
| Password | Strong password (12+ chars) |
| Auto Confirm | Yes |
| User Metadata | See JSON below |

### User Metadata JSON

Set in **user_metadata** when creating the user:

```json
{
  "full_name": "Maria da Recepção",
  "access_type": "reception"
}
```

### Required Roles

| Role | access_type | Purpose | Checkout Permissions |
|------|------------|---------|---------------------|
| Recepção | `reception` | Front desk — calls guardians, confirms exits | guardian_arrived, left_school, needs_verification |
| Coord. Infantil | `infantil_coordination` | Early childhood coordinator | preparing_release, ready_for_pickup, released_from_classroom |
| Coord. Fundamental | `fundamental_coordination` | Elementary coordinator | preparing_release, ready_for_pickup, released_from_classroom |
| Suporte | `support` | IT/operational support | All actions |
| Admin | `admin` | School admin | All actions + reset day |
| Secretaria | `secretaria` | Secretary | All actions + reset day |

### Minimum Users for Launch

Create at least:
1. 1 reception user
2. 1 infantil_coordination user
3. 1 fundamental_coordination user
4. 1 admin or support user (for troubleshooting)

### Verifying a User

After creation, verify the user can log in at `/login` and lands on `/checkout`.

---

## 3. Security Summary

### RLS Policies (verified)

| Protection | Status |
|-----------|--------|
| Anonymous users cannot read checkout data | Enforced via `is_school_staff()` |
| Only staff with `can_operate_student_checkout()` can write | Enforced |
| Reset day restricted to admin/secretaria | Enforced in app + RLS |
| `service_role` key not in frontend code | Verified — only `anon` key used |
| `.env` files gitignored | Verified — `.env`, `.env.*`, `*.local` all ignored |
| No secrets in committed code | Verified |

### RLS Functions

- `is_school_staff()`: Checks JWT `access_type` against allowed staff roles
- `can_operate_student_checkout()`: Subset of staff roles that can modify checkout state
- Both use `current_app_access_type()` which reads from JWT metadata

---

## 4. Deployment

### Option A: Vercel (recommended)

1. Connect the `veritus-os` repo to Vercel
2. Set root directory to `veritus-community`
3. Set framework preset to Vite
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_CHECKOUT_SUPABASE_LOW_EGRESS=true`
5. Deploy

### Option B: Netlify

Same as Vercel — connect repo, set env vars, deploy.

### Option C: Manual Build

```bash
npm run build
# Serve dist/ from any static host (S3, Firebase Hosting, etc.)
```

### Build Verification

```bash
npm run build
# Must complete with zero errors
# Output in dist/
```

---

## 5. Smoke Test Checklist

Run this checklist on every deployment:

### Login & Access
- [ ] Open `/login` on desktop browser
- [ ] Login as reception user — lands on `/checkout`
- [ ] Login as coordination user — lands on `/checkout`
- [ ] Demo button is NOT visible in production
- [ ] No "Modo local" badge visible

### Board
- [ ] Student list loads (~385 students)
- [ ] Campus filter works (Sede Infantil / Sede Fundamental)
- [ ] Search by student name works
- [ ] Search by guardian name works
- [ ] Shift/turno filter works

### Checkout Flow — Happy Path
- [ ] Reception: search student, click "Chamar", select guardian
- [ ] Student moves to "Responsavel chegou" (orange)
- [ ] Coordination: sees student in queue within ~15 seconds
- [ ] Coordination: clicks "Preparando" then "Pronto para buscar"
- [ ] Coordination: clicks "Liberado pela sala"
- [ ] Reception: sees student at "Liberado pela sala"
- [ ] Reception: clicks "Confirmar saida" with confirmation dialog
- [ ] Student moves to "Saiu" (green)

### Exceptional Pickup
- [ ] Reception: click "Chamar" without selecting a guardian
- [ ] Type manual pickup person name
- [ ] Status goes to "Necessita verificacao" with note required

### Logs
- [ ] Open support/logs view
- [ ] Logs load on demand
- [ ] Recent transitions appear
- [ ] Student detail panel shows individual history

### Reset Day
- [ ] Login as admin/secretaria
- [ ] "Resetar dia" button visible
- [ ] Confirm reset — all students back to "Na escola"

### Mobile
- [ ] Open on phone (same WiFi or deployed URL)
- [ ] Login works
- [ ] Board loads
- [ ] Tap-to-call student works
- [ ] Status updates visible across devices within ~15 seconds

### Error Handling
- [ ] Disconnect WiFi — "Sincronizacao temporariamente indisponivel" appears
- [ ] Reconnect — board refreshes automatically
- [ ] No infinite retry loops in browser console

---

## 6. Operational Rollout Plan

### Day 1 — Assisted Pilot

| Time | Activity | Who |
|------|----------|-----|
| 07:30 | Deploy production build | Dev team |
| 07:45 | Create/verify staff user accounts | Admin |
| 08:00 | Run smoke test checklist | Dev team |
| 08:30 | Brief reception staff (15 min) | Support + Dev |
| 08:45 | Brief coordination staff (15 min) | Support + Dev |
| 09:00 | System goes live — support person present at each station | All |
| 11:00-12:00 | First checkout period — full monitoring | Support on-site |
| 12:00 | Quick debrief — any issues? | All |
| 15:00-16:00 | Second checkout period — monitoring continues | Support on-site |
| 16:30 | Day 1 wrap-up — decide if Day 2 needs support | Team |

### Staff Training (15 min per role)

**Reception:**
1. Open `/checkout` on tablet/phone
2. When guardian arrives: search student name, click "Chamar", pick guardian
3. When student exits: click "Confirmar saida"
4. If unusual person: type name, mark "Necessita verificacao", add note

**Coordination:**
1. Open `/checkout` on tablet/phone
2. Watch for students in "Responsavel chegou" (orange cards)
3. Click student > "Preparando" > "Pronto" > "Liberado pela sala"
4. Student card turns green — reception handles the rest

### Devices Needed

| Station | Device | Role |
|---------|--------|------|
| Front desk | 1 tablet or phone | reception |
| Infantil building | 1 tablet or phone | infantil_coordination |
| Fundamental building | 1 tablet or phone | fundamental_coordination |
| Support (roaming) | 1 phone | support |

Minimum: 3 devices. Recommended: 4.

### Fallback Procedure

If the system fails during checkout:

1. **Announce**: "Sistema temporariamente indisponivel, usando lista manual"
2. **Switch to paper**: Use printed student list with manual checkmarks
3. **Record**: Note which students were released manually
4. **After fix**: Enter manual releases into the system retroactively
5. **Contact**: Support person or dev team via WhatsApp group

### How to Revert to Manual

If needed mid-operation:
- Staff simply stop using the tablets
- Reception uses the existing paper logbook
- No data loss — anything already recorded stays in Supabase

### Bug Reporting

Staff should report issues via WhatsApp group with:
- Screenshot of the error
- What they were trying to do
- Student name if applicable
- Time it happened

---

## 7. Monitoring

### Supabase Usage Dashboard

Check at: `https://supabase.com/dashboard/project/bnggrjkllpgisdgmnjvm/settings/billing/usage`

Watch for:
- **Database egress** — should stay under 2 GB/month with low-egress mode
- **Auth requests** — normal: 50-100/day for staff logins
- **Database size** — currently 31 MB / 500 MB limit

### Browser Console (dev only)

When `VITE_CHECKOUT_SUPABASE_LOW_EGRESS=true` in development:
- `[checkout-egress]` log lines show every Supabase query
- Watch for: repeated queries, large row counts, polling storms

### What To Do If Quota Warning Appears

1. The app auto-detects quota errors and backs off to 30-second polling
2. A yellow banner appears: "Limite de uso Supabase atingido"
3. The board remains visible with last known data
4. If persistent: switch to local mode temporarily (`VITE_CHECKOUT_LOCAL_MODE=true`)
5. Investigate: check Supabase usage dashboard for unexpected spikes

### Avoiding Excessive Usage

- Do NOT leave multiple browser tabs open on checkout page
- Do NOT use browser auto-refresh extensions
- Close checkout page when not in use (afterschool)
- One device per station is sufficient

---

## 8. Risks Before Launch

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Supabase egress quota hit again | Low (after low-egress optimization) | Medium — degraded polling | Auto-backoff + local mode fallback |
| Staff unfamiliar with system | Medium | Low — paper fallback exists | Day 1 assisted training |
| WiFi drops at school | Medium | Low — optimistic UI keeps last state | Auto-reconnect + manual refresh button |
| Wrong guardian picked | Low | Medium — student released to wrong person | needs_verification flow + mandatory notes |
| Concurrent edits conflict | Low | Low — optimistic locking in place | Retry message shown to user |
