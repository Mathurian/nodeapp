#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-event-manager.service}"

echo "Restarting production service: ${SERVICE_NAME}"
sudo systemctl restart "${SERVICE_NAME}"
sudo systemctl is-active "${SERVICE_NAME}"
sudo systemctl status "${SERVICE_NAME}" --no-pager -n 20
