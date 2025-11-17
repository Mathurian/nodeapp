#!/bin/bash

# Test Database Teardown Script
# Drops the test database after tests complete

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Tearing down test database...${NC}"

# Load environment variables
export DATABASE_URL=${TEST_DATABASE_URL:-"postgresql://event_manager:dittibop@localhost:5432/event_manager_test?schema=public"}

# Extract database name from connection string
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:\/]*\).*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

echo -e "${YELLOW}Database: ${DB_NAME}${NC}"

# Drop test database
echo -e "${YELLOW}Dropping test database...${NC}"
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"

echo -e "${GREEN}✓ Test database teardown complete!${NC}"
