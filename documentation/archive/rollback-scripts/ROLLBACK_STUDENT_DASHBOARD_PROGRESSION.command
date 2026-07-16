#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT="/Users/james/Desktop/EchoAural 3"
BACKUP="/Users/james/Desktop/EchoAural 3/backups/student-dashboard-progression-20260712-211915"
DASHBOARD_PATH="/Users/james/Desktop/EchoAural 3/student-dashboard-banner-backup-20260711-152919/account/student-home/index.html"
DASHBOARD_STATUS="existing"

[ -d "$BACKUP" ] || {
  echo "Backup not found: $BACKUP" >&2
  exit 1
}

cp "$BACKUP/instrument-identifier-index.html"   "$PROJECT/modules/instrument-identifier/index.html"

cp "$BACKUP/instrument-identifier-script.js"   "$PROJECT/modules/instrument-identifier/script.js"

if [ "$DASHBOARD_STATUS" = "existing" ]; then
  cp "$BACKUP/student-dashboard.html" "$DASHBOARD_PATH"
else
  rm -f "$DASHBOARD_PATH"
fi

restore_or_remove() {
  local backup_name="$1"
  local target="$2"

  if [ -f "$BACKUP/$backup_name" ]; then
    cp "$BACKUP/$backup_name" "$target"
  else
    rm -f "$target"
  fi
}

restore_or_remove   "progression-store.js"   "$PROJECT/shared/js/progression-store.js"

restore_or_remove   "student-module-catalog.js"   "$PROJECT/shared/js/student-module-catalog.js"

restore_or_remove   "student-dashboard-modes.js"   "$PROJECT/shared/js/student-dashboard-modes.js"

restore_or_remove   "student-learning-mode.css"   "$PROJECT/shared/css/student-learning-mode.css"

restore_or_remove   "progression-dashboard-adapter.js"   "$PROJECT/modules/instrument-identifier/progression-dashboard-adapter.js"

echo "Student dashboard Practice / Progression changes rolled back."
