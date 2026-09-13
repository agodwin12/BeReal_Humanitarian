#!/usr/bin/env bash
# Daily backup on the VPS (installed in /etc/cron.d by deploy.sh, or run by hand):
#   bash /var/www/bereal/deploy/vps/backup.sh
# Writes content JSON + PostgreSQL dump + media archive to BACKUP_DIR (backend/.env)
# and the status JSON the System screen reads. Log: /var/log/bereal-backup.log
set -uo pipefail
cd /var/www/bereal/backend || exit 1
{
  echo "== $(date -u +%FT%TZ) backup start"
  node scripts/backup.js
  echo "== $(date -u +%FT%TZ) backup exit $?"
} >> /var/log/bereal-backup.log 2>&1
