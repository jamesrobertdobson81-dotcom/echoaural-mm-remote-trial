#!/usr/bin/env bash
set -euo pipefail

FORMULA="postgresql@17"
PORT="5433"
PGDATA="$HOME/Library/Application Support/EchoAural/postgres17"
PG_BIN="$(brew --prefix "$FORMULA")/bin"

"$PG_BIN/pg_ctl" -D "$PGDATA" status || true
"$PG_BIN/pg_isready" -h 127.0.0.1 -p "$PORT" || true
