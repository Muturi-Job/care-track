#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_FILE="$BACKUP_DIR/care-track-$TIMESTAMP.dump"
TEMP_FILE="$BACKUP_FILE.partial"

mkdir -p "$BACKUP_DIR"
trap 'rm -f "$TEMP_FILE"' EXIT

docker compose --project-directory "$ROOT_DIR" -f "$ROOT_DIR/docker-compose.prod.yml" \
  exec -T postgres sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump --format=custom --no-owner --username="$POSTGRES_USER" "$POSTGRES_DB"' \
  > "$TEMP_FILE"

test -s "$TEMP_FILE"
ln "$TEMP_FILE" "$BACKUP_FILE"
rm "$TEMP_FILE"
trap - EXIT
printf 'Database backup written to %s\n' "$BACKUP_FILE"
