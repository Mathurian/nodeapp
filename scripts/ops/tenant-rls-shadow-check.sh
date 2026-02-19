#!/usr/bin/env bash
set -euo pipefail

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required."
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-${REPO_ROOT}/.env}"

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
  if [ -n "${DATABASE_URL:-}" ]; then
    printf '%s' "$DATABASE_URL"
    return
  fi

  local from_file
  from_file="$(extract_env_value "DATABASE_URL" "$ENV_FILE" || true)"
  if [ -n "$from_file" ]; then
    printf '%s' "$from_file"
    return
  fi

  echo "Unable to resolve DATABASE_URL. Set DATABASE_URL or ENV_FILE with DATABASE_URL."
  exit 1
}

DB_URL="$(resolve_database_url)"
PSQL_URL="$(sanitize_psql_url "$DB_URL")"

echo "Tenant RLS Shadow Check"
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

psql "$PSQL_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
BEGIN;

DO $$
DECLARE
  probe_suffix text;
  tenant_a text;
  tenant_b text;
  user_a_id text;
  user_b_id text;
  probe_email_a text;
  probe_email_b text;
  expected_a bigint;
  visible_total bigint;
  visible_b bigint;
BEGIN
  probe_suffix := substring(md5(random()::text || clock_timestamp()::text) for 10);
  tenant_a := format('rls_tenant_a_%s', probe_suffix);
  tenant_b := format('rls_tenant_b_%s', probe_suffix);
  user_a_id := format('rls_user_a_%s', probe_suffix);
  user_b_id := format('rls_user_b_%s', probe_suffix);
  probe_email_a := format('rls-shadow-a-%s@example.test', probe_suffix);
  probe_email_b := format('rls-shadow-b-%s@example.test', probe_suffix);

  INSERT INTO tenants (
    id,
    name,
    slug,
    "isActive",
    "planType",
    "subscriptionStatus",
    "scoringType",
    "createdAt",
    "updatedAt"
  ) VALUES
  (
    tenant_a,
    format('RLS Shadow Tenant A %s', probe_suffix),
    format('rls-shadow-a-%s', probe_suffix),
    true,
    'free',
    'active',
    'STRAIGHT',
    now(),
    now()
  ),
  (
    tenant_b,
    format('RLS Shadow Tenant B %s', probe_suffix),
    format('rls-shadow-b-%s', probe_suffix),
    true,
    'free',
    'active',
    'STRAIGHT',
    now(),
    now()
  );

  INSERT INTO users (
    id,
    name,
    email,
    password,
    role,
    "tenantId",
    "createdAt",
    "updatedAt",
    "isActive",
    "sessionVersion",
    "isSuperAdmin"
  ) VALUES
  (
    user_a_id,
    'RLS Shadow User A',
    probe_email_a,
    'not-used-for-login',
    'ADMIN',
    tenant_a,
    now(),
    now(),
    true,
    1,
    false
  ),
  (
    user_b_id,
    'RLS Shadow User B',
    probe_email_b,
    'not-used-for-login',
    'ADMIN',
    tenant_b,
    now(),
    now(),
    true,
    1,
    false
  );

  SELECT count(*)
  INTO expected_a
  FROM users
  WHERE "tenantId"::text = tenant_a
    AND email IN (probe_email_a, probe_email_b);

  PERFORM set_config('app.tenant_rls_mode', 'enforce', true);
  PERFORM set_config('app.is_super_admin', 'false', true);
  PERFORM set_config('app.tenant_id', tenant_a, true);

  SELECT count(*) INTO visible_total FROM users WHERE email IN (probe_email_a, probe_email_b);
  SELECT count(*) INTO visible_b FROM users WHERE "tenantId"::text = tenant_b AND email IN (probe_email_a, probe_email_b);

  IF visible_total <> expected_a THEN
    RAISE EXCEPTION 'RLS check failed: expected % rows for tenant %, saw %.', expected_a, tenant_a, visible_total;
  END IF;

  IF visible_b <> 0 THEN
    RAISE EXCEPTION 'RLS check failed: tenant % can see % rows from tenant %.', tenant_a, visible_b, tenant_b;
  END IF;

  RAISE NOTICE 'RLS shadow check passed for tenant % (visible rows=%).', tenant_a, visible_total;
END
$$;

ROLLBACK;
SQL

echo "PASS: tenant RLS shadow check succeeded."
