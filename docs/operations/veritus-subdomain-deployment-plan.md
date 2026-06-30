# Veritus Search + Checkout — Subdomain Deployment Plan

> Status: **PROPOSAL — for review. Nothing implemented, no code changed, no commits.**
> Scope: `veritus-community` only. The Alta Vista onboarding Hub (`cav-onboarding`)
> is live under separate review and is **not** touched by this plan.

Goal: make **Veritus Search** and **Student Checkout** usable by the team over
clean, separated subdomains, served from the physical Windows server, **without
opening router ports**, using **Cloudflare Tunnel**, with access governed by
`staff_users.modules`.

---

## 1. Current architecture

One React SPA (single Vite build), three PM2 processes on the Windows server
(`ecosystem.config.cjs`), all backed by the local PostgreSQL `veritus_os`.

| PM2 process | Entrypoint | Port | Role |
|---|---|---|---|
| `veritus-search` | `server/index.js` | **3001** | Search / Secretaria API |
| `veritus-checkout` | `scripts/checkout-pg-server.js` | **3333** | Checkout API (Saída de Alunos) |
| `veritus-web` | `vite preview --host` | **5173** | Frontend (serves `dist/`) |

**Routing & auth (already module-aware):**

- `src/App.jsx` — `/search` is gated by `requireModule="search"`, `/checkout`
  by `requireModule="checkout"` (`src/components/ProtectedRoute.jsx`).
- `src/core/config/moduleContext.jsx` — picks the active module **from the
  hostname**, today using prefixes **`out.` → checkout** and **`ache.` → search**
  (these need to become `checkout.` / `search.`).
- `src/core/auth/roleContext.jsx` — one unified `signIn()`:
  1. **Search API (:3001)** first — identity source of truth, returns `role` + `modules`.
  2. Falls back to **Checkout API (:3333)**.
  3. Falls back to Supabase (cloud) if configured.
- `staff_users.modules` is the **source of truth** for access.

**Permission scope is enforced in two layers (good):**

- **Frontend:** `ProtectedRoute` → `hasModule('search' | 'checkout')`.
- **API:** the Checkout API login **rejects any user without `checkout` in
  `modules`** (`scripts/checkout-pg-server.js`). The Search API authenticates all
  active staff and returns their `modules`.

**API URL resolution (the crux):** both API clients
(`src/core/services/veritusApiClient.js`, `localCheckoutApiClient.js`) use a
`VITE_*_API_URL` env, or otherwise **derive `currentHost:3001` / `:3333`**. The
derived `:port` form **cannot work behind a tunnel** (only :443 is public), so the
API URLs must be set to real hostnames at build time.

**CORS:**

- Search API: **env-configurable** allow-list via `CORS_ORIGINS`.
- Checkout API: **hardcoded `*`** — functional (Bearer tokens, no cookies) but
  should be tightened to an allow-list.

---

## 2. Recommended architecture

One `cloudflared` tunnel on the Windows server. **No inbound ports.** One shared
frontend build; the module is chosen by hostname. The APIs get their own
hostnames so the unified (Search-API-first) login works from both frontends.

```
                  ┌──────────────── Cloudflare edge (HTTPS :443) ────────────────┐
 search.colegioaltavista.com.br ───────────►  http://localhost:5173  (frontend, module=search)
 checkout.colegioaltavista.com.br ─────────►  http://localhost:5173  (frontend, module=checkout)
 api-search.colegioaltavista.com.br ───────►  http://localhost:3001  (Search API)
 api-checkout.colegioaltavista.com.br ─────►  http://localhost:3333  (Checkout API)
                  └──────────── one cloudflared tunnel, outbound-only ───────────┘
                          Windows server · PM2 · PostgreSQL (veritus_os)
```

- One Vite build, env-baked with absolute API URLs → works identically from both
  frontend subdomains.
- **Separation:** `search.` shows only Search, `checkout.` only Checkout (module
  detection). Real access control stays in `staff_users.modules` (frontend + API);
  the subdomain is the entry point, not the security boundary.
- **Resilience:** if the Search API is down, checkout-subdomain login still works
  via the Checkout-API fallback.

**Why not a same-origin `/api` reverse proxy (2 hostnames, no CORS)?** Because
`signIn()` always calls the **Search API first**; on the checkout subdomain a
same-origin `/api` would route that call to the Checkout API and only work via an
implicit response-shape fallback — fragile, and it needs 2–3 code changes. The
4-hostname design matches the existing auth flow with one tiny code change and
trivial CORS (Bearer tokens). The same-origin variant remains a documented
alternative if fewer hostnames / no-CORS is preferred later.

### Domains

| Purpose | Domain | Local target |
|---|---|---|
| **Search** frontend | `search.colegioaltavista.com.br` | `localhost:5173` |
| **Checkout** frontend | `checkout.colegioaltavista.com.br` | `localhost:5173` |
| **Search API** | `api-search.colegioaltavista.com.br` | `localhost:3001` |
| **Checkout API** | `api-checkout.colegioaltavista.com.br` | `localhost:3333` |

---

## 3. ⚠️ AWS Route 53 caveat (critical)

`colegioaltavista.com.br` is currently authoritative in **AWS Route 53**, not
Cloudflare (the Hub subdomain was pointed manually in Route 53).

**Cloudflare Tunnel public hostnames require the hostname's authoritative DNS to
be on Cloudflare.** The tunnel publishes a *proxied* record (CNAME-flattened to
`<TUNNEL_ID>.cfargotunnel.com`) that only resolves inside Cloudflare's edge. A
plain Route 53 `CNAME → <id>.cfargotunnel.com` **does not work** — Cloudflare
returns **Error 1014 "CNAME Cross-User Banned"**. So `cloudflared tunnel route
dns` cannot run against a Route 53 zone.

Two supported DNS paths follow. **Path B keeps Route 53 authoritative and leaves
the existing Hub/Wix records untouched** — recommended given the constraints.

### Path A — Move the zone to Cloudflare (simplest operationally)

1. Add `colegioaltavista.com.br` as a zone in Cloudflare; let it import existing
   records (recreate the Hub `hub.` record and any Wix records so the site keeps
   working).
2. At the registrar, change nameservers from Route 53 to the Cloudflare pair.
3. Then `cloudflared tunnel route dns` works directly (see §5).

- ✅ Simplest tunnel setup. ❌ Route 53 is no longer authoritative for the domain
  (contradicts "keep Route 53 / Hub via AWS").

### Path B — Keep Route 53, delegate the subdomains to Cloudflare (recommended)

Delegate **only the four new hostnames** to Cloudflare via `NS` records in Route
53. Everything else in Route 53 (apex, Hub, Wix) stays exactly as-is.

For each of `search`, `checkout`, `api-search`, `api-checkout`:

1. In Cloudflare, **Add a site** using the full subdomain, e.g.
   `search.colegioaltavista.com.br`. Cloudflare assigns two nameservers, e.g.
   `gina.ns.cloudflare.com`, `rick.ns.cloudflare.com` (yours will differ).
2. In the Route 53 hosted zone for `colegioaltavista.com.br`, add an **`NS`
   record** named `search.colegioaltavista.com.br` with those two Cloudflare
   nameservers as the values. Repeat per subdomain (each Cloudflare subdomain
   zone has its own NS pair).
3. Run `cloudflared tunnel route dns` for each hostname (it now writes into the
   matching Cloudflare subdomain zone).

**Route 53 — AWS Console:** Hosted zones → `colegioaltavista.com.br` → *Create
record* → Record name `search` → Type `NS` → Value = the two Cloudflare NS (one
per line) → TTL 300 → Create. Repeat for `checkout`, `api-search`, `api-checkout`.

**Route 53 — AWS CLI** (example for one subdomain; repeat per name, substituting
your real Cloudflare NS values and `HOSTED_ZONE_ID`):

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id ZXXXXXXXXXXXXX \
  --change-batch '{
    "Comment": "Delegate search.colegioaltavista.com.br to Cloudflare for tunnel",
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "search.colegioaltavista.com.br",
        "Type": "NS",
        "TTL": 300,
        "ResourceRecords": [
          {"Value": "gina.ns.cloudflare.com"},
          {"Value": "rick.ns.cloudflare.com"}
        ]
      }
    }]
  }'
```

- ✅ Route 53 stays authoritative; Hub/Wix untouched. ❌ Four small delegations
  (one per hostname) to set up once.

> Lighter variant (fewer delegations, different names): delegate a single parent
> like `veritus.colegioaltavista.com.br` to Cloudflare and use
> `search.veritus…` / `checkout.veritus…`. Only do this if the nested names are
> acceptable; otherwise use the four exact-name delegations above.

> If neither moving nor delegating is acceptable, Cloudflare Tunnel cannot serve
> these names; an alternative tunnel that exposes a CNAME-able endpoint (e.g.
> ngrok reserved domain) would be required — not recommended here.

---

## 4. Required code / env changes (NOT yet applied)

**A. Code (2 small edits + 1 optional):**

1. `src/core/config/moduleContext.jsx` — detect the new prefixes:
   `host.startsWith('search.') → 'search'`, `host.startsWith('checkout.') → 'checkout'`
   (keep or retire `out.` / `ache.`).
2. `vite.config.js` — allow the public hosts on the preview server (Vite blocks
   unknown `Host` headers):
   ```js
   preview: {
     allowedHosts: [
       'search.colegioaltavista.com.br',
       'checkout.colegioaltavista.com.br',
     ],
   }
   ```
3. *(Optional hardening)* `scripts/checkout-pg-server.js` — replace the hardcoded
   `Access-Control-Allow-Origin: *` with a `CORS_ORIGINS` allow-list, mirroring
   the Search API.

**B. Build-time env** (`.env.production`, then rebuild — `VITE_*` are baked in):

```
VITE_SEARCH_API_URL=https://api-search.colegioaltavista.com.br
VITE_LOCAL_API_URL=https://api-checkout.colegioaltavista.com.br
VITE_CHECKOUT_LOCAL_MODE=true
```

**C. CORS** (`ecosystem.config.cjs` env for both APIs):

```
CORS_ORIGINS=https://search.colegioaltavista.com.br,https://checkout.colegioaltavista.com.br
```

Both subdomains must be allowed on **both** APIs, because the checkout frontend
calls the Search API for primary login.

---

## 5. Cloudflare Tunnel plan + Windows commands

`cloudflared` config (`C:\Users\<user>\.cloudflared\config.yml`):

```yaml
tunnel: <TUNNEL_ID>
credentials-file: C:\Users\<user>\.cloudflared\<TUNNEL_ID>.json
ingress:
  - hostname: search.colegioaltavista.com.br
    service: http://localhost:5173
  - hostname: checkout.colegioaltavista.com.br
    service: http://localhost:5173
  - hostname: api-search.colegioaltavista.com.br
    service: http://localhost:3001
  - hostname: api-checkout.colegioaltavista.com.br
    service: http://localhost:3333
  - service: http_status:404
```

Windows server commands (PowerShell):

```powershell
# 1) Install cloudflared
winget install --id Cloudflare.cloudflared

# 2) Authenticate (opens browser; select the Cloudflare account/zone)
cloudflared tunnel login

# 3) Create the tunnel (note the TUNNEL_ID it prints)
cloudflared tunnel create veritus

# 4) Write config.yml (contents above)

# 5) Publish the hostnames.
#    - Path A (zone on Cloudflare) OR Path B (after the Route 53 NS delegation):
cloudflared tunnel route dns veritus search.colegioaltavista.com.br
cloudflared tunnel route dns veritus checkout.colegioaltavista.com.br
cloudflared tunnel route dns veritus api-search.colegioaltavista.com.br
cloudflared tunnel route dns veritus api-checkout.colegioaltavista.com.br

# 6) Run as a Windows service (starts on boot, outbound-only)
cloudflared service install
cloudflared tunnel run veritus   # or rely on the installed service

# 7) Rebuild the frontend with the new VITE_ envs, then (re)start PM2
cd C:\veritus\veritus-community
npm run build
pm2 restart ecosystem.config.cjs --update-env
pm2 save
```

No firewall/port-forwarding changes — the tunnel is outbound-only.

---

## 6. CORS notes

- **Search API** already reads `CORS_ORIGINS` (comma-separated) and reflects the
  matching origin. Set it to both subdomains (§4-C).
- **Checkout API** currently sends `Access-Control-Allow-Origin: *`. It works
  (Bearer tokens in headers, no cookies → wildcard is valid), but should be
  changed to the same `CORS_ORIGINS` allow-list for least privilege (§4-A.3).
- Requests are **same-scheme HTTPS**; no mixed-content issues once everything is
  behind the tunnel.

---

## 7. Security notes

- Tunnel is **outbound-only** — no inbound ports, no public IP exposure of the
  Windows box.
- `staff_users.modules` remains the real boundary, enforced at **API + UI**.
  Subdomains are entry points / branding, not the security perimeter.
- Recommend **Cloudflare Access** in front of `search.` (and ideally
  `api-search.`) for a second factor on sensitive secretaria/student data.
- Tighten Checkout API CORS from `*` to the allow-list.
- Keep Postgres bound to `localhost` only; both APIs already connect locally.
- JWTs are 12h; tokens are per-module (`veritus_api_token`, `cav_local_checkout_token`).

---

## 8. Open questions (decide before implementing)

1. **DNS path:** Path A (move the zone to Cloudflare) or **Path B (keep Route 53,
   delegate the 4 subdomains)**? Path B preserves the current Route 53 / Hub
   setup and is the recommended default.
2. **API subdomain names:** OK with `api-search.` / `api-checkout.`? (Or prefer
   the no-CORS same-origin `/api` variant on just `search.` / `checkout.`, which
   needs a small auth/client refactor?)
3. **Network exposure:** put Cloudflare Access on `search.` (and `api-search.`)?
   Recommended for the sensitive secretaria data.
4. **Server paths/IP:** confirm the repo path on the server (`C:\veritus\…`?),
   that PostgreSQL runs as a service on boot, and the cloudflared user profile path.

---

## 9. Out of scope / unchanged

- No changes to `cav-onboarding` / the Alta Vista Hub.
- No command palette / documentation search added to the Hub.
- `DATABASE_URL` stays local (`postgres://localhost:5432/veritus_os`).
- This document is a proposal; code/env/DNS changes are applied only after approval.
```
