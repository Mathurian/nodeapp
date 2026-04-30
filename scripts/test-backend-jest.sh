#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

JEST_BIN="node_modules/.bin/jest"
NODE_HEAP_MB="${JEST_NODE_HEAP_MB:-4096}"
PREPARE_DB=0

run_jest() {
  node --max-old-space-size="$NODE_HEAP_MB" "$JEST_BIN" --runInBand "$@"
}

prepare_test_database() {
  bash scripts/test-db-setup.sh
}

if [ "${1:-}" = "--prepare-db" ]; then
  PREPARE_DB=1
  shift
fi

if [ "$#" -gt 0 ]; then
  if [ "$PREPARE_DB" -eq 1 ]; then
    prepare_test_database
  fi
  run_jest "$@"
  exit $?
fi

prepare_test_database

status=0

run_required_group() {
  local label="$1"
  shift

  echo
  echo "==> Running ${label}"
  run_jest "$@"
  local rc=$?
  if [ "$rc" -ne 0 ]; then
    status=1
    echo "==> ${label} failed with exit code ${rc}"
  else
    echo "==> ${label} passed"
  fi
}

mapfile -t integration_files < <(find tests/integration -type f \( -name '*.test.ts' -o -name '*.spec.ts' \) | sort)

for test_file in "${integration_files[@]}"; do
  run_required_group "$test_file" --runTestsByPath "$test_file"
done

run_required_group "contract tests" --testPathPatterns=tests/contracts
run_required_group "unit tests" --testPathPatterns=tests/unit

exit "$status"
