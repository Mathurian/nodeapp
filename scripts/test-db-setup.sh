#!/bin/bash

# Test Database Setup Script
# Creates and initializes the test database for running tests

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Setting up test database...${NC}"

# Load environment variables
export DATABASE_URL=${TEST_DATABASE_URL:-"postgresql://event_manager:dittibop@localhost:5432/event_manager_test?schema=public"}

# Extract database name from connection string
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:\/]*\).*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')

echo -e "${YELLOW}Database: ${DB_NAME}${NC}"
echo -e "${YELLOW}Host: ${DB_HOST}:${DB_PORT}${NC}"
echo -e "${YELLOW}User: ${DB_USER}${NC}"

# Drop existing test database if it exists
echo -e "${YELLOW}Dropping existing test database (if exists)...${NC}"
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true

# Create test database
echo -e "${YELLOW}Creating test database...${NC}"
PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"

# Run Prisma migrations
echo -e "${YELLOW}Running Prisma migrations...${NC}"
npx prisma migrate deploy

# Run seed data (optional, comment out if not needed)
# echo -e "${YELLOW}Seeding test database...${NC}"
# npx prisma db seed

echo -e "${GREEN}✓ Test database setup complete!${NC}"
