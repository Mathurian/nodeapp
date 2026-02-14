#!/usr/bin/env bash
set -uo pipefail

# Hardened live UAT role matrix runner.
# - Host fallback (:3000 and :80)
# - Retries with backoff
# - Per-role login with CSRF
# - Optional endpoint retry after re-auth on 401
# - CSV output + compact summary

TENANT_SLUG="${TENANT_SLUG:-febtest1}"
PASSWORD="${PASSWORD:-Password123!}"
OUTPUT_CSV="${OUTPUT_CSV:-/tmp/role_uat_matrix_live.csv}"
DETAIL_LOG="${DETAIL_LOG:-/tmp/role_uat_matrix_live.log}"

ROLE_USERS=(
  "organizer1@febtest1.com"
  "judge1@febtest1.com"
  "tally1@febtest1.com"
  "auditor1@febtest1.com"
  "board1@febtest1.com"
  "emcee1@febtest1.com"
  "contestant1@febtest1.com"
)

ENDPOINTS=(
  "/api/v1/navigation"
  "/api/v1/assignments"
  "/api/v1/bios/directory"
  "/api/v1/results"
  "/api/v1/scoring/categories"
  "/api/v1/judge/assignments"
  "/api/v1/tally-master/stats"
  "/api/v1/auditor/stats"
  "/api/v1/board/stats"
  "/api/v1/emcee/scripts"
  "/api/v1/certifications/overview"
  "/api/v1/deductions/pending"
  "/api/v1/score-files"
)

BASE_CANDIDATES=(
  "http://127.0.0.1:3000"
  "http://127.0.0.1"
)

mkdir -p "$(dirname "$OUTPUT_CSV")"
mkdir -p "$(dirname "$DETAIL_LOG")"
: > "$DETAIL_LOG"

log() {
  printf '[%s] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*" | tee -a "$DETAIL_LOG" >/dev/null
}

sleep_backoff() {
  case "$1" in
    1) sleep 0.2 ;;
    2) sleep 0.4 ;;
    3) sleep 0.8 ;;
    4) sleep 1.2 ;;
    *) sleep 1.8 ;;
  esac
}

http_code_for() {
  local method="$1"
  local base="$2"
  local path="$3"
  local cookie_file="$4"
  local out_file="$5"
  local data="${6:-}"
  local csrf="${7:-}"

  local curl_args=(
    -sS
    --connect-timeout 2
    --max-time 10
    -o "$out_file"
    -w '%{http_code}'
    -H "X-Tenant-Slug: ${TENANT_SLUG}"
    -X "$method"
  )

  if [ -n "$cookie_file" ]; then
    curl_args+=(-b "$cookie_file" -c "$cookie_file")
  fi

  if [ -n "$csrf" ]; then
    curl_args+=(-H "X-CSRF-Token: ${csrf}")
  fi

  if [ -n "$data" ]; then
    curl_args+=(-H 'Content-Type: application/json' -d "$data")
  fi

  local code
  code="$(curl "${curl_args[@]}" "${base}${path}" 2>>"$DETAIL_LOG" || true)"
  if [ -z "$code" ]; then
    printf '000'
    return 0
  fi
  if [ "${#code}" -gt 3 ]; then
    code="${code: -3}"
  fi
  printf '%s' "$code"
}

probe_base() {
  local selected=""
  local base attempt code

  for base in "${BASE_CANDIDATES[@]}"; do
    for attempt in 1 2 3 4 5; do
      code="$(http_code_for GET "$base" "/health" "" "/tmp/uat_health_probe.json")"
      if [ "$code" = "200" ]; then
        selected="$base"
        break
      fi
      sleep_backoff "$attempt"
    done
    [ -n "$selected" ] && break
  done

  if [ -z "$selected" ]; then
    return 1
  fi

  printf '%s' "$selected"
}

login_role() {
  local base="$1"
  local email="$2"
  local cookie_file="$3"
  local csrf_file="/tmp/uat_csrf_${email%@*}.json"
  local login_file="/tmp/uat_login_${email%@*}.json"
  local attempt csrf code payload

  : > "$cookie_file"
  payload="{\"email\":\"${email}\",\"password\":\"${PASSWORD}\"}"

  for attempt in 1 2 3 4 5; do
    code="$(http_code_for GET "$base" "/api/v1/csrf-token" "$cookie_file" "$csrf_file")"
    if [ "$code" != "200" ]; then
      sleep_backoff "$attempt"
      continue
    fi

    csrf="$(jq -r '.csrfToken // empty' "$csrf_file" 2>/dev/null || true)"
    if [ -z "$csrf" ]; then
      sleep_backoff "$attempt"
      continue
    fi

    code="$(http_code_for POST "$base" "/api/v1/auth/login" "$cookie_file" "$login_file" "$payload" "$csrf")"
    case "$code" in
      200) printf '200'; return 0 ;;
      429) sleep_backoff "$attempt" ;;
      *) sleep_backoff "$attempt" ;;
    esac
  done

  printf '%s' "${code:-000}"
  return 1
}

call_endpoint() {
  local base="$1"
  local endpoint="$2"
  local cookie_file="$3"
  local out_file="$4"
  local attempt code

  for attempt in 1 2 3 4 5; do
    code="$(http_code_for GET "$base" "$endpoint" "$cookie_file" "$out_file")"
    case "$code" in
      200|201|204|400|401|403|404|409|422) printf '%s' "$code"; return 0 ;;
      429) sleep_backoff "$attempt" ;;
      000|5??) sleep_backoff "$attempt" ;;
      *) printf '%s' "$code"; return 0 ;;
    esac
  done

  printf '%s' "${code:-000}"
  return 1
}

main() {
  local base
  base="$(probe_base)" || {
    log "ERROR: no healthy local endpoint found on candidates: ${BASE_CANDIDATES[*]}"
    exit 1
  }
  log "Using base endpoint: ${base}"

  printf 'user,endpoint,status\n' > "$OUTPUT_CSV"

  local email cookie_file login_code endpoint code
  for email in "${ROLE_USERS[@]}"; do
    cookie_file="/tmp/uat_cookie_${email%@*}.txt"
    login_code="$(login_role "$base" "$email" "$cookie_file")"

    if [ "$login_code" != "200" ]; then
      log "LOGIN FAILED for ${email} (${login_code})"
      for endpoint in "${ENDPOINTS[@]}"; do
        printf '%s,%s,%s\n' "$email" "$endpoint" "LOGIN_${login_code}" >> "$OUTPUT_CSV"
      done
      continue
    fi

    for endpoint in "${ENDPOINTS[@]}"; do
      code="$(call_endpoint "$base" "$endpoint" "$cookie_file" "/tmp/uat_resp_${email%@*}.json")"

      # Re-auth one time on 401 in case session/cookie rotated.
      if [ "$code" = "401" ]; then
        login_code="$(login_role "$base" "$email" "$cookie_file")"
        if [ "$login_code" = "200" ]; then
          code="$(call_endpoint "$base" "$endpoint" "$cookie_file" "/tmp/uat_resp_${email%@*}.json")"
        fi
      fi

      printf '%s,%s,%s\n' "$email" "$endpoint" "$code" >> "$OUTPUT_CSV"
    done
  done

  log "Wrote matrix to ${OUTPUT_CSV}"
  printf '\nSummary by status:\n'
  awk -F, 'NR>1{c[$3]++} END {for (k in c) printf "%s,%d\n",k,c[k]}' "$OUTPUT_CSV" | sort -t, -k2,2nr
}

main "$@"
