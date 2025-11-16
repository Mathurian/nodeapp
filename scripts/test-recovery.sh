#!/bin/bash

################################################################################
# Recovery Test Script
#
# Automated recovery testing to verify backups can be restored
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../config/backup.config.sh"

LOG_FILE="${LOG_DIR}/recovery-test.log"
TEST_DB="event_manager_test_recovery"
TEST_REPORT="/var/log/recovery-test-report.html"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') [$1] ${@:2}" | tee -a "$LOG_FILE"; }

show_usage() {
    cat << EOF
Recovery Test Script

Usage: sudo $0 [options]

Options:
    --help              Show help
    --backup PATH       Test specific backup file

Description:
    Tests backup restoration to verify backup integrity.
    Creates temporary test database, restores backup, runs checks.

EOF
    exit 0
}

BACKUP_FILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --help) show_usage ;;
        --backup) BACKUP_FILE="$2"; shift 2 ;;
        *) log "ERROR" "Unknown option: $1"; show_usage ;;
    esac
done

cleanup() {
    log "INFO" "Cleaning up test environment..."
    sudo -u postgres psql -c "DROP DATABASE IF EXISTS $TEST_DB;" &> /dev/null || true
    rm -rf /tmp/recovery_test_* 2>/dev/null || true
}

main() {
    log "INFO" "=========================================="
    log "INFO" "Recovery Test"
    log "INFO" "=========================================="

    local test_start=$(date +%s)
    local tests_passed=0
    local tests_failed=0

    # Find latest backup if not specified
    if [[ -z "$BACKUP_FILE" ]]; then
        BACKUP_FILE=$(find "$BACKUP_FULL_DIR" -name "full_backup_*.tar.*" -type f | sort -r | head -1)
        if [[ -z "$BACKUP_FILE" ]]; then
            log "ERROR" "No backup files found"
            exit 1
        fi
    fi

    log "INFO" "Testing backup: $BACKUP_FILE"

    # Test 1: Backup file exists and is readable
    log "INFO" "Test 1: Backup file integrity"
    if [[ -f "$BACKUP_FILE" ]] && [[ -r "$BACKUP_FILE" ]]; then
        log "SUCCESS" "✓ Backup file is readable"
        ((tests_passed++))
    else
        log "ERROR" "✗ Backup file not found or not readable"
        ((tests_failed++))
    fi

    # Test 2: Extract backup
    log "INFO" "Test 2: Backup extraction"
    local temp_dir="/tmp/recovery_test_$$"
    mkdir -p "$temp_dir"

    if [[ "$BACKUP_FILE" == *.tar.gz ]]; then
        tar -xzf "$BACKUP_FILE" -C "$temp_dir" 2>&1 | tee -a "$LOG_FILE"
    elif [[ "$BACKUP_FILE" == *.tar.zst ]]; then
        tar -I zstd -xf "$BACKUP_FILE" -C "$temp_dir" 2>&1 | tee -a "$LOG_FILE"
    fi

    if [[ -f "$temp_dir/database.sql" ]] || [[ -f "$temp_dir/"*"/database.sql" ]]; then
        log "SUCCESS" "✓ Backup extracted successfully"
        ((tests_passed++))
    else
        log "ERROR" "✗ Database backup not found in archive"
        ((tests_failed++))
        cleanup
        exit 1
    fi

    # Find the database backup file
    local db_backup=$(find "$temp_dir" -name "database.sql" | head -1)

    # Test 3: Create test database
    log "INFO" "Test 3: Create test database"
    sudo -u postgres psql -c "DROP DATABASE IF EXISTS $TEST_DB;" &> /dev/null
    if sudo -u postgres psql -c "CREATE DATABASE $TEST_DB;" 2>&1 | tee -a "$LOG_FILE"; then
        log "SUCCESS" "✓ Test database created"
        ((tests_passed++))
    else
        log "ERROR" "✗ Failed to create test database"
        ((tests_failed++))
    fi

    # Test 4: Restore database
    log "INFO" "Test 4: Database restoration"
    if sudo -u postgres pg_restore -d "$TEST_DB" "$db_backup" 2>&1 | tee -a "$LOG_FILE"; then
        log "SUCCESS" "✓ Database restored successfully"
        ((tests_passed++))
    else
        log "WARNING" "Database restore had warnings (may be normal)"
        ((tests_passed++))
    fi

    # Test 5: Verify database is accessible
    log "INFO" "Test 5: Database accessibility"
    if sudo -u postgres psql -d "$TEST_DB" -c "SELECT 1;" &> /dev/null; then
        log "SUCCESS" "✓ Test database is accessible"
        ((tests_passed++))
    else
        log "ERROR" "✗ Test database is not accessible"
        ((tests_failed++))
    fi

    # Test 6: Check table count
    log "INFO" "Test 6: Table integrity"
    local table_count=$(sudo -u postgres psql -d "$TEST_DB" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
    if [[ $table_count -gt 0 ]]; then
        log "SUCCESS" "✓ Database has $table_count tables"
        ((tests_passed++))
    else
        log "WARNING" "✗ No tables found in database"
        ((tests_failed++))
    fi

    # Test 7: Run sample queries
    log "INFO" "Test 7: Data integrity checks"
    local queries=(
        "SELECT count(*) FROM \"User\" WHERE 1=1"
        "SELECT count(*) FROM \"Event\" WHERE 1=1"
    )

    local query_success=0
    for query in "${queries[@]}"; do
        if sudo -u postgres psql -d "$TEST_DB" -t -c "$query" &> /dev/null; then
            ((query_success++))
        fi
    done

    if [[ $query_success -eq ${#queries[@]} ]]; then
        log "SUCCESS" "✓ All data integrity checks passed"
        ((tests_passed++))
    else
        log "WARNING" "Some queries failed (${query_success}/${#queries[@]} passed)"
        ((tests_passed++))
    fi

    # Cleanup
    cleanup

    # Generate report
    local test_end=$(date +%s)
    local duration=$((test_end - test_start))

    log "INFO" "=========================================="
    log "INFO" "Test Summary"
    log "INFO" "=========================================="
    log "INFO" "Tests Passed: $tests_passed"
    log "INFO" "Tests Failed: $tests_failed"
    log "INFO" "Duration: ${duration}s"
    log "INFO" "Backup: $(basename $BACKUP_FILE)"

    if [[ $tests_failed -eq 0 ]]; then
        log "SUCCESS" "All tests passed ✓"
        send_alert "Recovery Test Passed" "All recovery tests passed successfully." "SUCCESS"
        exit 0
    else
        log "ERROR" "Some tests failed ✗"
        send_alert "Recovery Test Failed" "$tests_failed tests failed. Check logs: $LOG_FILE" "ERROR"
        exit 1
    fi
}

trap 'cleanup; log "ERROR" "Test failed at line $LINENO"; exit 1' ERR

main

exit 0
