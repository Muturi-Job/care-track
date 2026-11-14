# CLAUDE.md

CareTrack — Phase A prototype.

Family members of a hospital patient follow progress through a procedure. Staff
update the stage with one tap; family watch a calm, live progress page from a
private link. This repo is a spike to test the idea, not a product.

## Stack

| Part | Tech | Port |
| --- | --- | --- |
| `api/` | Ruby on Rails 8, API-only, PostgreSQL | 3001 |
| `web/` | Next.js (App Router), TypeScript, Tailwind | 3000 |
| root | Makefile, docker-compose, GitHub Actions | — |

One monorepo, two independently runnable apps. The browser only ever talks to
`web/`; `web/` calls `api/` server-side.

## Non-negotiable rules

1. **No authentication.** No sign-in, accounts, roles, tokens, OTP, consent
   flows, authorisation policies. No gems or packages that provide them.
   Instead, at every controller action and page that will one day need access
   control, leave exactly one short comment:
   `# ACCESS CONTROL LATER: ...` (TypeScript: `// ACCESS CONTROL LATER: ...`).
2. **Minimum data.** Persist only: patient alias or first name, bed,
   procedure, stage, timestamps. Never add fields for diagnoses, notes,
   results, ID numbers, contacts, or images. When tempted to add a column,
   don't.
3. **Family access is the tracking code alone.** A family member reaches an
   episode only via a long random code in the URL (`/p/{code}`). Generate with
   `SecureRandom.urlsafe_base64(24)` or stronger; unique index on the column;
   never derive it from patient data. The family API returns only the fields
   the progress page renders, and is rate-limited (Rack::Attack, per IP, limits
   from env).
4. **Tone.** Family-facing copy is calm, plain, non-clinical. No diagnoses,
   findings, outcomes, prognoses, or numeric timings that imply a result. Any
   state the page cannot explain shows: **"Please call the care team."**
5. **Simplicity.** The simplest thing that works. No websockets, no background
   workers, no job queue, no push, no SMS/WhatsApp/email. Family page polls
   every 10 seconds. No caching layer, no state library, no design system.
6. **Quality.** Tests cover the business rules (stage transitions, family
   payload shape, code lookup, rate limiting, fallback copy). Small functions.
   Configuration via environment variables, documented in `.env.example`.
7. **Banner always.** Every screen renders
   `CareTrack prototype - demo data only`. No exceptions, including error and
   `not-found` pages.

## Stage vocabulary

Stages are data, not an enum: each `procedure_template` owns an ordered list of
`stage_templates` (positions `1..n`, exactly one terminal stage), enforced by
`StageSequenceValidator`. Family copy lives on the stage itself (`label`,
`family_explanation`), so changing wording is a data change, not a code change.
Both seed templates share nine stages: Admitted, Preparing, Heading to theatre,
Procedure started, Procedure complete, In recovery, Moved to ward, Ready for
visitors, Discharged.

`episodes.current_stage_position` points into its template's sequence. Any
stage the page cannot explain is unknown → rule 4 fallback copy.

## Folder structure

```
care-track/
  CLAUDE.md  README.md  Makefile  docker-compose.yml
  .github/workflows/ci.yml  lint + test + build for both apps
  api/                      Rails 8 API, RSpec (bin/rails generated with --skip-test)
    app/controllers/api/v1/   health, staff episodes + family progress
    app/models/               ProcedureTemplate, StageTemplate, Episode, StageEvent
    app/services/             StageTransitionService (every stage/flag change)
    app/serializers/          Episode + ProcedureTemplate JSON
    app/validators/           StageSequenceValidator (contiguous, one terminal)
    config/initializers/      cors.rb, rack_attack.rb
    db/                       migrations, seeds.rb
    spec/                     model, service, request specs, factories
    .env.example
  web/                      Next.js App Router, src/ directory
    src/app/                  layout (banner), page, p/[code]/page.tsx
    src/app/staff/            one-tap stage buttons
    src/components/           banner, ProgressSteps, StageButton
    src/lib/                  api client, stages, polling hook
    src/**/*.test.tsx         Vitest;  e2e/ = Playwright
    .env.example
```

## Commands

Root: `make setup` (deps, env files, Postgres, db:prepare), `make dev` (both apps),
`make test`, `make lint`, `make db-reset`, `make seed`.

```bash
cd api && bin/rails s -p 3001        # dev server
cd api && bundle exec rspec          # business-rule + request specs
cd api && bundle exec rubocop        # lint
cd api && bundle exec brakeman -q    # security scan
cd api && bin/rails db:seed          # demo episodes (Phase B) + /p/{code} URLs

cd web && npm run dev                # http://localhost:3000
cd web && npm test                   # vitest
cd web && npm run test:e2e           # playwright, both apps must be running
cd web && npm run lint && npx tsc --noEmit
cd web && npm run build              # must pass before done
```

## Environment variables

Each app has its own `.env.example`; copy to `.env` (api) / `.env.local` (web).
Never commit real values. No secret is needed, because there is no auth.

```
# api/.env.example
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=postgres
CORS_ORIGINS=http://localhost:3000
RACK_ATTACK_ENABLED=true
RACK_ATTACK_FAMILY_LIMIT=60          # requests per IP per hour
RACK_ATTACK_STAFF_LIMIT=600
EPISODE_LINK_TTL_DAYS=7             # family link lifetime after discharge

# web/.env.example
API_BASE_URL=http://localhost:3001
NEXT_PUBLIC_POLL_INTERVAL_MS=10000
```

## Definition of Done

- [ ] `CLAUDE.md` rules 1–7 each satisfied; no auth gem/package in either
      lockfile, and an `ACCESS CONTROL LATER` comment sits at each entry point.
- [ ] `episodes` table holds no field beyond the rule 2 list; migration reviewed
      against it.
- [ ] Stage sequence is contiguous `1..n` with exactly one terminal stage;
      `bundle exec rspec` proves it.
- [ ] Tracking code is random, unique-indexed, non-enumerable; family route
      works with the code alone and 404s otherwise.
- [ ] Family API response contains only: alias, bed, procedure, stage, updated
      timestamp. Verified by a request spec asserting the exact key set.
- [ ] Rate limit returns 429 when exceeded, and has a spec.
- [ ] Every stage key has calm copy; unknown stage or stale/error response
      renders "Please call the care team."
- [ ] Progress page polls at `NEXT_PUBLIC_POLL_INTERVAL_MS`, defaults to 10s,
      cleans up on unmount, and keeps the last good result on a failed poll.
- [ ] Banner present on every route: `/`, `/p/[code]`, `/staff`, 404, error.
- [ ] `bundle exec rspec`, `bundle exec rubocop`, `npm test`, `npm run build`,
      `npx tsc --noEmit` and `npm run lint` all pass, and CI is green.
- [ ] `api/.env.example` and `web/.env.example` exist and match the code.
- [ ] `make setup && make dev` starts both apps; the home page shows `API: ok`.
