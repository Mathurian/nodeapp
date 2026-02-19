#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if ! command -v rg >/dev/null 2>&1; then
  echo "ripgrep (rg) is required for tenant segregation audit."
  exit 1
fi

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
  "Direct global prisma imports (manual review needed)" \
  "import\\s+\\{?\\s*prisma\\s*\\}?\\s+from\\s+'\\.{1,2}/config/database'|import\\s+prisma\\s+from\\s+'\\.{1,2}/config/database'" \
  "src"

scan_and_count \
  "Legacy admin DB routes still permitting ADMIN (should be SUPER_ADMIN-only)" \
  "database/tables.*requireRole\\(\\['SUPER_ADMIN',\\s*'ADMIN'\\]\\)|database/tables.*requireRole\\(\\[\"SUPER_ADMIN\",\\s*\"ADMIN\"\\]\\)" \
  "src/routes/adminRoutes.ts"

echo
echo "Audit complete."
