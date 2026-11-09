#!/usr/bin/env bash
# Local smoke check. Does not contact Social Stream Ninja or Zo.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-3456}"
export PORT
export VIEWER_PASSWORD="${VIEWER_PASSWORD:-smoke-viewer}"
export ADMIN_PASSWORD="${ADMIN_PASSWORD:-smoke-admin}"
export SSN_SESSION_ID="${SSN_SESSION_ID:-SmokeSession1}"
export SSN_PASSWORD="${SSN_PASSWORD:-smoke-ssn-secret}"
export SSN_SERVER_URL="${SSN_SERVER_URL:-ws://127.0.0.1:9}"

log=/tmp/the-jam-smoke.log
bun run index.tsx >"$log" 2>&1 &
pid=$!
cleanup() {
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
  rm -f the-jam.db the-jam.db-wal the-jam.db-shm
}
trap cleanup EXIT

ready=0
for _ in $(seq 1 50); do
  if curl -sf "http://127.0.0.1:${PORT}/api/health" >/dev/null; then
    ready=1
    break
  fi
  sleep 0.1
done
if [[ "$ready" != 1 ]]; then
  echo "server did not start. log:" >&2
  cat "$log" >&2
  exit 1
fi

health=$(curl -sf "http://127.0.0.1:${PORT}/api/health")
grep -q '"ok":true' <<<"$health"

html=$(curl -sf "http://127.0.0.1:${PORT}/hub")
grep -q 'data-tab="chat"' <<<"$html"
grep -q 'Live Chat' <<<"$html"
if grep -q 'SmokeSession1' <<<"$html"; then
  echo "hub HTML leaked the SSN session id" >&2
  exit 1
fi
if grep -q 'smoke-ssn-secret' <<<"$html"; then
  echo "hub HTML leaked the SSN password" >&2
  exit 1
fi

code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "http://127.0.0.1:${PORT}/api/chat/ticket" -H 'content-type: application/json' -d '{}')
[[ "$code" == "401" ]]

code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "http://127.0.0.1:${PORT}/api/auth/verify" -H 'content-type: application/json' -d 'not-json')
[[ "$code" == "400" ]]

code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "http://127.0.0.1:${PORT}/api/auth/verify" -H 'content-type: application/json' -d '{"password":"nope","type":"viewer"}')
[[ "$code" == "401" ]]

code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "http://127.0.0.1:${PORT}/api/requests/submit" \
  -H 'content-type: application/json' \
  -H "x-viewer-password: ${VIEWER_PASSWORD}" \
  -d '{"type":"message","content":"smoke should not post","username":"not-an-account"}')
[[ "$code" == "401" ]]

curl -sf -o /dev/null "http://127.0.0.1:${PORT}/api/overlay/current"
overlay_html=$(curl -sf "http://127.0.0.1:${PORT}/overlay")
if grep -q 'SmokeSession1' <<<"$overlay_html"; then
  echo "overlay HTML leaked the SSN session id" >&2
  exit 1
fi

ticket_json=$(curl -sf -X POST "http://127.0.0.1:${PORT}/api/chat/ticket" -H 'content-type: application/json' -H "x-viewer-password: ${VIEWER_PASSWORD}" -d '{}')
grep -q '"ticket"' <<<"$ticket_json"
if grep -q 'SmokeSession1\|smoke-ssn-secret' <<<"$ticket_json"; then
  echo "ticket response leaked SSN credentials" >&2
  exit 1
fi

status=$(curl -sf "http://127.0.0.1:${PORT}/api/chat/status" -H "x-admin-password: ${ADMIN_PASSWORD}")
grep -q '"mode":"server-relay"' <<<"$status"
grep -q '"configured":true' <<<"$status"
if grep -q 'SmokeSession1\|smoke-ssn-secret' <<<"$status"; then
  echo "status response leaked SSN credentials" >&2
  exit 1
fi

ticket=$(python3 -c 'import json,sys; print(json.load(sys.stdin)["ticket"])' <<<"$ticket_json")
curl -s -D /tmp/the-jam-chat.hdr -o /tmp/the-jam-chat.body -m 1 \
  "http://127.0.0.1:${PORT}/api/chat/stream?ticket=${ticket}" || true
grep -iq 'content-type: text/event-stream' /tmp/the-jam-chat.hdr
grep -q 'event: status' /tmp/the-jam-chat.body
if grep -q 'SmokeSession1\|smoke-ssn-secret' /tmp/the-jam-chat.body; then
  echo "chat stream leaked SSN credentials" >&2
  exit 1
fi

code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}/api/chat/stream")
[[ "$code" == "401" ]]

echo "smoke ok"
