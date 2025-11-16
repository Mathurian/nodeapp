#!/bin/bash

################################################################################
# Incremental Backup Script
#
# Creates incremental backups by archiving WAL files for Point-in-Time Recovery
#
# Usage: sudo ./backup-incremental.sh [options]
################################################################################

set -euo pipefail

# Source configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/../config/backup.config.sh"

if [[ -f "$CONFIG_FILE" ]]; then
    source "$CONFIG_FILE"
else
    echo "ERROR: Configuration file not found"
    exit 1
fi

# Configuration
DRY_RUN=false
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/backup-incremental.log"
INCREMENTAL_BACKUP_DIR="${BACKUP_INCREMENTAL_DIR}/${TIMESTAMP}"

# Logging
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [$1] ${@:2}" | tee -a "$LOG_FILE"
}

# Show usage
show_usage() {
    cat << EOF
Incremental Backup Script

Usage: sudo $0 [options]

Options:
    --help              Show this help message
    --dry-run           Show what would be done

Description:
    Archives WAL files for incremental backup and PITR capability.

EOF
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help) show_usage ;;
        --dry-run) DRY_RUN=true; shift ;;
        *) log "ERROR" "Unknown option: $1"; show_usage ;;
    esac
done

# Main backup process
main() {
    log "INFO" "Starting incremental backup: $TIMESTAMP"

    # Check if WAL archive exists
    if [[ ! -d "$WAL_ARCHIVE_DIR" ]]; then
        log "ERROR" "WAL archive directory not found: $WAL_ARCHIVE_DIR"
        exit 1
    fi

    # Count WAL files
    local wal_count=$(find "$WAL_ARCHIVE_DIR" -type f | wc -l)
    log "INFO" "WAL files found: $wal_count"

    if [[ $wal_count -eq 0 ]]; then
        log "INFO" "No WAL files to backup"
        exit 0
    fi

    if [[ $DRY_RUN == true ]]; then
        log "INFO" "[DRY-RUN] Would backup $wal_count WAL files"
        exit 0
    fi

    # Create incremental backup directory
    mkdir -p "$INCREMENTAL_BACKUP_DIR"

    # Copy WAL files
    cp -a "$WAL_ARCHIVE_DIR"/* "$INCREMENTAL_BACKUP_DIR/" 2>/dev/null || true

    # Create archive
    local archive_file="${BACKUP_INCREMENTAL_DIR}/incremental_${TIMESTAMP}.tar.${BACKUP_COMPRESSION#zstd}"

    if [[ "$BACKUP_COMPRESSION" == "zstd" ]]; then
        tar -cf - -C "$BACKUP_INCREMENTAL_DIR" "$TIMESTAMP" | zstd -3 > "$archive_file"
    else
        tar -czf "$archive_file" -C "$BACKUP_INCREMENTAL_DIR" "$TIMESTAMP"
    fi

    # Remove uncompressed directory
    rm -rf "$INCREMENTAL_BACKUP_DIR"

    local size=$(du -h "$archive_file" | cut -f1)
    log "SUCCESS" "Incremental backup created: $archive_file (Size: $size)"

    # Clean old WAL files (keep last 1GB)
    local wal_size=$(du -sb "$WAL_ARCHIVE_DIR" | cut -f1)
    local wal_size_gb=$((wal_size / 1073741824))

    if [[ $wal_size_gb -gt 1 ]]; then
        log "INFO" "Cleaning old WAL files (current size: ${wal_size_gb}GB)"
        find "$WAL_ARCHIVE_DIR" -type f -mtime +7 -delete
    fi

    log "INFO" "Incremental backup completed"
}

trap 'log "ERROR" "Backup failed at line $LINENO"; exit 1' ERR

main

exit 0
