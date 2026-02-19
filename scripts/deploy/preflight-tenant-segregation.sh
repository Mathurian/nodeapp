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
echo "Checking Prisma compat layer does not instantiate standalone client..."
if rg -n "new PrismaClient\\(" src/utils/prisma.ts >/dev/null 2>&1; then
  echo "ERROR: src/utils/prisma.ts must remain a compatibility re-export and not create a new Prisma client."
  exit 1
fi
echo "Prisma compat layer check passed."

echo
echo "Checking context-aware Prisma proxy guardrails..."
if ! rg -q "getRequestContext" src/config/database.ts; then
  echo "ERROR: src/config/database.ts is missing getRequestContext integration."
  exit 1
fi
if ! rg -q "requestPrisma" src/config/database.ts; then
  echo "ERROR: src/config/database.ts is missing requestPrisma proxy resolution."
  exit 1
fi
if ! rg -q "requestPrisma" src/middleware/correlationId.ts; then
  echo "ERROR: correlation request context is missing requestPrisma propagation."
  exit 1
fi
echo "Context-aware Prisma proxy guardrails passed."

echo
echo "Checking for direct global prisma imports in request layer..."
request_layer_prisma_imports="$(
  rg -n "import\\s+\\{?\\s*prisma\\s*\\}?\\s+from\\s+'\\.{1,2}/(config/database|utils/prisma)'|import\\s+prisma\\s+from\\s+'\\.{1,2}/(config/database|utils/prisma)'" src/controllers src/routes || true
)"
if [ -n "$request_layer_prisma_imports" ]; then
  filtered_request_layer_imports="$(printf '%s\n' "$request_layer_prisma_imports" | rg -v "src/routes/publicTenantRoutes.ts|src/routes/settingsRoutes.ts|src/routes/healthRoutes.ts|src/controllers/backupController.ts|src/controllers/testRunnerController.ts" || true)"
  if [ -n "$filtered_request_layer_imports" ]; then
    echo "ERROR: request-layer files must not import global prisma directly:"
    echo "$filtered_request_layer_imports"
    exit 1
  fi
fi
echo "No blocked request-layer global prisma imports found."

echo
echo "Checking EventBus publish calls for tenantId propagation..."
missing_publish_calls="$(
  rg -n "^[[:space:]]*await[[:space:]]+EventBusService\\.publish\\(" src/services src/controllers src/events 2>/dev/null | \
  while IFS=: read -r file line _; do
    block="$(sed -n "${line},$((line+14))p" "$file")"
    if ! printf '%s\n' "$block" | rg -q "tenantId"; then
      printf '%s:%s\n' "$file" "$line"
    fi
  done
)"
if [ -n "$missing_publish_calls" ]; then
  echo "ERROR: EventBus publish calls missing tenantId propagation:"
  echo "$missing_publish_calls"
  exit 1
fi
echo "All EventBus publish calls include tenantId in call block."

echo
echo "Verifying legacy admin database route hardening..."
if rg -n "database/tables.*requireRole\\(\\['SUPER_ADMIN',\\s*'ADMIN'\\]\\)|database/tables.*requireRole\\(\\[\"SUPER_ADMIN\",\\s*\"ADMIN\"\\]\\)" src/routes/adminRoutes.ts >/dev/null 2>&1; then
  echo "ERROR: legacy admin database routes still allow ADMIN."
  exit 1
fi

echo "Preflight passed."
