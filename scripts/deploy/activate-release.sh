#!/usr/bin/env bash
set -euo pipefail

RELEASES_DIR="${RELEASES_DIR:-/opt/event-manager/releases}"
CURRENT_LINK="${CURRENT_LINK:-/opt/event-manager/current}"
SERVICE_NAME="${SERVICE_NAME:-event-manager.service}"
NGINX_ENABLED="${NGINX_ENABLED:-/etc/nginx/sites-enabled/event-manager}"
NGINX_AVAILABLE="${NGINX_AVAILABLE:-/etc/nginx/sites-available/event-manager}"
ENV_FILE="${ENV_FILE:-/etc/event-manager/event-manager.env}"

if [ "${1:-}" = "" ]; then
  echo "Usage: sudo $0 <release-timestamp>"
  exit 1
fi

TS="$1"
REL="$RELEASES_DIR/$TS"

if [ ! -d "$REL" ]; then
  echo "Release not found: $REL"
  exit 1
fi

NOW="$(date +%Y%m%d%H%M%S)"
sudo cp /etc/systemd/system/event-manager.service "/etc/systemd/system/event-manager.service.bak-$NOW"
[ -f "$NGINX_ENABLED" ] && sudo cp "$NGINX_ENABLED" "$NGINX_ENABLED.bak-$NOW" || true
[ -f "$NGINX_AVAILABLE" ] && sudo cp "$NGINX_AVAILABLE" "$NGINX_AVAILABLE.bak-$NOW" || true

sudo ln -sfn "$REL" "$CURRENT_LINK"

sudo install -d -m 755 /etc/systemd/system/event-manager.service.d
sudo tee /etc/systemd/system/event-manager.service.d/override.conf >/dev/null <<EOF
[Service]
WorkingDirectory=$CURRENT_LINK
EnvironmentFile=$ENV_FILE
ExecStart=
ExecStart=/usr/bin/node dist/server.js
EOF

normalize_nginx_roots() {
  local file="$1"
  [ -f "$file" ] || return 0

  # Normalize frontend and shared-data roots without relying on legacy paths.
  sudo sed -i -E 's|root[[:space:]]+[^;]*/frontend/dist;|root /opt/event-manager/current/frontend/dist;|g' "$file"
  sudo sed -i -E 's|root[[:space:]]+[^;]*/event-manager;|root /var/lib/event-manager;|g' "$file"
}

normalize_nginx_roots "$NGINX_ENABLED"
normalize_nginx_roots "$NGINX_AVAILABLE"

if [ -d /etc/nginx/backup-sites-enabled ]; then
  for f in /etc/nginx/sites-enabled/*.bak-*; do
    [ -e "$f" ] || continue
    sudo mv "$f" /etc/nginx/backup-sites-enabled/
  done
fi

sudo systemctl daemon-reload
sudo systemctl restart "$SERVICE_NAME"
sudo nginx -t
sudo systemctl reload nginx

echo "Activated release: $REL"
systemctl is-active "$SERVICE_NAME"
readlink -f "$CURRENT_LINK"
