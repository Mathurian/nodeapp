#!/bin/bash
# Test runner script with proper environment

# Kill any existing test servers
pkill -f "NODE_ENV=test.*dist/server.js" || true
pkill -f "vite.*frontend" || true
sleep 2

# Export test environment
export NODE_ENV=test
export DATABASE_URL="postgresql://event_manager:dittibop@localhost:5432/event_manager_test?schema=public"
export TEST_DATABASE_URL="postgresql://event_manager:dittibop@localhost:5432/event_manager_test?schema=public"
export JWT_SECRET="test-jwt-secret-key-for-testing"
export PORT=3001
export FRONTEND_URL="http://localhost:3002"
export BACKEND_URL="http://localhost:3001"

# Start test backend in background
echo "Starting test backend on port 3001..."
NODE_ENV=test PORT=3001 DATABASE_URL="$DATABASE_URL" node dist/server.js > /tmp/test-backend.log 2>&1 &
TEST_BACKEND_PID=$!
echo "Test backend PID: $TEST_BACKEND_PID"

# Wait for backend to be ready
echo "Waiting for backend..."
for i in {1..30}; do
  if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✓ Backend ready"
    break
  fi
  sleep 1
done

# Run tests
echo "Running tests..."
FRONTEND_URL=http://localhost:3002 BACKEND_URL=http://localhost:3001 SKIP_WEB_SERVER=true \
  npx playwright test tests/e2e/ --reporter=list --workers=3

# Cleanup
echo "Stopping test backend..."
kill $TEST_BACKEND_PID 2>/dev/null || true

