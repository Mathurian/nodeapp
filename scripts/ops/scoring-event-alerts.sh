#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NOTIFY_SCRIPT="${SCRIPT_DIR}/notify.sh"
STATE_DIR="${STATE_DIR:-/var/lib/event-manager/alerts}"
STATE_FILE="${STATE_DIR}/scoring-events.last_ts"
MAX_LINES="${MAX_LINES:-40}"

DB_URL="${DB_URL:-}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-event_manager}"
DB_USER="${DB_USER:-event_manager}"
DB_PASSWORD="${DB_PASSWORD:-dittibop}"

run_psql() {
  if [[ -n "$DB_URL" ]]; then
    psql "$DB_URL" "$@"
  else
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" "$@"
  fi
}

if ! mkdir -p "$STATE_DIR" 2>/dev/null; then
  STATE_DIR="/tmp/event-manager-alerts"
  STATE_FILE="${STATE_DIR}/scoring-events.last_ts"
  mkdir -p "$STATE_DIR"
fi

if [[ -e "$STATE_FILE" ]]; then
  if [[ ! -w "$STATE_FILE" ]]; then
    STATE_DIR="/tmp/event-manager-alerts"
    STATE_FILE="${STATE_DIR}/scoring-events.last_ts"
    mkdir -p "$STATE_DIR"
  fi
elif [[ ! -w "$STATE_DIR" ]]; then
  STATE_DIR="/tmp/event-manager-alerts"
  STATE_FILE="${STATE_DIR}/scoring-events.last_ts"
  mkdir -p "$STATE_DIR"
fi

if [[ -f "$STATE_FILE" ]]; then
  since_ts="$(cat "$STATE_FILE" 2>/dev/null || true)"
else
  since_ts=""
fi

if [[ -z "$since_ts" ]]; then
  since_ts="$(date -u -d '5 minutes ago' +'%Y-%m-%dT%H:%M:%SZ')"
fi

now_ts="$(date -u +'%Y-%m-%dT%H:%M:%SZ')"

should_emit_event() {
  local event_type="$1"
  local on_created="$2"
  local on_approved="$3"
  local on_rejected="$4"
  local on_ded_req="$5"
  local on_ded_approved="$6"
  local on_judge="$7"
  local on_category="$8"

  case "$event_type" in
    GOV_REQ_CREATED) [[ "$on_created" == "true" ]] ;;
    GOV_REQ_APPROVED) [[ "$on_approved" == "true" ]] ;;
    GOV_REQ_REJECTED) [[ "$on_rejected" == "true" ]] ;;
    DEDUCTION_REQUEST) [[ "$on_ded_req" == "true" ]] ;;
    DEDUCTION_APPROVED) [[ "$on_ded_approved" == "true" ]] ;;
    JUDGE_CERTIFIED) [[ "$on_judge" == "true" ]] ;;
    CATEGORY_CERTIFIED) [[ "$on_category" == "true" ]] ;;
    *) return 1 ;;
  esac
}

event_is_escalated() {
  local ts="$1"
  local escalation_minutes="$2"
  local ts_epoch now_epoch
  ts_epoch="$(date -u -d "$ts" +%s 2>/dev/null || echo 0)"
  now_epoch="$(date -u +%s)"
  (( now_epoch - ts_epoch >= escalation_minutes * 60 ))
}

get_tenant_alert_settings() {
  local tenant_id="$1"
  run_psql -v ON_ERROR_STOP=1 -v tenant_id="$tenant_id" -At 2>/tmp/scoring_event_alerts.err <<'SQL' || true
WITH cfg AS (
  SELECT
    COALESCE((SELECT value FROM system_settings WHERE "tenantId" = :'tenant_id' AND key='alerts_scoring_enabled' LIMIT 1), (SELECT value FROM system_settings WHERE "tenantId" IS NULL AND key='alerts_scoring_enabled' LIMIT 1), 'true') AS enabled,
    COALESCE((SELECT value FROM system_settings WHERE "tenantId" = :'tenant_id' AND key='alerts_scoring_recipient_roles' LIMIT 1), (SELECT value FROM system_settings WHERE "tenantId" IS NULL AND key='alerts_scoring_recipient_roles' LIMIT 1), '["AUDITOR","BOARD","ORGANIZER","ADMIN","SUPER_ADMIN"]') AS recipient_roles,
    COALESCE((SELECT value FROM system_settings WHERE "tenantId" = :'tenant_id' AND key='alerts_scoring_recipient_user_ids' LIMIT 1), (SELECT value FROM system_settings WHERE "tenantId" IS NULL AND key='alerts_scoring_recipient_user_ids' LIMIT 1), '[]') AS recipient_user_ids,
    COALESCE((SELECT value FROM system_settings WHERE "tenantId" = :'tenant_id' AND key='alerts_scoring_recipient_emails' LIMIT 1), (SELECT value FROM system_settings WHERE "tenantId" IS NULL AND key='alerts_scoring_recipient_emails' LIMIT 1), '[]') AS recipient_emails,
    COALESCE((SELECT value FROM system_settings WHERE "tenantId" = :'tenant_id' AND key='alerts_scoring_on_governance_created' LIMIT 1), (SELECT value FROM system_settings WHERE "tenantId" IS NULL AND key='alerts_scoring_on_governance_created' LIMIT 1), 'true') AS on_gov_created,
    COALESCE((SELECT value FROM system_settings WHERE "tenantId" = :'tenant_id' AND key='alerts_scoring_on_governance_approved' LIMIT 1), (SELECT value FROM system_settings WHERE "tenantId" IS NULL AND key='alerts_scoring_on_governance_approved' LIMIT 1), 'true') AS on_gov_approved,
    COALESCE((SELECT value FROM system_settings WHERE "tenantId" = :'tenant_id' AND key='alerts_scoring_on_governance_rejected' LIMIT 1), (SELECT value FROM system_settings WHERE "tenantId" IS NULL AND key='alerts_scoring_on_governance_rejected' LIMIT 1), 'true') AS on_gov_rejected,
    COALESCE((SELECT value FROM system_settings WHERE "tenantId" = :'tenant_id' AND key='alerts_scoring_on_deduction_requested' LIMIT 1), (SELECT value FROM system_settings WHERE "tenantId" IS NULL AND key='alerts_scoring_on_deduction_requested' LIMIT 1), 'true') AS on_deduction_requested,
    COALESCE((SELECT value FROM system_settings WHERE "tenantId" = :'tenant_id' AND key='alerts_scoring_on_deduction_approved' LIMIT 1), (SELECT value FROM system_settings WHERE "tenantId" IS NULL AND key='alerts_scoring_on_deduction_approved' LIMIT 1), 'true') AS on_deduction_approved,
    COALESCE((SELECT value FROM system_settings WHERE "tenantId" = :'tenant_id' AND key='alerts_scoring_on_judge_certified' LIMIT 1), (SELECT value FROM system_settings WHERE "tenantId" IS NULL AND key='alerts_scoring_on_judge_certified' LIMIT 1), 'true') AS on_judge_certified,
    COALESCE((SELECT value FROM system_settings WHERE "tenantId" = :'tenant_id' AND key='alerts_scoring_on_category_certified' LIMIT 1), (SELECT value FROM system_settings WHERE "tenantId" IS NULL AND key='alerts_scoring_on_category_certified' LIMIT 1), 'true') AS on_category_certified,
    COALESCE((SELECT value FROM system_settings WHERE "tenantId" = :'tenant_id' AND key='alerts_scoring_only_if_unviewed' LIMIT 1), (SELECT value FROM system_settings WHERE "tenantId" IS NULL AND key='alerts_scoring_only_if_unviewed' LIMIT 1), 'false') AS only_if_unviewed,
    COALESCE((SELECT value FROM system_settings WHERE "tenantId" = :'tenant_id' AND key='alerts_scoring_escalation_minutes' LIMIT 1), (SELECT value FROM system_settings WHERE "tenantId" IS NULL AND key='alerts_scoring_escalation_minutes' LIMIT 1), '60') AS escalation_minutes
),
arrays AS (
  SELECT
    lower(enabled) AS enabled,
    lower(on_gov_created) AS on_gov_created,
    lower(on_gov_approved) AS on_gov_approved,
    lower(on_gov_rejected) AS on_gov_rejected,
    lower(on_deduction_requested) AS on_deduction_requested,
    lower(on_deduction_approved) AS on_deduction_approved,
    lower(on_judge_certified) AS on_judge_certified,
    lower(on_category_certified) AS on_category_certified,
    lower(only_if_unviewed) AS only_if_unviewed,
    escalation_minutes,
    CASE WHEN recipient_roles ~ '^\s*\[' THEN ARRAY(SELECT jsonb_array_elements_text(recipient_roles::jsonb)) ELSE ARRAY[]::text[] END AS role_arr,
    CASE WHEN recipient_user_ids ~ '^\s*\[' THEN ARRAY(SELECT jsonb_array_elements_text(recipient_user_ids::jsonb)) ELSE ARRAY[]::text[] END AS user_id_arr,
    CASE WHEN recipient_emails ~ '^\s*\[' THEN ARRAY(SELECT jsonb_array_elements_text(recipient_emails::jsonb)) ELSE ARRAY[]::text[] END AS email_arr
  FROM cfg
),
resolved_users AS (
  SELECT DISTINCT u.id, lower(u.email) AS email
  FROM users u, arrays a
  WHERE u."tenantId"=:'tenant_id'
    AND u."isActive" = true
    AND (
      (cardinality(a.role_arr) > 0 AND u.role::text = ANY(a.role_arr))
      OR (cardinality(a.user_id_arr) > 0 AND u.id = ANY(a.user_id_arr))
    )
),
manual_emails AS (
  SELECT DISTINCT lower(trim(e.email)) AS email
  FROM arrays a, unnest(a.email_arr) AS e(email)
  WHERE trim(e.email) <> ''
),
resolved_emails AS (
  SELECT email FROM resolved_users
  UNION
  SELECT email FROM manual_emails
)
SELECT
  a.enabled || '|' ||
  a.on_gov_created || '|' ||
  a.on_gov_approved || '|' ||
  a.on_gov_rejected || '|' ||
  a.on_deduction_requested || '|' ||
  a.on_deduction_approved || '|' ||
  a.on_judge_certified || '|' ||
  a.on_category_certified || '|' ||
  a.only_if_unviewed || '|' ||
  a.escalation_minutes || '|' ||
  COALESCE((SELECT string_agg(id, ',') FROM resolved_users), '') || '|' ||
  COALESCE((SELECT string_agg(email, ',') FROM resolved_emails), '')
FROM arrays a;
SQL
}

create_scoring_notification() {
  local tenant_id="$1"
  local user_id="$2"
  local event_type="$3"
  local event_id="$4"
  local details="$5"

  local metadata="scoring_alert:${event_type}:${event_id}"
  local title="Scoring Workflow Alert: ${event_type}"
  local message="$details"

  run_psql \
    -v ON_ERROR_STOP=1 \
    -v tenant_id="$tenant_id" \
    -v user_id="$user_id" \
    -v metadata="$metadata" \
    -v title="$title" \
    -v message="$message" \
    -At >/dev/null 2>/tmp/scoring_event_alerts.err <<'SQL' || true
INSERT INTO notifications (
  id, "userId", type, title, message, link, read, "createdAt", "updatedAt", "tenantId", "emailSent", "pushSent", metadata
)
SELECT
  'alt_' || substr(md5(random()::text || clock_timestamp()::text), 1, 24),
  :'user_id',
  'INFO'::"NotificationType",
  :'title',
  :'message',
  '/score-governance',
  false,
  now(),
  now(),
  :'tenant_id',
  false,
  false,
  :'metadata'
WHERE NOT EXISTS (
  SELECT 1
  FROM notifications n
  WHERE n."tenantId"=:'tenant_id'
    AND n."userId"=:'user_id'
    AND n.metadata=:'metadata'
);
SQL
}

collect_sendable_notifications() {
  local tenant_id="$1"
  local recipient_user_ids_csv="$2"
  local only_if_unviewed="$3"
  local escalation_minutes="$4"

  [[ -z "$recipient_user_ids_csv" ]] && return 0

  run_psql \
    -v ON_ERROR_STOP=1 \
    -v tenant_id="$tenant_id" \
    -v recipient_user_ids="$recipient_user_ids_csv" \
    -v only_if_unviewed="$only_if_unviewed" \
    -v escalation_minutes="$escalation_minutes" \
    -At -F $'\t' 2>/tmp/scoring_event_alerts.err <<'SQL' || true
SELECT
  n.id,
  lower(u.email) AS recipient_email,
  to_char(n."createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_utc,
  n.title,
  n.message,
  n.metadata
FROM notifications n
JOIN users u ON u.id = n."userId"
WHERE n."tenantId"=:'tenant_id'
  AND n."userId" = ANY(string_to_array(:'recipient_user_ids', ','))
  AND n."emailSent" = false
  AND n.metadata LIKE 'scoring_alert:%'
  AND (
    :'only_if_unviewed' <> 'true'
    OR (n.read = false AND n."createdAt" <= now() - (interval '1 minute' * (:'escalation_minutes')::int))
  )
ORDER BY n."createdAt" ASC;
SQL
}

mark_notifications_emailed() {
  local notification_ids_csv="$1"
  [[ -z "$notification_ids_csv" ]] && return 0

  run_psql -v ON_ERROR_STOP=1 -v notification_ids="$notification_ids_csv" -At >/dev/null 2>/tmp/scoring_event_alerts.err <<'SQL' || true
UPDATE notifications
SET "emailSent" = true,
    "emailSentAt" = now(),
    "updatedAt" = now()
WHERE id = ANY(string_to_array(:'notification_ids', ','));
SQL
}

events="$(
  run_psql -v ON_ERROR_STOP=1 -v since_ts="$since_ts" -At -F $'\t' 2>/tmp/scoring_event_alerts.err <<'SQL' || true
WITH event_rows AS (
  SELECT
    g."createdAt" AS ts,
    g."tenantId" AS tenant_id,
    t.slug AS tenant_slug,
    'GOV_REQ_CREATED' AS event_type,
    g.id AS event_id,
    concat('action=', g."actionType", ', scope=', g."scopeType", ', status=', g.status, ', by=', u.email) AS details
  FROM score_governance_requests g
  JOIN tenants t ON t.id = g."tenantId"
  LEFT JOIN users u ON u.id = g."requestedById"
  WHERE g."createdAt" > :'since_ts'::timestamptz

  UNION ALL

  SELECT
    g."updatedAt" AS ts,
    g."tenantId" AS tenant_id,
    t.slug AS tenant_slug,
    CASE
      WHEN g.status = 'APPROVED' THEN 'GOV_REQ_APPROVED'
      WHEN g.status = 'REJECTED' THEN 'GOV_REQ_REJECTED'
      ELSE 'GOV_REQ_STATUS'
    END AS event_type,
    g.id AS event_id,
    concat('status=', g.status, ', action=', g."actionType", ', scope=', g."scopeType") AS details
  FROM score_governance_requests g
  JOIN tenants t ON t.id = g."tenantId"
  WHERE g."updatedAt" > :'since_ts'::timestamptz
    AND g."updatedAt" <> g."createdAt"

  UNION ALL

  SELECT
    d."createdAt" AS ts,
    d."tenantId" AS tenant_id,
    t.slug AS tenant_slug,
    'DEDUCTION_REQUEST' AS event_type,
    d.id AS event_id,
    concat('status=', d.status, ', amount=', d.amount, ', contestant=', c.name, ', category=', cat.name) AS details
  FROM deduction_requests d
  JOIN tenants t ON t.id = d."tenantId"
  LEFT JOIN contestants c ON c.id = d."contestantId"
  LEFT JOIN categories cat ON cat.id = d."categoryId"
  WHERE d."createdAt" > :'since_ts'::timestamptz

  UNION ALL

  SELECT
    d."updatedAt" AS ts,
    d."tenantId" AS tenant_id,
    t.slug AS tenant_slug,
    'DEDUCTION_APPROVED' AS event_type,
    d.id AS event_id,
    concat('status=', d.status, ', amount=', d.amount, ', contestant=', c.name, ', category=', cat.name) AS details
  FROM deduction_requests d
  JOIN tenants t ON t.id = d."tenantId"
  LEFT JOIN contestants c ON c.id = d."contestantId"
  LEFT JOIN categories cat ON cat.id = d."categoryId"
  WHERE d."updatedAt" > :'since_ts'::timestamptz
    AND d.status = 'APPROVED'
    AND d."updatedAt" <> d."createdAt"

  UNION ALL

  SELECT
    jc."certifiedAt" AS ts,
    jc."tenantId" AS tenant_id,
    t.slug AS tenant_slug,
    'JUDGE_CERTIFIED' AS event_type,
    jc.id AS event_id,
    concat('judge=', j.name, ', category=', cat.name) AS details
  FROM judge_certifications jc
  JOIN tenants t ON t.id = jc."tenantId"
  LEFT JOIN judges j ON j.id = jc."judgeId"
  LEFT JOIN categories cat ON cat.id = jc."categoryId"
  WHERE jc."certifiedAt" > :'since_ts'::timestamptz

  UNION ALL

  SELECT
    cc."certifiedAt" AS ts,
    cc."tenantId" AS tenant_id,
    t.slug AS tenant_slug,
    'CATEGORY_CERTIFIED' AS event_type,
    cc.id AS event_id,
    concat('role=', cc.role, ', user=', u.email, ', category=', cat.name) AS details
  FROM category_certifications cc
  JOIN tenants t ON t.id = cc."tenantId"
  LEFT JOIN users u ON u.id = cc."userId"
  LEFT JOIN categories cat ON cat.id = cc."categoryId"
  WHERE cc."certifiedAt" > :'since_ts'::timestamptz
)
SELECT
  to_char(ts AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS ts,
  tenant_id,
  tenant_slug,
  event_type,
  event_id,
  details
FROM event_rows
ORDER BY ts ASC;
SQL
)"

printf '%s\n' "$now_ts" > "$STATE_FILE"

if [[ -s /tmp/scoring_event_alerts.err ]]; then
  err_msg="$(tail -n 20 /tmp/scoring_event_alerts.err)"
  "$NOTIFY_SCRIPT" "ERROR" "Scoring event alert query failed" "$err_msg" >/dev/null || true
  rm -f /tmp/scoring_event_alerts.err
  exit 1
fi

rm -f /tmp/scoring_event_alerts.err

if [[ -z "${events}" ]]; then
  echo "No scoring events since ${since_ts}"
  exit 0
fi

declare -A tenant_rows
declare -A tenant_slugs
declare -A tenants_seen

while IFS=$'\t' read -r ts tenant_id tenant_slug event_type event_id details; do
  [[ -z "${tenant_id}" ]] && continue
  tenants_seen["$tenant_id"]=1
  tenant_slugs["$tenant_id"]="${tenant_slug}"
  tenant_rows["$tenant_id"]+="${ts}"$'\t'"${event_type}"$'\t'"${event_id}"$'\t'"${details}"$'\n'
done <<< "$events"

reported_total=0

for tenant_id in "${!tenants_seen[@]}"; do
  settings_line="$(get_tenant_alert_settings "$tenant_id")"
  if [[ -s /tmp/scoring_event_alerts.err ]]; then
    err_msg="$(tail -n 20 /tmp/scoring_event_alerts.err)"
    "$NOTIFY_SCRIPT" "ERROR" "Scoring alert settings query failed" "$err_msg" >/dev/null || true
    rm -f /tmp/scoring_event_alerts.err
    exit 1
  fi

  IFS='|' read -r enabled on_created on_approved on_rejected on_ded_req on_ded_approved on_judge on_category only_if_unviewed escalation_minutes recipient_user_ids recipient_emails <<< "$settings_line"

  if [[ "${enabled:-true}" != "true" ]]; then
    continue
  fi

  filtered_count=0
  backlog_lines=""
  backlog_count=0
  while IFS=$'\t' read -r ts event_type event_id details; do
    [[ -z "${event_type}" ]] && continue
    if should_emit_event "$event_type" "${on_created:-true}" "${on_approved:-true}" "${on_rejected:-true}" "${on_ded_req:-true}" "${on_ded_approved:-true}" "${on_judge:-true}" "${on_category:-true}"; then
      ((filtered_count+=1))
      if [[ -n "${recipient_user_ids}" ]]; then
        IFS=',' read -r -a _recipient_ids <<< "${recipient_user_ids}"
        for recipient_user_id in "${_recipient_ids[@]}"; do
          [[ -z "$recipient_user_id" ]] && continue
          create_scoring_notification "$tenant_id" "$recipient_user_id" "$event_type" "$event_id" "$details"
          if [[ -s /tmp/scoring_event_alerts.err ]]; then
            err_msg="$(tail -n 20 /tmp/scoring_event_alerts.err)"
            "$NOTIFY_SCRIPT" "ERROR" "Scoring alert notification insert failed" "$err_msg" >/dev/null || true
            rm -f /tmp/scoring_event_alerts.err
            exit 1
          fi
        done
      elif [[ "${only_if_unviewed:-false}" != "true" ]] || event_is_escalated "$ts" "${escalation_minutes:-60}"; then
        backlog_lines+="${ts} | ${event_type} | id=${event_id} | ${details}"$'\n'
        ((backlog_count+=1))
      fi
    fi
  done <<< "${tenant_rows[$tenant_id]}"

  (( filtered_count == 0 )) && continue

  notification_lines=""
  notification_ids_csv=""
  notification_count=0

  if [[ -n "${recipient_user_ids}" ]]; then
    notification_rows="$(collect_sendable_notifications "$tenant_id" "${recipient_user_ids}" "${only_if_unviewed:-false}" "${escalation_minutes:-60}")"
    if [[ -s /tmp/scoring_event_alerts.err ]]; then
      err_msg="$(tail -n 20 /tmp/scoring_event_alerts.err)"
      "$NOTIFY_SCRIPT" "ERROR" "Scoring alert notification fetch failed" "$err_msg" >/dev/null || true
      rm -f /tmp/scoring_event_alerts.err
      exit 1
    fi

    while IFS=$'\t' read -r notif_id notif_email notif_created notif_title notif_message notif_metadata; do
      [[ -z "${notif_id}" ]] && continue
      event_type_from_meta="$(printf '%s' "$notif_metadata" | cut -d':' -f2)"
      if ! should_emit_event "$event_type_from_meta" "${on_created:-true}" "${on_approved:-true}" "${on_rejected:-true}" "${on_ded_req:-true}" "${on_ded_approved:-true}" "${on_judge:-true}" "${on_category:-true}"; then
        continue
      fi
      notification_lines+="${notif_created} | user=${notif_email} | ${notif_title} | ${notif_message}"$'\n'
      notification_ids_csv+="${notif_id},"
      ((notification_count+=1))
    done <<< "$notification_rows"
  fi

  if (( notification_count == 0 && backlog_count == 0 )); then
    continue
  fi

  shown_lines_source="$notification_lines"
  if [[ -z "$shown_lines_source" ]]; then
    shown_lines_source="$backlog_lines"
  fi
  shown_lines="$(printf '%s' "$shown_lines_source" | head -n "$MAX_LINES")"

  total_send_count="$notification_count"
  if [[ -z "$notification_lines" ]]; then
    total_send_count="$backlog_count"
  fi

  truncated_note=""
  if (( total_send_count > MAX_LINES )); then
    truncated_note=$'\n'"(truncated: showing first ${MAX_LINES} of ${total_send_count} notifications)"
  fi

  tenant_slug="${tenant_slugs[$tenant_id]:-unknown}"
  body="$(cat <<EOF
Tenant: ${tenant_slug} (${tenant_id})
Detected ${filtered_count} scoring/certification governance events since ${since_ts}
Window end: ${now_ts}
Escalation minutes: ${escalation_minutes:-60}
Only-if-unviewed mode: ${only_if_unviewed:-false}

${shown_lines}${truncated_note}
EOF
)"

  ALERT_EMAIL_TO_OVERRIDE="${recipient_emails:-}" \
  "$NOTIFY_SCRIPT" "INFO" "Scoring workflow events (${tenant_slug}: ${total_send_count})" "$body" >/dev/null || true

  if [[ -n "$notification_ids_csv" ]]; then
    notification_ids_csv="${notification_ids_csv%,}"
    mark_notifications_emailed "$notification_ids_csv"
    if [[ -s /tmp/scoring_event_alerts.err ]]; then
      err_msg="$(tail -n 20 /tmp/scoring_event_alerts.err)"
      "$NOTIFY_SCRIPT" "ERROR" "Scoring alert notification update failed" "$err_msg" >/dev/null || true
      rm -f /tmp/scoring_event_alerts.err
      exit 1
    fi
  fi

  ((reported_total+=total_send_count))
done

echo "Reported ${reported_total} tenant-scoped events"
