#!/usr/bin/env bash
set -euo pipefail

FORMULA="postgresql@17"
PGDATA="$HOME/Library/Application Support/EchoAural/postgres17"
PG_BIN="$(brew --prefix "$FORMULA")/bin"

if "$PG_BIN/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; then
  "$PG_BIN/pg_ctl" -D "$PGDATA" -m fast -w stop
else
  echo "EchoAural PostgreSQL is already stopped."
fi
