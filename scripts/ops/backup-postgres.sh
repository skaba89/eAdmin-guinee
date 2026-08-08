#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

: "${PG_BACKUP_URL:?PG_BACKUP_URL must contain a PostgreSQL connection URL dedicated to backups}"

BACKUP_DIR="${BACKUP_DIR:-./backups/postgres}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
HOSTNAME_SAFE="$(hostname | tr -cd '[:alnum:]._-')"
BASE_NAME="eadmin-${TIMESTAMP}-${HOSTNAME_SAFE:-host}"
DUMP_FILE="${BACKUP_DIR}/${BASE_NAME}.dump"
CHECKSUM_FILE="${DUMP_FILE}.sha256"
METADATA_FILE="${DUMP_FILE}.meta"

mkdir -p "${BACKUP_DIR}"

cleanup_partial() {
  rm -f "${DUMP_FILE}.partial" "${CHECKSUM_FILE}.partial" "${METADATA_FILE}.partial"
}
trap cleanup_partial ERR INT TERM

printf 'Starting PostgreSQL logical backup at %s\n' "${TIMESTAMP}"
pg_dump \
  --dbname="${PG_BACKUP_URL}" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-acl \
  --file="${DUMP_FILE}.partial"

# A backup that pg_restore cannot list is considered invalid and is never promoted.
pg_restore --list "${DUMP_FILE}.partial" >/dev/null
mv "${DUMP_FILE}.partial" "${DUMP_FILE}"

(
  cd "${BACKUP_DIR}"
  sha256sum "$(basename "${DUMP_FILE}")"
) >"${CHECKSUM_FILE}.partial"
mv "${CHECKSUM_FILE}.partial" "${CHECKSUM_FILE}"

{
  printf 'created_at_utc=%s\n' "${TIMESTAMP}"
  printf 'format=pg_dump_custom\n'
  printf 'sha256=%s\n' "$(cut -d' ' -f1 "${CHECKSUM_FILE}")"
  printf 'size_bytes=%s\n' "$(wc -c <"${DUMP_FILE}" | tr -d ' ')"
  printf 'retention_days=%s\n' "${RETENTION_DAYS}"
} >"${METADATA_FILE}.partial"
mv "${METADATA_FILE}.partial" "${METADATA_FILE}"

# Optional off-host copy. The alias must already be configured by the runtime
# secret/bootstrap layer; credentials are intentionally never accepted here.
if [[ -n "${MC_BACKUP_TARGET:-}" ]]; then
  command -v mc >/dev/null 2>&1 || {
    echo 'MC_BACKUP_TARGET is set but the MinIO client (mc) is unavailable.' >&2
    exit 1
  }
  mc cp "${DUMP_FILE}" "${CHECKSUM_FILE}" "${METADATA_FILE}" "${MC_BACKUP_TARGET%/}/postgres/"
fi

if [[ "${RETENTION_DAYS}" =~ ^[0-9]+$ ]] && (( RETENTION_DAYS > 0 )); then
  find "${BACKUP_DIR}" -type f \
    \( -name 'eadmin-*.dump' -o -name 'eadmin-*.dump.sha256' -o -name 'eadmin-*.dump.meta' \) \
    -mtime "+${RETENTION_DAYS}" -delete
fi

printf 'Backup verified: %s\n' "${DUMP_FILE}"
printf '%s\n' "${DUMP_FILE}"
