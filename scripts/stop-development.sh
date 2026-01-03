#!/bin/bash
# Stop Development Servers
# Usage: ./scripts/stop-development.sh

set -e

echo "🛑 Stopping Development Servers..."
echo "==================================="

# Stop backend (port 3001)
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "Stopping backend (port 3001)..."
    lsof -ti :3001 | xargs kill 2>/dev/null || true
    sleep 1
    lsof -ti :3001 | xargs kill -9 2>/dev/null || true
    echo "✓ Backend stopped"
else
    echo "⚠️  No backend running on port 3001"
fi

# Stop frontend (port 3002)
if lsof -Pi :3002 -sTCP:LISTEN -t >/dev/null ; then
    echo "Stopping frontend (port 3002)..."
    lsof -ti :3002 | xargs kill 2>/dev/null || true
    sleep 1
    lsof -ti :3002 | xargs kill -9 2>/dev/null || true
    echo "✓ Frontend stopped"
else
    echo "⚠️  No frontend running on port 3002"
fi

echo ""
echo "✅ Development servers stopped"
