#!/usr/bin/env bash
set -Eeuo pipefail

DATABASE_PATH="${DATABASE_PATH:-/var/lib/todoslate/tasks.sqlite3}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/todoslate}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DESTINATION="${BACKUP_DIR}/todoslate-${STAMP}.sqlite3.gz"

umask 077
mkdir -p -- "$BACKUP_DIR"
TEMP_FILE="$(mktemp "${BACKUP_DIR}/.todoslate-${STAMP}.XXXXXX")"

cleanup() {
  rm -f -- "$TEMP_FILE"
}
trap cleanup EXIT

sqlite3 "$DATABASE_PATH" ".timeout 5000" ".backup '$TEMP_FILE'"

if [ "$(sqlite3 "$TEMP_FILE" 'PRAGMA quick_check;')" != "ok" ]; then
  echo "Yedek bütünlük kontrolünden geçemedi." >&2
  exit 1
fi

gzip -9 -c -- "$TEMP_FILE" > "$DESTINATION"
find "$BACKUP_DIR" -maxdepth 1 -type f -name 'todoslate-*.sqlite3.gz' -mtime "+${RETENTION_DAYS}" -delete

echo "Yedek hazır: $DESTINATION"
