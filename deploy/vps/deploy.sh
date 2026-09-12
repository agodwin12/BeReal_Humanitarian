#!/usr/bin/env bash
# Deploy / update Be Real Humanitarian Works on the VPS (run as root on the server).
#
#   bash /var/www/bereal/deploy/vps/deploy.sh          # pull, install, build, (re)start
#   bash /var/www/bereal/deploy/vps/deploy.sh --no-pull  # rebuild what is already checked out
#
# First-time prerequisites (done once by hand): Node 22 + pm2, PostgreSQL with the
# database from backend/.env, the three env files (backend/.env, frontend/.env.local,
# backoffice/.env.local), and nginx-bereal.conf linked into /etc/nginx/sites-enabled.
set -euo pipefail

APP_DIR=/var/www/bereal
REPO=https://github.com/agodwin12/BeReal_Humanitarian.git
PULL=1
[ "${1:-}" = "--no-pull" ] && PULL=0

if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO" "$APP_DIR"
elif [ "$PULL" = 1 ]; then
  git -C "$APP_DIR" pull --ff-only
fi

for f in backend/.env frontend/.env.local backoffice/.env.local; do
  [ -f "$APP_DIR/$f" ] || { echo "Missing $APP_DIR/$f — create it from the .env.example first."; exit 1; }
done

install_deps() { if [ -f package-lock.json ]; then npm ci --no-audit --no-fund "$@"; else npm install --no-audit --no-fund "$@"; fi; }

echo "== API"
cd "$APP_DIR/backend"
install_deps --omit=dev
mkdir -p uploads
npm run migrate
npm run seed:admin   # idempotent: creates the first Super Admin only if missing

echo "== Website"
cd "$APP_DIR/frontend"
install_deps
npm run build

echo "== Backoffice"
cd "$APP_DIR/backoffice"
install_deps
npm run build

echo "== pm2"
pm2 startOrReload "$APP_DIR/deploy/vps/ecosystem.config.js" --update-env
pm2 save

echo "== nginx"
nginx -t && systemctl reload nginx
echo "Done. pm2 status:"
pm2 ls
