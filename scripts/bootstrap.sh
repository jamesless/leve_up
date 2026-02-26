#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
FRONTEND_DIR="${ROOT_DIR}/frontend"
ENV_FILE="${BACKEND_DIR}/.env"

upsert_env() {
  local key="$1"
  local value="$2"
  local file="$3"
  local tmp_file
  tmp_file="$(mktemp)"

  if [[ -f "$file" ]] && grep -q "^${key}=" "$file"; then
    awk -v key="$key" -v value="$value" 'BEGIN{done=0} {
      if ($0 ~ ("^" key "=") && done==0) {
        print key "=" value;
        done=1;
      } else {
        print $0;
      }
    } END { if (done==0) print key "=" value; }' "$file" > "$tmp_file"
  else
    if [[ -f "$file" ]]; then
      cat "$file" > "$tmp_file"
    fi
    echo "${key}=${value}" >> "$tmp_file"
  fi

  mv "$tmp_file" "$file"
}

echo "==> Project root: ${ROOT_DIR}"

if ! command -v go >/dev/null 2>&1; then
  echo "Go is required. Please install Go 1.21+."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Please install Node 20+."
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "PostgreSQL client (psql) is required."
  exit 1
fi

echo "==> Ensuring pnpm is available"
if command -v corepack >/dev/null 2>&1; then
  corepack enable
  corepack prepare pnpm@latest --activate
elif ! command -v pnpm >/dev/null 2>&1; then
  npm install -g pnpm
fi

echo "==> Preparing backend env"
if [[ ! -f "${ENV_FILE}" ]]; then
  cp "${BACKEND_DIR}/.env.example" "${ENV_FILE}"
  echo "Created ${ENV_FILE} from template."
fi

# Ensure .env always has runnable defaults
upsert_env "DB_HOST" "localhost" "${ENV_FILE}"
upsert_env "DB_PORT" "5432" "${ENV_FILE}"
upsert_env "DB_USER" "postgres" "${ENV_FILE}"
upsert_env "DB_PASSWORD" "postgres" "${ENV_FILE}"
upsert_env "DB_NAME" "level_up" "${ENV_FILE}"
upsert_env "DB_SSL_MODE" "disable" "${ENV_FILE}"

set -a
source "${ENV_FILE}"
set +a

echo "==> Initializing local database"
"${BACKEND_DIR}/scripts/init_local_db.sh"

echo "==> Installing backend dependencies"
(cd "${BACKEND_DIR}" && go mod download)

echo "==> Installing frontend dependencies"
(cd "${FRONTEND_DIR}" && npm install)

echo "==> Building frontend (for backend static hosting)"
(cd "${FRONTEND_DIR}" && npm run build)

echo
echo "Bootstrap completed."
echo "Run services:"
echo "  Terminal 1: cd \"${BACKEND_DIR}\" && set -a && source .env && set +a && go run ."
echo "  Terminal 2: cd \"${FRONTEND_DIR}\" && npm run dev"
