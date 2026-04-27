#!/usr/bin/env bash
# Endpoint smoke test for the VIT-AP Attendance Planner.
#
# Usage:
#   BASE_URL=http://localhost:3000 ./scripts/smokeTest.sh
#   BASE_URL=https://your-app.vercel.app ID_TOKEN=... CRON_SECRET=... ./scripts/smokeTest.sh
#
# All requests are read-only or rate-limited POSTs that the server is expected
# to either accept or reject explicitly. The script exits with a non-zero
# status if any endpoint replies with an unexpected status code.

set -u

BASE_URL="${BASE_URL:-http://localhost:3000}"
ID_TOKEN="${ID_TOKEN:-}"
CRON_SECRET="${CRON_SECRET:-}"

PASS=0
FAIL=0

color() { printf '\033[%sm%s\033[0m' "$1" "$2"; }

assert_status() {
  local label="$1" expected="$2" actual="$3" body="$4"
  if [[ "$actual" == "$expected" ]]; then
    printf '  %s %s -> %s\n' "$(color '32' 'PASS')" "$label" "$actual"
    PASS=$((PASS + 1))
  else
    printf '  %s %s -> got %s, expected %s\n' "$(color '31' 'FAIL')" "$label" "$actual" "$expected"
    printf '       body: %s\n' "${body:0:200}"
    FAIL=$((FAIL + 1))
  fi
}

http_call() {
  local method="$1" path="$2"
  shift 2
  curl -sS -o /tmp/smoke_body -w '%{http_code}' -X "$method" "$BASE_URL$path" "$@" 2>/dev/null
}

section() { printf '\n%s %s\n' "$(color '36;1' '==>')" "$1"; }

section "Static asset"
status=$(http_call GET /semester-data.json)
body=$(cat /tmp/smoke_body)
assert_status "GET /semester-data.json" 200 "$status" "$body"

section "Admin validators (must require auth)"
for endpoint in semester events slots; do
  status=$(http_call POST "/api/admin/$endpoint" -H 'Content-Type: application/json' -d '{}')
  body=$(cat /tmp/smoke_body)
  assert_status "POST /api/admin/$endpoint without token" 401 "$status" "$body"
done

if [[ -n "$ID_TOKEN" ]]; then
  for endpoint in semester events slots; do
    status=$(http_call POST "/api/admin/$endpoint" \
      -H 'Content-Type: application/json' \
      -H "Authorization: Bearer $ID_TOKEN" \
      -d '{}')
    body=$(cat /tmp/smoke_body)
    case "$endpoint" in
      semester|slots) expected=200 ;;
      events) expected=200 ;;
    esac
    # Admin-only: 200 if the token belongs to the admin, 403 otherwise.
    if [[ "$status" == "200" || "$status" == "403" ]]; then
      printf '  %s POST /api/admin/%s with token -> %s (admin=%s)\n' \
        "$(color '32' 'PASS')" "$endpoint" "$status" "$([[ "$status" == "200" ]] && echo yes || echo no)"
      PASS=$((PASS + 1))
    else
      printf '  %s POST /api/admin/%s with token -> %s\n' "$(color '31' 'FAIL')" "$endpoint" "$status"
      printf '       body: %s\n' "${body:0:200}"
      FAIL=$((FAIL + 1))
    fi
  done
fi

section "Bootstrap (rejects bad credentials)"
status=$(http_call POST "/api/admin/bootstrap" \
  -H 'Content-Type: application/json' \
  -d '{"email":"intruder@example.com","password":"wrong"}')
body=$(cat /tmp/smoke_body)
# 401 if configured, 503 if the env vars are missing — both are acceptable.
if [[ "$status" == "401" || "$status" == "503" ]]; then
  printf '  %s POST /api/admin/bootstrap -> %s\n' "$(color '32' 'PASS')" "$status"
  PASS=$((PASS + 1))
else
  printf '  %s POST /api/admin/bootstrap -> %s\n' "$(color '31' 'FAIL')" "$status"
  printf '       body: %s\n' "${body:0:200}"
  FAIL=$((FAIL + 1))
fi

section "send-alert-email (must require auth)"
status=$(http_call POST "/api/send-alert-email" \
  -H 'Content-Type: application/json' \
  -d '{"courses":[],"semester":{}}')
body=$(cat /tmp/smoke_body)
assert_status "POST /api/send-alert-email without token" 401 "$status" "$body"

if [[ -n "$ID_TOKEN" ]]; then
  status=$(http_call POST "/api/send-alert-email" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $ID_TOKEN" \
    -d '{"courses":[],"semester":{}}')
  body=$(cat /tmp/smoke_body)
  # 200 (sent or skipped) or 429 (rate-limited) is healthy.
  if [[ "$status" == "200" || "$status" == "429" ]]; then
    printf '  %s POST /api/send-alert-email with token -> %s\n' "$(color '32' 'PASS')" "$status"
    PASS=$((PASS + 1))
  else
    printf '  %s POST /api/send-alert-email with token -> %s\n' "$(color '31' 'FAIL')" "$status"
    printf '       body: %s\n' "${body:0:200}"
    FAIL=$((FAIL + 1))
  fi
fi

section "attendance-review cron (must require secret)"
status=$(http_call GET "/api/attendance-review")
body=$(cat /tmp/smoke_body)
assert_status "GET /api/attendance-review without secret" 401 "$status" "$body"

status=$(http_call GET "/api/attendance-review" \
  -H 'Authorization: Bearer not-the-real-secret')
body=$(cat /tmp/smoke_body)
assert_status "GET /api/attendance-review with bad secret" 401 "$status" "$body"

if [[ -n "$CRON_SECRET" ]]; then
  status=$(http_call GET "/api/attendance-review" \
    -H "Authorization: Bearer $CRON_SECRET")
  body=$(cat /tmp/smoke_body)
  assert_status "GET /api/attendance-review with secret" 200 "$status" "$body"
fi

section "Method enforcement"
status=$(http_call GET "/api/send-alert-email")
body=$(cat /tmp/smoke_body)
assert_status "GET on POST-only endpoint" 405 "$status" "$body"

status=$(http_call POST "/api/attendance-review" \
  -H 'Authorization: Bearer x')
body=$(cat /tmp/smoke_body)
assert_status "POST on GET-only cron" 405 "$status" "$body"

printf '\n----------------------------------------\n'
printf 'Smoke test complete: %s passed, %s failed\n' \
  "$(color '32' "$PASS")" "$(color '31' "$FAIL")"
[[ "$FAIL" == 0 ]]
