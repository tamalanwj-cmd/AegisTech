#!/usr/bin/env bash
# TSPES one-click deploy (Docker / Podman)
# Usage: ./deploy.sh [up|down|restart|rebuild|logs|status]
# Env overrides: APP_PORT (default 3000), NOCODB_PORT (default 8080)

set -u
cd "$(dirname "$0")"

ACTION="${1:-up}"

# ---- pick engine: docker when its daemon is up, otherwise podman ----
if docker info >/dev/null 2>&1; then
  ENGINE=docker
  if docker compose version >/dev/null 2>&1; then
    COMPOSE=(docker compose)
  else
    COMPOSE=(docker-compose)
  fi
elif command -v podman >/dev/null 2>&1; then
  ENGINE=podman
  if command -v podman-compose >/dev/null 2>&1; then
    COMPOSE=(podman-compose)
  else
    echo "[ERROR] podman is installed but podman-compose is missing" >&2
    exit 1
  fi
else
  echo "[ERROR] neither docker nor podman is available on PATH" >&2
  exit 1
fi

APP_PORT="${APP_PORT:-3000}"
NOCODB_PORT="${NOCODB_PORT:-8080}"

echo "[deploy] engine : $ENGINE"
echo "[deploy] compose: ${COMPOSE[*]}"

compose_up() {
  # A nocodb container from the legacy nocodb-server compose project may hold
  # the name/port; remove it (data survives in ./nocodb-server/nocodb_data).
  "$ENGINE" rm -f nocodb >/dev/null 2>&1 || true
  "${COMPOSE[@]}" up -d --build
}

wait_for() { # $1 url, $2 label, $3 max tries
  local url="$1" label="$2" tries="${3:-45}" i=0
  echo "[deploy] waiting for $label ($url) ..."
  until curl -sf -o /dev/null -m 3 "$url"; do
    i=$((i + 1))
    if [ "$i" -ge "$tries" ]; then
      echo "[ERROR] $label did not become reachable on $url" >&2
      return 1
    fi
    sleep 2
  done
  echo "[deploy] $label is up."
}

report() {
  echo
  echo "==============================================="
  echo "  TSPES deployed!"
  echo "  App    : http://localhost:${APP_PORT}"
  echo "  NocoDB : http://localhost:${NOCODB_PORT}"
  echo "  Login  : admin / admin123"
  echo "==============================================="
}

case "$ACTION" in
  up)
    compose_up || exit 1
    wait_for "http://localhost:${NOCODB_PORT}" "NocoDB" || exit 1
    wait_for "http://localhost:${APP_PORT}" "app" || exit 1
    report
    ;;
  rebuild)
    "$ENGINE" rm -f nocodb >/dev/null 2>&1 || true
    "${COMPOSE[@]}" build --no-cache app || exit 1
    "${COMPOSE[@]}" up -d || exit 1
    wait_for "http://localhost:${APP_PORT}" "app" || exit 1
    report
    ;;
  restart)
    "${COMPOSE[@]}" down >/dev/null 2>&1 || true
    compose_up || exit 1
    wait_for "http://localhost:${APP_PORT}" "app" || exit 1
    report
    ;;
  down)
    "${COMPOSE[@]}" down
    ;;
  logs)
    "${COMPOSE[@]}" logs -f app
    ;;
  status)
    "${COMPOSE[@]}" ps
    ;;
  *)
    echo "Usage: $0 [up|down|restart|rebuild|logs|status]" >&2
    exit 1
    ;;
esac
