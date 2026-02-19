#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/srv/event-manager/dev}"
SCHEMA_PATH="${SCHEMA_PATH:-${APP_ROOT}/prisma/schema.prisma}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-${APP_ROOT}/prisma/migrations}"
ENV_FILE="${ENV_FILE:-${APP_ROOT}/.env}"
APPLY="${APPLY:-0}"
ALLOW_BASELINE_KNOWN_DRIFT="${ALLOW_BASELINE_KNOWN_DRIFT:-0}"

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
  if [ -n "${PRISMA_BASELINE_DATABASE_URL:-}" ]; then
    printf '%s' "$PRISMA_BASELINE_DATABASE_URL"
    return
  fi

  if [ -n "${MIGRATION_DATABASE_URL:-}" ]; then
    printf '%s' "$MIGRATION_DATABASE_URL"
    return
  fi

  if [ -n "${DATABASE_URL:-}" ]; then
    printf '%s' "$DATABASE_URL"
    return
  fi

  if [ -f "$ENV_FILE" ]; then
    local migration_url
    migration_url="$(extract_env_value "MIGRATION_DATABASE_URL" "$ENV_FILE" || true)"
    if [ -n "$migration_url" ]; then
      printf '%s' "$migration_url"
      return
    fi

    local database_url
    database_url="$(extract_env_value "DATABASE_URL" "$ENV_FILE" || true)"
    if [ -n "$database_url" ]; then
      printf '%s' "$database_url"
      return
    fi
  fi

  echo "Unable to resolve database URL. Set PRISMA_BASELINE_DATABASE_URL, MIGRATION_DATABASE_URL, DATABASE_URL, or provide ENV_FILE with one of those keys." >&2
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
  unknown_drift_lines=""
  known_drift_count=0

  while IFS= read -r line; do
    [ -z "$line" ] && continue

    # Known production legacy drift pattern:
    # tenant-scoped FK constraints with hashed names that are not represented
    # in prisma/schema.prisma relation metadata.
    if [[ "$line" =~ ^ALTER[[:space:]]+TABLE[[:space:]]+\"[^\"]+\"[[:space:]]+DROP[[:space:]]+CONSTRAINT[[:space:]]+\"fk_.*_tenant_[0-9a-f]{8}\"\;$ ]]; then
      known_drift_count=$((known_drift_count + 1))
      continue
    fi

    # Historical one-off default mismatch in production.
    if [[ "$line" == 'ALTER TABLE "score_governance_requests" ALTER COLUMN "updatedAt" DROP DEFAULT;' ]]; then
      known_drift_count=$((known_drift_count + 1))
      continue
    fi

    unknown_drift_lines+="${line}"$'\n'
  done <<< "$DRIFT_LINES"

  if [ -n "$unknown_drift_lines" ]; then
    echo "ERROR: drift detected between database and prisma/schema.prisma."
    echo "Baseline aborted to avoid masking schema differences."
    echo "First drift lines:"
    printf '%s\n' "$unknown_drift_lines" | sed -n '1,40p'
    exit 2
  fi

  if [ "$ALLOW_BASELINE_KNOWN_DRIFT" != "1" ]; then
    echo "ERROR: known legacy drift detected (${known_drift_count} lines)."
    echo "Baseline is blocked by default."
    echo "Re-run with ALLOW_BASELINE_KNOWN_DRIFT=1 only after review."
    echo "First drift lines:"
    printf '%s\n' "$DRIFT_LINES" | sed -n '1,20p'
    exit 2
  fi

  echo "Known legacy drift detected (${known_drift_count} lines)."
  echo "Proceeding because ALLOW_BASELINE_KNOWN_DRIFT=1 was provided."
else
  echo "No drift detected."
fi

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
