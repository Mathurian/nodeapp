#!/bin/bash

# E2E Test Failure Diagnostic Script
# Automatically checks common issues that cause test failures

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}E2E Test Failure Diagnostic Tool${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check 1: Database Configuration
echo -e "${YELLOW}[1/10] Checking database configuration...${NC}"
if grep -q "event_manager_test" .env; then
    echo -e "${GREEN}✓ Database configured for test database${NC}"
else
    echo -e "${RED}✗ Database NOT using test database${NC}"
    echo "   Fix: Update .env to use event_manager_test"
fi
echo ""

# Check 2: Test Database Exists
echo -e "${YELLOW}[2/10] Checking if test database exists...${NC}"
if PGPASSWORD=dittibop psql -h localhost -U event_manager -lqt | cut -d \| -f 1 | grep -qw event_manager_test; then
    echo -e "${GREEN}✓ Test database exists${NC}"
else
    echo -e "${RED}✗ Test database does not exist${NC}"
    echo "   Fix: createdb -U event_manager event_manager_test"
fi
echo ""

# Check 3: Tenant Exists in Database
echo -e "${YELLOW}[3/10] Checking for test tenants...${NC}"
TENANT_COUNT=$(PGPASSWORD=dittibop psql -h localhost -U event_manager -d event_manager_test -t -c "SELECT COUNT(*) FROM \"Tenant\";" 2>/dev/null | xargs)
if [ "$TENANT_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Found $TENANT_COUNT tenant(s) in database${NC}"
    PGPASSWORD=dittibop psql -h localhost -U event_manager -d event_manager_test -c "SELECT slug, name FROM \"Tenant\" LIMIT 5;"
else
    echo -e "${RED}✗ No tenants found in test database${NC}"
    echo "   Fix: Run migrations: npx prisma migrate deploy"
fi
echo ""

# Check 4: Backend Running
echo -e "${YELLOW}[4/10] Checking if backend is running...${NC}"
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is running on port 3000${NC}"
else
    echo -e "${RED}✗ Backend is NOT running${NC}"
    echo "   Fix: npm run dev:backend"
fi
echo ""

# Check 5: Frontend Running
echo -e "${YELLOW}[5/10] Checking if frontend is running...${NC}"
if curl -s http://localhost:3002 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is running on port 3002${NC}"
else
    echo -e "${RED}✗ Frontend is NOT running${NC}"
    echo "   Fix: cd frontend && npm run dev"
fi
echo ""

# Check 6: CORS Configuration
echo -e "${YELLOW}[6/10] Checking CORS configuration...${NC}"
if grep -q "localhost:3002" .env; then
    echo -e "${GREEN}✓ CORS configured for localhost:3002${NC}"
else
    echo -e "${YELLOW}⚠ localhost:3002 not in CORS config${NC}"
    echo "   Verify ALLOWED_ORIGINS includes http://localhost:3002"
fi
echo ""

# Check 7: CSRF Endpoints
echo -e "${YELLOW}[7/10] Checking CSRF endpoints...${NC}"
if grep -q "/api/v1/csrf-token" src/server.ts; then
    echo -e "${GREEN}✓ CSRF v1 endpoint configured${NC}"
else
    echo -e "${RED}✗ CSRF v1 endpoint missing${NC}"
    echo "   Fix: Add app.get('/api/v1/csrf-token', getCsrfToken) to server.ts"
fi
echo ""

# Check 8: Prisma Client Generated
echo -e "${YELLOW}[8/10] Checking Prisma client...${NC}"
if [ -d "node_modules/@prisma/client" ]; then
    echo -e "${GREEN}✓ Prisma client generated${NC}"
else
    echo -e "${RED}✗ Prisma client not generated${NC}"
    echo "   Fix: npx prisma generate"
fi
echo ""

# Check 9: Test Results Directory
echo -e "${YELLOW}[9/10] Checking test results...${NC}"
if [ -d "test-results" ]; then
    FAILURE_COUNT=$(find test-results -name "test-failed-*.png" 2>/dev/null | wc -l)
    TOTAL=396
    PASSING=$((TOTAL - FAILURE_COUNT))
    PERCENT=$((PASSING * 100 / TOTAL))

    echo -e "${BLUE}Current Status: $PASSING/$TOTAL tests passing ($PERCENT%)${NC}"
    echo "   Failures: $FAILURE_COUNT"
    echo "   Latest results: test-results/"
else
    echo -e "${YELLOW}⚠ No test results found${NC}"
    echo "   Run tests first: npm test"
fi
echo ""

# Check 10: Common Controller Issues
echo -e "${YELLOW}[10/10] Scanning for common code issues...${NC}"

MISSING_TENANT_FILTER=0

# Check admin controller
if [ -f "src/controllers/adminController.ts" ]; then
    if ! grep -q "tenantId" src/controllers/adminController.ts; then
        echo -e "${RED}✗ adminController.ts may be missing tenant filters${NC}"
        MISSING_TENANT_FILTER=1
    fi
fi

# Check events controller
if [ -f "src/controllers/eventsController.ts" ]; then
    if ! grep -q "tenantId" src/controllers/eventsController.ts; then
        echo -e "${RED}✗ eventsController.ts may be missing tenant filters${NC}"
        MISSING_TENANT_FILTER=1
    fi
fi

if [ $MISSING_TENANT_FILTER -eq 0 ]; then
    echo -e "${GREEN}✓ Controllers appear to have tenant filters${NC}"
else
    echo -e "${YELLOW}⚠ Review controllers for tenant isolation${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Diagnostic Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo "Next Steps:"
echo "1. Fix any red (✗) items above"
echo "2. Review yellow (⚠) warnings"
echo "3. Run a single test with --headed to see actual failures:"
echo "   npx playwright test tests/e2e/auth.e2e.test.ts:59 --headed"
echo ""
echo "4. Read the remediation plan:"
echo "   cat docs/TEST_FAILURE_REMEDIATION_PLAN.md"
echo ""
echo "5. Start with quick wins:"
echo "   cat docs/QUICK_START_FIXING_TESTS.md"
echo ""

# Create diagnostic report
REPORT_FILE="logs/diagnostic-report-$(date +%Y%m%d-%H%M%S).txt"
mkdir -p logs

{
    echo "E2E Test Diagnostic Report"
    echo "Generated: $(date)"
    echo ""
    echo "Database: $(grep DATABASE_URL .env | head -1)"
    echo "Tenants in DB: $TENANT_COUNT"
    echo "Backend Running: $(curl -s http://localhost:3000/health > /dev/null 2>&1 && echo 'Yes' || echo 'No')"
    echo "Frontend Running: $(curl -s http://localhost:3002 > /dev/null 2>&1 && echo 'Yes' || echo 'No')"
    echo "Test Pass Rate: $PERCENT%"
    echo "Tests Passing: $PASSING/$TOTAL"
} > "$REPORT_FILE"

echo -e "${GREEN}Diagnostic report saved: $REPORT_FILE${NC}"
