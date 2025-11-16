#!/bin/bash

###############################################################################
# Database Maintenance Script
# Performs routine PostgreSQL maintenance tasks
#
# Usage:
#   ./scripts/db-maintenance.sh [vacuum|analyze|reindex|backup|all]
#
# Tasks:
#   - vacuum: Run VACUUM to reclaim storage
#   - analyze: Run ANALYZE to update statistics
#   - reindex: Rebuild all indexes
#   - backup: Create database backup
#   - all: Run all maintenance tasks
#
# Schedule with cron (example):
#   # Run full maintenance weekly on Sunday at 2 AM
#   0 2 * * 0 /var/www/event-manager/scripts/db-maintenance.sh all
#
#   # Run VACUUM daily at 3 AM
#   0 3 * * * /var/www/event-manager/scripts/db-maintenance.sh vacuum
###############################################################################

set -e  # Exit on error

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse DATABASE_URL to get connection details
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}ERROR: DATABASE_URL not set${NC}"
    exit 1
fi

# Extract database credentials from DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

export PGPASSWORD="$DB_PASS"

# Log directory
LOG_DIR="./logs/db-maintenance"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/maintenance-$(date +%Y%m%d-%H%M%S).log"

# Log function
log() {
    echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Success message
success() {
    log "${GREEN}✓ $1${NC}"
}

# Error message
error() {
    log "${RED}✗ $1${NC}"
}

# Warning message
warn() {
    log "${YELLOW}⚠ $1${NC}"
}

# Check if PostgreSQL is accessible
check_connection() {
    log "Checking database connection..."
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
        success "Database connection successful"
        return 0
    else
        error "Cannot connect to database"
        return 1
    fi
}

# Run VACUUM to reclaim storage
run_vacuum() {
    log "Running VACUUM..."
    start_time=$(date +%s)

    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "VACUUM (VERBOSE, ANALYZE);" >> "$LOG_FILE" 2>&1; then
        end_time=$(date +%s)
        duration=$((end_time - start_time))
        success "VACUUM completed in ${duration}s"
    else
        error "VACUUM failed"
        return 1
    fi
}

# Run ANALYZE to update statistics
run_analyze() {
    log "Running ANALYZE..."
    start_time=$(date +%s)

    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "ANALYZE VERBOSE;" >> "$LOG_FILE" 2>&1; then
        end_time=$(date +%s)
        duration=$((end_time - start_time))
        success "ANALYZE completed in ${duration}s"
    else
        error "ANALYZE failed"
        return 1
    fi
}

# Rebuild all indexes
run_reindex() {
    log "Rebuilding indexes..."
    start_time=$(date +%s)

    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "REINDEX DATABASE \"$DB_NAME\";" >> "$LOG_FILE" 2>&1; then
        end_time=$(date +%s)
        duration=$((end_time - start_time))
        success "REINDEX completed in ${duration}s"
    else
        error "REINDEX failed"
        return 1
    fi
}

# Create database backup
run_backup() {
    log "Creating database backup..."
    BACKUP_DIR="./backups/db"
    mkdir -p "$BACKUP_DIR"

    BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).sql.gz"
    start_time=$(date +%s)

    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" | gzip > "$BACKUP_FILE"; then
        end_time=$(date +%s)
        duration=$((end_time - start_time))
        size=$(du -h "$BACKUP_FILE" | cut -f1)
        success "Backup created: $BACKUP_FILE (${size}) in ${duration}s"

        # Clean up old backups (keep last 30 days)
        find "$BACKUP_DIR" -name "backup-*.sql.gz" -mtime +30 -delete
        success "Cleaned up old backups"
    else
        error "Backup failed"
        return 1
    fi
}

# Clean up old logs
cleanup_old_logs() {
    log "Cleaning up old activity logs..."

    # Delete activity logs older than 90 days
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "DELETE FROM activity_logs WHERE \"createdAt\" < NOW() - INTERVAL '90 days';" >> "$LOG_FILE" 2>&1; then
        success "Old activity logs cleaned up"
    else
        warn "Failed to clean up old activity logs"
    fi

    # Delete performance logs older than 30 days
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "DELETE FROM performance_logs WHERE \"createdAt\" < NOW() - INTERVAL '30 days';" >> "$LOG_FILE" 2>&1; then
        success "Old performance logs cleaned up"
    else
        warn "Failed to clean up old performance logs"
    fi
}

# Display database statistics
show_stats() {
    log "Database Statistics:"
    echo "-----------------------------------"

    # Table sizes
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
            pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10;
    " | tee -a "$LOG_FILE"

    echo "-----------------------------------"
}

# Main execution
main() {
    log "=== Database Maintenance Started ==="

    # Check connection first
    if ! check_connection; then
        error "Maintenance aborted due to connection failure"
        exit 1
    fi

    TASK="${1:-all}"

    case "$TASK" in
        vacuum)
            run_vacuum
            ;;
        analyze)
            run_analyze
            ;;
        reindex)
            run_reindex
            ;;
        backup)
            run_backup
            ;;
        stats)
            show_stats
            ;;
        cleanup)
            cleanup_old_logs
            ;;
        all)
            run_vacuum
            run_analyze
            cleanup_old_logs
            run_backup
            show_stats
            ;;
        *)
            error "Unknown task: $TASK"
            echo "Usage: $0 [vacuum|analyze|reindex|backup|cleanup|stats|all]"
            exit 1
            ;;
    esac

    log "=== Database Maintenance Completed ==="
    success "Log file: $LOG_FILE"
}

# Run main function
main "$@"
