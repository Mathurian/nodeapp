#!/usr/bin/env bash
set -euo pipefail

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-event_manager}"
DB_USER="${DB_USER:-event_manager}"

if [[ -z "${PGPASSWORD:-}" ]]; then
  echo "PGPASSWORD is required"
  exit 1
fi

echo "Backfilling tenant/user attribution in activity_logs..."

psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" <<'SQL'
WITH updated AS (
  UPDATE activity_logs al
  SET
    "tenantId" = u."tenantId",
    "userName" = COALESCE(al."userName", u.name),
    "userRole" = COALESCE(al."userRole", CAST(u.role AS text))
  FROM users u
  WHERE al."userId" = u.id
    AND (
      al."tenantId" IS NULL OR
      al."userName" IS NULL OR
      al."userRole" IS NULL
    )
  RETURNING al.id
)
SELECT COUNT(*) AS updated_rows FROM updated;
SQL

echo "Backfill completed."
