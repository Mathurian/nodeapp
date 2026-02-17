#!/usr/bin/env bash
set -euo pipefail

RELEASES_DIR="${RELEASES_DIR:-/opt/event-manager/releases}"
CURRENT_LINK="${CURRENT_LINK:-/opt/event-manager/current}"
SERVICE_NAME="${SERVICE_NAME:-event-manager.service}"

target="${1:-}"
current="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"

if [ -z "$target" ]; then
  mapfile -t releases < <(ls -1dt "$RELEASES_DIR"/* 2>/dev/null)
  if [ "${#releases[@]}" -lt 2 ]; then
    echo "No previous release available to roll back to."
    exit 1
  fi
  for candidate in "${releases[@]}"; do
    if [ "$candidate" != "$current" ]; then
      target="$candidate"
      break
    fi
  done
fi

if [ -z "$target" ]; then
  echo "Could not determine rollback target."
  exit 1
fi

if [ -d "$RELEASES_DIR/$target" ]; then
  target="$RELEASES_DIR/$target"
fi

if [ ! -d "$target" ]; then
  echo "Rollback target does not exist: $target"
  exit 1
fi

echo "Rolling back to: $target"
sudo ln -sfn "$target" "$CURRENT_LINK"
sudo systemctl daemon-reload
sudo systemctl restart "$SERVICE_NAME"
systemctl is-active "$SERVICE_NAME"
readlink -f "$CURRENT_LINK"

