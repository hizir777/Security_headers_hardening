#!/usr/bin/env bash
# =============================================================================
# audit-headers.sh
# Curl-based verifier. Hits a running instance and asserts the six core
# security headers are emitted with the expected values.
#
# Usage:  ./scripts/audit-headers.sh [BASE_URL]
# Default BASE_URL: http://127.0.0.1:3000
# =============================================================================
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:3000}"
FAILED=0

echo "==> Auditing security headers on ${BASE_URL}"
echo

# Fetch headers once, reuse across checks.
HEADERS="$(curl -sI "${BASE_URL}/" | tr -d '\r')"

check() {
  local name="$1"
  local pattern="$2"
  local value
  value="$(echo "${HEADERS}" | grep -i "^${name}:" || true)"
  if [[ -z "${value}" ]]; then
    echo "  [FAIL] ${name} - missing"
    FAILED=1
    return
  fi
  if echo "${value}" | grep -iqE "${pattern}"; then
    echo "  [OK]   ${name}"
  else
    echo "  [WARN] ${name} - present but does not match expected pattern: ${pattern}"
    echo "         got: ${value}"
    FAILED=1
  fi
}

check "Content-Security-Policy" "strict-dynamic.*nonce-|nonce-.*strict-dynamic"
check "X-Frame-Options"         "^x-frame-options:[[:space:]]*DENY"
check "X-Content-Type-Options"  "^x-content-type-options:[[:space:]]*nosniff"
check "Referrer-Policy"         "strict-origin-when-cross-origin"
check "Permissions-Policy"      "camera=\(\)"

# HSTS only in production, so warn (not fail) if absent in dev.
if echo "${HEADERS}" | grep -iq "^strict-transport-security:"; then
  check "Strict-Transport-Security" "max-age=[0-9]+"
else
  echo "  [INFO] Strict-Transport-Security absent (expected in non-prod)"
fi

# Confirm fingerprint headers are stripped.
for h in x-powered-by server; do
  if echo "${HEADERS}" | grep -iq "^${h}:"; then
    echo "  [WARN] fingerprint header still present: ${h}"
    FAILED=1
  fi
done

echo
if [[ "${FAILED}" -ne 0 ]]; then
  echo "==> AUDIT FAILED"
  exit 1
fi
echo "==> AUDIT PASSED"
