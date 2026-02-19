#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/srv/event-manager/dev}"
ENV_FILE="${ENV_FILE:-/etc/event-manager/event-manager.env}"

if ! command -v rg >/dev/null 2>&1; then
  echo "ripgrep (rg) is required."
  exit 1
fi

if [ ! -d "$APP_ROOT" ]; then
  echo "App root not found: $APP_ROOT"
  exit 1
fi

cd "$APP_ROOT"

echo "Tenant Segregation Preflight"
echo "App root: $APP_ROOT"
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: env file not found: $ENV_FILE"
  exit 1
fi

mode_line="$(grep -E '^TENANT_SEGREGATION_MODE=' "$ENV_FILE" || true)"
ids_line="$(grep -E '^TENANT_DEFAULT_IDS=' "$ENV_FILE" || true)"
slugs_line="$(grep -E '^TENANT_DEFAULT_SLUGS=' "$ENV_FILE" || true)"

mode="${mode_line#TENANT_SEGREGATION_MODE=}"
ids="${ids_line#TENANT_DEFAULT_IDS=}"
slugs="${slugs_line#TENANT_DEFAULT_SLUGS=}"

if [ -z "$mode_line" ]; then
  mode="audit (implicit default)"
fi
if [ -z "$ids_line" ]; then
  ids="default_tenant,default-tenant (implicit default)"
fi
if [ -z "$slugs_line" ]; then
  slugs="default (implicit default)"
fi

echo
echo "Runtime policy from $ENV_FILE"
echo "  TENANT_SEGREGATION_MODE=$mode"
echo "  TENANT_DEFAULT_IDS=$ids"
echo "  TENANT_DEFAULT_SLUGS=$slugs"

echo
echo "Running source audit..."
bash scripts/ops/tenant-segregation-audit.sh

echo
echo "Checking for blocked tenant fallback patterns in runtime code..."
blocked_fallbacks="$(rg -n "default_tenant|default-tenant|tenantId\\s*\\|\\|\\s*['\\\"]default['\\\"]" \
  src/controllers src/services src/routes src/middleware \
  --glob '!src/utils/tenantSegregationPolicy.ts' || true)"
if [ -n "$blocked_fallbacks" ]; then
  echo "ERROR: blocked tenant fallback patterns detected:"
  echo "$blocked_fallbacks"
  exit 1
fi
echo "No blocked tenant fallback patterns found."

echo
echo "Verifying legacy admin database route hardening..."
if rg -n "database/tables.*requireRole\\(\\['SUPER_ADMIN',\\s*'ADMIN'\\]\\)|database/tables.*requireRole\\(\\[\"SUPER_ADMIN\",\\s*\"ADMIN\"\\]\\)" src/routes/adminRoutes.ts >/dev/null 2>&1; then
  echo "ERROR: legacy admin database routes still allow ADMIN."
  exit 1
fi

echo "Preflight passed."
