#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NOTIFY_SCRIPT="${SCRIPT_DIR}/notify.sh"
STATE_DIR="${STATE_DIR:-/var/lib/event-manager/alerts}"
STATE_FILE="${STATE_DIR}/system-health.state"

WARN_DISK_PCT="${WARN_DISK_PCT:-80}"
CRIT_DISK_PCT="${CRIT_DISK_PCT:-90}"
WARN_MEM_PCT="${WARN_MEM_PCT:-85}"
CRIT_MEM_PCT="${CRIT_MEM_PCT:-92}"
SYSTEM_HEALTH_ALERTS_ENABLED="${SYSTEM_HEALTH_ALERTS_ENABLED:-true}"
SYSTEM_HEALTH_ALERT_EMAILS="${SYSTEM_HEALTH_ALERT_EMAILS:-}"
SYSTEM_HEALTH_ALERT_WEBHOOK="${SYSTEM_HEALTH_ALERT_WEBHOOK:-}"

DB_URL="${DB_URL:-}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-event_manager}"
DB_USER="${DB_USER:-event_manager}"
DB_PASSWORD="${DB_PASSWORD:-dittibop}"

if ! mkdir -p "$STATE_DIR" 2>/dev/null; then
  STATE_DIR="/tmp/event-manager-alerts"
  STATE_FILE="${STATE_DIR}/system-health.state"
  mkdir -p "$STATE_DIR"
fi

if [[ -e "$STATE_FILE" ]]; then
  if [[ ! -w "$STATE_FILE" ]]; then
    STATE_DIR="/tmp/event-manager-alerts"
    STATE_FILE="${STATE_DIR}/system-health.state"
    mkdir -p "$STATE_DIR"
  fi
elif [[ ! -w "$STATE_DIR" ]]; then
  STATE_DIR="/tmp/event-manager-alerts"
  STATE_FILE="${STATE_DIR}/system-health.state"
  mkdir -p "$STATE_DIR"
fi

load_settings_from_db() {
  local sql
  sql="$(cat <<'SQL'
SELECT key || '|' || COALESCE(value, '')
FROM system_settings
WHERE "tenantId" IS NULL
  AND key IN (
    'alerts_system_health_enabled',
    'alerts_system_health_webhook_url',
    'alerts_system_health_email_recipients',
    'alerts_system_health_warn_disk_percent',
    'alerts_system_health_critical_disk_percent',
    'alerts_system_health_warn_memory_percent',
    'alerts_system_health_critical_memory_percent'
  );
SQL
)"

  local rows
  if [[ -n "$DB_URL" ]]; then
    rows="$(psql "$DB_URL" -v ON_ERROR_STOP=1 -At -F '|' -c "$sql" 2>/dev/null || true)"
  else
    rows="$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -At -F '|' -c "$sql" 2>/dev/null || true)"
  fi
  [[ -z "$rows" ]] && return 0

  while IFS='|' read -r key value; do
    case "$key" in
      alerts_system_health_enabled) SYSTEM_HEALTH_ALERTS_ENABLED="${value,,}" ;;
      alerts_system_health_webhook_url) SYSTEM_HEALTH_ALERT_WEBHOOK="$value" ;;
      alerts_system_health_email_recipients)
        SYSTEM_HEALTH_ALERT_EMAILS="$(printf '%s' "$value" | sed -e 's/^[[:space:]]*\[[[:space:]]*//' -e 's/[[:space:]]*\][[:space:]]*$//' -e 's/"//g' -e 's/[[:space:]]//g')"
        ;;
      alerts_system_health_warn_disk_percent) WARN_DISK_PCT="$value" ;;
      alerts_system_health_critical_disk_percent) CRIT_DISK_PCT="$value" ;;
      alerts_system_health_warn_memory_percent) WARN_MEM_PCT="$value" ;;
      alerts_system_health_critical_memory_percent) CRIT_MEM_PCT="$value" ;;
    esac
  done <<< "$rows"
}

load_settings_from_db

if [[ "${SYSTEM_HEALTH_ALERTS_ENABLED}" != "true" ]]; then
  echo "System health alerts disabled by settings"
  exit 0
fi

disk_pct="$(df -P / | awk 'NR==2 {gsub("%","",$5); print $5}')"
mem_pct="$(free | awk '/Mem:/ {printf "%d", ($3/$2)*100}')"
swap_pct="$(free | awk '/Swap:/ {if ($2 == 0) print 0; else printf "%d", ($3/$2)*100}')"
service_state="unknown"
if command -v systemctl >/dev/null 2>&1; then
  if systemctl is-active event-manager.service >/dev/null 2>&1; then
    service_state="active"
  elif systemctl is-failed event-manager.service >/dev/null 2>&1; then
    service_state="failed"
  else
    service_state="inactive"
  fi
fi
load_1m="$(awk '{print $1}' /proc/loadavg)"

status="OK"
level="INFO"
issues=()

if (( disk_pct >= CRIT_DISK_PCT )); then
  status="CRITICAL"
  level="CRITICAL"
  issues+=("Root disk is at ${disk_pct}% (critical >= ${CRIT_DISK_PCT}%)")
elif (( disk_pct >= WARN_DISK_PCT )); then
  [[ "$status" == "OK" ]] && status="WARNING" && level="WARNING"
  issues+=("Root disk is at ${disk_pct}% (warning >= ${WARN_DISK_PCT}%)")
fi

if (( mem_pct >= CRIT_MEM_PCT )); then
  status="CRITICAL"
  level="CRITICAL"
  issues+=("Memory usage is ${mem_pct}% (critical >= ${CRIT_MEM_PCT}%)")
elif (( mem_pct >= WARN_MEM_PCT )); then
  [[ "$status" == "OK" ]] && status="WARNING" && level="WARNING"
  issues+=("Memory usage is ${mem_pct}% (warning >= ${WARN_MEM_PCT}%)")
fi

if [[ "$service_state" != "active" && "$service_state" != "unknown" ]]; then
  status="CRITICAL"
  level="CRITICAL"
  issues+=("event-manager.service is '${service_state}'")
fi

if [[ -f "$STATE_FILE" ]]; then
  last_status="$(cat "$STATE_FILE" 2>/dev/null || echo "UNKNOWN")"
else
  last_status="UNKNOWN"
fi

printf '%s\n' "$status" > "$STATE_FILE"

if [[ "$status" != "$last_status" || "$status" != "OK" ]]; then
  body="$(cat <<EOF
Health status: ${status}
Previous status: ${last_status}
Root disk: ${disk_pct}%
Memory: ${mem_pct}%
Swap: ${swap_pct}%
Load (1m): ${load_1m}
Service: ${service_state}

Issues:
$(printf -- '- %s\n' "${issues[@]:-No active issues}")
EOF
)"
  ALERT_WEBHOOK_URL_OVERRIDE="${SYSTEM_HEALTH_ALERT_WEBHOOK}" \
  ALERT_EMAIL_TO_OVERRIDE="${SYSTEM_HEALTH_ALERT_EMAILS}" \
  "$NOTIFY_SCRIPT" "$level" "System health status changed: ${status}" "$body" >/dev/null || true
fi

echo "status=${status} disk=${disk_pct}% mem=${mem_pct}% swap=${swap_pct}% service=${service_state} load1=${load_1m}"
