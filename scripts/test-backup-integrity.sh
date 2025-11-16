#!/bin/bash

################################################################################
# Backup Integrity Test Script
#
# Tests integrity of all backups
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../config/backup.config.sh"

LOG_FILE="${LOG_DIR}/backup-integrity-test.log"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') [$1] ${@:2}" | tee -a "$LOG_FILE"; }

main() {
    log "INFO" "Testing backup integrity..."

    local total=0
    local passed=0
    local failed=0

    for backup in $(find "$BACKUP_FULL_DIR" -name "*.tar.*" -type f); do
        ((total++))
        log "INFO" "Testing: $(basename $backup)"

        if [[ "$backup" == *.tar.gz ]]; then
            if gzip -t "$backup" 2>&1 | tee -a "$LOG_FILE"; then
                log "SUCCESS" "✓ OK"
                ((passed++))
            else
                log "ERROR" "✗ FAILED"
                ((failed++))
            fi
        elif [[ "$backup" == *.tar.zst ]]; then
            if zstd -t "$backup" 2>&1 | tee -a "$LOG_FILE"; then
                log "SUCCESS" "✓ OK"
                ((passed++))
            else
                log "ERROR" "✗ FAILED"
                ((failed++))
            fi
        fi
    done

    log "INFO" "=========================================="
    log "INFO" "Total: $total, Passed: $passed, Failed: $failed"

    if [[ $failed -gt 0 ]]; then
        send_alert "Backup Integrity Issues" "$failed/$total backups failed integrity check" "ERROR"
        exit 1
    fi

    log "SUCCESS" "All backups passed integrity check"
    exit 0
}

main

exit 0
