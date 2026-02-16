#!/bin/bash

################################################################################
# Backup Cleanup Script
#
# Removes old backups based on retention policy
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../config/backup.config.sh"

DRY_RUN=false
LOG_FILE="${LOG_DIR}/backup-cleanup.log"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') [$1] ${@:2}" | tee -a "$LOG_FILE"; }

show_usage() {
    cat << EOF
Backup Cleanup Script

Usage: sudo $0 [options]

Options:
    --help              Show help
    --dry-run           Show what would be deleted

Description:
    Removes backups older than retention period while keeping minimum backups.

    Retention:
    - Full backups: ${RETENTION_DAYS_FULL_LOCAL} days
    - Incremental backups: ${RETENTION_DAYS_INCREMENTAL_LOCAL} days
    - PITR backups: ${RETENTION_DAYS_PITR_LOCAL} days
    - Remote: ${RETENTION_DAYS_REMOTE} days
    - Minimum to keep (full/incremental/pitr): ${MIN_BACKUPS_TO_KEEP_FULL}/${MIN_BACKUPS_TO_KEEP_INCREMENTAL}/${MIN_BACKUPS_TO_KEEP_PITR}

EOF
    exit 0
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --help) show_usage ;;
        --dry-run) DRY_RUN=true; shift ;;
        *) log "ERROR" "Unknown option: $1"; show_usage ;;
    esac
done

cleanup_directory() {
    local dir="$1"
    local retention_days="$2"
    local pattern="$3"
    local min_keep="$4"

    if [[ ! -d "$dir" ]]; then
        log "WARNING" "Directory not found: $dir"
        return 0
    fi

    log "INFO" "Cleaning: $dir (retention: ${retention_days} days)"

    # Find all backups matching pattern
    local backups=()
    mapfile -t backups < <(find "$dir" -name "$pattern" -type f | sort -r)
    local total_count=${#backups[@]}

    log "INFO" "Total backups found: $total_count"

    if [[ $total_count -le $min_keep ]]; then
        log "INFO" "Keeping all backups (below minimum threshold)"
        return 0
    fi

    local removed_count=0
    local kept_count=0

    for backup in "${backups[@]}"; do
        local age_days=$(( ($(date +%s) - $(stat -c %Y "$backup")) / 86400 ))

        # Always keep minimum number of recent backups
        if [[ $kept_count -lt $min_keep ]]; then
            log "INFO" "Keeping (recent): $(basename $backup)"
            kept_count=$((kept_count + 1))
            continue
        fi

        # Remove if older than retention
        if [[ $age_days -gt $retention_days ]]; then
            if [[ $DRY_RUN == true ]]; then
                log "INFO" "[DRY-RUN] Would remove: $(basename $backup) (age: ${age_days}d)"
            else
                rm -f "$backup"
                log "INFO" "Removed: $(basename $backup) (age: ${age_days}d)"
            fi
            removed_count=$((removed_count + 1))
        else
            log "INFO" "Keeping: $(basename $backup) (age: ${age_days}d)"
            kept_count=$((kept_count + 1))
        fi
    done

    log "SUCCESS" "Cleanup complete - Removed: $removed_count, Kept: $kept_count"

    # Report freed space
    if [[ $removed_count -gt 0 ]] && [[ $DRY_RUN == false ]]; then
        local free_space=$(df -h "$dir" | tail -1 | awk '{print $4}')
        log "INFO" "Available space: $free_space"
    fi
}

main() {
    log "INFO" "=========================================="
    log "INFO" "Backup Cleanup"
    log "INFO" "=========================================="

    # Cleanup full backups
    cleanup_directory "$BACKUP_FULL_DIR" "$RETENTION_DAYS_FULL_LOCAL" "full_backup_*.tar.*" "$MIN_BACKUPS_TO_KEEP_FULL"

    # Cleanup incremental backups
    cleanup_directory "$BACKUP_INCREMENTAL_DIR" "$RETENTION_DAYS_INCREMENTAL_LOCAL" "incremental_*.tar.*" "$MIN_BACKUPS_TO_KEEP_INCREMENTAL"

    # Cleanup PITR base backups
    cleanup_directory "/var/backups/postgresql/base" "$RETENTION_DAYS_PITR_LOCAL" "pitr_base_*.tar.*" "$MIN_BACKUPS_TO_KEEP_PITR"

    # Cleanup old logs
    if [[ -d "$LOG_DIR" ]]; then
        log "INFO" "Cleaning old log files..."
        find "$LOG_DIR" -name "*.log" -mtime +${LOG_RETENTION_DAYS} -delete 2>/dev/null || true
    fi

    log "INFO" "=========================================="
    log "SUCCESS" "Cleanup completed"
    log "INFO" "=========================================="
}

trap 'log "ERROR" "Cleanup failed at line $LINENO"; exit 1' ERR

main

exit 0
