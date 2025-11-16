#!/bin/bash

################################################################################
# Full Backup Script
#
# Creates a complete backup of the Event Manager application including:
# - PostgreSQL database (using pg_dump)
# - Uploaded files
# - Configuration files
# - Application logs
#
# Usage: sudo ./backup-full.sh [options]
################################################################################

set -euo pipefail

# Source configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/../config/backup.config.sh"

if [[ -f "$CONFIG_FILE" ]]; then
    source "$CONFIG_FILE"
else
    echo "ERROR: Configuration file not found: $CONFIG_FILE"
    exit 1
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Script-specific configuration
DRY_RUN=false
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="full_backup_${TIMESTAMP}"
BACKUP_WORK_DIR="${BACKUP_FULL_DIR}/${BACKUP_NAME}"
LOG_FILE="${LOG_DIR}/backup-full.log"
BACKUP_START_TIME=$(date +%s)

# Backup manifest
MANIFEST_FILE="${BACKUP_WORK_DIR}/MANIFEST.txt"
CHECKSUM_FILE="${BACKUP_WORK_DIR}/CHECKSUMS.txt"

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
Full Backup Script

Usage: sudo $0 [options]

Options:
    --help              Show this help message
    --dry-run           Show what would be done without making changes
    --no-compress       Skip compression
    --no-encrypt        Skip encryption (even if enabled in config)
    --no-remote         Skip remote upload (even if enabled in config)

Description:
    Creates a complete backup including database, files, and configurations.
    Backup is compressed, optionally encrypted, and uploaded to remote storage.

Examples:
    sudo $0
    sudo $0 --dry-run
    sudo $0 --no-encrypt

EOF
    exit 0
}

# Parse arguments
SKIP_COMPRESS=false
SKIP_ENCRYPT=false
SKIP_REMOTE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --help) show_usage ;;
        --dry-run) DRY_RUN=true; shift ;;
        --no-compress) SKIP_COMPRESS=true; shift ;;
        --no-encrypt) SKIP_ENCRYPT=true; shift ;;
        --no-remote) SKIP_REMOTE=true; shift ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            ;;
    esac
done

# Pre-flight checks
preflight_checks() {
    log_info "Running pre-flight checks..."

    # Check if running as root
    if [[ $EUID -ne 0 ]] && [[ $DRY_RUN == false ]]; then
        log_error "This script must be run as root"
        exit 1
    fi

    # Check PostgreSQL
    if ! systemctl is-active --quiet postgresql; then
        log_error "PostgreSQL is not running"
        exit 1
    fi

    # Check disk space
    if ! check_disk_space "$BACKUP_FULL_DIR"; then
        log_error "Insufficient disk space (need at least ${MIN_FREE_SPACE_GB}GB)"
        exit 1
    fi

    # Check required commands
    local required_commands=("pg_dump" "tar")
    [[ "$SKIP_COMPRESS" == false ]] && required_commands+=("$BACKUP_COMPRESSION")

    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "Required command not found: $cmd"
            exit 1
        fi
    done

    log_success "Pre-flight checks passed"
}

# Create backup directory
create_backup_directory() {
    log_info "Creating backup directory..."

    if [[ $DRY_RUN == true ]]; then
        log_info "[DRY-RUN] Would create: $BACKUP_WORK_DIR"
        return 0
    fi

    mkdir -p "$BACKUP_WORK_DIR"
    chmod 755 "$BACKUP_WORK_DIR"
    chown postgres:postgres "$BACKUP_WORK_DIR"
    log_success "Created: $BACKUP_WORK_DIR"
}

# Backup database
backup_database() {
    log_info "Backing up PostgreSQL database: $PGDATABASE..."

    local db_backup_file="${BACKUP_WORK_DIR}/database.sql"
    local db_size=$(get_database_size)

    log_info "Database size: $db_size"

    if [[ $DRY_RUN == true ]]; then
        log_info "[DRY-RUN] Would backup database to: $db_backup_file"
        return 0
    fi

    # Use pg_dump with custom format for flexibility
    if sudo -u postgres pg_dump -Fc -v \
        --dbname="$PGDATABASE" \
        --file="$db_backup_file" \
        --no-owner \
        --no-privileges \
        2>&1 | tee -a "$LOG_FILE"; then

        local backup_size=$(du -h "$db_backup_file" | cut -f1)
        log_success "Database backed up successfully (Size: $backup_size)"

        # Add to manifest
        echo "database.sql|$(stat -c%s "$db_backup_file")|$(date '+%Y-%m-%d %H:%M:%S')" >> "$MANIFEST_FILE"

        # Calculate checksum
        calculate_checksum "$db_backup_file" >> "$CHECKSUM_FILE"
    else
        log_error "Database backup failed"
        return 1
    fi
}

# Backup uploaded files
backup_uploads() {
    log_info "Backing up uploaded files..."

    if [[ ! -d "$APP_UPLOADS_DIR" ]]; then
        log_warning "Uploads directory not found: $APP_UPLOADS_DIR"
        return 0
    fi

    local uploads_count=$(find "$APP_UPLOADS_DIR" -type f | wc -l)
    log_info "Files to backup: $uploads_count"

    if [[ $DRY_RUN == true ]]; then
        log_info "[DRY-RUN] Would backup uploads from: $APP_UPLOADS_DIR"
        return 0
    fi

    if [[ $uploads_count -eq 0 ]]; then
        log_warning "No uploaded files to backup"
        return 0
    fi

    # Create uploads backup
    local uploads_backup="${BACKUP_WORK_DIR}/uploads.tar"

    tar -cf "$uploads_backup" -C "$(dirname "$APP_UPLOADS_DIR")" "$(basename "$APP_UPLOADS_DIR")" 2>&1 | tee -a "$LOG_FILE"

    if [[ -f "$uploads_backup" ]]; then
        local backup_size=$(du -h "$uploads_backup" | cut -f1)
        log_success "Uploads backed up successfully (Size: $backup_size)"

        echo "uploads.tar|$(stat -c%s "$uploads_backup")|$(date '+%Y-%m-%d %H:%M:%S')" >> "$MANIFEST_FILE"
        calculate_checksum "$uploads_backup" >> "$CHECKSUM_FILE"
    else
        log_warning "Failed to backup uploads"
    fi
}

# Backup configuration files
backup_configs() {
    log_info "Backing up configuration files..."

    if [[ $DRY_RUN == true ]]; then
        log_info "[DRY-RUN] Would backup configurations"
        return 0
    fi

    local config_backup="${BACKUP_WORK_DIR}/configs.tar"

    # List of config files to backup
    local config_files=(
        "${APP_DIR}/.env"
        "${APP_DIR}/package.json"
        "${APP_DIR}/prisma/schema.prisma"
        "/etc/postgresql"
    )

    local temp_config_dir="${BACKUP_WORK_DIR}/configs_temp"
    mkdir -p "$temp_config_dir"

    # Copy config files to temp directory
    for config in "${config_files[@]}"; do
        if [[ -e "$config" ]]; then
            cp -a "$config" "$temp_config_dir/" 2>/dev/null || true
        fi
    done

    # Create tar archive
    if tar -cf "$config_backup" -C "$temp_config_dir" . 2>&1 | tee -a "$LOG_FILE"; then
        local backup_size=$(du -h "$config_backup" | cut -f1)
        log_success "Configurations backed up (Size: $backup_size)"

        echo "configs.tar|$(stat -c%s "$config_backup")|$(date '+%Y-%m-%d %H:%M:%S')" >> "$MANIFEST_FILE"
        calculate_checksum "$config_backup" >> "$CHECKSUM_FILE"
    fi

    # Cleanup temp directory
    rm -rf "$temp_config_dir"
}

# Backup application logs
backup_logs() {
    log_info "Backing up application logs..."

    if [[ ! -d "$APP_LOGS_DIR" ]] || [[ ! "$(ls -A $APP_LOGS_DIR 2>/dev/null)" ]]; then
        log_info "No logs to backup"
        return 0
    fi

    if [[ $DRY_RUN == true ]]; then
        log_info "[DRY-RUN] Would backup logs"
        return 0
    fi

    local logs_backup="${BACKUP_WORK_DIR}/logs.tar"

    tar -cf "$logs_backup" -C "$(dirname "$APP_LOGS_DIR")" "$(basename "$APP_LOGS_DIR")" 2>&1 | tee -a "$LOG_FILE"

    if [[ -f "$logs_backup" ]]; then
        local backup_size=$(du -h "$logs_backup" | cut -f1)
        log_success "Logs backed up (Size: $backup_size)"

        echo "logs.tar|$(stat -c%s "$logs_backup")|$(date '+%Y-%m-%d %H:%M:%S')" >> "$MANIFEST_FILE"
    fi
}

# Create backup metadata
create_metadata() {
    log_info "Creating backup metadata..."

    if [[ $DRY_RUN == true ]]; then
        log_info "[DRY-RUN] Would create metadata"
        return 0
    fi

    local metadata_file="${BACKUP_WORK_DIR}/METADATA.txt"

    cat > "$metadata_file" << EOF
Backup Name: $BACKUP_NAME
Backup Type: Full Backup
Timestamp: $(date '+%Y-%m-%d %H:%M:%S')
Server Hostname: $(hostname)
PostgreSQL Version: $(psql --version)
Database Name: $PGDATABASE
Database Size: $(get_database_size)
Application Directory: $APP_DIR

Backup Contents:
$(cat "$MANIFEST_FILE" 2>/dev/null || echo "Manifest not available")

System Information:
OS: $(uname -a)
Disk Usage: $(df -h / | tail -1)

Checksums:
$(cat "$CHECKSUM_FILE" 2>/dev/null || echo "Checksums not available")
EOF

    log_success "Metadata created"
}

# Compress backup
compress_backup() {
    if [[ "$SKIP_COMPRESS" == true ]]; then
        log_info "Skipping compression (--no-compress flag)"
        return 0
    fi

    log_info "Compressing backup..."

    if [[ $DRY_RUN == true ]]; then
        log_info "[DRY-RUN] Would compress using $BACKUP_COMPRESSION"
        return 0
    fi

    local archive_name="${BACKUP_FULL_DIR}/${BACKUP_NAME}.tar"

    # Create tar archive
    tar -cf "$archive_name" -C "$BACKUP_FULL_DIR" "$BACKUP_NAME" 2>&1 | tee -a "$LOG_FILE"

    # Compress
    if [[ "$BACKUP_COMPRESSION" == "zstd" ]]; then
        zstd -${BACKUP_COMPRESSION_LEVEL} -T${BACKUP_PARALLEL_JOBS} "$archive_name" -o "${archive_name}.zst"
        rm -f "$archive_name"
        FINAL_BACKUP_FILE="${archive_name}.zst"
    else
        gzip -${BACKUP_COMPRESSION_LEVEL} "$archive_name"
        FINAL_BACKUP_FILE="${archive_name}.gz"
    fi

    # Remove uncompressed directory
    rm -rf "$BACKUP_WORK_DIR"

    local final_size=$(du -h "$FINAL_BACKUP_FILE" | cut -f1)
    log_success "Backup compressed: $FINAL_BACKUP_FILE (Size: $final_size)"
}

# Encrypt backup
encrypt_backup() {
    if [[ "$SKIP_ENCRYPT" == true ]] || [[ "$BACKUP_ENCRYPTION_ENABLED" != "true" ]]; then
        log_info "Skipping encryption"
        return 0
    fi

    log_info "Encrypting backup..."

    if [[ $DRY_RUN == true ]]; then
        log_info "[DRY-RUN] Would encrypt backup"
        return 0
    fi

    local encrypted_file=$(encrypt_file "$FINAL_BACKUP_FILE")

    if [[ $? -eq 0 ]]; then
        FINAL_BACKUP_FILE="$encrypted_file"
        log_success "Backup encrypted: $FINAL_BACKUP_FILE"
    else
        log_error "Encryption failed"
        return 1
    fi
}

# Upload to remote storage
upload_remote() {
    if [[ "$SKIP_REMOTE" == true ]] || [[ "$REMOTE_BACKUP_ENABLED" != "true" ]]; then
        log_info "Skipping remote upload"
        return 0
    fi

    log_info "Uploading to remote storage..."

    if [[ $DRY_RUN == true ]]; then
        log_info "[DRY-RUN] Would upload to remote"
        return 0
    fi

    if upload_to_remote "$FINAL_BACKUP_FILE"; then
        log_success "Uploaded to remote storage"
    else
        log_warning "Remote upload failed"
    fi
}

# Update monitoring API
update_monitoring() {
    if [[ "$MONITORING_ENABLED" != "true" ]] || [[ $DRY_RUN == true ]]; then
        return 0
    fi

    local backup_end_time=$(date +%s)
    local duration=$((backup_end_time - BACKUP_START_TIME))
    local backup_size=0

    if [[ -f "$FINAL_BACKUP_FILE" ]]; then
        backup_size=$(stat -c%s "$FINAL_BACKUP_FILE" 2>/dev/null || echo 0)
    fi

    # Send to monitoring API
    curl -s -X POST "$MONITORING_API_URL" \
        -H "Content-Type: application/json" \
        -d "{
            \"type\": \"full\",
            \"status\": \"success\",
            \"startedAt\": \"$(date -d @$BACKUP_START_TIME '+%Y-%m-%dT%H:%M:%S')\",
            \"completedAt\": \"$(date -d @$backup_end_time '+%Y-%m-%dT%H:%M:%S')\",
            \"duration\": $duration,
            \"size\": $backup_size,
            \"location\": \"$FINAL_BACKUP_FILE\"
        }" &> /dev/null || true
}

# Send completion notification
send_notification() {
    local status="$1"
    local backup_end_time=$(date +%s)
    local duration=$((backup_end_time - BACKUP_START_TIME))
    local duration_human="$((duration / 60))m $((duration % 60))s"

    if [[ "$status" == "success" ]]; then
        local subject="✓ Backup Completed Successfully - Event Manager"
        local message="Full backup completed successfully.

Backup Name: $BACKUP_NAME
Duration: $duration_human
Final Backup: $FINAL_BACKUP_FILE
Size: $(du -h "$FINAL_BACKUP_FILE" 2>/dev/null | cut -f1 || echo "Unknown")
Timestamp: $(date '+%Y-%m-%d %H:%M:%S')

Next backup: $(date -d '+1 day' '+%Y-%m-%d 02:00:00')
"
        send_alert "$subject" "$message" "SUCCESS"
    else
        local subject="✗ Backup Failed - Event Manager"
        local message="Full backup FAILED.

Backup Name: $BACKUP_NAME
Duration: $duration_human
Timestamp: $(date '+%Y-%m-%d %H:%M:%S')

Please investigate the backup logs: $LOG_FILE
"
        send_alert "$subject" "$message" "ERROR"
    fi
}

# Display summary
display_summary() {
    local backup_end_time=$(date +%s)
    local duration=$((backup_end_time - BACKUP_START_TIME))

    log_info ""
    log_info "=========================================="
    log_info "Full Backup Summary"
    log_info "=========================================="
    log_info "Backup Name: $BACKUP_NAME"
    log_info "Duration: $((duration / 60))m $((duration % 60))s"

    if [[ -f "$FINAL_BACKUP_FILE" ]]; then
        log_info "Final Backup: $FINAL_BACKUP_FILE"
        log_info "Size: $(du -h "$FINAL_BACKUP_FILE" | cut -f1)"
    fi

    log_info "Log File: $LOG_FILE"
    log_info ""
    log_success "Backup completed successfully!"
    log_info "=========================================="
}

# Error handler
handle_error() {
    log_error "Backup failed at line $1"
    send_notification "failure"

    # Update monitoring with failure status
    if [[ "$MONITORING_ENABLED" == "true" ]]; then
        local backup_end_time=$(date +%s)
        local duration=$((backup_end_time - BACKUP_START_TIME))

        curl -s -X POST "$MONITORING_API_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"type\": \"full\",
                \"status\": \"failed\",
                \"startedAt\": \"$(date -d @$BACKUP_START_TIME '+%Y-%m-%dT%H:%M:%S')\",
                \"completedAt\": \"$(date -d @$backup_end_time '+%Y-%m-%dT%H:%M:%S')\",
                \"duration\": $duration,
                \"errorMessage\": \"Backup failed at line $1\"
            }" &> /dev/null || true
    fi

    exit 1
}

# Main execution
main() {
    log_info "=========================================="
    log_info "Full Backup - Event Manager"
    log_info "=========================================="
    log_info "Started at: $(date '+%Y-%m-%d %H:%M:%S')"
    log_info "Backup name: $BACKUP_NAME"
    log_info ""

    preflight_checks
    create_backup_directory
    backup_database
    backup_uploads
    backup_configs
    backup_logs
    create_metadata
    compress_backup
    encrypt_backup
    upload_remote
    update_monitoring
    display_summary
    send_notification "success"

    log_info "Completed at: $(date '+%Y-%m-%d %H:%M:%S')"
}

# Set error handler
trap 'handle_error $LINENO' ERR

# Run main
main

exit 0
