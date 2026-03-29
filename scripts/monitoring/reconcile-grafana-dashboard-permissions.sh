#!/usr/bin/env bash
set -euo pipefail

GRAFANA_URL="${GRAFANA_URL:-http://127.0.0.1:3001/monitoring/grafana}"
PROVISIONER_USER="${GRAFANA_PROVISIONER_USER:-grafana-provisioner@local}"
PROVISIONER_NAME="${GRAFANA_PROVISIONER_NAME:-Grafana Provisioner}"
PROVISIONER_ROLE="${GRAFANA_PROVISIONER_ROLE:-Admin}"
DASHBOARD_UIDS=(
  "event-manager-monitoring-dev"
  "event-manager-monitoring-prod"
)

wait_for_grafana() {
  local attempts="${1:-30}"
  local delay_seconds="${2:-1}"

  for ((i = 1; i <= attempts; i++)); do
    if curl -fsS -H "X-WEBAUTH-USER: ${PROVISIONER_USER}" \
      -H "X-WEBAUTH-EMAIL: ${PROVISIONER_USER}" \
      -H "X-WEBAUTH-NAME: ${PROVISIONER_NAME}" \
      -H "X-WEBAUTH-ROLE: ${PROVISIONER_ROLE}" \
      "${GRAFANA_URL}/api/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep "${delay_seconds}"
  done

  echo "Grafana API did not become ready at ${GRAFANA_URL}" >&2
  return 1
}

get_dashboard_id() {
  local uid="$1"

  curl -fsS \
    -H "X-WEBAUTH-USER: ${PROVISIONER_USER}" \
    -H "X-WEBAUTH-EMAIL: ${PROVISIONER_USER}" \
    -H "X-WEBAUTH-NAME: ${PROVISIONER_NAME}" \
    -H "X-WEBAUTH-ROLE: ${PROVISIONER_ROLE}" \
    "${GRAFANA_URL}/api/dashboards/uid/${uid}" | jq -r '.dashboard.id // empty'
}

apply_dashboard_permissions() {
  local dashboard_id="$1"

  curl -fsS \
    -X POST \
    -H "X-WEBAUTH-USER: ${PROVISIONER_USER}" \
    -H "X-WEBAUTH-EMAIL: ${PROVISIONER_USER}" \
    -H "X-WEBAUTH-NAME: ${PROVISIONER_NAME}" \
    -H "X-WEBAUTH-ROLE: ${PROVISIONER_ROLE}" \
    -H 'Content-Type: application/json' \
    --data-binary '{"items":[{"role":"Viewer","permission":1},{"role":"Editor","permission":2}]}' \
    "${GRAFANA_URL}/api/dashboards/id/${dashboard_id}/permissions" >/dev/null
}

main() {
  wait_for_grafana

  for uid in "${DASHBOARD_UIDS[@]}"; do
    local dashboard_id
    dashboard_id="$(get_dashboard_id "${uid}")"
    if [ -z "${dashboard_id}" ]; then
      echo "Skipping permissions reconciliation for missing dashboard uid=${uid}" >&2
      continue
    fi

    apply_dashboard_permissions "${dashboard_id}"
    echo "Applied Grafana dashboard permissions for uid=${uid} id=${dashboard_id}"
  done
}

main "$@"
