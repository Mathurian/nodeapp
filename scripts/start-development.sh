#!/bin/bash
# Start Development Server (Backend + Frontend)
# Usage: ./scripts/start-development.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "🔧 Starting Development Servers..."
echo "=================================="

# Check if backend is already running
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Backend already running on port 3001"
    lsof -Pi :3001 -sTCP:LISTEN
    read -p "Kill and restart? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        lsof -ti :3001 | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
fi

# Check if frontend is already running
if lsof -Pi :3002 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Frontend already running on port 3002"
    lsof -Pi :3002 -sTCP:LISTEN
    read -p "Kill and restart? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        lsof -ti :3002 | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
fi

# Load development environment
if [ -f ".env.development" ]; then
    echo "✓ Loading .env.development"
    export $(cat .env.development | grep -v '^#' | xargs)
else
    echo "❌ .env.development not found!"
    exit 1
fi

echo "✓ Environment: $NODE_ENV"
echo "✓ Backend Port: $PORT"
echo "✓ Database: event_manager_test (safe for development)"

# Start backend
echo ""
echo "Starting backend server..."
NODE_ENV=development PORT=3001 node dist/server.js > logs/dev-backend.log 2>&1 &
BACKEND_PID=$!

sleep 3

if ! ps -p $BACKEND_PID > /dev/null; then
    echo "❌ Backend failed to start. Check logs/dev-backend.log"
    exit 1
fi

echo "✓ Backend started (PID: $BACKEND_PID)"

# Start frontend
echo "Starting frontend server..."
cd frontend
VITE_API_URL=http://localhost:3001 npm run dev -- --port 3002 > ../logs/dev-frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

sleep 3

if ! ps -p $FRONTEND_PID > /dev/null; then
    echo "❌ Frontend failed to start. Check logs/dev-frontend.log"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

echo "✓ Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "✅ Development servers running!"
echo "   Backend:  http://localhost:3001"
echo "   Frontend: http://localhost:3002"
echo "   Backend PID:  $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""
echo "To view logs:"
echo "  Backend:  tail -f logs/dev-backend.log"
echo "  Frontend: tail -f logs/dev-frontend.log"
echo ""
echo "To stop: ./scripts/stop-development.sh"
