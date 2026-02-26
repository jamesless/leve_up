#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
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

DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_NAME="${DB_NAME:-level_up}"

echo "Initializing local PostgreSQL..."
echo "  user: ${DB_USER}"
echo "  db:   ${DB_NAME}"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql not found. Please install PostgreSQL client first."
  exit 1
fi

# Inject runtime DB values into backend/.env for consistency
if [[ ! -f "${ENV_FILE}" ]]; then
  touch "${ENV_FILE}"
fi
upsert_env "DB_HOST" "${DB_HOST:-localhost}" "${ENV_FILE}"
upsert_env "DB_PORT" "${DB_PORT:-5432}" "${ENV_FILE}"
upsert_env "DB_USER" "${DB_USER}" "${ENV_FILE}"
upsert_env "DB_PASSWORD" "${DB_PASSWORD}" "${ENV_FILE}"
upsert_env "DB_NAME" "${DB_NAME}" "${ENV_FILE}"
upsert_env "DB_SSL_MODE" "${DB_SSL_MODE:-disable}" "${ENV_FILE}"

psql postgres -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    EXECUTE format('CREATE ROLE %I WITH LOGIN PASSWORD %L', '${DB_USER}', '${DB_PASSWORD}');
  END IF;
END
\$\$;
SQL

# Create database if missing (CREATE DATABASE cannot run inside transaction block)
if [[ "$(psql postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'")" != "1" ]]; then
  createdb --owner="${DB_USER}" "${DB_NAME}"
else
  psql postgres -v ON_ERROR_STOP=1 -c "ALTER DATABASE \"${DB_NAME}\" OWNER TO \"${DB_USER}\";"
fi

# Ensure database-level privileges
psql postgres -v ON_ERROR_STOP=1 -c "GRANT ALL PRIVILEGES ON DATABASE \"${DB_NAME}\" TO \"${DB_USER}\";"

# Ensure schema ownership/privileges so app can create tables in public schema
psql "${DB_NAME}" -v ON_ERROR_STOP=1 <<SQL
ALTER SCHEMA public OWNER TO "${DB_USER}";
GRANT USAGE, CREATE ON SCHEMA public TO "${DB_USER}";
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO "${DB_USER}";
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO "${DB_USER}";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO "${DB_USER}";
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO "${DB_USER}";
SQL

echo "Done. Export one of the following:"
echo "  export DATABASE_URL=\"postgres://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}?sslmode=disable\""
echo "or"
echo "  export DB_USER=${DB_USER} DB_PASSWORD=${DB_PASSWORD} DB_NAME=${DB_NAME}"
