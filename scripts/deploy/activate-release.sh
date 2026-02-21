#!/usr/bin/env bash
set -euo pipefail

RELEASES_DIR="${RELEASES_DIR:-/opt/event-manager/releases}"
CURRENT_LINK="${CURRENT_LINK:-/opt/event-manager/current}"
SERVICE_NAME="${SERVICE_NAME:-event-manager.service}"
NGINX_ENABLED="${NGINX_ENABLED:-/etc/nginx/sites-enabled/event-manager}"
NGINX_AVAILABLE="${NGINX_AVAILABLE:-/etc/nginx/sites-available/event-manager}"
ENV_FILE="${ENV_FILE:-/etc/event-manager/event-manager.env}"
RETAIN_RELEASES="${RETAIN_RELEASES:-10}"

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

normalize_nginx_pwa_cache_headers() {
  local file="$1"
  [ -f "$file" ] || return 0

  local marker="# PWA entry files must not be long-term cached"
  if sudo grep -qF "$marker" "$file"; then
    return 0
  fi

  local tmp
  tmp="$(mktemp)"

  sudo awk -v marker="$marker" '
    BEGIN { inserted = 0 }
    /# Cache control for hashed frontend assets/ && inserted == 0 {
      print "    " marker
      print "    location = /sw.js {"
      print "        try_files $uri =404;"
      print "        add_header Cache-Control \"no-cache, no-store, must-revalidate\" always;"
      print "        add_header Pragma \"no-cache\" always;"
      print "        add_header Expires \"0\" always;"
      print "    }"
      print ""
      print "    location = /service-worker.js {"
      print "        try_files $uri =404;"
      print "        add_header Cache-Control \"no-cache, no-store, must-revalidate\" always;"
      print "        add_header Pragma \"no-cache\" always;"
      print "        add_header Expires \"0\" always;"
      print "    }"
      print ""
      print "    location = /registerSW.js {"
      print "        try_files $uri =404;"
      print "        add_header Cache-Control \"no-cache, no-store, must-revalidate\" always;"
      print "        add_header Pragma \"no-cache\" always;"
      print "        add_header Expires \"0\" always;"
      print "    }"
      print ""
      print "    location = /manifest.webmanifest {"
      print "        try_files $uri =404;"
      print "        add_header Cache-Control \"no-cache, no-store, must-revalidate\" always;"
      print "        add_header Pragma \"no-cache\" always;"
      print "        add_header Expires \"0\" always;"
      print "    }"
      print ""
      inserted = 1
    }
    { print }
  ' "$file" > "$tmp"

  sudo mv "$tmp" "$file"
}

normalize_nginx_api_docs_location() {
  local file="$1"
  [ -f "$file" ] || return 0

  # Prevent regex static-asset locations from overriding Swagger UI assets.
  sudo sed -i -E 's|location[[:space:]]+/api-docs[[:space:]]*\{|location ^~ /api-docs {|g' "$file"
}

prune_old_releases() {
  if ! [[ "$RETAIN_RELEASES" =~ ^[0-9]+$ ]]; then
    echo "Skipping release pruning: RETAIN_RELEASES must be a positive integer (current: $RETAIN_RELEASES)"
    return 0
  fi

  if [ "$RETAIN_RELEASES" -lt 1 ]; then
    echo "Skipping release pruning: RETAIN_RELEASES=$RETAIN_RELEASES"
    return 0
  fi

  local current_target
  current_target="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
  mapfile -t releases < <(ls -1dt "$RELEASES_DIR"/* 2>/dev/null || true)

  if [ "${#releases[@]}" -le "$RETAIN_RELEASES" ]; then
    return 0
  fi

  local index=0
  for rel in "${releases[@]}"; do
    index=$((index + 1))
    if [ "$index" -le "$RETAIN_RELEASES" ]; then
      continue
    fi
    if [ -n "$current_target" ] && [ "$rel" = "$current_target" ]; then
      continue
    fi
    sudo rm -rf "$rel"
    echo "Pruned old release: $rel"
  done
}

normalize_nginx_roots "$NGINX_ENABLED"
normalize_nginx_roots "$NGINX_AVAILABLE"
normalize_nginx_pwa_cache_headers "$NGINX_ENABLED"
normalize_nginx_pwa_cache_headers "$NGINX_AVAILABLE"
normalize_nginx_api_docs_location "$NGINX_ENABLED"
normalize_nginx_api_docs_location "$NGINX_AVAILABLE"

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
prune_old_releases

echo "Activated release: $REL"
systemctl is-active "$SERVICE_NAME"
readlink -f "$CURRENT_LINK"
