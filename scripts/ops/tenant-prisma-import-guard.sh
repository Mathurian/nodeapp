#!/usr/bin/env bash
set -euo pipefail

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
  echo "ripgrep (rg) is required."
  exit 1
fi

rg() {
  "$RG_BIN" "$@"
}

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ALLOWLIST_FILE="${ROOT_DIR}/scripts/ops/tenant-global-prisma-import-allowlist.txt"

if [ ! -f "$ALLOWLIST_FILE" ]; then
  echo "Allowlist not found: $ALLOWLIST_FILE"
  exit 1
fi

cd "$ROOT_DIR"

echo "Tenant Prisma Import Guard"
echo "Repository: $ROOT_DIR"
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

read_allowlist() {
  grep -vE '^\s*(#|$)' "$ALLOWLIST_FILE" | sort -u
}

collect_global_imports() {
  rg -l \
    "^\\s*import\\s+\\{?\\s*prisma\\s*\\}?\\s+from\\s+'\\.{1,2}/(config/database|utils/prisma)'|^\\s*import\\s+prisma\\s+from\\s+'\\.{1,2}/(config/database|utils/prisma)'" \
    src \
    --glob '!**/*.disabled' \
    --glob '!**/*.md' \
    | sort -u || true
}

collect_raw_prisma_imports() {
  rg -l \
    "^\\s*import\\s+[^;]*rawPrisma[^;]*from\\s+'\\.{1,2}/config/database'" \
    src \
    --glob '!**/*.disabled' \
    --glob '!**/*.md' \
    | sort -u || true
}

allowlisted_imports="$(read_allowlist)"
observed_imports="$(collect_global_imports)"

unexpected_imports="$(comm -23 <(printf '%s\n' "$observed_imports") <(printf '%s\n' "$allowlisted_imports"))"
missing_allowlist_entries="$(comm -13 <(printf '%s\n' "$observed_imports") <(printf '%s\n' "$allowlisted_imports"))"

if [ -n "$unexpected_imports" ]; then
  echo
  echo "ERROR: Unreviewed direct global Prisma imports detected:"
  printf '%s\n' "$unexpected_imports"
  exit 1
fi

if [ -n "$missing_allowlist_entries" ]; then
  echo
  echo "ERROR: Allowlist contains stale paths. Refresh allowlist file:"
  printf '%s\n' "$missing_allowlist_entries"
  exit 1
fi

echo "Global Prisma import baseline check passed."

observed_raw_imports="$(collect_raw_prisma_imports)"
allowed_raw_imports=$'src/middleware/tenantMiddleware.ts\nsrc/utils/prisma.ts'

unexpected_raw_imports="$(comm -23 <(printf '%s\n' "$observed_raw_imports") <(printf '%s\n' "$allowed_raw_imports"))"
stale_raw_allowlist="$(comm -13 <(printf '%s\n' "$observed_raw_imports") <(printf '%s\n' "$allowed_raw_imports"))"

if [ -n "$unexpected_raw_imports" ]; then
  echo
  echo "ERROR: rawPrisma import is restricted to tenant middleware and compat exports:"
  printf '%s\n' "$unexpected_raw_imports"
  exit 1
fi

if [ -n "$stale_raw_allowlist" ]; then
  echo
  echo "ERROR: rawPrisma allowlist drift detected:"
  printf '%s\n' "$stale_raw_allowlist"
  exit 1
fi

echo "rawPrisma import guard passed."
echo "PASS: tenant Prisma import guard completed."
