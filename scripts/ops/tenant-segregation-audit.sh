#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

RG_BIN="${RG_BIN:-$(command -v rg || true)}"
if [ -z "$RG_BIN" ]; then
  for candidate in \
    /usr/bin/rg \
    /usr/local/bin/rg \
    /usr/lib/node_modules/@openai/codex/node_modules/@openai/codex-linux-x64/vendor/x86_64-unknown-linux-musl/path/rg
  do
    if [ -x "$candidate" ]; then
      RG_BIN="$candidate"
      break
    fi
  done
fi
if [ -z "$RG_BIN" ]; then
  echo "ripgrep (rg) is required for tenant segregation audit."
  exit 1
fi

rg() {
  "$RG_BIN" "$@"
}

print_section() {
  local title="$1"
  printf "\n== %s ==\n" "$title"
}

scan_and_count() {
  local label="$1"
  local pattern="$2"
  local paths="${3:-src}"

  print_section "$label"
  local output
  output="$(rg -n "$pattern" $paths || true)"
  if [ -z "$output" ]; then
    echo "0 findings"
    return
  fi

  echo "$output"
  local count
  count="$(echo "$output" | wc -l | tr -d ' ')"
  echo "findings: $count"
}

echo "Tenant Segregation Audit"
echo "Repository: $ROOT_DIR"
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

scan_and_count \
  "Default tenant fallbacks outside policy utility (should be 0)" \
  "default_tenant|default-tenant|tenantId\\s*\\|\\|\\s*['\\\"]default['\\\"]" \
  "src --glob=!src/utils/tenantSegregationPolicy.ts"

scan_and_count \
  "Default tenant policy definition (expected)" \
  "TENANT_DEFAULT_IDS|TENANT_DEFAULT_SLUGS|default_tenant|default-tenant" \
  "src/utils/tenantSegregationPolicy.ts"

scan_and_count \
  "Raw SQL unsafe calls" \
  "\$queryRawUnsafe\\(" \
  "src"

scan_and_count \
  "Legacy standalone Prisma client instantiation in compat layer (should be 0)" \
  "new PrismaClient\\(" \
  "src/utils/prisma.ts"

scan_and_count \
  "Context-aware Prisma proxy guardrails (expected findings > 0)" \
  "getRequestContext|requestPrisma|new Proxy\\(" \
  "src/config/database.ts src/middleware/correlationId.ts"

scan_and_count \
  "Direct global prisma imports (manual review needed)" \
  "import\\s+\\{?\\s*prisma\\s*\\}?\\s+from\\s+'\\.{1,2}/(config/database|utils/prisma)'|import\\s+prisma\\s+from\\s+'\\.{1,2}/(config/database|utils/prisma)'" \
  "src"

print_section "Direct global prisma imports in request layer (controllers/routes)"
request_layer_prisma_imports="$(
  rg -n "import\\s+\\{?\\s*prisma\\s*\\}?\\s+from\\s+'\\.{1,2}/(config/database|utils/prisma)'|import\\s+prisma\\s+from\\s+'\\.{1,2}/(config/database|utils/prisma)'" src/controllers src/routes || true
)"
if [ -n "$request_layer_prisma_imports" ]; then
  filtered_request_layer_imports="$(printf '%s\n' "$request_layer_prisma_imports" | rg -v "src/routes/publicTenantRoutes.ts|src/routes/healthRoutes.ts|src/controllers/backupController.ts|src/controllers/testRunnerController.ts" || true)"
  if [ -n "$filtered_request_layer_imports" ]; then
    echo "$filtered_request_layer_imports"
    count="$(printf '%s\n' "$filtered_request_layer_imports" | wc -l | tr -d ' ')"
    echo "findings: $count"
  else
    echo "0 findings"
  fi
else
  echo "0 findings"
fi

scan_and_count \
  "Legacy admin DB routes still permitting ADMIN (should be SUPER_ADMIN-only)" \
  "database/tables.*requireRole\\(\\['SUPER_ADMIN',\\s*'ADMIN'\\]\\)|database/tables.*requireRole\\(\\[\"SUPER_ADMIN\",\\s*\"ADMIN\"\\]\\)" \
  "src/routes/adminRoutes.ts"

print_section "EventBus publish calls missing tenantId in call block"
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
  echo "$missing_publish_calls"
  count="$(printf '%s\n' "$missing_publish_calls" | wc -l | tr -d ' ')"
  echo "findings: $count"
else
  echo "0 findings"
fi

echo
echo "Audit complete."
