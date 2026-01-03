#!/bin/bash
# Stop Production Server
# Usage: ./scripts/stop-production.sh

set -e

echo "🛑 Stopping Production Server..."
echo "================================"

# Find production server on port 3000
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    PIDS=$(lsof -ti :3000)
    echo "Found production server(s): $PIDS"

    for PID in $PIDS; do
        echo "Stopping PID $PID..."
        kill $PID 2>/dev/null || true
    done

    # Wait for graceful shutdown
    sleep 2

    # Force kill if still running
    if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
        echo "Force killing remaining processes..."
        lsof -ti :3000 | xargs kill -9 2>/dev/null || true
    fi

    echo "✅ Production server stopped"
else
    echo "⚠️  No production server running on port 3000"
fi
