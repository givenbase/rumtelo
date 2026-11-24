# Rumtelo CI/CD (GitHub Actions)

**Repo:** [github.com/givenbase/rumtelo](https://github.com/givenbase/rumtelo)

Rumtelo-focused workflows only. No Docker image build / single-app deploy / GHCR
cleanup yet (no app Dockerfiles). Add those when images exist.

## GitHub Environments

Use **exactly two** under **Settings → Environments**:

| GitHub environment | Branch default | Backend `NODE_ENV` | Config source |
|--------------------|----------------|--------------------|---------------|
| `staging` | `dev` (when present) | `production` | staging secrets/vars |
| `production` | `main` | `production` | production secrets/vars |

Local `NODE_ENV=development` is **not** a GitHub environment. Do not create `dev` / `development` envs.

Resolution: [`.github/actions/resolve-deploy-environment`](../actions/resolve-deploy-environment/action.yml).

## Required keys (per environment)

Match `apps/backend/.env.example` and app `get-env.ts`:

| Key | Type | Used by |
|-----|------|---------|
| `DATABASE_URL` | secret | migrate — **public** Railway Postgres TCP URL (not `*.railway.internal`) |
| `BETTER_AUTH_SECRET` | secret | migrate / auth |
| `DOMAIN_APP` | var | migrate, e2e (public HTTPS) |
| `DOMAIN_WEB` | var | migrate (public HTTPS) |
| `DOMAIN_BACK` | var | migrate env validation |
| `DOMAIN_BACK_PUBLIC` | var | api-smoke, e2e (public Nest HTTPS; preferred over `DOMAIN_BACK` for probes) |
| `DATABASE_SSL` | var | optional (`true` on managed Postgres) |
| `E2E_*_EMAIL` / `E2E_*_PASSWORD` | secret | optional e2e (defaults = seed demos) |

CI runners are outside Railway’s private mesh — never point `DATABASE_URL`, smoke, or e2e at `*.railway.internal`.
On Railway, Application’s server-only `DOMAIN_BACK` is the private Nest URL for proxies.

### Sync from your machine

```bash
pnpm sync:github-secrets:init        # creates .env.github.*.{staging,production}
# fill real values in those four files (gitignored)
pnpm sync:github-secrets             # push both envs via gh CLI
pnpm sync:github-secrets:staging     # staging only
pnpm sync:github-secrets:production  # production only
```

Templates: `.env.github.secrets.example`, `.env.github.vars.example`. Script: `scripts/sync-github-secrets.js`.

## Workflows

| Workflow | Purpose |
|----------|---------|
| `db-migrate.yml` | Applies schema on remote DB when migration/auth files push (or manual); then API smoke. Locally `pn db:push` already chains Mikro + `auth:migrate`. |
| `api-smoke.yml` | `/health*` must not 5xx (strict ready after migrate) |
| `e2e-smoke.yml` | Playwright `@smoke` against staging application |
| `ci.yml` | Static gate on every pull request and every push to `dev` / `main` — no secrets, no database: contracts build → `pnpm lint:check` (oxlint, oxfmt check, entity lint, `pnpm check-types`) → `pnpm test --filter='!@rumtelo/e2e'` (backend Vitest, utils + i18n node:test) → contracts and application node:test via `tsx --test` → `next build` of application and website |
| `i18n-keys.yml` | Every message key used in application/website/ui exists in every `languages/*.json`; catalogs match `translations/` (`pnpm --filter @rumtelo/i18n test`) |

`ci.yml` notes:

- It reports; it does not stop a deploy by itself. Railway builds from the branch whether the run is green or red. To make it blocking, mark the check **Lint, types, tests, build** as required in branch protection, or turn on Railway's wait-for-CI for the services.
- Root `pnpm test` is `turbo run test` and includes `@rumtelo/e2e` (Playwright). `ci.yml` filters it out; `e2e-smoke.yml` owns Playwright.
- The Next builds validate the public origins at build time (`get-env.ts`). `ci.yml` sets `NEXT_PUBLIC_DOMAIN_APP` / `_WEB` / `_BACK` to the local dev defaults (`http://localhost:3000` / `3001` / `3002`) — placeholders, not secrets; nothing is deployed from the job.
- New EN keys without regenerated `languages/*.json` fail the i18n tests here (and in `i18n-keys.yml`): run `pnpm i18n:gen` before pushing.

`db:push` / `db:seed` run via `oxnode` scripts (not `@mikro-orm/cli`) so CI is not hit by the Node 22.22.3+ `yargonaut` / `require.cache` crash under `--import @oxc-node/core/register`. They also build `@rumtelo/contracts` first (`dist/` is required by package exports). Workflows pin Node **22.22.2**.

Manual runs: **Actions** → pick workflow → choose `staging` or `production`.

Local smoke: `BACKEND_URL=https://… pnpm api:smoke`

## Intentionally omitted (for now)

- `docker-build.yml` / `deploy-single-app.yml` / `cleanup-packages.yml` — need Dockerfiles + GHCR org packages
