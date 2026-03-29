#!/usr/bin/env bash
set -euo pipefail

ROLE_NAME="${GRAFANA_SQL_ROLE_NAME:-event_manager_grafana_ro}"
ENV_FILE="${GRAFANA_SERVER_ENV_FILE:-/etc/default/grafana-server}"
HOST="${GRAFANA_SQL_HOST:-127.0.0.1}"
PORT="${GRAFANA_SQL_PORT:-5432}"
DATABASES=("$@")

if [ "$#" -eq 0 ]; then
  DATABASES=("event_manager" "event_manager_dev")
fi

require_root() {
  if [ "${EUID}" -ne 0 ]; then
    echo "Run as root (sudo)." >&2
    exit 1
  fi
}

load_existing_password() {
  if [ -f "$ENV_FILE" ]; then
    sed -n 's/^GF_EVENT_MANAGER_SQL_PASSWORD=//p' "$ENV_FILE" | tail -n 1
  fi
}

generate_password() {
  openssl rand -base64 24 | tr -d '\n'
}

upsert_env_var() {
  local key="$1"
  local value="$2"
  touch "$ENV_FILE"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    printf '%s=%s\n' "$key" "$value" >>"$ENV_FILE"
  fi
}

provision_database() {
  local database="$1"
  local password="$2"

  psql "postgresql://event_manager:dittibop@${HOST}:${PORT}/${database}" -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${ROLE_NAME}') THEN
    EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', '${ROLE_NAME}', '${password}');
  ELSE
    EXECUTE format('ALTER ROLE %I WITH LOGIN PASSWORD %L', '${ROLE_NAME}', '${password}');
  END IF;
END
\$\$;

GRANT CONNECT ON DATABASE ${database} TO ${ROLE_NAME};
GRANT USAGE ON SCHEMA public TO ${ROLE_NAME};

CREATE OR REPLACE VIEW grafana_user_tenant_scope AS
SELECT
  lower(u.email) AS user_email,
  u."tenantId" AS tenant_id,
  t.name AS tenant_name,
  t.slug AS tenant_slug,
  u."isSuperAdmin" AS is_super_admin,
  u."isActive" AS is_active,
  u.role AS user_role
FROM users u
JOIN tenants t ON t.id = u."tenantId";

CREATE OR REPLACE VIEW grafana_tenants AS
SELECT
  t.id AS tenant_id,
  t.name AS tenant_name,
  t.slug AS tenant_slug,
  t."isActive" AS is_active
FROM tenants t;

CREATE OR REPLACE VIEW grafana_events AS
SELECT
  e.id AS event_id,
  e."tenantId" AS tenant_id,
  e.name AS event_name,
  e."startDate" AS start_date,
  e."endDate" AS end_date,
  e.archived,
  e."isLocked" AS is_locked
FROM events e
WHERE e."deletedAt" IS NULL;

CREATE OR REPLACE VIEW grafana_contests AS
SELECT
  c.id AS contest_id,
  c."tenantId" AS tenant_id,
  c."eventId" AS event_id,
  c.name AS contest_name,
  c."winnersPublished" AS winners_published,
  c."isLocked" AS is_locked
FROM contests c
WHERE c."deletedAt" IS NULL;

CREATE OR REPLACE VIEW grafana_categories AS
SELECT
  c.id AS category_id,
  c."tenantId" AS tenant_id,
  c."contestId" AS contest_id,
  c.name AS category_name
FROM categories c
WHERE c."deletedAt" IS NULL;

REVOKE ALL ON TABLE users, tenants, events, contests, categories FROM ${ROLE_NAME};
GRANT SELECT ON grafana_user_tenant_scope, grafana_tenants, grafana_events, grafana_contests, grafana_categories TO ${ROLE_NAME};
SQL
}

require_root

PASSWORD="${GRAFANA_SQL_PASSWORD:-$(load_existing_password)}"
if [ -z "$PASSWORD" ]; then
  PASSWORD="$(generate_password)"
fi

upsert_env_var "GF_EVENT_MANAGER_SQL_USER" "$ROLE_NAME"
upsert_env_var "GF_EVENT_MANAGER_SQL_PASSWORD" "$PASSWORD"
upsert_env_var "GF_EVENT_MANAGER_SQL_HOST" "$HOST"
upsert_env_var "GF_EVENT_MANAGER_SQL_PORT" "$PORT"
upsert_env_var "GF_EVENT_MANAGER_SQL_PROD_DB" "event_manager"
upsert_env_var "GF_EVENT_MANAGER_SQL_DEV_DB" "event_manager_dev"
chmod 640 "$ENV_FILE"

for database in "${DATABASES[@]}"; do
  provision_database "$database" "$PASSWORD"
done

echo "Provisioned Grafana read-only SQL role/views for: ${DATABASES[*]}"
