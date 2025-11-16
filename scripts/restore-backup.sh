#!/bin/bash

################################################################################
# Restore Backup Script
#
# Restores a full backup including database and files
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../config/backup.config.sh"

LOG_FILE="${LOG_DIR}/restore-backup.log"
BACKUP_FILE=""
SAFETY_BACKUP="/var/backups/postgresql/safety_$(date +%Y%m%d_%H%M%S)"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') [$1] ${@:2}" | tee -a "$LOG_FILE"; }

show_usage() {
    cat << EOF
Restore Backup Script

Usage: sudo $0 --backup BACKUP_FILE [options]

Required:
    --backup PATH       Path to backup file

Options:
    --help              Show help
    --no-confirm        Skip confirmation prompt

Description:
    Restores full backup including database, uploads, and configurations.

    WARNING: This will REPLACE the current database and files!

Examples:
    sudo $0 --backup /var/backups/event-manager/full/full_backup_20250101_020000.tar.gz

EOF
    exit 0
}

NO_CONFIRM=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --help) show_usage ;;
        --backup) BACKUP_FILE="$2"; shift 2 ;;
        --no-confirm) NO_CONFIRM=true; shift ;;
        *) log "ERROR" "Unknown option: $1"; show_usage ;;
    esac
done

if [[ -z "$BACKUP_FILE" ]]; then
    log "ERROR" "Backup file required"
    show_usage
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
    log "ERROR" "Backup file not found: $BACKUP_FILE"
    exit 1
fi

confirm_restore() {
    if [[ $NO_CONFIRM == true ]]; then
        return 0
    fi

    log "WARNING" "=========================================="
    log "WARNING" "DESTRUCTIVE OPERATION"
    log "WARNING" "=========================================="
    log "WARNING" "This will REPLACE current database and files"
    log "WARNING" "Backup file: $BACKUP_FILE"
    log "WARNING" "Safety backup will be created at: $SAFETY_BACKUP"
    log "WARNING" ""

    read -p "Type 'YES' to continue: " confirmation

    if [[ "$confirmation" != "YES" ]]; then
        log "INFO" "Restore cancelled"
        exit 0
    fi
}

main() {
    log "INFO" "Starting restore from: $BACKUP_FILE"

    confirm_restore

    # Stop services
    log "INFO" "Stopping services..."
    systemctl stop postgresql || true
    systemctl stop event-manager || true

    # Create safety backup
    log "INFO" "Creating safety backup..."
    mkdir -p "$SAFETY_BACKUP"

    PG_DATA_DIR=$(grep "^data_directory" /etc/postgresql/*/main/postgresql.conf | awk -F "'" '{print $2}' | head -1)
    if [[ -n "$PG_DATA_DIR" ]] && [[ -d "$PG_DATA_DIR" ]]; then
        cp -a "$PG_DATA_DIR" "$SAFETY_BACKUP/" 2>&1 | tee -a "$LOG_FILE"
        log "SUCCESS" "Safety backup created"
    fi

    # Extract backup
    log "INFO" "Extracting backup..."
    TEMP_RESTORE="/tmp/restore_$$"
    mkdir -p "$TEMP_RESTORE"

    if [[ "$BACKUP_FILE" == *.tar.gz ]]; then
        tar -xzf "$BACKUP_FILE" -C "$TEMP_RESTORE" 2>&1 | tee -a "$LOG_FILE"
    elif [[ "$BACKUP_FILE" == *.tar.zst ]]; then
        tar -I zstd -xf "$BACKUP_FILE" -C "$TEMP_RESTORE" 2>&1 | tee -a "$LOG_FILE"
    else
        log "ERROR" "Unknown backup format"
        exit 1
    fi

    # Restore database
    if [[ -f "$TEMP_RESTORE/database.sql" ]]; then
        log "INFO" "Restoring database..."

        # Drop and recreate database
        sudo -u postgres psql -c "DROP DATABASE IF EXISTS $PGDATABASE;" 2>&1 | tee -a "$LOG_FILE"
        sudo -u postgres psql -c "CREATE DATABASE $PGDATABASE;" 2>&1 | tee -a "$LOG_FILE"

        # Restore from backup
        sudo -u postgres pg_restore -d "$PGDATABASE" "$TEMP_RESTORE/database.sql" 2>&1 | tee -a "$LOG_FILE"

        log "SUCCESS" "Database restored"
    fi

    # Restore uploads
    if [[ -f "$TEMP_RESTORE/uploads.tar" ]]; then
        log "INFO" "Restoring uploads..."
        tar -xf "$TEMP_RESTORE/uploads.tar" -C "$(dirname $APP_UPLOADS_DIR)" 2>&1 | tee -a "$LOG_FILE"
        log "SUCCESS" "Uploads restored"
    fi

    # Restore configs
    if [[ -f "$TEMP_RESTORE/configs.tar" ]]; then
        log "INFO" "Restoring configurations..."
        tar -xf "$TEMP_RESTORE/configs.tar" -C / 2>&1 | tee -a "$LOG_FILE"
        log "SUCCESS" "Configurations restored"
    fi

    # Cleanup
    rm -rf "$TEMP_RESTORE"

    # Start services
    log "INFO" "Starting services..."
    systemctl start postgresql
    systemctl start event-manager || true

    # Verify
    sleep 5
    if sudo -u postgres psql -d "$PGDATABASE" -c "SELECT 1;" &> /dev/null; then
        log "SUCCESS" "Database is accessible"
    else
        log "ERROR" "Database is not accessible"
    fi

    log "INFO" "=========================================="
    log "SUCCESS" "Restore completed successfully"
    log "INFO" "=========================================="
    log "INFO" "Safety backup: $SAFETY_BACKUP"
    log "INFO" "To remove safety backup: sudo rm -rf $SAFETY_BACKUP"
}

trap 'log "ERROR" "Restore failed at line $LINENO"; exit 1' ERR

main

exit 0
