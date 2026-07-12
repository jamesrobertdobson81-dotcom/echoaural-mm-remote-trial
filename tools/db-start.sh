#!/usr/bin/env bash
set -euo pipefail

FORMULA="postgresql@17"
PORT="5433"
BASE="$HOME/Library/Application Support/EchoAural"
PGDATA="$BASE/postgres17"
LOGFILE="$BASE/postgres17.log"
PG_BIN="$(brew --prefix "$FORMULA")/bin"

if "$PG_BIN/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; then
  echo "EchoAural PostgreSQL is already running."
else
  "$PG_BIN/pg_ctl" -D "$PGDATA" -l "$LOGFILE" -w start
fi

"$PG_BIN/pg_isready" -h 127.0.0.1 -p "$PORT"
