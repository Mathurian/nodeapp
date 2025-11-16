#!/bin/bash

################################################################################
# PostgreSQL PITR Base Backup Script
#
# Creates a base backup required for Point-in-Time Recovery using pg_basebackup.
# Compresses the backup and maintains retention policy.
#
# Usage: sudo ./pitr-base-backup.sh [options]
# Options:
#   --help              Show this help message
#   --dry-run           Show what would be done without making changes
#   --backup-dir PATH   Custom backup directory (default: /var/backups/postgresql/base)
#   --retention DAYS    Number of backups to keep (default: 7)
################################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_BASE_DIR="/var/backups/postgresql/base"
RETENTION_COUNT=7
DRY_RUN=false
LOG_FILE="/var/log/pitr-base-backup.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_BASE_DIR}/${TIMESTAMP}"
COMPRESSION="zstd"  # or "gzip"

# Logging functions
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $@"
    log "INFO" "$@"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $@"
    log "SUCCESS" "$@"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $@"
    log "WARNING" "$@"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $@"
    log "ERROR" "$@"
}

# Show usage
show_usage() {
    cat << EOF
PostgreSQL PITR Base Backup Script

Usage: sudo $0 [options]

Options:
    --help              Show this help message
    --dry-run           Show what would be done without making changes
    --backup-dir PATH   Custom backup directory (default: /var/backups/postgresql/base)
    --retention COUNT   Number of backups to keep (default: 7)

Description:
    Creates a base backup required for Point-in-Time Recovery (PITR).
    Uses pg_basebackup to create a consistent backup with WAL files.
    Compresses the backup and maintains the specified retention policy.

Requirements:
    - PostgreSQL with PITR enabled (run setup-pitr.sh first)
    - At least 2x database size in free space
    - zstd or gzip installed for compression

Examples:
    sudo $0
    sudo $0 --dry-run
    sudo $0 --retention 14

EOF
    exit 0
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help)
            show_usage
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --backup-dir)
            BACKUP_BASE_DIR="$2"
            BACKUP_DIR="${BACKUP_BASE_DIR}/${TIMESTAMP}"
            shift 2
            ;;
        --retention)
            RETENTION_COUNT="$2"
            shift 2
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            ;;
    esac
done

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if running as root
    if [[ $EUID -ne 0 ]] && [[ $DRY_RUN == false ]]; then
        log_error "This script must be run as root or with sudo"
        exit 1
    fi

    # Check if PostgreSQL is running
    if ! systemctl is-active --quiet postgresql; then
        log_error "PostgreSQL service is not running"
        exit 1
    fi

    # Check if pg_basebackup exists
    if ! command -v pg_basebackup &> /dev/null; then
        log_error "pg_basebackup not found. Install PostgreSQL client tools."
        exit 1
    fi

    # Check compression tool
    if command -v zstd &> /dev/null; then
        COMPRESSION="zstd"
        log_success "Using zstd compression"
    elif command -v gzip &> /dev/null; then
        COMPRESSION="gzip"
        log_success "Using gzip compression"
    else
        log_error "Neither zstd nor gzip found. Install compression tools."
        exit 1
    fi

    # Check disk space
    local db_size=$(sudo -u postgres psql -t -c "SELECT pg_size_pretty(pg_database_size(current_database()));" | xargs)
    log_info "Current database size: $db_size"

    # Get available space properly
    local backup_path="$BACKUP_BASE_DIR"
    if [[ ! -d "$backup_path" ]]; then
        backup_path=$(dirname "$BACKUP_BASE_DIR")
    fi
    local available_space=$(df -BG "$backup_path" | awk 'NR==2 {print $4}' | sed 's/G//')

    if [[ $available_space -lt 10 ]]; then
        log_warning "Less than 10GB available for backup (${available_space}GB)"
    else
        log_success "Sufficient disk space: ${available_space}GB available"
    fi
}

# Create backup directory
create_backup_directory() {
    log_info "Creating backup directory..."

    if [[ $DRY_RUN == true ]]; then
        log_info "[DRY-RUN] Would create directory: $BACKUP_DIR"
        return 0
    fi

    mkdir -p "$BACKUP_DIR"
    chown postgres:postgres "$BACKUP_DIR"
    chmod 700 "$BACKUP_DIR"
    log_success "Created backup directory: $BACKUP_DIR"
}

# Perform base backup
perform_base_backup() {
    log_info "Starting base backup using pg_basebackup..."
    log_info "This may take several minutes depending on database size..."

    if [[ $DRY_RUN == true ]]; then
        log_info "[DRY-RUN] Would run pg_basebackup to $BACKUP_DIR"
        return 0
    fi

    local start_time=$(date +%s)

    # Run pg_basebackup
    if sudo -u postgres pg_basebackup -D "${BACKUP_DIR}/data" \
        -Ft -z -P \
        --wal-method=fetch \
        --checkpoint=fast \
        --label="pitr_base_backup_${TIMESTAMP}" 2>&1 | tee -a "$LOG_FILE"; then

        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        log_success "Base backup completed in ${duration} seconds"
    else
        log_error "Base backup failed"
        exit 1
    fi
}

# Create backup metadata
create_backup_metadata() {
    log_info "Creating backup metadata..."

    if [[ $DRY_RUN == true ]]; then
        log_info "[DRY-RUN] Would create metadata file"
        return 0
    fi

    local metadata_file="${BACKUP_DIR}/backup_metadata.txt"

    cat > "$metadata_file" << EOF
Backup Type: PITR Base Backup
Timestamp: $(date '+%Y-%m-%d %H:%M:%S')
Backup Directory: $BACKUP_DIR
PostgreSQL Version: $(psql --version)
Database Size: $(sudo -u postgres psql -t -c "SELECT pg_size_pretty(pg_database_size(current_database()));" | xargs)
Compression: $COMPRESSION
WAL Method: fetch

Backup Contents:
$(ls -lh "${BACKUP_DIR}/data" 2>/dev/null || echo "N/A")

Checksums:
EOF

    # Generate checksums for backup files
    if [[ -d "${BACKUP_DIR}/data" ]]; then
        find "${BACKUP_DIR}/data" -type f -exec sha256sum {} \; >> "$metadata_file"
    fi

    log_success "Created metadata file: $metadata_file"
}

# Compress backup
compress_backup() {
    log_info "Compressing backup..."

    if [[ $DRY_RUN == true ]]; then
        log_info "[DRY-RUN] Would compress backup using $COMPRESSION"
        return 0
    fi

    local archive_name
    if [[ "$COMPRESSION" == "zstd" ]]; then
        archive_name="${BACKUP_BASE_DIR}/pitr_base_${TIMESTAMP}.tar.zst"
    else
        archive_name="${BACKUP_BASE_DIR}/pitr_base_${TIMESTAMP}.tar.gz"
    fi

    log_info "Creating archive: $archive_name"

    if [[ "$COMPRESSION" == "zstd" ]]; then
        tar -cf - -C "$BACKUP_DIR" . | zstd -3 -T0 > "$archive_name"
    else
        tar -czf "$archive_name" -C "$BACKUP_DIR" .
    fi

    # Verify archive was created
    if [[ -f "$archive_name" ]]; then
        local size=$(du -h "$archive_name" | cut -f1)
        log_success "Archive created: $archive_name (Size: $size)"

        # Remove uncompressed backup directory
        rm -rf "$BACKUP_DIR"
        log_info "Removed uncompressed backup directory"
    else
        log_error "Failed to create archive"
        exit 1
    fi
}

# Verify backup integrity
verify_backup() {
    log_info "Verifying backup integrity..."

    if [[ $DRY_RUN == true ]]; then
        log_info "[DRY-RUN] Would verify backup integrity"
        return 0
    fi

    local archive_name
    if [[ "$COMPRESSION" == "zstd" ]]; then
        archive_name="${BACKUP_BASE_DIR}/pitr_base_${TIMESTAMP}.tar.zst"
    else
        archive_name="${BACKUP_BASE_DIR}/pitr_base_${TIMESTAMP}.tar.gz"
    fi

    # Test archive extraction
    if [[ "$COMPRESSION" == "zstd" ]]; then
        if zstd -t "$archive_name" &> /dev/null; then
            log_success "Backup archive integrity verified"
        else
            log_error "Backup archive is corrupted"
            exit 1
        fi
    else
        if gzip -t "$archive_name" &> /dev/null; then
            log_success "Backup archive integrity verified"
        else
            log_error "Backup archive is corrupted"
            exit 1
        fi
    fi
}

# Clean old backups
cleanup_old_backups() {
    log_info "Cleaning up old backups (retention: keep last ${RETENTION_COUNT} backups)..."

    if [[ $DRY_RUN == true ]]; then
        log_info "[DRY-RUN] Would clean up old backups"
        return 0
    fi

    # Count current backups
    local backup_count=$(ls -1 "${BACKUP_BASE_DIR}"/pitr_base_*.tar.* 2>/dev/null | wc -l)
    log_info "Current backup count: $backup_count"

    if [[ $backup_count -le $RETENTION_COUNT ]]; then
        log_info "No cleanup needed (${backup_count} backups, retention: ${RETENTION_COUNT})"
        return 0
    fi

    # Remove oldest backups
    local to_remove=$((backup_count - RETENTION_COUNT))
    log_info "Removing $to_remove old backup(s)..."

    ls -1t "${BACKUP_BASE_DIR}"/pitr_base_*.tar.* | tail -n "$to_remove" | while read backup; do
        log_info "Removing old backup: $backup"
        rm -f "$backup"
    done

    log_success "Cleanup completed"
}

# Display summary
display_summary() {
    log_info ""
    log_info "=========================================="
    log_info "PITR Base Backup Summary"
    log_info "=========================================="
    log_info "Timestamp: $TIMESTAMP"
    log_info "Backup Location: $BACKUP_BASE_DIR"
    log_info "Compression: $COMPRESSION"
    log_info "Retention: $RETENTION_COUNT backups"
    log_info ""

    if [[ $DRY_RUN == false ]]; then
        log_info "Available backups:"
        ls -lh "${BACKUP_BASE_DIR}"/pitr_base_*.tar.* 2>/dev/null || log_info "No backups found"
    fi

    log_info ""
    log_success "Base backup completed successfully!"
    log_info ""
    log_info "To restore from this backup:"
    log_info "  sudo ./restore-pitr.sh --backup ${BACKUP_BASE_DIR}/pitr_base_${TIMESTAMP}.tar.*"
    log_info "=========================================="
}

# Main execution
main() {
    log_info "=========================================="
    log_info "PostgreSQL PITR Base Backup"
    log_info "=========================================="
    log_info "Started at: $(date '+%Y-%m-%d %H:%M:%S')"
    log_info ""

    check_prerequisites
    create_backup_directory
    perform_base_backup
    create_backup_metadata
    compress_backup
    verify_backup
    cleanup_old_backups
    display_summary

    log_info "Completed at: $(date '+%Y-%m-%d %H:%M:%S')"
}

# Error handling
trap 'log_error "Backup failed at line $LINENO"; exit 1' ERR

# Run main
main

exit 0
