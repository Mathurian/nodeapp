#!/bin/bash

################################################################################
# PostgreSQL Point-in-Time Recovery (PITR) Restore Script
#
# Restores PostgreSQL database to a specific point in time using PITR.
#
# Usage: sudo ./restore-pitr.sh [options]
# Options:
#   --help                  Show this help message
#   --dry-run               Show what would be done without making changes
#   --backup PATH           Path to base backup file (required)
#   --target-time TIMESTAMP Target recovery time (format: YYYY-MM-DD HH:MM:SS)
#   --target-name NAME      Target recovery name (restore_target_name)
#   --wal-dir PATH          WAL archive directory (default: /var/lib/postgresql/wal_archive)
################################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DRY_RUN=false
BACKUP_FILE=""
TARGET_TIME=""
TARGET_NAME=""
WAL_ARCHIVE_DIR="/var/lib/postgresql/wal_archive"
LOG_FILE="/var/log/pitr-restore.log"
SAFETY_BACKUP_DIR="/var/backups/postgresql/safety_backup_$(date +%Y%m%d_%H%M%S)"

# Logging
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
PostgreSQL Point-in-Time Recovery (PITR) Restore Script

Usage: sudo $0 --backup BACKUP_FILE [options]

Required:
    --backup PATH           Path to base backup file

Options:
    --help                  Show this help message
    --dry-run               Show what would be done without making changes
    --target-time TIMESTAMP Target recovery time (format: "YYYY-MM-DD HH:MM:SS")
    --target-name NAME      Target recovery name (recovery target name)
    --wal-dir PATH          WAL archive directory (default: /var/lib/postgresql/wal_archive)

Description:
    Restores PostgreSQL database to a specific point in time using PITR.

    WARNING: This will STOP PostgreSQL and REPLACE the current database!
    A safety backup of the current database will be created first.

Recovery Targets:
    If neither --target-time nor --target-name is specified, recovers to
    the latest available point in time.

Examples:
    # Restore to latest
    sudo $0 --backup /var/backups/postgresql/base/pitr_base_20250101_020000.tar.gz

    # Restore to specific time
    sudo $0 --backup /path/to/backup.tar.gz --target-time "2025-01-15 10:30:00"

    # Dry run
    sudo $0 --backup /path/to/backup.tar.gz --dry-run

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
        --backup)
            BACKUP_FILE="$2"
            shift 2
            ;;
        --target-time)
            TARGET_TIME="$2"
            shift 2
            ;;
        --target-name)
            TARGET_NAME="$2"
            shift 2
            ;;
        --wal-dir)
            WAL_ARCHIVE_DIR="$2"
            shift 2
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            ;;
    esac
done

# Validate arguments
if [[ -z "$BACKUP_FILE" ]]; then
    log_error "Backup file is required. Use --backup option."
    show_usage
fi

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check root
    if [[ $EUID -ne 0 ]] && [[ $DRY_RUN == false ]]; then
        log_error "This script must be run as root"
        exit 1
    fi

    # Check backup file exists
    if [[ ! -f "$BACKUP_FILE" ]]; then
        log_error "Backup file not found: $BACKUP_FILE"
        exit 1
    fi
    log_success "Backup file found: $BACKUP_FILE"

    # Check WAL archive directory
    if [[ ! -d "$WAL_ARCHIVE_DIR" ]]; then
        log_error "WAL archive directory not found: $WAL_ARCHIVE_DIR"
        exit 1
    fi
    log_success "WAL archive directory found: $WAL_ARCHIVE_DIR"

    # Check PostgreSQL
    if ! command -v psql &> /dev/null; then
        log_error "PostgreSQL not found"
        exit 1
    fi

    # Get PostgreSQL version
    PG_VERSION=$(psql --version | grep -oP '\d+' | head -1)
    log_info "PostgreSQL version: $PG_VERSION"

    # Get data directory
    if systemctl is-active --quiet postgresql; then
        PG_DATA_DIR=$(sudo -u postgres psql -t -c "SHOW data_directory;" | xargs)
        log_success "Data directory: $PG_DATA_DIR"
    else
        # Try to get from config
        local pg_conf=$(find /etc/postgresql -name postgresql.conf 2>/dev/null | head -1)
        if [[ -n "$pg_conf" ]]; then
            PG_DATA_DIR=$(grep "^data_directory" "$pg_conf" | awk -F "'" '{print $2}')
        fi

        if [[ -z "$PG_DATA_DIR" ]]; then
            log_error "Cannot determine PostgreSQL data directory"
            exit 1
        fi
        log_info "Data directory: $PG_DATA_DIR"
    fi
}

# Confirm with user
confirm_restore() {
    if [[ $DRY_RUN == true ]]; then
        log_info "[DRY-RUN] Skipping confirmation"
        return 0
    fi

    log_warning "=========================================="
    log_warning "WARNING: DESTRUCTIVE OPERATION"
    log_warning "=========================================="
    log_warning "This will:"
    log_warning "  1. STOP PostgreSQL"
    log_warning "  2. BACKUP current database to: $SAFETY_BACKUP_DIR"
    log_warning "  3. REPLACE current database with backup"
    log_warning "  4. RESTORE to point in time"
    log_warning ""
    log_warning "Backup file: $BACKUP_FILE"

    if [[ -n "$TARGET_TIME" ]]; then
        log_warning "Target time: $TARGET_TIME"
    elif [[ -n "$TARGET_NAME" ]]; then
        log_warning "Target name: $TARGET_NAME"
    else
        log_warning "Target: Latest available"
    fi

    log_warning ""

    read -p "Are you sure you want to continue? (type 'YES' to proceed): " confirmation

    if [[ "$confirmation" != "YES" ]]; then
        log_info "Restore cancelled by user"
        exit 0
    fi

    log_info "Confirmation received. Proceeding with restore..."
}

# Stop PostgreSQL
stop_postgresql() {
    log_info "Stopping PostgreSQL service..."

    if [[ $DRY_RUN == true ]]; then
        log_info "[DRY-RUN] Would stop PostgreSQL"
        return 0
    fi

    systemctl stop postgresql

    # Verify stopped
    local max_wait=30
    local waited=0
    while systemctl is-active --quiet postgresql; do
        if [[ $waited -ge $max_wait ]]; then
            log_error "Failed to stop PostgreSQL within ${max_wait} seconds"
            exit 1
        fi
        sleep 1
        ((waited++))
    done

    log_success "PostgreSQL stopped"
}

# Create safety backup
create_safety_backup() {
    log_info "Creating safety backup of current database..."

    if [[ $DRY_RUN == true ]]; then
        log_info "[DRY-RUN] Would create safety backup at: $SAFETY_BACKUP_DIR"
        return 0
    fi

    mkdir -p "$SAFETY_BACKUP_DIR"

    log_info "Copying data directory to safety backup..."
    if cp -a "$PG_DATA_DIR" "$SAFETY_BACKUP_DIR/"; then
        log_success "Safety backup created: $SAFETY_BACKUP_DIR"
    else
        log_error "Failed to create safety backup"
        exit 1
    fi
}

# Clear data directory
clear_data_directory() {
    log_info "Clearing data directory..."

    if [[ $DRY_RUN == true ]]; then
        log_info "[DRY-RUN] Would clear: $PG_DATA_DIR"
        return 0
    fi

    # Remove all contents but keep the directory
    rm -rf "${PG_DATA_DIR:?}"/*
    log_success "Data directory cleared"
}

# Restore base backup
restore_base_backup() {
    log_info "Restoring base backup..."

    if [[ $DRY_RUN == true ]]; then
        log_info "[DRY-RUN] Would extract backup to: $PG_DATA_DIR"
        return 0
    fi

    # Detect compression type
    local extract_cmd=""
    if [[ "$BACKUP_FILE" == *.tar.gz ]]; then
        extract_cmd="tar -xzf"
    elif [[ "$BACKUP_FILE" == *.tar.zst ]]; then
        extract_cmd="tar -I zstd -xf"
    elif [[ "$BACKUP_FILE" == *.tar ]]; then
        extract_cmd="tar -xf"
    else
        log_error "Unknown backup file format: $BACKUP_FILE"
        exit 1
    fi

    # Extract to temporary directory first
    local temp_dir="/tmp/pitr_restore_$$"
    mkdir -p "$temp_dir"

    log_info "Extracting backup to temporary location..."
    if $extract_cmd "$BACKUP_FILE" -C "$temp_dir"; then
        log_success "Backup extracted"
    else
        log_error "Failed to extract backup"
        rm -rf "$temp_dir"
        exit 1
    fi

    # Move data to PostgreSQL data directory
    if [[ -d "$temp_dir/data" ]]; then
        # Backup had data subdirectory
        mv "$temp_dir"/data/* "$PG_DATA_DIR/"
    else
        # Backup root is the data directory
        mv "$temp_dir"/* "$PG_DATA_DIR/"
    fi

    # Set ownership
    chown -R postgres:postgres "$PG_DATA_DIR"
    chmod 700 "$PG_DATA_DIR"

    # Cleanup temp directory
    rm -rf "$temp_dir"

    log_success "Base backup restored to: $PG_DATA_DIR"
}

# Create recovery configuration
create_recovery_config() {
    log_info "Creating recovery configuration..."

    if [[ $DRY_RUN == true ]]; then
        log_info "[DRY-RUN] Would create recovery configuration"
        return 0
    fi

    # PostgreSQL 12+ uses recovery.signal and postgresql.auto.conf
    # Older versions use recovery.conf

    if [[ $PG_VERSION -ge 12 ]]; then
        # PostgreSQL 12+
        log_info "Creating recovery.signal (PostgreSQL 12+)"
        touch "${PG_DATA_DIR}/recovery.signal"
        chown postgres:postgres "${PG_DATA_DIR}/recovery.signal"

        # Create postgresql.auto.conf with recovery settings
        local auto_conf="${PG_DATA_DIR}/postgresql.auto.conf"

        cat > "$auto_conf" << EOF
# Recovery configuration
restore_command = 'cp ${WAL_ARCHIVE_DIR}/%f %p'
recovery_target_action = 'promote'
EOF

        # Add target time if specified
        if [[ -n "$TARGET_TIME" ]]; then
            echo "recovery_target_time = '$TARGET_TIME'" >> "$auto_conf"
            log_info "Recovery target time: $TARGET_TIME"
        fi

        # Add target name if specified
        if [[ -n "$TARGET_NAME" ]]; then
            echo "recovery_target_name = '$TARGET_NAME'" >> "$auto_conf"
            log_info "Recovery target name: $TARGET_NAME"
        fi

        chown postgres:postgres "$auto_conf"
        log_success "Recovery configuration created (PostgreSQL 12+)"

    else
        # PostgreSQL < 12
        log_info "Creating recovery.conf (PostgreSQL < 12)"
        local recovery_conf="${PG_DATA_DIR}/recovery.conf"

        cat > "$recovery_conf" << EOF
# Recovery configuration
restore_command = 'cp ${WAL_ARCHIVE_DIR}/%f %p'
recovery_target_action = 'promote'
EOF

        if [[ -n "$TARGET_TIME" ]]; then
            echo "recovery_target_time = '$TARGET_TIME'" >> "$recovery_conf"
            log_info "Recovery target time: $TARGET_TIME"
        fi

        if [[ -n "$TARGET_NAME" ]]; then
            echo "recovery_target_name = '$TARGET_NAME'" >> "$recovery_conf"
            log_info "Recovery target name: $TARGET_NAME"
        fi

        chown postgres:postgres "$recovery_conf"
        chmod 600 "$recovery_conf"
        log_success "Recovery configuration created (PostgreSQL < 12)"
    fi
}

# Start PostgreSQL in recovery mode
start_postgresql_recovery() {
    log_info "Starting PostgreSQL in recovery mode..."

    if [[ $DRY_RUN == true ]]; then
        log_info "[DRY-RUN] Would start PostgreSQL"
        return 0
    fi

    systemctl start postgresql

    log_info "Waiting for PostgreSQL to be ready..."
    local max_wait=60
    local waited=0

    while ! sudo -u postgres psql -c "SELECT 1;" &> /dev/null; do
        if [[ $waited -ge $max_wait ]]; then
            log_error "PostgreSQL did not start within ${max_wait} seconds"
            log_error "Check PostgreSQL logs for details"
            exit 1
        fi
        sleep 2
        ((waited+=2))

        # Show progress
        if [[ $((waited % 10)) -eq 0 ]]; then
            log_info "Still waiting... (${waited}s / ${max_wait}s)"
        fi
    done

    log_success "PostgreSQL started and ready"
}

# Wait for recovery to complete
wait_for_recovery() {
    log_info "Waiting for recovery to complete..."

    if [[ $DRY_RUN == true ]]; then
        log_info "[DRY-RUN] Would wait for recovery"
        return 0
    fi

    # Check recovery status
    local max_wait=600  # 10 minutes
    local waited=0

    while true; do
        # Check if still in recovery
        local in_recovery=$(sudo -u postgres psql -t -c "SELECT pg_is_in_recovery();" 2>/dev/null | xargs || echo "error")

        if [[ "$in_recovery" == "f" ]]; then
            log_success "Recovery completed and database promoted"
            break
        elif [[ "$in_recovery" == "error" ]]; then
            log_error "Failed to check recovery status"
            exit 1
        fi

        if [[ $waited -ge $max_wait ]]; then
            log_error "Recovery did not complete within ${max_wait} seconds"
            exit 1
        fi

        sleep 5
        ((waited+=5))

        if [[ $((waited % 30)) -eq 0 ]]; then
            log_info "Recovery in progress... (${waited}s / ${max_wait}s)"
        fi
    done
}

# Verify database
verify_database() {
    log_info "Verifying database integrity..."

    if [[ $DRY_RUN == true ]]; then
        log_info "[DRY-RUN] Would verify database"
        return 0
    fi

    # Run basic checks
    local db_count=$(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_database;" | xargs)
    log_success "Database count: $db_count"

    # Check if we can query the main database
    if sudo -u postgres psql -d event_manager -c "SELECT 1;" &> /dev/null; then
        log_success "event_manager database is accessible"
    else
        log_warning "event_manager database is not accessible (may not exist)"
    fi

    # Show recovery timeline info
    log_info "Current timeline: $(sudo -u postgres psql -t -c "SELECT timeline_id FROM pg_control_checkpoint();" | xargs || echo "N/A")"
}

# Display summary
display_summary() {
    log_info ""
    log_info "=========================================="
    log_info "PITR Restore Summary"
    log_info "=========================================="
    log_info "Backup File: $BACKUP_FILE"

    if [[ -n "$TARGET_TIME" ]]; then
        log_info "Target Time: $TARGET_TIME"
    elif [[ -n "$TARGET_NAME" ]]; then
        log_info "Target Name: $TARGET_NAME"
    else
        log_info "Target: Latest available"
    fi

    log_info "Data Directory: $PG_DATA_DIR"
    log_info "Safety Backup: $SAFETY_BACKUP_DIR"
    log_info ""
    log_success "Database restored successfully!"
    log_info ""
    log_info "Next steps:"
    log_info "1. Verify application connectivity"
    log_info "2. Check data integrity"
    log_info "3. If everything is OK, you can remove safety backup:"
    log_info "   sudo rm -rf $SAFETY_BACKUP_DIR"
    log_info "4. If restore failed, you can rollback:"
    log_info "   sudo systemctl stop postgresql"
    log_info "   sudo rm -rf $PG_DATA_DIR/*"
    log_info "   sudo cp -a $SAFETY_BACKUP_DIR/$(basename $PG_DATA_DIR)/* $PG_DATA_DIR/"
    log_info "   sudo systemctl start postgresql"
    log_info "=========================================="
}

# Main execution
main() {
    log_info "=========================================="
    log_info "PostgreSQL PITR Restore"
    log_info "=========================================="
    log_info "Started at: $(date '+%Y-%m-%d %H:%M:%S')"
    log_info ""

    check_prerequisites
    confirm_restore
    stop_postgresql
    create_safety_backup
    clear_data_directory
    restore_base_backup
    create_recovery_config
    start_postgresql_recovery
    wait_for_recovery
    verify_database
    display_summary

    log_info "Completed at: $(date '+%Y-%m-%d %H:%M:%S')"
}

# Error handling
trap 'log_error "Restore failed at line $LINENO"; exit 1' ERR

# Run main
main

exit 0
