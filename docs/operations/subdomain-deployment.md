# Subdomain Deployment — VeritusOS

## Architecture

Single React app, one Vite build. Module detected at runtime from hostname.

```
out.colegioaltavista.com.br   → Checkout module (Saída de Alunos)
ache.colegioaltavista.com.br  → Search module (Secretaria / Pesquisa)
localhost:5173                → Development (all modules)
```

## How Module Detection Works

File: `src/core/config/moduleContext.jsx`

```
1. Check VITE_VERITUS_MODULE env var (build-time override)
2. Check hostname prefix:
   - out.*  → checkout
   - ache.* → search
3. Default → all (development mode)
```

## Behavior by Module

| Aspect | out.* (Checkout) | ache.* (Search) | localhost (Dev) |
|--------|-----------------|----------------|-----------------|
| Home route | /checkout | /search | Role-based |
| Login branding | Green, "Saída" | Indigo, "Secretaria" | Blue, "VeritusOS" |
| Demo button | Hidden | Hidden | Visible |
| Search routes | Hidden | Visible | Visible |
| Checkout routes | Visible | Hidden | Visible |
| Auth path | Supabase first | Veritus API first | Email-based routing |

## DNS Records

```
out.colegioaltavista.com.br    A    <server-ip>
ache.colegioaltavista.com.br   A    <server-ip>
```

Or for Vercel/Netlify:
```
out.colegioaltavista.com.br    CNAME  veritus-os.vercel.app
ache.colegioaltavista.com.br   CNAME  veritus-os.vercel.app
```

Both subdomains point to the same deployment. The app detects which module to show.

## Deployment Options

### Option 1: Internal Network (Current)

```bash
# Terminal 1: API server (search/enrollment backend)
npm run api

# Terminal 2: Frontend
npm run dev -- --host
```

Access via LAN IP. No DNS needed — use IP:port directly.
For subdomain simulation: edit `/etc/hosts` on staff machines.

### Option 2: Vercel (Recommended for Production)

1. Connect repo to Vercel
2. Set env vars:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_CHECKOUT_SUPABASE_LOW_EGRESS=true`
3. Add custom domains: `out.colegioaltavista.com.br`, `ache.colegioaltavista.com.br`
4. Single deployment serves both subdomains

**Note:** The search/enrollment backend (`:3001`) must be accessible.
For Vercel, the API would need to be hosted separately (Railway, Render, or the school server).

### Option 3: Single Server (Simplest for School)

Run everything on one machine:

```bash
# Nginx reverse proxy
server {
    server_name out.colegioaltavista.com.br;
    location / { proxy_pass http://localhost:5173; }
}
server {
    server_name ache.colegioaltavista.com.br;
    location / { proxy_pass http://localhost:5173; }
    location /api/ { proxy_pass http://localhost:3001; }
}
```

## Build-Time Override

If separate builds are preferred later:

```bash
# Checkout-only build
VITE_VERITUS_MODULE=checkout npm run build

# Search-only build
VITE_VERITUS_MODULE=search npm run build
```

This doesn't reduce bundle size (both modules ship), but locks the module regardless of hostname.

## Security Notes

- `ache.*` (search/secretaria) handles sensitive student data and should only be accessible on the internal school network
- `out.*` (checkout) is used during pickup and could be on a wider network if needed
- The API server (`:3001`) should only be accessible from the internal network
- Supabase (checkout backend) is cloud-hosted and accessible from anywhere with auth
