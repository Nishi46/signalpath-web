#!/bin/bash
# Test that all API routes return 401 without authentication.
# Usage: bash scripts/test-auth.sh [BASE_URL]
# Default: http://localhost:3000

BASE_URL="${1:-http://localhost:3000}"
FAIL=0
PASS_COUNT=0
TOTAL=0

echo "=== API Auth Enforcement Test ==="
echo "Base URL: $BASE_URL"
echo ""

test_endpoint() {
  local METHOD="$1"
  local ENDPOINT="$2"
  local EXPECTED="$3"
  local BODY="$4"
  TOTAL=$((TOTAL + 1))

  if [ -n "$BODY" ]; then
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X "$METHOD" "$BASE_URL$ENDPOINT" \
      -H "Content-Type: application/json" \
      -d "$BODY")
  else
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X "$METHOD" "$BASE_URL$ENDPOINT")
  fi

  if [ "$STATUS" = "$EXPECTED" ]; then
    echo "PASS: $METHOD $ENDPOINT -> $STATUS"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "FAIL: $METHOD $ENDPOINT -> $STATUS (expected $EXPECTED)"
    FAIL=1
  fi
}

# Protected endpoints — should return 401 without auth cookies
test_endpoint GET  /api/clusters         401
test_endpoint GET  /api/clusters/fake-id 401
test_endpoint GET  /api/signal-count     401
test_endpoint GET  /api/pipeline-status  401
test_endpoint POST /api/feedback         401 '{"cluster_id":"fake","action":"approve"}'
test_endpoint POST /api/push-linear      401 '{"cluster_id":"fake"}'
test_endpoint POST /api/push-jira        401 '{"cluster_id":"fake"}'
test_endpoint GET  /api/auth-init        401
test_endpoint GET  /api/auth-linear      401
test_endpoint GET  /api/auth-jira        401

# Signup should NOT require auth (expect non-401 response)
TOTAL=$((TOTAL + 1))
SIGNUP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/signup" \
  -H "Content-Type: application/json" \
  -d '{"email":"auth-test@test.com","password":"testpass123","company_name":"Auth Test"}')
if [ "$SIGNUP_STATUS" = "401" ]; then
  echo "FAIL: POST /api/signup -> 401 (should be publicly accessible)"
  FAIL=1
else
  echo "PASS: POST /api/signup -> $SIGNUP_STATUS (not 401, publicly accessible)"
  PASS_COUNT=$((PASS_COUNT + 1))
fi

echo ""
echo "Results: $PASS_COUNT/$TOTAL passed"

if [ $FAIL -eq 0 ]; then
  echo "All auth enforcement tests passed!"
  exit 0
else
  echo "Some auth tests FAILED!"
  exit 1
fi
