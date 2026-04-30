#!/usr/bin/env bash
set -euo pipefail

RELEASES_DIR="${RELEASES_DIR:-/opt/event-manager/releases}"
CURRENT_LINK="${CURRENT_LINK:-/opt/event-manager/current}"
SERVICE_NAME="${SERVICE_NAME:-event-manager.service}"
NGINX_ENABLED="${NGINX_ENABLED:-/etc/nginx/sites-enabled/event-manager}"
NGINX_AVAILABLE="${NGINX_AVAILABLE:-/etc/nginx/sites-available/event-manager}"
NGINX_BACKUP_DIR="${NGINX_BACKUP_DIR:-/etc/nginx/backups/event-manager}"
SYSTEMD_BACKUP_DIR="${SYSTEMD_BACKUP_DIR:-/etc/systemd/system/event-manager-backups}"
ENV_FILE="${ENV_FILE:-/etc/event-manager/event-manager.env}"
RETAIN_RELEASES="${RETAIN_RELEASES:-10}"
GRAFANA_PROVISIONING_DIR="${GRAFANA_PROVISIONING_DIR:-/etc/grafana/provisioning}"
GRAFANA_SERVICE_NAME="${GRAFANA_SERVICE_NAME:-grafana-server}"

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

backup_runtime_config() {
  local backup_set="$1"
  local nginx_target="$NGINX_BACKUP_DIR/$backup_set"
  local systemd_target="$SYSTEMD_BACKUP_DIR/$backup_set"

  if [ -f /etc/systemd/system/event-manager.service ]; then
    sudo install -d -m 755 "$systemd_target"
    sudo cp -a /etc/systemd/system/event-manager.service "$systemd_target/event-manager.service"
  fi

  sudo install -d -m 755 "$nginx_target"
  [ -f "$NGINX_ENABLED" ] && sudo cp -a "$NGINX_ENABLED" "$nginx_target/sites-enabled-event-manager" || true
  [ -f "$NGINX_AVAILABLE" ] && sudo cp -a "$NGINX_AVAILABLE" "$nginx_target/sites-available-event-manager" || true
}

migrate_legacy_nginx_backups() {
  local backup_set="$1"
  local legacy_target="$NGINX_BACKUP_DIR/$backup_set/legacy"
  local legacy_file
  local found=0

  for legacy_file in /etc/nginx/sites-enabled/event-manager.bak-* /etc/nginx/sites-available/event-manager.bak-*; do
    [ -e "$legacy_file" ] || continue
    if [ "$found" -eq 0 ]; then
      sudo install -d -m 755 "$legacy_target"
      found=1
    fi
    sudo mv "$legacy_file" "$legacy_target/"
    echo "Moved legacy nginx backup out of site directory: $legacy_file"
  done
}

prune_backup_sets() {
  local dir="$1"
  [ -d "$dir" ] || return 0

  if ! [[ "$RETAIN_RELEASES" =~ ^[0-9]+$ ]] || [ "$RETAIN_RELEASES" -lt 1 ]; then
    echo "Skipping backup pruning for $dir: RETAIN_RELEASES must be a positive integer (current: $RETAIN_RELEASES)"
    return 0
  fi

  mapfile -t backups < <(sudo find "$dir" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' 2>/dev/null | sort -rn | awk '{print $2}')

  if [ "${#backups[@]}" -le "$RETAIN_RELEASES" ]; then
    return 0
  fi

  local index=0
  for backup in "${backups[@]}"; do
    index=$((index + 1))
    if [ "$index" -le "$RETAIN_RELEASES" ]; then
      continue
    fi
    sudo rm -rf "$backup"
    echo "Pruned old backup set: $backup"
  done
}

backup_runtime_config "$NOW"
migrate_legacy_nginx_backups "$NOW"

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

normalize_nginx_monitoring_locations() {
  local file="$1"
  [ -f "$file" ] || return 0

  # Ensure monitoring subpaths win against regex static-asset locations.
  sudo sed -i -E 's|location[[:space:]]+/monitoring/grafana/[[:space:]]*\{|location ^~ /monitoring/grafana/ {|g' "$file"
  sudo sed -i -E 's|location[[:space:]]+/monitoring/prometheus/[[:space:]]*\{|location ^~ /monitoring/prometheus/ {|g' "$file"
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
normalize_nginx_monitoring_locations "$NGINX_ENABLED"
normalize_nginx_monitoring_locations "$NGINX_AVAILABLE"

sync_grafana_provisioning() {
  local source_dir="$CURRENT_LINK/grafana/provisioning"
  [ -d "$source_dir" ] || return 0
  [ -d "$GRAFANA_PROVISIONING_DIR" ] || return 0

  sudo rsync -a --delete "$source_dir/" "$GRAFANA_PROVISIONING_DIR/"
  sudo chown -R grafana:grafana "$GRAFANA_PROVISIONING_DIR"
}

reconcile_grafana_permissions() {
  local reconcile_script="$CURRENT_LINK/scripts/monitoring/reconcile-grafana-dashboard-permissions.sh"
  [ -f "$reconcile_script" ] || return 0

  sudo bash "$reconcile_script"
}

sudo systemctl daemon-reload
sudo systemctl restart "$SERVICE_NAME"
sync_grafana_provisioning
if systemctl list-unit-files "$GRAFANA_SERVICE_NAME" >/dev/null 2>&1; then
  sudo systemctl restart "$GRAFANA_SERVICE_NAME"
  reconcile_grafana_permissions
fi
sudo nginx -t
sudo systemctl reload nginx
prune_old_releases
prune_backup_sets "$NGINX_BACKUP_DIR"
prune_backup_sets "$SYSTEMD_BACKUP_DIR"

echo "Activated release: $REL"
systemctl is-active "$SERVICE_NAME"
readlink -f "$CURRENT_LINK"
