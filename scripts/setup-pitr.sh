#!/bin/bash

################################################################################
# PostgreSQL Point-in-Time Recovery (PITR) Setup Script
#
# This script configures PostgreSQL for PITR by:
# - Setting up WAL archiving
# - Configuring postgresql.conf
# - Creating necessary directories
# - Verifying the setup
#
# Usage: sudo ./setup-pitr.sh [options]
# Options:
#   --help              Show this help message
#   --dry-run           Show what would be done without making changes
#   --wal-dir PATH      Custom WAL archive directory (default: /var/lib/postgresql/wal_archive)
################################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
LOG_FILE="/var/log/pitr-setup.log"
DRY_RUN=false
WAL_ARCHIVE_DIR="/var/lib/postgresql/wal_archive"

# Function to log messages
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

# Function to show usage
show_usage() {
    cat << EOF
PostgreSQL Point-in-Time Recovery (PITR) Setup Script

Usage: sudo $0 [options]

Options:
    --help              Show this help message
    --dry-run           Show what would be done without making changes
    --wal-dir PATH      Custom WAL archive directory (default: /var/lib/postgresql/wal_archive)

Description:
    This script sets up PostgreSQL for Point-in-Time Recovery (PITR) by:
    1. Checking PostgreSQL version and status
    2. Creating WAL archive directory
    3. Backing up current postgresql.conf
    4. Updating postgresql.conf with PITR settings
    5. Restarting PostgreSQL service
    6. Verifying WAL archiving is working

Requirements:
    - PostgreSQL 10 or higher
    - Root or sudo privileges
    - At least 10GB free space for WAL archives

Examples:
    sudo $0
    sudo $0 --dry-run
    sudo $0 --wal-dir /custom/wal/path

EOF
    exit 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help)
            show_usage
            ;;
        --dry-run)
            DRY_RUN=true
            log_info "Running in DRY-RUN mode - no changes will be made"
            shift
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

# Check if running as root
if [[ $EUID -ne 0 ]] && [[ $DRY_RUN == false ]]; then
   log_error "This script must be run as root or with sudo"
   exit 1
fi

log_info "=========================================="
log_info "PostgreSQL PITR Setup Script"
log_info "=========================================="
log_info "WAL Archive Directory: $WAL_ARCHIVE_DIR"
log_info "Dry Run: $DRY_RUN"
log_info ""

# Detect PostgreSQL installation
detect_postgresql() {
    log_info "Detecting PostgreSQL installation..."

    # Try to find PostgreSQL version
    if command -v psql &> /dev/null; then
        PG_VERSION=$(psql --version | grep -oP '\d+' | head -1)
        log_success "PostgreSQL version detected: $PG_VERSION"
    else
        log_error "PostgreSQL not found. Please install PostgreSQL first."
        exit 1
    fi

    # Find postgresql.conf location
    if sudo -u postgres psql -t -c "SHOW config_file;" &> /dev/null; then
        PG_CONF=$(sudo -u postgres psql -t -c "SHOW config_file;" | xargs)
        log_success "postgresql.conf found at: $PG_CONF"
    else
        log_error "Cannot determine postgresql.conf location"
        exit 1
    fi

    # Find data directory
    PG_DATA_DIR=$(sudo -u postgres psql -t -c "SHOW data_directory;" | xargs)
    log_success "Data directory: $PG_DATA_DIR"

    # Check PostgreSQL service status
    if systemctl is-active --quiet postgresql; then
        log_success "PostgreSQL service is running"
    else
        log_error "PostgreSQL service is not running"
        exit 1
    fi
}

# Check disk space
check_disk_space() {
    log_info "Checking disk space..."

    local wal_parent_dir=$(dirname "$WAL_ARCHIVE_DIR")
    local available_space=$(df -BG "$wal_parent_dir" | awk 'NR==2 {print $4}' | sed 's/G//')

    if [[ $available_space -lt 10 ]]; then
        log_warning "Less than 10GB available at $wal_parent_dir (${available_space}GB available)"
        log_warning "WAL archives can grow large. Consider adding more disk space."
    else
        log_success "Sufficient disk space available: ${available_space}GB"
    fi
}

# Create WAL archive directory
create_wal_archive_dir() {
    log_info "Creating WAL archive directory..."

    if [[ $DRY_RUN == true ]]; then
        log_info "[DRY-RUN] Would create directory: $WAL_ARCHIVE_DIR"
        log_info "[DRY-RUN] Would set ownership to postgres:postgres"
        log_info "[DRY-RUN] Would set permissions to 700"
        return 0
    fi

    if [[ -d "$WAL_ARCHIVE_DIR" ]]; then
        log_warning "WAL archive directory already exists: $WAL_ARCHIVE_DIR"
    else
        mkdir -p "$WAL_ARCHIVE_DIR"
        log_success "Created WAL archive directory: $WAL_ARCHIVE_DIR"
    fi

    # Set ownership and permissions
    chown postgres:postgres "$WAL_ARCHIVE_DIR"
    chmod 700 "$WAL_ARCHIVE_DIR"
    log_success "Set ownership and permissions on $WAL_ARCHIVE_DIR"
}

# Backup postgresql.conf
backup_postgresql_conf() {
    log_info "Backing up postgresql.conf..."

    local backup_file="${PG_CONF}.backup.$(date +%Y%m%d_%H%M%S)"

    if [[ $DRY_RUN == true ]]; then
        log_info "[DRY-RUN] Would backup $PG_CONF to $backup_file"
        return 0
    fi

    cp "$PG_CONF" "$backup_file"
    log_success "Backed up postgresql.conf to: $backup_file"
}

# Update postgresql.conf with PITR settings
update_postgresql_conf() {
    log_info "Updating postgresql.conf with PITR settings..."

    # Archive command - escape the path properly
    local archive_cmd="test ! -f ${WAL_ARCHIVE_DIR}/%f && cp %p ${WAL_ARCHIVE_DIR}/%f"

    if [[ $DRY_RUN == true ]]; then
        log_info "[DRY-RUN] Would add/update the following settings in postgresql.conf:"
        echo "  wal_level = replica"
        echo "  archive_mode = on"
        echo "  archive_command = '$archive_cmd'"
        echo "  max_wal_senders = 3"
        echo "  wal_keep_size = 1GB"
        return 0
    fi

    # Check if settings already exist
    local needs_restart=false

    # Update wal_level
    if grep -q "^wal_level" "$PG_CONF"; then
        sed -i "s/^wal_level.*/wal_level = replica/" "$PG_CONF"
        log_success "Updated wal_level"
    else
        echo "wal_level = replica" >> "$PG_CONF"
        log_success "Added wal_level"
    fi
    needs_restart=true

    # Update archive_mode
    if grep -q "^archive_mode" "$PG_CONF"; then
        sed -i "s/^archive_mode.*/archive_mode = on/" "$PG_CONF"
        log_success "Updated archive_mode"
    else
        echo "archive_mode = on" >> "$PG_CONF"
        log_success "Added archive_mode"
    fi

    # Update archive_command
    # First, remove any existing archive_command lines (even commented ones at the end of file)
    sed -i "/^archive_command/d" "$PG_CONF"
    # Now add the new one
    echo "archive_command = '$archive_cmd'" >> "$PG_CONF"
    log_success "Updated archive_command"

    # Update max_wal_senders
    if grep -q "^max_wal_senders" "$PG_CONF"; then
        sed -i "s/^max_wal_senders.*/max_wal_senders = 3/" "$PG_CONF"
        log_success "Updated max_wal_senders"
    else
        echo "max_wal_senders = 3" >> "$PG_CONF"
        log_success "Added max_wal_senders"
    fi

    # Update wal_keep_size (PostgreSQL 13+) or wal_keep_segments (older versions)
    if [[ $PG_VERSION -ge 13 ]]; then
        if grep -q "^wal_keep_size" "$PG_CONF"; then
            sed -i "s/^wal_keep_size.*/wal_keep_size = 1GB/" "$PG_CONF"
            log_success "Updated wal_keep_size"
        else
            echo "wal_keep_size = 1GB" >> "$PG_CONF"
            log_success "Added wal_keep_size"
        fi
    else
        # For older PostgreSQL versions (< 13)
        if grep -q "^wal_keep_segments" "$PG_CONF"; then
            sed -i "s/^wal_keep_segments.*/wal_keep_segments = 64/" "$PG_CONF"
            log_success "Updated wal_keep_segments"
        else
            echo "wal_keep_segments = 64" >> "$PG_CONF"
            log_success "Added wal_keep_segments"
        fi
    fi
}

# Restart PostgreSQL service
restart_postgresql() {
    log_info "Restarting PostgreSQL service..."

    if [[ $DRY_RUN == true ]]; then
        log_info "[DRY-RUN] Would restart PostgreSQL service"
        return 0
    fi

    systemctl restart postgresql

    # Wait for PostgreSQL to be ready
    local max_wait=30
    local waited=0
    while ! sudo -u postgres psql -c "SELECT 1;" &> /dev/null; do
        if [[ $waited -ge $max_wait ]]; then
            log_error "PostgreSQL did not start within ${max_wait} seconds"
            exit 1
        fi
        sleep 1
        ((waited++))
    done

    log_success "PostgreSQL restarted successfully"
}

# Verify PITR setup
verify_pitr_setup() {
    log_info "Verifying PITR setup..."

    if [[ $DRY_RUN == true ]]; then
        log_info "[DRY-RUN] Would verify PITR settings"
        return 0
    fi

    # Check wal_level
    local wal_level=$(sudo -u postgres psql -t -c "SHOW wal_level;" | xargs)
    if [[ "$wal_level" == "replica" ]] || [[ "$wal_level" == "logical" ]]; then
        log_success "wal_level is set correctly: $wal_level"
    else
        log_error "wal_level is not set correctly: $wal_level (expected: replica)"
        exit 1
    fi

    # Check archive_mode
    local archive_mode=$(sudo -u postgres psql -t -c "SHOW archive_mode;" | xargs)
    if [[ "$archive_mode" == "on" ]]; then
        log_success "archive_mode is enabled"
    else
        log_error "archive_mode is not enabled"
        exit 1
    fi

    # Check archive_command
    local archive_command=$(sudo -u postgres psql -t -c "SHOW archive_command;" | xargs)
    log_success "archive_command is set: $archive_command"

    # Force a WAL switch to test archiving
    log_info "Testing WAL archiving by forcing a WAL switch..."
    sudo -u postgres psql -c "SELECT pg_switch_wal();" &> /dev/null || sudo -u postgres psql -c "SELECT pg_switch_xlog();" &> /dev/null

    sleep 2

    # Check if any WAL files were archived
    local wal_count=$(ls -1 "$WAL_ARCHIVE_DIR" 2>/dev/null | wc -l)
    if [[ $wal_count -gt 0 ]]; then
        log_success "WAL archiving is working! Found $wal_count archived WAL file(s)"
    else
        log_warning "No WAL files found in archive directory yet. This might be normal if there's little activity."
    fi
}

# Display summary
display_summary() {
    log_info ""
    log_info "=========================================="
    log_info "PITR Setup Summary"
    log_info "=========================================="
    log_info "WAL Archive Directory: $WAL_ARCHIVE_DIR"
    log_info "PostgreSQL Config: $PG_CONF"
    log_info "PostgreSQL Version: $PG_VERSION"
    log_info ""
    log_success "PITR setup completed successfully!"
    log_info ""
    log_info "Next steps:"
    log_info "1. Create a base backup: sudo ./pitr-base-backup.sh"
    log_info "2. Monitor WAL archiving: ls -lh $WAL_ARCHIVE_DIR"
    log_info "3. Set up regular base backups (weekly recommended)"
    log_info ""
    log_info "To restore to a point in time, use: sudo ./restore-pitr.sh"
    log_info "=========================================="
}

# Main execution
main() {
    detect_postgresql
    check_disk_space
    create_wal_archive_dir
    backup_postgresql_conf
    update_postgresql_conf
    restart_postgresql
    verify_pitr_setup
    display_summary
}

# Error handling
trap 'log_error "Script failed at line $LINENO"' ERR

# Run main function
main

exit 0
