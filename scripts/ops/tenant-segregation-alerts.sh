#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NOTIFY_SCRIPT="${SCRIPT_DIR}/notify.sh"

METRICS_URL="${METRICS_URL:-http://127.0.0.1:3000/metrics}"
STATE_DIR="${STATE_DIR:-/var/lib/event-manager/alerts}"
STATE_FILE="${STATE_DIR}/tenant-segregation-violations.state"
MIN_DELTA="${MIN_DELTA:-1}"
MAX_LINES="${MAX_LINES:-40}"

mkdir -p "$STATE_DIR" 2>/dev/null || true
if [[ ! -w "$STATE_DIR" ]]; then
  STATE_DIR="/tmp/event-manager-alerts"
  STATE_FILE="${STATE_DIR}/tenant-segregation-violations.state"
  mkdir -p "$STATE_DIR"
fi

extract_metric_total() {
  local metric_payload="$1"
  local outcome_filter="${2:-}"
  if [[ -n "$outcome_filter" ]]; then
    printf '%s\n' "$metric_payload" | awk -v outcome="$outcome_filter" '
      /^tenant_segregation_violations_total\{/ {
        if ($0 ~ ("outcome=\"" outcome "\"")) sum += $NF
      }
      END { printf "%.0f", sum + 0 }
    '
  else
    printf '%s\n' "$metric_payload" | awk '
      /^tenant_segregation_violations_total\{/ { sum += $NF }
      END { printf "%.0f", sum + 0 }
    '
  fi
}

parse_state_value() {
  local key="$1"
  if [[ ! -f "$STATE_FILE" ]]; then
    printf '0'
    return
  fi
  local value
  value="$(grep -E "^${key}=" "$STATE_FILE" | head -n 1 | cut -d'=' -f2- || true)"
  if [[ -z "$value" ]]; then
    printf '0'
  else
    printf '%s' "$value"
  fi
}

metrics_payload="$(curl -fsS -m 15 "$METRICS_URL" 2>/dev/null || true)"
if [[ -z "$metrics_payload" ]]; then
  echo "WARN: Unable to fetch metrics from ${METRICS_URL}"
  exit 0
fi

current_total="$(extract_metric_total "$metrics_payload")"
current_blocked="$(extract_metric_total "$metrics_payload" "blocked")"
current_audit_only="$(extract_metric_total "$metrics_payload" "audit_only")"
current_allowed="$(extract_metric_total "$metrics_payload" "allowed")"

previous_total="$(parse_state_value "total")"
previous_blocked="$(parse_state_value "blocked")"
previous_audit_only="$(parse_state_value "audit_only")"
previous_allowed="$(parse_state_value "allowed")"

delta_total=$((current_total - previous_total))
delta_blocked=$((current_blocked - previous_blocked))
delta_audit_only=$((current_audit_only - previous_audit_only))
delta_allowed=$((current_allowed - previous_allowed))

if (( delta_total < 0 )); then
  # Counter reset due process restart/redeploy. Do not alert on this run.
  delta_total=0
  delta_blocked=0
  delta_audit_only=0
  delta_allowed=0
fi

if (( delta_total >= MIN_DELTA )); then
  top_lines="$(
    printf '%s\n' "$metrics_payload" \
      | awk '/^tenant_segregation_violations_total\{/{print}' \
      | sort -t' ' -k2,2nr \
      | head -n "$MAX_LINES"
  )"

  body="$(cat <<EOF
Tenant segregation violations increased.

Metrics URL: ${METRICS_URL}
Previous total: ${previous_total}
Current total: ${current_total}
Delta total: ${delta_total}
Delta blocked: ${delta_blocked}
Delta audit_only: ${delta_audit_only}
Delta allowed: ${delta_allowed}

Top counters:
${top_lines}
EOF
)"

  if [[ -x "$NOTIFY_SCRIPT" ]]; then
    "$NOTIFY_SCRIPT" "WARN" "Tenant segregation violations increased" "$body" >/dev/null || true
  fi
fi

cat > "$STATE_FILE" <<EOF
total=${current_total}
blocked=${current_blocked}
audit_only=${current_audit_only}
allowed=${current_allowed}
last_checked=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
metrics_url=${METRICS_URL}
EOF

echo "tenant-segregation-alerts: total=${current_total} delta=${delta_total} blocked=${current_blocked} audit_only=${current_audit_only} allowed=${current_allowed}"
