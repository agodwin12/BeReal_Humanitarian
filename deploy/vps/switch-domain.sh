#!/usr/bin/env bash
# Move the three apps from the temporary nip.io names to the real domain.
# Run as root on the server. Waits until the four hostnames resolve to this
# server, then: certificate (certbot), env URLs, stored media URLs, rebuild,
# nip.io names turned into redirects.
#
#   bash /var/www/bereal/deploy/vps/switch-domain.sh            # wait for DNS (up to 24 h), then switch
#   bash /var/www/bereal/deploy/vps/switch-domain.sh --no-wait  # fail immediately if DNS is not ready
set -euo pipefail

IP=31.97.53.16
SITE=berealhumanitarian.org
WWW=www.berealhumanitarian.org
ADMIN=portal.berealhumanitarian.org
API=api.berealhumanitarian.org
OLD_SITE=bereal.31.97.53.16.nip.io
OLD_ADMIN=bereal-admin.31.97.53.16.nip.io
OLD_API=bereal-api.31.97.53.16.nip.io
APP=/var/www/bereal
LOG=/var/log/bereal-domain-switch.log
DONE_FLAG=/var/www/bereal/.domain-switched

exec > >(tee -a "$LOG") 2>&1
echo "== $(date -u +%FT%TZ) switch-domain start"

if [ -f "$DONE_FLAG" ]; then echo "Already switched ($(cat "$DONE_FLAG")). Nothing to do."; exit 0; fi

resolve() {
  if command -v dig >/dev/null; then dig +short "$1" A @1.1.1.1 2>/dev/null | grep -E '^[0-9.]+$' | tail -1;
  else getent ahostsv4 "$1" 2>/dev/null | awk '{print $1}' | head -1; fi
}

WAIT=1; [ "${1:-}" = "--no-wait" ] && WAIT=0
deadline=$(( $(date +%s) + 24*3600 ))
for h in $SITE $WWW $ADMIN $API; do
  while [ "$(resolve "$h")" != "$IP" ]; do
    echo "$(date -u +%T) $h resolves to '$(resolve "$h")', waiting for $IP"
    [ "$WAIT" = 1 ] || { echo "DNS not ready for $h"; exit 1; }
    [ "$(date +%s)" -lt "$deadline" ] || { echo "Gave up after 24 h."; exit 1; }
    sleep 60
  done
  echo "$h -> $IP ok"
done

echo "== certificate"
certbot --nginx --non-interactive --no-eff-email --redirect --cert-name bereal-org \
  -d "$SITE" -d "$WWW" -d "$ADMIN" -d "$API"

echo "== env URLs"
sed -i "s#https://$OLD_API#https://$API#g; s#https://$OLD_ADMIN#https://$ADMIN#g; s#https://$OLD_SITE#https://$SITE#g" \
  "$APP/backend/.env" "$APP/frontend/.env.local" "$APP/backoffice/.env.local"
grep -h "^SITE_URL=\|^API_PUBLIC_URL=\|^NEXT_PUBLIC_API_URL=\|^NEXT_PUBLIC_SITE_URL=\|^CLIENT_URLS=" \
  "$APP/backend/.env" "$APP/frontend/.env.local" "$APP/backoffice/.env.local"

echo "== stored media URLs"
sudo -u postgres psql -d be_real_humanitarian -v ON_ERROR_STOP=1 -Atc \
  "UPDATE media SET url = replace(url, 'https://$OLD_API', 'https://$API'), variants = replace(variants::text, 'https://$OLD_API', 'https://$API')::jsonb WHERE url LIKE 'https://$OLD_API%' OR variants::text LIKE '%https://$OLD_API%';"

echo "== rebuild + restart"
bash "$APP/deploy/vps/deploy.sh" --no-pull

echo "== nip.io names now redirect"
cp "$APP/deploy/vps/nginx-nip-redirect.conf" /etc/nginx/sites-available/bereal
nginx -t && systemctl reload nginx

echo "== checks"
for u in "https://$SITE/en" "https://$WWW/" "https://$ADMIN/login" "https://$API/health" "https://$OLD_SITE/en"; do
  printf '%-45s -> ' "$u"; curl -s -o /dev/null -w '%{http_code} -> %{redirect_url}\n' --max-time 30 "$u"
done
date -u +%FT%TZ > "$DONE_FLAG"
echo "== $(date -u +%FT%TZ) switch-domain done"
