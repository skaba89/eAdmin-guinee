#!/usr/bin/env bash
set -Eeuo pipefail

if [[ "${ALLOW_DESTRUCTIVE_RESTORE:-}" != "YES_I_UNDERSTAND" ]]; then
  echo 'Refusing restore: set ALLOW_DESTRUCTIVE_RESTORE=YES_I_UNDERSTAND explicitly.' >&2
  exit 2
fi

: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL must target the database to restore}"

DUMP_FILE="${1:-}"
if [[ -z "${DUMP_FILE}" || ! -f "${DUMP_FILE}" ]]; then
  echo 'Usage: restore-postgres.sh /path/to/eadmin-*.dump' >&2
  exit 2
fi

CHECKSUM_FILE="${DUMP_FILE}.sha256"
if [[ ! -f "${CHECKSUM_FILE}" ]]; then
  echo "Missing checksum file: ${CHECKSUM_FILE}" >&2
  exit 3
fi

(
  cd "$(dirname "${DUMP_FILE}")"
  sha256sum --check "$(basename "${CHECKSUM_FILE}")"
)

# Validate the archive before making any database change.
pg_restore --list "${DUMP_FILE}" >/dev/null

printf 'Restoring verified archive %s\n' "${DUMP_FILE}"
pg_restore \
  --dbname="${RESTORE_DATABASE_URL}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --exit-on-error \
  "${DUMP_FILE}"

printf 'Restore completed successfully. Application integrity checks are still required before traffic is reopened.\n'
