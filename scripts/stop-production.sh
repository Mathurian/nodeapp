#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="${SERVICE_NAME:-event-manager.service}"

echo "Stopping production service: ${SERVICE_NAME}"
sudo systemctl stop "${SERVICE_NAME}"
sudo systemctl is-active "${SERVICE_NAME}" || true
