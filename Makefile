SHELL := /bin/bash

.PHONY: setup install env db-up db-prepare dev test lint db-reset seed

## First-run: dependencies, env files, database.
setup: install env db-up db-prepare
	@echo ""
	@echo "Setup complete. Run 'make dev' and open http://localhost:3000"

install:
	cd api && bundle install
	cd web && npm install

env:
	@test -f api/.env || cp api/.env.example api/.env
	@test -f web/.env.local || cp web/.env.example web/.env.local
	@echo "Environment files ready."

# Postgres for local development. If you already run PostgreSQL, skip this and
# point DATABASE_HOST/PORT/USERNAME/PASSWORD at it in api/.env.
db-up:
	docker compose up -d postgres

db-prepare:
	cd api && bin/rails db:prepare

## Both apps in the foreground; Ctrl-C stops both.
dev:
	@echo "API -> http://localhost:3001"
	@echo "Web -> http://localhost:3000"
	@trap 'kill 0' INT TERM EXIT; \
	(cd api && bin/rails server -p 3001) & \
	(cd web && npm run dev) & \
	wait

test:
	cd api && RAILS_ENV=test bin/rails db:prepare
	cd api && bundle exec rspec
	cd web && npm test

lint:
	cd api && bundle exec rubocop
	cd api && bundle exec brakeman -q --no-pager
	cd web && npm run lint
	cd web && npx tsc --noEmit

db-reset:
	cd api && bin/rails db:reset

seed:
	cd api && bin/rails db:seed
