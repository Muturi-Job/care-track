# CareTrack prototype runbook

The production commands below assume the repository is checked out on the
server, `.env` is configured, and the production stack was started with
`docker-compose.prod.yml`. Keep `.env` and database backups private. Only
Caddy publishes ports; do not publish the API or PostgreSQL ports.

## Deploy

1. Back up the database before deploying:

   ```sh
   /bin/bash scripts/backup-database.sh
   ```

2. Check out the intended release and rebuild:

   ```sh
   git fetch --tags
   git checkout <release-tag>
   docker compose -f docker-compose.prod.yml up -d --build
   ```

   The API container runs `rails db:prepare` before Puma starts. Watch
   `docker compose -f docker-compose.prod.yml logs -f api proxy` and confirm
   `docker compose -f docker-compose.prod.yml ps` reports the API healthy.
3. Check `https://<DOMAIN>/`, `/staff` (must request the proxy username and
   password), and a known `/f/<code>` link (must be public).

## Roll back

1. Identify the last known-good release and restore its application code:

   ```sh
   git checkout <last-known-good-tag>
   docker compose -f docker-compose.prod.yml up -d --build
   ```

2. Check the API and proxy logs and verify the site. Do not assume an older
   application can use a newer schema: migrations should be backward
   compatible with the previous release. If a migration cannot be rolled
   forward safely, restore the pre-deploy database backup rather than
   improvising a destructive schema change.

To restore a custom-format backup, first stop the API to prevent writes, then
feed the chosen backup to PostgreSQL:

```sh
docker compose -f docker-compose.prod.yml stop api
docker compose -f docker-compose.prod.yml exec -T postgres sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" dropdb --if-exists --force --username="$POSTGRES_USER" "$POSTGRES_DB" &&
   PGPASSWORD="$POSTGRES_PASSWORD" createdb --owner="$POSTGRES_USER" --username="$POSTGRES_USER" "$POSTGRES_DB"'
docker compose -f docker-compose.prod.yml exec -T postgres sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" pg_restore --no-owner --exit-on-error --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"' \
  < backups/<backup-file>.dump
docker compose -f docker-compose.prod.yml start api
```

Restoring replaces current database contents. Verify the backup filename and
coordinate downtime before running this command.

## Daily retention and nightly backup

The retention task removes episodes created more than 30 days ago, their
events and associated feedback, plus old events and feedback from newer
episodes. Run it manually with:

```sh
/bin/bash scripts/cleanup-old-data.sh
```

Install these host cron entries (replace `/opt/care-track` with the checkout
path) to run retention daily and backups nightly:

```cron
15 2 * * * /bin/bash /opt/care-track/scripts/cleanup-old-data.sh >> /var/log/care-track-cleanup.log 2>&1
30 3 * * * /bin/bash /opt/care-track/scripts/backup-database.sh >> /var/log/care-track-backup.log 2>&1
```

Backups are written to `backups/` in UTC-named custom PostgreSQL format. Keep
the directory access-restricted, copy backups to an independent storage
location, and periodically test a restore. The scripts fail on command or dump
errors and do not overwrite existing backup files.

## Reset training data

`demo:reset` is destructive: it removes **all** episodes, feedback responses,
and procedure templates, then recreates the two demo templates and three demo
episodes. Use it only when the database contains training/demo data and those
records should be discarded:

```sh
docker compose -f docker-compose.prod.yml exec -T api bundle exec rails demo:reset
```

The task prints the fresh family links. `db:seed` alone is additive and
idempotent; use `demo:reset` when a clean training dataset is required.

To apply `STAFF_CREATION_ENABLED=false` or change `EPISODE_LINK_TTL_DAYS`,
update the root `.env` and recreate the affected app containers:

```sh
docker compose -f docker-compose.prod.yml up -d
```
