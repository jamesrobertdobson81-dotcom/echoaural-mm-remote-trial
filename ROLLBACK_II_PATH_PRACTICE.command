#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT="/Users/james/Desktop/EchoAural 3"
BACKUP="/Users/james/Desktop/EchoAural 3/backups/ii-path-practice-20260712-205023"

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
  rm -f "$PROJECT/modules/instrument-identifier/progression.js"
fi

if [ -f "$BACKUP/report-ii-progression.js" ]; then
  cp "$BACKUP/report-ii-progression.js"     "$PROJECT/tools/report-ii-progression.js"
else
  rm -f "$PROJECT/tools/report-ii-progression.js"
fi

echo "II Progression Path + Free Practice changes rolled back."
