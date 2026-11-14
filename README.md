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

Everything lives under `/api/v1`. There is no authentication in Phase A
(CLAUDE.md rule 1); `ACCESS CONTROL LATER` marks where it will go.

### Staff

| Endpoint | Purpose |
| --- | --- |
| `GET /procedure_templates` | Templates with their ordered stages |
| `GET /episodes` | Active episodes, most urgent first; `?q=` matches alias or bed |
| `POST /episodes` | Create from `patient_alias`, `procedure_template_id`, `ward_or_bed` |
| `PATCH /episodes/:id` | Change the alias or ward/bed only |
| `POST /episodes/:id/advance` | Move one stage; requires an `Idempotency-Key` header |
| `POST /episodes/:id/undo` | Reverse the latest advance, if it is under two minutes old |
| `POST /episodes/:id/flag` | Set `status_flag` (`delayed` or `call_care_team`) and optional `delay_reason` |
| `POST /episodes/:id/flag/clear` | Return the episode to `normal` |

Episodes come back as `{ "episode": { ... } }`; `GET /episodes` returns
`{ "episodes": [ ... ] }`. Each one carries its `tracking_code` and
`family_path` (`/p/{code}`). Single-episode responses include `history`, newest
first — one entry per `stage_event`.

`GET /episodes` lists flagged and overdue episodes first (overdue means: in the
current stage longer than that stage's `expected_minutes`) and omits discharged
episodes. Search is a case-insensitive `ILIKE`; `%` and `_` are literal.

### Rules

- `advance` takes a row lock and requires an `Idempotency-Key`. Repeating a key
  returns the original result and writes no second event; using another
  episode's key is a `409`.
- Entering the terminal stage sets `discharged_at` and `link_expires_at`
  (`EPISODE_LINK_TTL_DAYS`, default 7).
- `undo` works only when the latest position change was an advance less than two
  minutes ago, and only once per advance.
- Every accepted change writes a `stage_event`. Repeating the current flag, or
  clearing an already-clear flag, changes nothing, so it writes no event.
  Alias and bed edits are not stage events.

Errors look like `{ "error": "terminal_stage", "message": "..." }`: `400`
missing key, `404` unknown episode, `409` key conflict, `422` a rule rejected
the change.

### Family

| Endpoint | Purpose |
| --- | --- |
| `GET /family/:tracking_code` | The progress page. The tracking code is the only access |

The response is exactly what the family page renders, and nothing else:

```json
{
  "patient_alias": "Patient A",
  "procedure": "Day Surgery",
  "stages": [
    { "label": "Admitted", "family_explanation": "They have arrived and are settling in.", "state": "done" },
    { "label": "Preparing", "family_explanation": "The care team is getting things ready.", "state": "current" },
    { "label": "Heading to theatre", "family_explanation": "They are on their way now.", "state": "upcoming" }
  ],
  "current_stage": { "label": "Preparing", "family_explanation": "The care team is getting things ready.", "state": "current" },
  "special_status": { "kind": "delayed", "message": "The team is running a little behind schedule. We will keep updating this page." },
  "what_happens_next": "They are on their way to the procedure room now.",
  "expected_duration": { "min_minutes": 35, "max_minutes": 55 },
  "last_updated_at": "2026-11-14T06:00:00Z",
  "hospital_contact": { "phone": "0000 000 000", "text": "The care team can be reached through the ward." },
  "hospital_visiting": "Visiting is arranged with the ward. Please call before you visit."
}
```

- `state` is `done`, `current` or `upcoming`. `special_status` is `null` unless
  staff flagged the episode; its `message` is approved wording from
  `FamilyMessageCatalog`, never the raw `delay_reason`. `expected_duration` is a
  range (±25%, rounded to five minutes) so the page never suggests a precise
  time, and `null` when the stage has no expected time.
- No ids, bed numbers, tracking code, delay reason or staff detail. A request
  spec asserts the exact key set.
- Unknown code → `404` `{ "error": "not_found", "message": ... }`. Expired link
  (`link_expires_at` in the past) → `410` `{ "error": "link_expired", ... }`.
- Responses carry an `ETag` and `Last-Modified`; a poll with a matching
  `If-None-Match` gets a `304` and no body. Contact and visiting text come from
  `HOSPITAL_CONTACT_PHONE`, `HOSPITAL_CONTACT_TEXT` and `HOSPITAL_VISITING_TEXT`.

Rack::Attack's Railtie mounts the middleware; the rules live in
`config/initializers/rack_attack.rb`:

- family requests: `RACK_ATTACK_FAMILY_LIMIT` per IP per minute (default 30, so
  a page polling every ten seconds fits several times over);
- repeated unknown codes: every 404 counts against the IP, and after
  `RACK_ATTACK_FAMILY_MISS_LIMIT` misses in ten minutes (default 10) the IP is
  blocked for an hour. Real links and expired links never count.

Both refusals answer `429` with "Too many requests. Please call the care team."

### Health

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Liveness + database check, no patient data |

```json
{ "status": "ok", "database": "ok", "checked_at": "2026-11-14T06:00:00Z" }
```

`status` is `ok` or `degraded` (the API answered but the database did not).
The web app calls this server-side only; the browser never talks to the API.

## Data model

| Table | Purpose |
| --- | --- |
| `procedure_templates` | A procedure type and whether staff can use it |
| `stage_templates` | Ordered, plain-language stages for one procedure |
| `episodes` | One patient's journey; `tracking_code` is the family's access |
| `stage_events` | What staff did, when, and an optional idempotency key |

All four use UUID primary keys. Fields are deliberately minimal (CLAUDE.md
rule 2): no diagnoses, notes, results, ID numbers or images.

`db/seeds.rb` creates two templates (Day Surgery, Orthopaedic Surgery) with nine
stages each, plus three episodes at different stages, and prints a
`/p/{tracking_code}` link for each.

## Environment

Copy the examples and edit if your setup differs. No secrets exist yet, because
Phase A has no authentication.

`api/.env` — `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USERNAME`,
`DATABASE_PASSWORD`, `CORS_ORIGINS`, `RACK_ATTACK_ENABLED`,
`RACK_ATTACK_FAMILY_LIMIT`, `RACK_ATTACK_FAMILY_MISS_LIMIT`,
`RACK_ATTACK_STAFF_LIMIT`, `EPISODE_LINK_TTL_DAYS`, `HOSPITAL_CONTACT_PHONE`,
`HOSPITAL_CONTACT_TEXT`, `HOSPITAL_VISITING_TEXT`, `FAMILY_BLOCKED_WORDS`.

`web/.env.local` — `API_BASE_URL`, `NEXT_PUBLIC_POLL_INTERVAL_MS`.

## Tests

- `api/spec` — RSpec: health contract, CORS allow/deny, stage sequence rules,
  tracking codes, delay/status rules, event idempotency, every
  `StageTransitionService` rule (advance, terminal stage, idempotent replay,
  undo window, flags), the episode endpoints, real threaded concurrency, the
  family payload (exact key set, stage states, wording, ETag/304, 404 and 410),
  both Rack::Attack limits, and the blocked-word check over
  `FamilyMessageCatalog`.
- `web/src/**/*.test.ts(x)` — Vitest: health payload mapping, prototype banner.
- `web/e2e` — Playwright: home page shows the banner and `API: ok`.

The concurrency specs (and only those) run without transactional fixtures so
two threads can see each other's commits; they clean up after themselves. The
family specs clear Rack::Attack's counters before each example so throttles do
not leak between them.

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
- Further access control and the web side of the family page (`/p/[code]`) are
  Phase B — the places to add them are marked `ACCESS CONTROL LATER` in the
  code.
