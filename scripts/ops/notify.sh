#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ALERT_ENV_FILE:-/etc/event-manager/alerts.env}"

if [[ -r "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

LEVEL="${1:-INFO}"
SUBJECT="${2:-Event Manager Alert}"
BODY="${3:-No details provided}"

ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
ALERT_EMAIL_TO="${ALERT_EMAIL_TO:-}"
ALERT_FROM="${ALERT_FROM:-event-manager@localhost}"
ALERT_PREFIX="${ALERT_PREFIX:-[event-manager]}"

# Allow caller scripts to override recipients per-notification without mutating env files.
if [[ -n "${ALERT_WEBHOOK_URL_OVERRIDE:-}" ]]; then
  ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL_OVERRIDE}"
fi
if [[ -n "${ALERT_EMAIL_TO_OVERRIDE:-}" ]]; then
  ALERT_EMAIL_TO="${ALERT_EMAIL_TO_OVERRIDE}"
fi

timestamp="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
full_subject="${ALERT_PREFIX} [${LEVEL}] ${SUBJECT}"
full_body="$(cat <<EOF
Time: ${timestamp}
Host: $(hostname -f 2>/dev/null || hostname)
Level: ${LEVEL}
Subject: ${SUBJECT}

${BODY}
EOF
)"

send_webhook() {
  [[ -z "$ALERT_WEBHOOK_URL" ]] && return 0
  local escaped
  escaped="$(printf '%s' "$full_body" | sed ':a;N;$!ba;s/\n/\\n/g; s/"/\\"/g')"
  curl -fsS -m 15 -H 'Content-Type: application/json' \
    -d "{\"text\":\"${escaped}\"}" \
    "$ALERT_WEBHOOK_URL" >/dev/null 2>&1 || true
}

send_email() {
  [[ -z "$ALERT_EMAIL_TO" ]] && return 0
  if command -v mail >/dev/null 2>&1; then
    printf '%s\n' "$full_body" | mail -a "From: ${ALERT_FROM}" -s "$full_subject" "$ALERT_EMAIL_TO" || true
  elif command -v sendmail >/dev/null 2>&1; then
    {
      echo "From: ${ALERT_FROM}"
      echo "To: ${ALERT_EMAIL_TO}"
      echo "Subject: ${full_subject}"
      echo
      echo "${full_body}"
    } | sendmail -t || true
  fi
}

send_webhook
send_email

printf '%s %s\n' "$timestamp" "$full_subject"
