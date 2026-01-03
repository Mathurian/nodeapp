#!/bin/bash
# Start Production Server
# Usage: ./scripts/start-production.sh

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "🚀 Starting Production Server..."
echo "================================"

# Check if production server is already running
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Production server already running on port 3000"
    echo "Current process:"
    lsof -Pi :3000 -sTCP:LISTEN
    read -p "Kill existing process and restart? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Killing existing process..."
        lsof -ti :3000 | xargs kill -9 2>/dev/null || true
        sleep 2
    else
        echo "Aborted."
        exit 1
    fi
fi

# Load production environment
if [ -f ".env.production" ]; then
    echo "✓ Loading .env.production"
    export $(cat .env.production | grep -v '^#' | xargs)
else
    echo "❌ .env.production not found!"
    exit 1
fi

# Verify we're using production database
if [[ ! "$DATABASE_URL" =~ "event_manager?schema" ]] || [[ "$DATABASE_URL" =~ "event_manager_test" ]]; then
    echo "❌ ERROR: DATABASE_URL does not point to production database!"
    echo "Current: $DATABASE_URL"
    exit 1
fi

echo "✓ Environment: $NODE_ENV"
echo "✓ Port: $PORT"
echo "✓ Database: event_manager (production)"

# Start production server in background
echo ""
echo "Starting server..."
NODE_ENV=production node dist/server.js > logs/production-server.log 2>&1 &
SERVER_PID=$!

echo "✓ Production server started (PID: $SERVER_PID)"
echo "✓ Log file: logs/production-server.log"

# Wait and verify
sleep 3

if ps -p $SERVER_PID > /dev/null; then
    echo ""
    echo "✅ Production server running successfully!"
    echo "   URL: https://conmgr.com"
    echo "   API: http://localhost:3000"
    echo "   PID: $SERVER_PID"
    echo ""
    echo "To view logs: tail -f logs/production-server.log"
    echo "To stop: kill $SERVER_PID or ./scripts/stop-production.sh"
else
    echo "❌ Server failed to start. Check logs/production-server.log"
    exit 1
fi
