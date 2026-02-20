#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/srv/event-manager/dev}"
RELEASES_DIR="${RELEASES_DIR:-/opt/event-manager/releases}"
CURRENT_LINK="${CURRENT_LINK:-/opt/event-manager/current}"
SHARED_DIR="${SHARED_DIR:-/var/lib/event-manager}"
LOG_DIR="${LOG_DIR:-/var/log/event-manager}"
ENV_DIR="${ENV_DIR:-/etc/event-manager}"

if ! command -v sudo >/dev/null 2>&1; then
  echo "sudo is required"
  exit 1
fi

if [ ! -d "$APP_ROOT" ]; then
  echo "App root not found: $APP_ROOT"
  exit 1
fi

if [ -x "$APP_ROOT/scripts/deploy/pwa-preflight.sh" ]; then
  echo "Running PWA preflight..."
  "$APP_ROOT/scripts/deploy/pwa-preflight.sh" "$APP_ROOT/frontend/dist"
fi

if [ ! -f "$ENV_DIR/event-manager.env" ]; then
  echo "Missing production env file: $ENV_DIR/event-manager.env"
  echo "Create it once and keep it managed separately from the dev workspace."
  echo "Example:"
  echo "  sudo install -d -m 750 $ENV_DIR"
  echo "  sudo cp $APP_ROOT/.env.example $ENV_DIR/event-manager.env"
  echo "  sudo chown root:www-data $ENV_DIR/event-manager.env"
  echo "  sudo chmod 640 $ENV_DIR/event-manager.env"
  echo "  sudoedit $ENV_DIR/event-manager.env"
  exit 1
fi

TS="$(date +%Y%m%d%H%M%S)"
REL="$RELEASES_DIR/$TS"
PREVIOUS_RELEASE="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
PREVIOUS_FRONTEND_DIST=""
if [ -n "$PREVIOUS_RELEASE" ] && [ -d "$PREVIOUS_RELEASE/frontend/dist" ]; then
  PREVIOUS_FRONTEND_DIST="$PREVIOUS_RELEASE/frontend/dist"
fi

copy_pwa_compat_assets_from_previous_release() {
  local previous_dist="$1"
  local target_dist="$2"

  [ -n "$previous_dist" ] || return 0
  [ -f "$previous_dist/sw.js" ] || return 0

  local compat_paths
  compat_paths="$(node - "$previous_dist/sw.js" <<'NODE'
const fs = require('fs');
const swPath = process.argv[2];
if (!swPath || !fs.existsSync(swPath)) process.exit(0);

const content = fs.readFileSync(swPath, 'utf8');
const matches = new Set();
const pattern = /"url":"([^"]+)"/g;
let match;

while ((match = pattern.exec(content)) !== null) {
  const normalized = String(match[1] || '').replace(/^\/+/, '');
  if (!normalized) continue;
  if (normalized.startsWith('assets/') || normalized.startsWith('workbox-')) {
    matches.add(normalized);
  }
}

for (const filePath of Array.from(matches).sort()) {
  process.stdout.write(`${filePath}\n`);
}
NODE
)"

  if [ -z "$compat_paths" ]; then
    return 0
  fi

  echo "Copying previous-release PWA assets for rollout compatibility..."
  while IFS= read -r relative_path; do
    [ -n "$relative_path" ] || continue
    local src="$previous_dist/$relative_path"
    local dst="$target_dist/$relative_path"
    if [ -f "$src" ] && [ ! -f "$dst" ]; then
      sudo install -d -m 755 "$(dirname "$dst")"
      sudo cp -p "$src" "$dst"
    fi
  done <<< "$compat_paths"
}

echo "Staging release: $REL"

sudo install -d -m 755 "$REL" "$REL/frontend" "$REL/src/templates" "$REL/config" "$REL/scripts"

sudo rsync -a --delete "$APP_ROOT/dist/" "$REL/dist/"
sudo install -d -m 755 "$REL/dist/templates/print"
sudo rsync -a --delete "$APP_ROOT/frontend/dist/" "$REL/frontend/dist/"
copy_pwa_compat_assets_from_previous_release "$PREVIOUS_FRONTEND_DIST" "$REL/frontend/dist"
sudo rsync -a --delete "$APP_ROOT/prisma/" "$REL/prisma/"
sudo rsync -a --delete "$APP_ROOT/docs/" "$REL/docs/"
sudo rsync -a --delete "$APP_ROOT/config/" "$REL/config/"
sudo rsync -a --delete "$APP_ROOT/scripts/" "$REL/scripts/"
sudo rsync -a --delete "$APP_ROOT/src/templates/email/" "$REL/src/templates/email/"
sudo rsync -a --delete "$APP_ROOT/src/templates/print/" "$REL/dist/templates/print/"
sudo cp "$APP_ROOT/package.json" "$APP_ROOT/package-lock.json" "$REL/"

echo "Installing runtime dependencies..."
(
  cd "$REL"
  sudo npm ci --omit=dev --legacy-peer-deps
)

sudo install -d -m 755 \
  "$SHARED_DIR/uploads" \
  "$SHARED_DIR/backups" \
  "$SHARED_DIR/config" \
  "$SHARED_DIR/temp" \
  "$SHARED_DIR/quarantine" \
  "$SHARED_DIR/exports" \
  "$LOG_DIR"

sudo rsync -a "$APP_ROOT/uploads/" "$SHARED_DIR/uploads/"
sudo rsync -a "$APP_ROOT/backups/" "$SHARED_DIR/backups/"
sudo rsync -a "$APP_ROOT/logs/" "$LOG_DIR/"

if [ -f "$APP_ROOT/config/backup.runtime.env" ]; then
  sudo cp "$APP_ROOT/config/backup.runtime.env" "$SHARED_DIR/config/backup.runtime.env"
fi

sudo chown -R www-data:www-data "$SHARED_DIR" "$LOG_DIR"
sudo chmod 750 "$SHARED_DIR" "$SHARED_DIR/config" "$LOG_DIR"
sudo chmod 640 "$SHARED_DIR/config/backup.runtime.env" 2>/dev/null || true

sudo ln -sfn "$SHARED_DIR/uploads" "$REL/uploads"
sudo ln -sfn "$SHARED_DIR/backups" "$REL/backups"
sudo ln -sfn "$SHARED_DIR/temp" "$REL/temp"
sudo ln -sfn "$SHARED_DIR/quarantine" "$REL/quarantine"
sudo ln -sfn "$SHARED_DIR/exports" "$REL/exports"
sudo ln -sfn "$LOG_DIR" "$REL/logs"
sudo ln -sfn "$SHARED_DIR/config/backup.runtime.env" "$REL/config/backup.runtime.env"

echo "$TS" | sudo tee /opt/event-manager/.last_release_ts >/dev/null

echo "Release staged: $REL"
echo "Next: sudo scripts/deploy/activate-release.sh $TS"
