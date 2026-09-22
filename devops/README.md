# Deployment

## Local

```bash
pnpm infra:up      # Postgres + Redis in Docker
pnpm db:migrate    # apply migrations
pnpm dev           # all three apps
```

| App | Port | Purpose |
|-----|------|---------|
| `@rumtelo/application` | 3000 | the authenticated product |
| `@rumtelo/website` | 3001 | marketing site |
| `@rumtelo/backend` | 3002 | NestJS + oRPC API |

## Railway (EU)

Five services in one project, all in the **europe-west4 (Amsterdam)** region so
Dutch bank transaction data stays EU-resident under GDPR:

1. **postgres** — Railway Postgres plugin. Enable daily backups before real data lands.
2. **redis** — Railway Redis plugin.
3. **backend** — root `/`, start `pnpm start:backend`.
4. **application** — root `/`, start `pnpm start:application` — product app.
5. **website** — root `/`, start `pnpm start:website` — marketing + **sign-up / verify / reset** (`rumtelo.com`).

Email verification links are rewritten to **DOMAIN_WEB** and hit
`https://<website>/api/auth/verify-email` → Website Next proxy → Nest. The Website
service must be live and that hostname must resolve to **Website**, not Backend.
The auth proxy must use `redirect: 'manual'` — otherwise Nest’s 302 for
`callbackURL` is followed inside Next and the browser gets HTTP 500.

### Private vs public

```
Browser ──HTTPS──► Website (public)     ── /api/auth ──┐
Browser ──HTTPS──► Application (public) ── /api/auth   ├─► Backend (Nest)
                      │  /api/backend                  │
                      └────────────────────────────────┘
                   Backend
                      ├── Postgres (private)
                      └── Redis (private)
```

| Variable | Service | Value |
|----------|---------|-------|
| `DATABASE_URL` | Backend | `${{Postgres.DATABASE_URL}}` — must include `/dbname` path |
| `DATABASE_SSL` | Backend | `true` |
| `DATABASE_SYNC` | Backend | `false` |
| `DATABASE_REDIS_URL` | Backend | `${{Redis.REDIS_URL}}` (`redis://` / `rediss://`) — Better Auth rate limits + session cache, Nest HTTP Throttler, sign-up stash; Nest health probe |
| `DOMAIN_BACK` | Backend + Application + Website (server) | `http://${{Backend.RAILWAY_PRIVATE_DOMAIN}}:${{Backend.PORT}}` — see note below |
| `DOMAIN_BACK_PUBLIC` | Backend | `https://${{Backend.RAILWAY_PUBLIC_DOMAIN}}` |
| `DOMAIN_APP` / `DOMAIN_WEB` | Backend | Public HTTPS — no www (`https://app.rumtelo.com`, `https://rumtelo.com`) |
| `NEXT_PUBLIC_DOMAIN_APP` | Application + Website (build) | Same as `DOMAIN_APP` |
| `NEXT_PUBLIC_DOMAIN_WEB` | Application + Website (build) | Same as `DOMAIN_WEB` (`https://rumtelo.com`) |
| `NEXT_PUBLIC_DOMAIN_BACK` | Application + Website (build) | Backend **public** HTTPS (optional; not used by proxies) |

Private mesh uses **http + PORT** (no TLS). Public uses **https**. Browsers never call
`.railway.internal`.

**Private `DOMAIN_BACK` port:** Railway’s `${{Backend.PORT}}` reference is **empty** unless
you set a variable named `PORT` on the **Backend** service yourself (e.g. `PORT=8080`).
It does **not** auto-resolve to Railway’s runtime-injected listen port. Nest already
reads `process.env.PORT`, so:

1. Backend → Variables → add `PORT=8080` (or any free port you prefer).
2. Application + Website → `DOMAIN_BACK=http://${{Backend.RAILWAY_PRIVATE_DOMAIN}}:${{Backend.PORT}}`

You should then see a real URL like `http://backend.railway.internal:8080`.

### Custom domain + Cloudflare (Error 1000)

**Cloudflare Error 1000** (`DNS points to prohibited IP`) is **not** a missing Next
route. Cloudflare never reaches Railway — usually a bad A/CNAME (another Cloudflare
IP, a private IP, or a double-proxy loop).

1. **Railway → Website → Networking** — add `rumtelo.com` (and `www`). Copy the CNAME
   target (e.g. `….up.railway.app`).
2. **Cloudflare → DNS** — `CNAME` `@`/`www` → that Railway host. Prefer **DNS only**
   (grey cloud) until it works; orange-cloud often causes Error 1000 with Railway.
3. Do **not** point an A record at a Cloudflare anycast IP or `*.railway.internal`.
4. Set `DOMAIN_WEB` / `NEXT_PUBLIC_DOMAIN_WEB` = `https://rumtelo.com` on Backend + Website.

Until DNS hits the Website service, `/api/auth/verify-email` never runs — the proxy in
`apps/website/app/api/auth/[...all]/route.ts` never sees the request.

See `apps/backend/.env.example`, `apps/application/.env.example`, and
`apps/website/.env.example`. Use `DATABASE_SSL=true` and `DATABASE_SYNC=false`
in production.

Estimated cost at the owner-plus-friends stage: roughly $5–10/month.
