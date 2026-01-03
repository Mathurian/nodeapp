#!/bin/bash
# Run Test Suite Safely
# Usage: ./scripts/run-tests.sh [test-file-pattern]
# Example: ./scripts/run-tests.sh admin.e2e.test.ts

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "🧪 Running Test Suite..."
echo "========================"

# CRITICAL: Verify test database configuration
TEST_DB="postgresql://event_manager:dittibop@localhost:5432/event_manager_test?schema=public"

echo "✓ Test database: event_manager_test"
echo "✓ Environment: test"

# Verify test database exists
echo ""
echo "Verifying test database exists..."
if ! PGPASSWORD=dittibop psql -U event_manager -h localhost -lqt | cut -d \| -f 1 | grep -qw event_manager_test; then
    echo "❌ Test database 'event_manager_test' does not exist!"
    echo "Creating test database..."
    PGPASSWORD=dittibop psql -U event_manager -h localhost -c "CREATE DATABASE event_manager_test;"
    echo "✓ Test database created"
fi

# Ensure test database schema is up to date
echo "Ensuring test database schema is up to date..."
DATABASE_URL="$TEST_DB" npx prisma db push --accept-data-loss --skip-generate 2>&1 | grep -v "Update available" || true
echo "✓ Test database schema ready"

# Safety check: Verify we're NOT pointing to production
if [[ "$DATABASE_URL" =~ "event_manager?schema" ]] && [[ ! "$DATABASE_URL" =~ "event_manager_test" ]]; then
    echo "❌ CRITICAL ERROR: DATABASE_URL points to PRODUCTION database!"
    echo "DATABASE_URL=$DATABASE_URL"
    echo "ABORTED for safety!"
    exit 1
fi

echo ""
echo "===================================="
echo "Running Playwright tests..."
echo "===================================="
echo ""

# Run tests with explicit test database URL
# Note: Playwright's global timeout (30 min) will handle overall timeout
# Use existing servers: backend (port 3000 with test DB), frontend (port 3002)
if [ -z "$1" ]; then
    # Run all tests
    DATABASE_URL="$TEST_DB" \
    NODE_ENV=test \
    SKIP_WEB_SERVER=true \
    FRONTEND_URL=http://localhost:3002 \
    npx playwright test \
        --workers=6 \
        --reporter=list
else
    # Run specific test file/pattern
    DATABASE_URL="$TEST_DB" \
    NODE_ENV=test \
    SKIP_WEB_SERVER=true \
    FRONTEND_URL=http://localhost:3002 \
    npx playwright test "$1" \
        --workers=6 \
        --reporter=list
fi

TEST_EXIT_CODE=$?

echo ""
echo "===================================="
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ Tests completed successfully!"
else
    echo "❌ Tests failed (exit code: $TEST_EXIT_CODE)"
fi
echo "===================================="

exit $TEST_EXIT_CODE
