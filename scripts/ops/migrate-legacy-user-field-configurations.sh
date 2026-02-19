#!/usr/bin/env bash
set -euo pipefail

MODE="check"
ENFORCE_CLEAN="false"
ENV_FILE="${ENV_FILE:-}"
ENV_FILE_EXPLICIT="false"

if [ -n "$ENV_FILE" ]; then
  ENV_FILE_EXPLICIT="true"
fi

usage() {
  cat <<'EOF'
Legacy user-field-configuration migration helper.

Usage:
  scripts/ops/migrate-legacy-user-field-configurations.sh [--check|--apply] [--enforce-clean] [--env-file <path>]

Options:
  --check          Show migration status only (default)
  --apply          Backfill missing system_settings rows from legacy table
  --enforce-clean  Exit non-zero when pending backfill rows or value conflicts exist
  --env-file PATH  Resolve DATABASE_URL from this env file when DATABASE_URL is unset
  -h, --help       Show this help text
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --check)
      MODE="check"
      ;;
    --apply)
      MODE="apply"
      ;;
    --enforce-clean)
      ENFORCE_CLEAN="true"
      ;;
    --env-file)
      if [ "$#" -lt 2 ]; then
        echo "--env-file requires a value"
        exit 1
      fi
      ENV_FILE="$2"
      ENV_FILE_EXPLICIT="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      usage
      exit 1
      ;;
  esac
  shift
done

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required."
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEFAULT_ENV_FILE="${REPO_ROOT}/.env"

extract_env_value() {
  local key="$1"
  local file_path="$2"
  if [ ! -f "$file_path" ]; then
    return 1
  fi
  local line
  line="$(grep -E "^${key}=" "$file_path" | head -n 1 || true)"
  if [ -z "$line" ]; then
    return 1
  fi
  local value="${line#*=}"
  value="${value%\"}"
  value="${value#\"}"
  printf '%s' "$value"
}

sanitize_db_url() {
  local raw_url="$1"
  printf '%s' "$raw_url" | sed -E 's/([?&])schema=[^&]*&?/\1/g; s/\?&/\?/g; s/[?&]$//'
}

if [ -n "${DATABASE_URL:-}" ]; then
  PSQL_CMD=(psql "$(sanitize_db_url "$DATABASE_URL")")
elif [ -n "${DB_HOST:-}" ] || [ -n "${DB_NAME:-}" ] || [ -n "${DB_USER:-}" ]; then
  DB_HOST="${DB_HOST:-127.0.0.1}"
  DB_PORT="${DB_PORT:-5432}"
  DB_NAME="${DB_NAME:-event_manager_dev}"
  DB_USER="${DB_USER:-event_manager}"
  if [ -n "${DB_PASSWORD:-}" ]; then
    export PGPASSWORD="${DB_PASSWORD}"
  fi
  PSQL_CMD=(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME")
else
  RESOLVED_ENV_FILE="$ENV_FILE"
  if [ -z "$RESOLVED_ENV_FILE" ]; then
    RESOLVED_ENV_FILE="$DEFAULT_ENV_FILE"
  fi

  ENV_FALLBACK_URL=""
  if [ "$ENV_FILE_EXPLICIT" = "true" ]; then
    ENV_FALLBACK_URL="$(extract_env_value "DATABASE_URL" "$RESOLVED_ENV_FILE" || true)"
  fi

  if [ -n "$ENV_FALLBACK_URL" ]; then
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
fi

prepare_work_tables_sql() {
  cat <<'SQL'
SET client_min_messages TO WARNING;

DROP TABLE IF EXISTS _legacy_field_visibility_rows;
DROP TABLE IF EXISTS _legacy_effective_field_visibility;
DROP TABLE IF EXISTS _desired_field_visibility_settings;
DROP TABLE IF EXISTS _pending_field_visibility_settings;
DROP TABLE IF EXISTS _conflicting_field_visibility_settings;

CREATE TEMP TABLE _legacy_field_visibility_rows (
  field_name text NOT NULL,
  is_visible boolean NOT NULL,
  is_required boolean NOT NULL,
  tenant_id text NULL,
  sort_order integer NOT NULL DEFAULT 0
);

DO $plpgsql$
DECLARE
  has_legacy_table boolean;
  has_tenant_column boolean;
  has_order_column boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_field_configurations'
  )
  INTO has_legacy_table;

  IF NOT has_legacy_table THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_field_configurations'
      AND column_name = 'tenantId'
  )
  INTO has_tenant_column;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_field_configurations'
      AND column_name = 'order'
  )
  INTO has_order_column;

  IF has_tenant_column AND has_order_column THEN
    EXECUTE $sql$
      INSERT INTO _legacy_field_visibility_rows (field_name, is_visible, is_required, tenant_id, sort_order)
      SELECT
        "fieldName",
        "isVisible",
        "isRequired",
        NULLIF("tenantId", '')::text,
        COALESCE("order", 0)
      FROM user_field_configurations
    $sql$;
  ELSIF has_tenant_column THEN
    EXECUTE $sql$
      INSERT INTO _legacy_field_visibility_rows (field_name, is_visible, is_required, tenant_id, sort_order)
      SELECT
        "fieldName",
        "isVisible",
        "isRequired",
        NULLIF("tenantId", '')::text,
        0
      FROM user_field_configurations
    $sql$;
  ELSIF has_order_column THEN
    EXECUTE $sql$
      INSERT INTO _legacy_field_visibility_rows (field_name, is_visible, is_required, tenant_id, sort_order)
      SELECT
        "fieldName",
        "isVisible",
        "isRequired",
        NULL::text,
        COALESCE("order", 0)
      FROM user_field_configurations
    $sql$;
  ELSE
    EXECUTE $sql$
      INSERT INTO _legacy_field_visibility_rows (field_name, is_visible, is_required, tenant_id, sort_order)
      SELECT
        "fieldName",
        "isVisible",
        "isRequired",
        NULL::text,
        0
      FROM user_field_configurations
    $sql$;
  END IF;
END
$plpgsql$;

CREATE TEMP TABLE _legacy_effective_field_visibility AS
SELECT DISTINCT ON (field_name, COALESCE(tenant_id, ''))
  field_name,
  is_visible,
  is_required,
  tenant_id
FROM _legacy_field_visibility_rows
ORDER BY
  field_name,
  COALESCE(tenant_id, ''),
  sort_order ASC;

CREATE TEMP TABLE _desired_field_visibility_settings AS
SELECT
  ('user_field_visibility_' || field_name)::text AS key,
  json_build_object('visible', is_visible, 'required', is_required)::text AS value,
  tenant_id,
  ('Visibility setting for user field: ' || field_name)::text AS description,
  'user_fields'::text AS category
FROM _legacy_effective_field_visibility;

CREATE TEMP TABLE _pending_field_visibility_settings AS
SELECT d.*
FROM _desired_field_visibility_settings d
LEFT JOIN system_settings s
  ON s.key = d.key
 AND s."tenantId" IS NOT DISTINCT FROM d.tenant_id
WHERE s.id IS NULL;

CREATE TEMP TABLE _conflicting_field_visibility_settings AS
SELECT
  d.key,
  d.tenant_id,
  s.value AS existing_value,
  d.value AS desired_value
FROM _desired_field_visibility_settings d
JOIN system_settings s
  ON s.key = d.key
 AND s."tenantId" IS NOT DISTINCT FROM d.tenant_id
WHERE s.value IS DISTINCT FROM d.value;
SQL
}

collect_metrics() {
  "${PSQL_CMD[@]}" -X -At -v ON_ERROR_STOP=1 <<SQL
$(prepare_work_tables_sql)
SELECT 'DATABASE=' || current_database();
SELECT 'LEGACY_TABLE_EXISTS=' || EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'user_field_configurations'
)::text;
SELECT 'LEGACY_HAS_TENANT_COLUMN=' || EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'user_field_configurations'
    AND column_name = 'tenantId'
)::text;
SELECT 'LEGACY_ROWS=' || (SELECT count(*)::text FROM _legacy_field_visibility_rows);
SELECT 'DESIRED_ROWS=' || (SELECT count(*)::text FROM _desired_field_visibility_settings);
SELECT 'PENDING_INSERTS=' || (SELECT count(*)::text FROM _pending_field_visibility_settings);
SELECT 'CONFLICTING_EXISTING=' || (SELECT count(*)::text FROM _conflicting_field_visibility_settings);
SQL
}

apply_backfill() {
  "${PSQL_CMD[@]}" -X -At -v ON_ERROR_STOP=1 <<SQL
$(prepare_work_tables_sql)
WITH inserted AS (
  INSERT INTO system_settings (
    id,
    key,
    value,
    description,
    category,
    "tenantId",
    "updatedAt",
    "updatedBy"
  )
  SELECT
    md5(random()::text || clock_timestamp()::text || d.key || COALESCE(d.tenant_id, '')),
    d.key,
    d.value,
    d.description,
    d.category,
    d.tenant_id,
    NOW(),
    NULL
  FROM _pending_field_visibility_settings d
  RETURNING 1
)
SELECT 'INSERTED_ROWS=' || count(*)::text FROM inserted;
SQL
}

extract_metric() {
  local key="$1"
  local blob="$2"
  printf '%s\n' "$blob" | awk -F= -v k="$key" '$1 == k { print $2 }' | tail -n 1
}

echo "Legacy User Field Configuration Migration"
echo "Mode: $MODE"
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

METRICS="$(collect_metrics)"
DATABASE_NAME="$(extract_metric "DATABASE" "$METRICS")"
LEGACY_TABLE_EXISTS="$(extract_metric "LEGACY_TABLE_EXISTS" "$METRICS")"
LEGACY_HAS_TENANT_COLUMN="$(extract_metric "LEGACY_HAS_TENANT_COLUMN" "$METRICS")"
LEGACY_ROWS="$(extract_metric "LEGACY_ROWS" "$METRICS")"
DESIRED_ROWS="$(extract_metric "DESIRED_ROWS" "$METRICS")"
PENDING_INSERTS="$(extract_metric "PENDING_INSERTS" "$METRICS")"
CONFLICTING_EXISTING="$(extract_metric "CONFLICTING_EXISTING" "$METRICS")"

echo "Database: ${DATABASE_NAME:-unknown}"
echo "Legacy table exists: ${LEGACY_TABLE_EXISTS:-false}"
echo "Legacy table has tenantId column: ${LEGACY_HAS_TENANT_COLUMN:-false}"
echo "Legacy rows: ${LEGACY_ROWS:-0}"
echo "Desired settings rows: ${DESIRED_ROWS:-0}"
echo "Pending inserts: ${PENDING_INSERTS:-0}"
echo "Conflicting existing rows: ${CONFLICTING_EXISTING:-0}"

if [ "$MODE" = "apply" ] && [ "${PENDING_INSERTS:-0}" -gt 0 ]; then
  APPLY_RESULT="$(apply_backfill)"
  INSERTED_ROWS="$(extract_metric "INSERTED_ROWS" "$APPLY_RESULT")"
  echo "Inserted rows: ${INSERTED_ROWS:-0}"

  POST_METRICS="$(collect_metrics)"
  POST_PENDING="$(extract_metric "PENDING_INSERTS" "$POST_METRICS")"
  POST_CONFLICTS="$(extract_metric "CONFLICTING_EXISTING" "$POST_METRICS")"
  echo "Post-apply pending inserts: ${POST_PENDING:-0}"
  echo "Post-apply conflicting rows: ${POST_CONFLICTS:-0}"

  if [ "${POST_PENDING:-0}" -gt 0 ]; then
    echo "ERROR: Pending inserts remain after apply."
    exit 1
  fi
fi

if [ "${CONFLICTING_EXISTING:-0}" -gt 0 ]; then
  echo "WARN: Existing system settings differ from legacy row values."
  echo "      No overwrite was performed; resolve manually if needed."
fi

if [ "$ENFORCE_CLEAN" = "true" ]; then
  if [ "${PENDING_INSERTS:-0}" -gt 0 ] || [ "${CONFLICTING_EXISTING:-0}" -gt 0 ]; then
    echo "ERROR: Legacy field-configuration migration state is not clean."
    echo "Run with --apply and resolve conflicts before deployment."
    exit 2
  fi
fi

echo "Done."
