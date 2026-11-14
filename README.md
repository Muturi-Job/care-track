# CareTrack

Family members of a hospital patient follow the patient's progress through a
procedure. Staff update the stage with one tap; family watch a calm, live
progress page from a private link.

**Phase A prototype — demo data only.** There is no authentication and no real
patient data. Read [`CLAUDE.md`](./CLAUDE.md) before changing anything; it holds
the non-negotiable rules.

```
api/   Rails 8 API-only + PostgreSQL   -> http://localhost:3001
web/   Next.js (App Router) + Tailwind -> http://localhost:3000
```

## Requirements

| Tool | Version | Needed for |
| --- | --- | --- |
| Ruby | 3.4 | `api/` |
| Node.js | 22 (>= 20.9) | `web/` |
| PostgreSQL | 16 | database, via Docker or local install |
| Docker | any recent | `make db-up` / `docker compose up` |
| GNU make | any | the `make` shortcuts (optional) |

No Make, or on Windows? Run the commands in [Commands](#commands) directly.

## Quick start

```bash
make setup    # gems, npm packages, .env files, starts Postgres, prepares the DB
make dev      # api on :3001 and web on :3000, Ctrl-C stops both
```

Open <http://localhost:3000>. You should see the prototype banner and
`API: ok`. If the API is down the page shows `API: unavailable` instead — it
never errors.

`make setup` uses Docker for Postgres only. If you already run PostgreSQL, skip
it and set `DATABASE_*` in `api/.env`:

```bash
make install env db-prepare
```

To run the whole stack in containers instead:

```bash
docker compose up --build
```

Do not run `docker compose up` and `make dev` at the same time; both bind 3000
and 3001.

## Commands

| Command | What it does |
| --- | --- |
| `make setup` | Install deps, create `.env` files, start Postgres, `db:prepare` |
| `make dev` | Run API (:3001) and web (:3000) in the foreground |
| `make test` | RSpec (API) then Vitest (web) |
| `make lint` | RuboCop + Brakeman (API), ESLint + `tsc` (web) |
| `make db-reset` | `db:reset` — drop, recreate, migrate, seed |
| `make seed` | Load demo data |

Individually:

```bash
# API
cd api
bundle install
cp .env.example .env          # first time only
bin/rails db:prepare
bin/rails server -p 3001
bundle exec rspec
bundle exec rubocop
bundle exec brakeman -q --no-pager

# Web
cd web
npm install
cp .env.example .env.local    # first time only
npm run dev
npm test
npm run lint
npx tsc --noEmit
npm run build
```

End-to-end (needs both apps running, and Playwright browsers once):

```bash
cd web
npx playwright install chromium
npm run test:e2e
```

## API

| Endpoint | Purpose |
| --- | --- |
| `GET /api/v1/health` | Liveness + database check, no patient data |

```json
{ "status": "ok", "database": "ok", "checked_at": "2026-11-14T06:00:00Z" }
```

`status` is `ok` or `degraded` (the API answered but the database did not).
The web app calls this server-side only; the browser never talks to the API.

## Environment

Copy the examples and edit if your setup differs. No secrets exist yet, because
Phase A has no authentication.

`api/.env` — `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USERNAME`,
`DATABASE_PASSWORD`, `CORS_ORIGINS`, `RACK_ATTACK_ENABLED`,
`RACK_ATTACK_FAMILY_LIMIT`, `RACK_ATTACK_STAFF_LIMIT`.

`web/.env.local` — `API_BASE_URL`, `NEXT_PUBLIC_POLL_INTERVAL_MS`.

## Tests

- `api/spec` — RSpec: health endpoint contract, CORS allow/deny.
- `web/src/**/*.test.ts(x)` — Vitest: health payload mapping, prototype banner.
- `web/e2e` — Playwright: home page shows the banner and `API: ok`.

Business rules (stages, tracking codes, rate limits) get their tests in Phase B
as those features land.

## CI

`.github/workflows/ci.yml` runs on push to `main` and on pull requests:

- **api** — Postgres service, RuboCop, Brakeman, RSpec.
- **web** — ESLint, `tsc --noEmit`, Vitest, `next build`.

## Notes

- `api/Gemfile.lock` is not committed yet: the first `bundle install` (local or
  CI) resolves and writes it. Commit it, then CI can cache it.
- Test databases: `care_track_test`; development: `care_track_development`.
- `next build` does not need a running API: the home page is forced dynamic and
  treats an unreachable API as `unavailable`.
- Further access control, tracking codes and stage updates are Phase B — the
  places to add them are marked `ACCESS CONTROL LATER` in the code.
