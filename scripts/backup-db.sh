#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/compose.prod.yaml}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups/mysql}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP="$(date +"%Y-%m-%d_%H-%M-%S")"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

if [[ ! -f "$COMPOSE_FILE" ]]; then
  echo "Missing compose file: $COMPOSE_FILE" >&2
  exit 1
fi

# Load only the keys we need for the backup command.
set -a
source "$ENV_FILE"
set +a

DB_NAME="${MYSQL_DATABASE:-}"
DB_USER="${MYSQL_USER:-${MYSQL_ROOT_USER:-root}}"

if [[ -z "$DB_NAME" ]]; then
  echo "MYSQL_DATABASE is not set in $ENV_FILE" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

OUTPUT_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

docker compose -f "$COMPOSE_FILE" exec -T db sh -lc \
  'exec mysqldump \
    --single-transaction \
    --quick \
    --routines \
    --triggers \
    -u"$0" \
    -p"$1" \
    "$2"' \
  "$DB_USER" "${MYSQL_PASSWORD:-${MYSQL_ROOT_PASSWORD:-}}" "$DB_NAME" | gzip > "$OUTPUT_FILE"

find "$BACKUP_DIR" -type f -name '*.sql.gz' -mtime "+$RETENTION_DAYS" -delete

echo "Backup written to $OUTPUT_FILE"
