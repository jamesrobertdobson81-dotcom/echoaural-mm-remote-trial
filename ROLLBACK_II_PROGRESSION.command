#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT="/Users/james/Desktop/EchoAural 3"
BACKUP="/Users/james/Desktop/EchoAural 3/backups/ii-progression-20260712-184049"

[ -d "$BACKUP" ] || {
  echo "Backup not found: $BACKUP" >&2
  exit 1
}

cp "$BACKUP/index.html"   "$PROJECT/modules/instrument-identifier/index.html"

cp "$BACKUP/script.js"   "$PROJECT/modules/instrument-identifier/script.js"

cp "$BACKUP/clips.js"   "$PROJECT/modules/instrument-identifier/clips.js"

cp "$BACKUP/package.json"   "$PROJECT/package.json"

if [ -f "$BACKUP/check-project.js" ]; then
  cp "$BACKUP/check-project.js"     "$PROJECT/tools/check-project.js"
fi

if [ -f "$BACKUP/progression.js" ]; then
  cp "$BACKUP/progression.js"     "$PROJECT/modules/instrument-identifier/progression.js"
else
  rm -f     "$PROJECT/modules/instrument-identifier/progression.js"
fi

rm -f "$PROJECT/tools/report-ii-progression.js"

echo "Instrument Identifier progression changes rolled back."
