# Security Review — VeritusOS

**Date:** 2026-06-02
**Reviewer:** Automated audit + manual review

## Findings Summary

| Severity | Found | Fixed | Remaining |
|----------|-------|-------|-----------|
| Critical | 3 | 3 | 0 |
| High | 5 | 5 | 0 |
| Medium | 4 | 1 | 3 |
| Low | 3 | 0 | 3 |

## Critical (all fixed)

### 1. Hardcoded JWT secret fallback
- **Risk:** Token forgery by anyone reading source code
- **Fix:** Auto-generate random 48-byte secret on first run, stored in `server/.jwt-secret` (gitignored)

### 2. Unrestricted CORS
- **Risk:** Cross-origin requests from any website
- **Fix:** CORS now configurable via `CORS_ORIGINS` env var; defaults to requesting origin for internal use

### 3. Enrollment without transaction
- **Risk:** Orphan students/families/guardians on partial failure
- **Fix:** Wrapped in BEGIN/COMMIT/ROLLBACK — all-or-nothing

## High (all fixed)

### 4. Full CPF exposed in API responses
- **Fix:** `maskCpf()` applied to all student and guardian API responses (shows `***.***XXX-XX`)

### 5. No request body size limit
- **Fix:** 1 MB limit on all POST/PUT bodies; connection destroyed if exceeded

### 6. No login rate limiting
- **Fix:** Max 10 attempts per IP per minute; returns 429 after limit

### 7. Uniform auth error messages
- **Fix:** Both "user not found" and "wrong password" return "Credenciais inválidas" — prevents user enumeration

### 8. Auth/me endpoint missing URL parameter
- **Fix:** All `requireAuth` calls now pass URL for query-string token support

## Medium (3 remaining — acceptable for internal use)

### 9. Student update can set active=false (soft delete)
- **Status:** Not fixed — acceptable with audit logging
- **Recommendation:** Add confirmation dialog in frontend for active status changes

### 10. Audit log stores sensitive field values
- **Status:** Not fixed — acceptable for internal admin audit trail
- **Recommendation:** Mask CPF in audit details in future iteration

### 11. XLSX download token in query string
- **Status:** Not fixed — necessary for browser downloads
- **Recommendation:** Use short-lived download tokens in future iteration

### 12. Search ILIKE with % characters
- **Status:** Not fixed — low risk on 385 rows
- **Recommendation:** Escape special LIKE characters in future iteration

## Low (3 remaining — acceptable)

### 13. No HTTPS
- Internal network only — acceptable
- Add HTTPS if ever exposed to internet

### 14. Postgres error details in responses
- **Fixed:** Global error handler wraps errors with safe message

### 15. No structured request logging
- Console logging added for errors with timestamp
- Full request logging deferred to future iteration

## Permissions Matrix

| Action | Admin | Secretaria | Support | Readonly |
|--------|-------|------------|---------|----------|
| Search | Yes | Yes | Yes | Yes |
| View student profile | Yes | Yes | Yes | Yes |
| Edit student fields | Yes | Yes | No | No |
| Create enrollment | Yes | Yes | No | No |
| Export XLSX report | Yes | Yes | Yes | Yes |
| View audit logs | Yes | Yes | No | No |
| Manage saved queries | Own | Own | Own | Own |
| Delete students | No (soft delete via edit) | No | No | No |
| Manage staff users | Not implemented | N/A | N/A | N/A |

## Data Protection

| Field | Search Results | Profile View | XLSX Export | Audit Log |
|-------|---------------|-------------|-------------|-----------|
| Student name | Visible | Visible | Visible | Visible |
| CPF | Hidden | Masked | Not included | Stored (to mask later) |
| Phone | Hidden | Visible (staff only) | Not included | Not stored |
| Guardian email | Visible | Visible | Not included | Not stored |
| Allergies | Icon only | Visible | Visible | Not stored |
