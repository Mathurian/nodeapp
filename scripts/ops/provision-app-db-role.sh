#!/usr/bin/env bash
set -euo pipefail

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required."
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-${REPO_ROOT}/.env}"
ROLE_NAME="${ROLE_NAME:-event_manager_app}"
ROLE_PASSWORD="${ROLE_PASSWORD:-}"

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

sanitize_psql_url() {
  printf '%s' "$1" | sed -E 's/([?&])schema=[^&]*&?/\1/g; s/\?&/\?/g; s/[?&]$//'
}

resolve_database_url() {
  if [ -n "${MIGRATION_DATABASE_URL:-}" ]; then
    printf '%s' "$MIGRATION_DATABASE_URL"
    return
  fi

  if [ -n "${DATABASE_URL:-}" ]; then
    printf '%s' "$DATABASE_URL"
    return
  fi

  local migration_from_file
  migration_from_file="$(extract_env_value "MIGRATION_DATABASE_URL" "$ENV_FILE" || true)"
  if [ -n "$migration_from_file" ]; then
    printf '%s' "$migration_from_file"
    return
  fi

  local database_from_file
  database_from_file="$(extract_env_value "DATABASE_URL" "$ENV_FILE" || true)"
  if [ -n "$database_from_file" ]; then
    printf '%s' "$database_from_file"
    return
  fi

  echo "Unable to resolve database URL. Set MIGRATION_DATABASE_URL, DATABASE_URL, or ENV_FILE with one of those keys."
  exit 1
}

if [[ ! "$ROLE_NAME" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
  echo "Invalid ROLE_NAME: $ROLE_NAME"
  exit 1
fi

if [ -z "$ROLE_PASSWORD" ]; then
  if command -v openssl >/dev/null 2>&1; then
    ROLE_PASSWORD="$(openssl rand -hex 24)"
  else
    ROLE_PASSWORD="$(date +%s | sha256sum | cut -d' ' -f1)"
  fi
fi

DB_URL="$(resolve_database_url)"
PSQL_URL="$(sanitize_psql_url "$DB_URL")"
DB_NAME="$(psql "$PSQL_URL" -Atc 'SELECT current_database();')"

echo "Provision App DB Role"
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Role: $ROLE_NAME"
echo "Database: $DB_NAME"

psql "$PSQL_URL" -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${ROLE_NAME}') THEN
    EXECUTE 'CREATE ROLE "${ROLE_NAME}" LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION PASSWORD ''${ROLE_PASSWORD}''';
  ELSE
    EXECUTE 'ALTER ROLE "${ROLE_NAME}" WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION PASSWORD ''${ROLE_PASSWORD}''';
  END IF;
END
\$\$;

GRANT CONNECT ON DATABASE "${DB_NAME}" TO "${ROLE_NAME}";
GRANT USAGE ON SCHEMA public TO "${ROLE_NAME}";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${ROLE_NAME}";
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO "${ROLE_NAME}";
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO "${ROLE_NAME}";

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "${ROLE_NAME}";
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO "${ROLE_NAME}";
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO "${ROLE_NAME}";
SQL

RUNTIME_URL="$(printf '%s' "$DB_URL" | sed -E "s#://([^:/@]+):[^@]+@#://${ROLE_NAME}:${ROLE_PASSWORD}@#")"

echo
echo "Provisioning complete."
echo "Runtime DATABASE_URL:"
echo "$RUNTIME_URL"
