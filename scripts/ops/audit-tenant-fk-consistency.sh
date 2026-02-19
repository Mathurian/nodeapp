#!/usr/bin/env bash
set -euo pipefail

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required."
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FALLBACK_URL=""
if [ -z "${DATABASE_URL:-}" ] && [ -f "${REPO_ROOT}/.env" ]; then
  ENV_FALLBACK_URL="$(grep -E '^DATABASE_URL=' "${REPO_ROOT}/.env" | head -n 1 | sed -E 's/^DATABASE_URL=//')"
  ENV_FALLBACK_URL="${ENV_FALLBACK_URL%\"}"
  ENV_FALLBACK_URL="${ENV_FALLBACK_URL#\"}"
fi

sanitize_db_url() {
  local raw_url="$1"
  printf '%s' "$raw_url" | sed -E 's/([?&])schema=[^&]*&?/\1/g; s/\?&/\?/g; s/[?&]$//'
}

if [ -n "${DATABASE_URL:-}" ]; then
  PSQL_CMD=(psql "$(sanitize_db_url "$DATABASE_URL")")
elif [ -n "$ENV_FALLBACK_URL" ]; then
  PSQL_CMD=(psql "$(sanitize_db_url "$ENV_FALLBACK_URL")")
else
  DB_HOST="${DB_HOST:-127.0.0.1}"
  DB_PORT="${DB_PORT:-5432}"
  DB_NAME="${DB_NAME:-event_manager_dev}"
  DB_USER="${DB_USER:-event_manager}"
  if [ -n "${DB_PASSWORD:-}" ]; then
    export PGPASSWORD="${DB_PASSWORD}"
  fi
  PSQL_CMD=(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME")
fi

echo "Tenant FK Consistency Audit"
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

"${PSQL_CMD[@]}" -X -v ON_ERROR_STOP=1 <<'SQL'
CREATE TEMP TABLE tenant_fk_mismatch_report (
  child_table text NOT NULL,
  child_column text NOT NULL,
  parent_table text NOT NULL,
  mismatch_count bigint NOT NULL
);

DO $$
DECLARE
  rec RECORD;
  mismatch_count bigint;
BEGIN
  FOR rec IN
    SELECT
      tc.table_name AS child_table,
      kcu.column_name AS child_column,
      ccu.table_name AS parent_table
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_schema = kcu.constraint_schema
     AND tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_schema = tc.constraint_schema
     AND ccu.constraint_name = tc.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_schema = 'public'
      AND ccu.column_name = 'id'
      AND kcu.column_name <> 'tenantId'
      AND EXISTS (
        SELECT 1
        FROM information_schema.columns child_cols
        WHERE child_cols.table_schema = 'public'
          AND child_cols.table_name = tc.table_name
          AND child_cols.column_name = 'tenantId'
      )
      AND EXISTS (
        SELECT 1
        FROM information_schema.columns parent_cols
        WHERE parent_cols.table_schema = 'public'
          AND parent_cols.table_name = ccu.table_name
          AND parent_cols.column_name = 'tenantId'
      )
      AND 1 = (
        SELECT count(*)
        FROM information_schema.key_column_usage fk_cols
        WHERE fk_cols.constraint_schema = tc.constraint_schema
          AND fk_cols.constraint_name = tc.constraint_name
      )
    ORDER BY tc.table_name, kcu.column_name
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM %I child JOIN %I parent ON child.%I = parent.id WHERE child."tenantId" IS NOT NULL AND parent."tenantId" IS NOT NULL AND child."tenantId"::text <> parent."tenantId"::text',
      rec.child_table,
      rec.parent_table,
      rec.child_column
    )
    INTO mismatch_count;

    IF mismatch_count > 0 THEN
      INSERT INTO tenant_fk_mismatch_report (child_table, child_column, parent_table, mismatch_count)
      VALUES (rec.child_table, rec.child_column, rec.parent_table, mismatch_count);
    END IF;
  END LOOP;
END
$$;

SELECT child_table, child_column, parent_table, mismatch_count
FROM tenant_fk_mismatch_report
ORDER BY mismatch_count DESC, child_table, child_column, parent_table;

SELECT format(
  'SUMMARY|%s|%s',
  count(*),
  COALESCE(sum(mismatch_count), 0)
)
FROM tenant_fk_mismatch_report;
DO $$
DECLARE
  relation_mismatches bigint;
  row_mismatches bigint;
BEGIN
  SELECT count(*), COALESCE(sum(mismatch_count), 0)
  INTO relation_mismatches, row_mismatches
  FROM tenant_fk_mismatch_report;

  IF relation_mismatches > 0 THEN
    RAISE EXCEPTION 'Tenant FK mismatch detected: % relation(s), % row(s).', relation_mismatches, row_mismatches
      USING ERRCODE = 'P0001';
  END IF;
END
$$;
SQL

echo "PASS: no cross-tenant parent/child mismatch rows found."
