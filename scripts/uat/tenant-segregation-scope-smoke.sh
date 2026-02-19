#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:3002}"
TENANT="${TENANT:-default}"
EMAIL="${EMAIL:-admin@eventmanager.com}"
PASSWORD="${PASSWORD:-Password123!}"
SPOOF_TENANT="${SPOOF_TENANT:-spoof-tenant-$(date +%s)}"

COOKIE="/tmp/tenant_scope_smoke_cookie.txt"
BODY="/tmp/tenant_scope_smoke_body.json"
HDR="/tmp/tenant_scope_smoke_headers.txt"
CSRF=""
AUTH_TOKEN=""
FAILS=0

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; FAILS=$((FAILS+1)); }

request_json() {
  local method="$1"
  local path="$2"
  local data="${3:-}"
  shift 3 || true
  local extra_headers=("$@")
  local extra=()

  rm -f "$BODY" "$HDR"
  extra+=( -H "X-Tenant-Slug: ${TENANT}" )
  if [[ -n "$AUTH_TOKEN" ]]; then
    extra+=( -H "Authorization: Bearer ${AUTH_TOKEN}" )
  fi
  extra+=( -b "$COOKIE" -c "$COOKIE" )

  for h in "${extra_headers[@]}"; do
    extra+=( -H "$h" )
  done

  if [[ "$method" != "GET" ]]; then
    extra+=( -H "X-CSRF-Token: ${CSRF}" -H "Content-Type: application/json" )
  fi

  if [[ -n "$data" ]]; then
    curl -sS -D "$HDR" -o "$BODY" -w '%{http_code}' "${extra[@]}" -X "$method" -d "$data" "${BASE}${path}"
  else
    curl -sS -D "$HDR" -o "$BODY" -w '%{http_code}' "${extra[@]}" -X "$method" "${BASE}${path}"
  fi
}

login() {
  rm -f "$COOKIE"

  local csrf_code
  csrf_code="$(curl -sS -o "$BODY" -w '%{http_code}' -c "$COOKIE" -b "$COOKIE" -H "X-Tenant-Slug: ${TENANT}" "${BASE}/api/v1/csrf-token")"
  if [[ "$csrf_code" != "200" ]]; then
    return 1
  fi

  CSRF="$(jq -r '.csrfToken // empty' "$BODY")"
  if [[ -z "$CSRF" ]]; then
    return 1
  fi

  local payload login_code
  payload="$(jq -nc --arg email "$EMAIL" --arg password "$PASSWORD" '{email:$email,password:$password}')"
  login_code="$(curl -sS -D "$HDR" -o "$BODY" -w '%{http_code}' -c "$COOKIE" -b "$COOKIE" -H "X-Tenant-Slug: ${TENANT}" -H "X-CSRF-Token: ${CSRF}" -H 'Content-Type: application/json' -X POST -d "$payload" "${BASE}/api/v1/auth/login")"
  if [[ "$login_code" != "200" ]]; then
    return 1
  fi

  AUTH_TOKEN="$(jq -r '.data.token // .token // empty' "$BODY")"
  return 0
}

echo "Tenant Segregation Scope Smoke"
echo "BASE=${BASE}"
echo "TENANT=${TENANT}"
echo "EMAIL=${EMAIL}"
echo "SPOOF_TENANT=${SPOOF_TENANT}"

if login; then
  pass "login"
else
  fail "login"
  echo "SMOKE_RESULT=FAIL (failures=${FAILS})"
  exit 2
fi

status="$(request_json GET /api/v1/auth/profile)"
if [[ "$status" != "200" ]]; then
  fail "baseline profile (code=${status})"
  echo "SMOKE_RESULT=FAIL (failures=${FAILS})"
  exit 2
fi

BASELINE_ROLE="$(jq -r '.data.role // .role // empty' "$BODY")"
BASELINE_TENANT_ID="$(jq -r '.data.tenantId // .tenantId // empty' "$BODY")"

if [[ -z "$BASELINE_ROLE" || -z "$BASELINE_TENANT_ID" ]]; then
  fail "baseline profile parse"
  echo "SMOKE_RESULT=FAIL (failures=${FAILS})"
  exit 2
fi

pass "baseline profile role=${BASELINE_ROLE} tenantId=${BASELINE_TENANT_ID}"

if [[ "$BASELINE_ROLE" == "SUPER_ADMIN" ]]; then
  fail "test account is SUPER_ADMIN; provide a non-super-admin user for scope smoke"
  echo "SMOKE_RESULT=FAIL (failures=${FAILS})"
  exit 2
fi

status="$(request_json GET "/api/v1/auth/profile?tenantId=${SPOOF_TENANT}" "" "X-Tenant-ID: ${SPOOF_TENANT}" "X-Tenant-Slug: ${SPOOF_TENANT}")"
if [[ "$status" != "200" ]]; then
  fail "spoofed profile request blocked unexpectedly (code=${status})"
  echo "SMOKE_RESULT=FAIL (failures=${FAILS})"
  exit 2
fi

SPOOFED_TENANT_ID="$(jq -r '.data.tenantId // .tenantId // empty' "$BODY")"
if [[ "$SPOOFED_TENANT_ID" == "$BASELINE_TENANT_ID" ]]; then
  pass "tenant spoof ignored for authenticated non-super-admin"
else
  fail "tenant spoof changed tenant context (baseline=${BASELINE_TENANT_ID}, spoofed=${SPOOFED_TENANT_ID})"
fi

status="$(request_json GET "/api/v1/navigation?tenantId=${SPOOF_TENANT}" "" "X-Tenant-ID: ${SPOOF_TENANT}" "X-Tenant-Slug: ${SPOOF_TENANT}")"
if [[ "$status" == "200" ]]; then
  pass "navigation returned under token tenant context despite spoof headers"
else
  fail "navigation request failed under spoof headers (code=${status})"
fi

echo
if [[ "$FAILS" -eq 0 ]]; then
  echo "SMOKE_RESULT=PASS"
  exit 0
fi

echo "SMOKE_RESULT=FAIL (failures=${FAILS})"
exit 2
