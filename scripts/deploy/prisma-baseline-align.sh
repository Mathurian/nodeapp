#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/srv/event-manager/dev}"
SCHEMA_PATH="${SCHEMA_PATH:-${APP_ROOT}/prisma/schema.prisma}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-${APP_ROOT}/prisma/migrations}"
ENV_FILE="${ENV_FILE:-${APP_ROOT}/.env}"
APPLY="${APPLY:-0}"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required."
  exit 1
fi

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required."
  exit 1
fi

if [ ! -d "$APP_ROOT" ]; then
  echo "App root not found: $APP_ROOT"
  exit 1
fi

if [ ! -f "$SCHEMA_PATH" ]; then
  echo "Prisma schema not found: $SCHEMA_PATH"
  exit 1
fi

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "Migrations directory not found: $MIGRATIONS_DIR"
  exit 1
fi

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
  # psql may reject Prisma-specific query params like schema=public.
  printf '%s' "$1" | sed -E 's/([?&])schema=[^&]*&?/\1/g; s/\?&/\?/g; s/[?&]$//'
}

redact_url() {
  printf '%s' "$1" | sed -E 's#(://[^:/@]+:)[^@/]+@#\1***@#'
}

resolve_database_url() {
  if [ -n "${DATABASE_URL:-}" ]; then
    printf '%s' "$DATABASE_URL"
    return
  fi

  if [ -n "${PRISMA_BASELINE_DATABASE_URL:-}" ]; then
    printf '%s' "$PRISMA_BASELINE_DATABASE_URL"
    return
  fi

  if [ -f "$ENV_FILE" ]; then
    local from_file
    from_file="$(extract_env_value "DATABASE_URL" "$ENV_FILE" || true)"
    if [ -n "$from_file" ]; then
      printf '%s' "$from_file"
      return
    fi
  fi

  echo "Unable to resolve DATABASE_URL. Set DATABASE_URL or PRISMA_BASELINE_DATABASE_URL, or provide ENV_FILE with DATABASE_URL." >&2
  exit 1
}

cd "$APP_ROOT"

DB_URL="$(resolve_database_url)"
PSQL_URL="$(sanitize_psql_url "$DB_URL")"
REDACTED_URL="$(redact_url "$DB_URL")"

echo "Prisma Baseline Alignment"
echo "App root: $APP_ROOT"
echo "Schema: $SCHEMA_PATH"
echo "Migrations dir: $MIGRATIONS_DIR"
echo "Env file: $ENV_FILE"
echo "Target DB: $REDACTED_URL"
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo
echo "Step 1/5: validating Prisma schema..."
DATABASE_URL="$DB_URL" npx prisma validate --schema "$SCHEMA_PATH" >/dev/null
echo "Schema validation passed."

echo
echo "Step 2/5: checking schema drift (DB -> Prisma schema)..."
DIFF_FILE="$(mktemp /tmp/prisma-baseline-diff.XXXXXX.sql)"
trap 'rm -f "$DIFF_FILE"' EXIT
DATABASE_URL="$DB_URL" npx prisma migrate diff \
  --from-url "$DB_URL" \
  --to-schema-datamodel "$SCHEMA_PATH" \
  --script >"$DIFF_FILE"

DRIFT_LINES="$(sed -E '/^\s*--/d;/^\s*$/d' "$DIFF_FILE")"
if [ -n "$DRIFT_LINES" ]; then
  echo "ERROR: drift detected between database and prisma/schema.prisma."
  echo "Baseline aborted to avoid masking schema differences."
  echo "First drift lines:"
  printf '%s\n' "$DRIFT_LINES" | sed -n '1,40p'
  exit 2
fi
echo "No drift detected."

echo
echo "Step 3/5: collecting migrations and current baseline state..."
mapfile -t ALL_MIGRATIONS < <(
  find "$MIGRATIONS_DIR" -mindepth 2 -maxdepth 2 -type f -name 'migration.sql' -printf '%h\n' \
    | sed -E 's#^.*/##' \
    | sort
)

if [ "${#ALL_MIGRATIONS[@]}" -eq 0 ]; then
  echo "No migration directories found."
  exit 3
fi

HAS_MIGRATIONS_TABLE="$(psql "$PSQL_URL" -Atc "SELECT to_regclass('public._prisma_migrations') IS NOT NULL;")"
declare -A APPLIED_SET=()

if [ "$HAS_MIGRATIONS_TABLE" = "t" ]; then
  while IFS= read -r migration_name; do
    if [ -n "$migration_name" ]; then
      APPLIED_SET["$migration_name"]=1
    fi
  done < <(psql "$PSQL_URL" -Atc "SELECT migration_name FROM public._prisma_migrations;")
fi

PENDING=()
for migration_name in "${ALL_MIGRATIONS[@]}"; do
  if [ -z "${APPLIED_SET[$migration_name]+x}" ]; then
    PENDING+=("$migration_name")
  fi
done

echo "Migration directories: ${#ALL_MIGRATIONS[@]}"
echo "Already applied in _prisma_migrations: ${#APPLIED_SET[@]}"
echo "Pending baseline marks: ${#PENDING[@]}"

if [ "${#PENDING[@]}" -eq 0 ]; then
  echo
  echo "Step 4/5: nothing to baseline."
  echo "Step 5/5: verifying deploy status..."
  DATABASE_URL="$DB_URL" npx prisma migrate deploy --schema "$SCHEMA_PATH" >/dev/null
  echo "Prisma migration state already aligned."
  exit 0
fi

echo
echo "Pending migrations to mark as applied:"
for migration_name in "${PENDING[@]}"; do
  echo "- $migration_name"
done

if [ "$APPLY" != "1" ]; then
  echo
  echo "Dry run only. No baseline changes were made."
  echo "To apply baseline marks, rerun with APPLY=1."
  exit 0
fi

echo
echo "Step 4/5: marking migrations as applied..."
for migration_name in "${PENDING[@]}"; do
  echo "Applying baseline mark: $migration_name"
  DATABASE_URL="$DB_URL" npx prisma migrate resolve \
    --schema "$SCHEMA_PATH" \
    --applied "$migration_name" >/dev/null
done
echo "Baseline marks applied."

echo
echo "Step 5/5: verifying deploy status..."
DATABASE_URL="$DB_URL" npx prisma migrate deploy --schema "$SCHEMA_PATH" >/dev/null
echo "Prisma baseline alignment complete."
