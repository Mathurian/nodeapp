#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:3002}"
DEFAULT_TENANT="${DEFAULT_TENANT:-default}"
EMAIL="${EMAIL:-admin@eventmanager.com}"
PASSWORD="${PASSWORD:-Password123!}"
TARGET_TENANT="${TARGET_TENANT:-}"
TARGET_TENANT_ID="${TARGET_TENANT_ID:-}"

COOKIE="/tmp/super_admin_scope_smoke_cookie.txt"
BODY="/tmp/super_admin_scope_smoke_body.json"
HDR="/tmp/super_admin_scope_smoke_headers.txt"
AUTH_TOKEN=""
CSRF=""
FAILS=0

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; FAILS=$((FAILS+1)); }

request_json() {
  local method="$1"
  local path="$2"
  local tenant_slug="$3"
  local data="${4:-}"

  rm -f "$BODY" "$HDR"

  local extra=()
  extra+=( -H "X-Tenant-Slug: ${tenant_slug}" )
  if [[ -n "$AUTH_TOKEN" ]]; then
    extra+=( -H "Authorization: Bearer ${AUTH_TOKEN}" )
  fi
  extra+=( -b "$COOKIE" -c "$COOKIE" )

  if [[ "$method" != "GET" ]]; then
    extra+=( -H "X-CSRF-Token: ${CSRF}" -H "Content-Type: application/json" )
  fi

  if [[ -n "$data" ]]; then
    curl -sS -D "$HDR" -o "$BODY" -w '%{http_code}' "${extra[@]}" -X "$method" -d "$data" "${BASE}${path}"
  else
    curl -sS -D "$HDR" -o "$BODY" -w '%{http_code}' "${extra[@]}" -X "$method" "${BASE}${path}"
  fi
}

extract_tenant_array_jq='
  def arr(v):
    if (v|type) == "array" then v
    elif (v|type) == "object" then
      if ((v.tenants // null) != null and (v.tenants|type) == "array") then v.tenants
      elif ((v.items // null) != null and (v.items|type) == "array") then v.items
      elif ((v.results // null) != null and (v.results|type) == "array") then v.results
      else [] end
    else [] end;
  arr(.data // .tenants // .results // .items // [])
'

echo "Super Admin Tenant Scope Smoke"
echo "BASE=${BASE}"
echo "DEFAULT_TENANT=${DEFAULT_TENANT}"
echo "EMAIL=${EMAIL}"

rm -f "$COOKIE"
csrf_code="$(curl -sS -o "$BODY" -w '%{http_code}' -c "$COOKIE" -b "$COOKIE" -H "X-Tenant-Slug: ${DEFAULT_TENANT}" "${BASE}/api/v1/csrf-token")"
if [[ "$csrf_code" != "200" ]]; then
  fail "csrf-token (code=${csrf_code})"
  echo "SMOKE_RESULT=FAIL (failures=${FAILS})"
  exit 2
fi

CSRF="$(jq -r '.csrfToken // empty' "$BODY")"
if [[ -z "$CSRF" ]]; then
  fail "csrf-token parse"
  echo "SMOKE_RESULT=FAIL (failures=${FAILS})"
  exit 2
fi
pass "csrf-token"

payload="$(jq -nc --arg email "$EMAIL" --arg password "$PASSWORD" '{email:$email,password:$password}')"
login_code="$(curl -sS -D "$HDR" -o "$BODY" -w '%{http_code}' -c "$COOKIE" -b "$COOKIE" -H "X-Tenant-Slug: ${DEFAULT_TENANT}" -H "X-CSRF-Token: ${CSRF}" -H 'Content-Type: application/json' -X POST -d "$payload" "${BASE}/api/v1/auth/login")"
if [[ "$login_code" != "200" ]]; then
  fail "login (code=${login_code})"
  echo "SMOKE_RESULT=FAIL (failures=${FAILS})"
  exit 2
fi
AUTH_TOKEN="$(jq -r '.data.token // .token // empty' "$BODY")"
pass "login"

status="$(request_json GET /api/v1/auth/profile "${DEFAULT_TENANT}")"
if [[ "$status" != "200" ]]; then
  fail "baseline profile (code=${status})"
  echo "SMOKE_RESULT=FAIL (failures=${FAILS})"
  exit 2
fi
BASELINE_ROLE="$(jq -r '.data.role // .role // empty' "$BODY")"
BASELINE_TENANT_ID="$(jq -r '.data.tenantId // .tenantId // empty' "$BODY")"

if [[ "$BASELINE_ROLE" != "SUPER_ADMIN" ]]; then
  fail "account is not SUPER_ADMIN (role=${BASELINE_ROLE})"
  echo "SMOKE_RESULT=FAIL (failures=${FAILS})"
  exit 2
fi
pass "baseline super admin profile"

if [[ -z "$TARGET_TENANT" ]]; then
  status="$(request_json GET "/api/v1/tenants?page=1&limit=200" "${DEFAULT_TENANT}")"
  if [[ "$status" != "200" ]]; then
    fail "tenant list lookup (code=${status})"
    echo "SMOKE_RESULT=FAIL (failures=${FAILS})"
    exit 2
  fi
  TARGET_TENANT="$(jq -r --arg default_slug "$DEFAULT_TENANT" "${extract_tenant_array_jq} | map(select((.slug // \"\") != \$default_slug and (.isActive // true))) | .[0].slug // empty" "$BODY")"
  TARGET_TENANT_ID="$(jq -r --arg default_slug "$DEFAULT_TENANT" "${extract_tenant_array_jq} | map(select((.slug // \"\") != \$default_slug and (.isActive // true))) | .[0].id // empty" "$BODY")"
fi

if [[ -z "$TARGET_TENANT" ]]; then
  echo "WARN: no non-default active tenant found; set TARGET_TENANT to run explicit-scope assertions"
  echo "SMOKE_RESULT=PASS (scope assertions skipped)"
  exit 0
fi

status="$(request_json GET /api/v1/auth/profile "${TARGET_TENANT}")"
if [[ "$status" != "200" ]]; then
  fail "profile with tenant override (code=${status})"
  echo "SMOKE_RESULT=FAIL (failures=${FAILS})"
  exit 2
fi

PROFILE_OVERRIDE_TENANT_ID="$(jq -r '.data.tenantId // .tenantId // empty' "$BODY")"

if [[ -z "$TARGET_TENANT_ID" ]]; then
  TARGET_TENANT_ID="$PROFILE_OVERRIDE_TENANT_ID"
fi

if [[ -z "$TARGET_TENANT_ID" || "$TARGET_TENANT_ID" == "$BASELINE_TENANT_ID" ]]; then
  status="$(request_json GET "/api/v1/tenants?page=1&limit=200" "${DEFAULT_TENANT}")"
  if [[ "$status" == "200" ]]; then
    RESOLVED_TARGET_ID="$(jq -r --arg target_slug "$TARGET_TENANT" "${extract_tenant_array_jq} | map(select((.slug // \"\") == \$target_slug)) | .[0].id // empty" "$BODY")"
    if [[ -n "$RESOLVED_TARGET_ID" ]]; then
      TARGET_TENANT_ID="$RESOLVED_TARGET_ID"
    fi
  fi
fi

if [[ -z "$TARGET_TENANT_ID" ]]; then
  fail "tenant override profile parse"
  echo "SMOKE_RESULT=FAIL (failures=${FAILS})"
  exit 2
fi

if [[ "$PROFILE_OVERRIDE_TENANT_ID" == "$BASELINE_TENANT_ID" ]]; then
  echo "WARN: auth profile tenantId remained at session tenant; continuing with DB-scope validation"
else
  pass "tenant override changed active tenant context (${TARGET_TENANT})"
fi

status="$(request_json GET "/api/v1/admin/database/tables/users/data?page=1&limit=200" "${DEFAULT_TENANT}")"
if [[ "$status" != "200" ]]; then
  fail "global table query (code=${status})"
  echo "SMOKE_RESULT=FAIL (failures=${FAILS})"
  exit 2
fi
GLOBAL_COUNT="$(jq -r '(.data.rows // .rows // []) | length' "$BODY")"
pass "global table query count=${GLOBAL_COUNT}"

status="$(request_json GET "/api/v1/admin/database/tables/users/data?page=1&limit=200" "${TARGET_TENANT}")"
if [[ "$status" != "200" ]]; then
  fail "tenant-scoped table query (code=${status})"
  echo "SMOKE_RESULT=FAIL (failures=${FAILS})"
  exit 2
fi
TARGET_COUNT="$(jq -r '(.data.rows // .rows // []) | length' "$BODY")"

if jq -e --arg tid "$TARGET_TENANT_ID" '((.data.rows // .rows // []) | map(select((.tenantId // "") != $tid)) | length) == 0' "$BODY" >/dev/null 2>&1; then
  pass "tenant-scoped query returned only tenant rows"
else
  fail "tenant-scoped query returned cross-tenant rows"
fi

if [[ "$GLOBAL_COUNT" -ge "$TARGET_COUNT" ]]; then
  pass "global query count >= scoped count"
else
  fail "global query count < scoped count (unexpected)"
fi

echo
if [[ "$FAILS" -eq 0 ]]; then
  echo "SMOKE_RESULT=PASS"
  exit 0
fi

echo "SMOKE_RESULT=FAIL (failures=${FAILS})"
exit 2
