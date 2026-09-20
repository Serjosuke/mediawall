#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
    printf '%s\n' 'Install Docker Engine with Docker Compose or Docker Desktop, then rerun ./start.sh.' >&2
    exit 1
fi

if [ ! -f .env ]; then
    if ! command -v openssl >/dev/null 2>&1; then
        printf '%s\n' 'OpenSSL is required to create local credentials. Install it and rerun ./start.sh.' >&2
        exit 1
    fi
    printf 'APP_KEY=base64:%s\nDB_PASSWORD=%s\n' "$(openssl rand -base64 32)" "$(openssl rand -hex 24)" > .env
    chmod 600 .env
fi

docker compose up --build -d
printf '%s\n' 'Open http://localhost:3000 after the services start.'
