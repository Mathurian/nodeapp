#!/bin/bash

################################################################################
# Backup Verification Script
#
# Verifies integrity of backup files
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../config/backup.config.sh"

DRY_RUN=false
LOG_FILE="${LOG_DIR}/backup-verify.log"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') [$1] ${@:2}" | tee -a "$LOG_FILE"; }

show_usage() {
    cat << EOF
Backup Verification Script

Usage: sudo $0 [options]

Options:
    --help              Show help
    --dry-run           Dry run mode
    --backup PATH       Verify specific backup file

Description:
    Verifies backup file integrity and can test restoration.

EOF
    exit 0
}

BACKUP_FILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --help) show_usage ;;
        --dry-run) DRY_RUN=true; shift ;;
        --backup) BACKUP_FILE="$2"; shift 2 ;;
        *) log "ERROR" "Unknown option: $1"; show_usage ;;
    esac
done

verify_backup_file() {
    local file="$1"

    log "INFO" "Verifying: $(basename $file)"

    # Check file exists
    if [[ ! -f "$file" ]]; then
        log "ERROR" "File not found: $file"
        return 1
    fi

    # Check file size
    local size=$(stat -c%s "$file")
    if [[ $size -eq 0 ]]; then
        log "ERROR" "File is empty: $file"
        return 1
    fi

    log "INFO" "Size: $(du -h $file | cut -f1)"

    # Test archive integrity
    if [[ "$file" == *.tar.gz ]]; then
        if gzip -t "$file" 2>&1 | tee -a "$LOG_FILE"; then
            log "SUCCESS" "Archive integrity OK"
        else
            log "ERROR" "Archive is corrupted"
            return 1
        fi
    elif [[ "$file" == *.tar.zst ]]; then
        if zstd -t "$file" 2>&1 | tee -a "$LOG_FILE"; then
            log "SUCCESS" "Archive integrity OK"
        else
            log "ERROR" "Archive is corrupted"
            return 1
        fi
    fi

    # Test extraction (first few files only)
    log "INFO" "Testing extraction..."
    local temp_dir="/tmp/backup_verify_$$"
    mkdir -p "$temp_dir"

    if [[ "$file" == *.tar.gz ]]; then
        tar -xzf "$file" -C "$temp_dir" --strip-components=1 2>&1 | head -20 | tee -a "$LOG_FILE"
    elif [[ "$file" == *.tar.zst ]]; then
        tar -I zstd -xf "$file" -C "$temp_dir" --strip-components=1 2>&1 | head -20 | tee -a "$LOG_FILE"
    fi

    # Check if database backup exists
    if [[ -f "$temp_dir/database.sql" ]]; then
        log "SUCCESS" "Database backup found in archive"
    else
        log "WARNING" "Database backup not found in archive"
    fi

    # Cleanup
    rm -rf "$temp_dir"

    log "SUCCESS" "Verification passed: $(basename $file)"
    return 0
}

main() {
    log "INFO" "Starting backup verification"

    local failed_count=0
    local verified_count=0

    if [[ -n "$BACKUP_FILE" ]]; then
        # Verify single backup
        if verify_backup_file "$BACKUP_FILE"; then
            ((verified_count++))
        else
            ((failed_count++))
        fi
    else
        # Verify all recent backups
        log "INFO" "Verifying all backups in: $BACKUP_FULL_DIR"

        for backup in $(find "$BACKUP_FULL_DIR" -name "*.tar.*" -mtime -30 | sort); do
            if verify_backup_file "$backup"; then
                ((verified_count++))
            else
                ((failed_count++))
            fi
        done
    fi

    log "INFO" "=========================================="
    log "INFO" "Verification Summary"
    log "INFO" "=========================================="
    log "INFO" "Verified: $verified_count"
    log "INFO" "Failed: $failed_count"

    if [[ $failed_count -gt 0 ]]; then
        log "ERROR" "Some backups failed verification"
        send_alert "Backup Verification Failed" "Failed verifications: $failed_count" "ERROR"
        exit 1
    else
        log "SUCCESS" "All backups verified successfully"
    fi
}

trap 'log "ERROR" "Verification failed at line $LINENO"; exit 1' ERR

main

exit 0
