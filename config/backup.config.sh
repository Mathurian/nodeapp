#!/bin/bash

################################################################################
# Backup Configuration File
#
# Centralized configuration for all backup scripts.
# Source this file in backup scripts: source /var/www/event-manager/config/backup.config.sh
################################################################################

# Backup directories
export BACKUP_BASE_DIR="${BACKUP_BASE_DIR:-/var/backups/event-manager}"
export BACKUP_FULL_DIR="${BACKUP_BASE_DIR}/full"
export BACKUP_INCREMENTAL_DIR="${BACKUP_BASE_DIR}/incremental"
export BACKUP_PITR_DIR="${BACKUP_BASE_DIR}/pitr"
export WAL_ARCHIVE_DIR="${WAL_ARCHIVE_DIR:-/var/lib/postgresql/wal_archive}"

# Retention policies (in days)
export RETENTION_DAYS_LOCAL="${RETENTION_DAYS_LOCAL:-30}"
export RETENTION_DAYS_REMOTE="${RETENTION_DAYS_REMOTE:-90}"
export MIN_BACKUPS_TO_KEEP="${MIN_BACKUPS_TO_KEEP:-7}"

# Backup settings
export BACKUP_COMPRESSION="${BACKUP_COMPRESSION:-zstd}"  # zstd or gzip
export BACKUP_COMPRESSION_LEVEL="${BACKUP_COMPRESSION_LEVEL:-3}"
export BACKUP_PARALLEL_JOBS="${BACKUP_PARALLEL_JOBS:-2}"

# Encryption settings
export BACKUP_ENCRYPTION_ENABLED="${BACKUP_ENCRYPTION_ENABLED:-false}"
export GPG_KEY_ID="${GPG_KEY_ID:-}"
export GPG_RECIPIENT="${GPG_RECIPIENT:-}"

# Remote backup settings
export REMOTE_BACKUP_ENABLED="${REMOTE_BACKUP_ENABLED:-false}"
export REMOTE_BACKUP_TYPE="${REMOTE_BACKUP_TYPE:-rsync}"  # s3, rsync, or custom
export REMOTE_BACKUP_HOST="${REMOTE_BACKUP_HOST:-}"
export REMOTE_BACKUP_USER="${REMOTE_BACKUP_USER:-}"
export REMOTE_BACKUP_PATH="${REMOTE_BACKUP_PATH:-}"

# S3 settings (if using S3)
export S3_BUCKET="${S3_BUCKET:-}"
export S3_REGION="${S3_REGION:-us-east-1}"
export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}"

# PostgreSQL settings
export PGHOST="${PGHOST:-localhost}"
export PGPORT="${PGPORT:-5432}"
export PGDATABASE="${PGDATABASE:-event_manager}"
export PGUSER="${PGUSER:-postgres}"

# Alerting settings
export ALERT_ENABLED="${ALERT_ENABLED:-true}"
export ALERT_EMAIL="${ALERT_EMAIL:-admin@example.com}"
export ALERT_ON_SUCCESS="${ALERT_ON_SUCCESS:-false}"
export ALERT_ON_FAILURE="${ALERT_ON_FAILURE:-true}"
export ALERT_ON_WARNING="${ALERT_ON_WARNING:-true}"

# Logging settings
export LOG_DIR="${LOG_DIR:-/var/log}"
export LOG_RETENTION_DAYS="${LOG_RETENTION_DAYS:-30}"

# Backup verification settings
export VERIFY_BACKUPS="${VERIFY_BACKUPS:-true}"
export VERIFY_CHECKSUM="${VERIFY_CHECKSUM:-true}"

# Application settings
export APP_DIR="${APP_DIR:-/var/www/event-manager}"
export APP_UPLOADS_DIR="${APP_UPLOADS_DIR:-${APP_DIR}/uploads}"
export APP_LOGS_DIR="${APP_LOGS_DIR:-${APP_DIR}/logs}"

# Monitoring settings
export MONITORING_ENABLED="${MONITORING_ENABLED:-true}"
export MONITORING_API_URL="${MONITORING_API_URL:-http://localhost:5000/api/admin/backups}"

# Disk space thresholds
export MIN_FREE_SPACE_GB="${MIN_FREE_SPACE_GB:-20}"
export WARN_FREE_SPACE_GB="${WARN_FREE_SPACE_GB:-50}"

# Backup health checks
export MAX_BACKUP_AGE_HOURS="${MAX_BACKUP_AGE_HOURS:-25}"
export MAX_BACKUP_SIZE_VARIATION="${MAX_BACKUP_SIZE_VARIATION:-200}"  # Percentage

# Create backup directories if they don't exist
create_backup_directories() {
    local dirs=(
        "$BACKUP_BASE_DIR"
        "$BACKUP_FULL_DIR"
        "$BACKUP_INCREMENTAL_DIR"
        "$BACKUP_PITR_DIR"
    )

    for dir in "${dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            mkdir -p "$dir"
            chmod 700 "$dir"
        fi
    done
}

# Utility function: Check disk space
check_disk_space() {
    local target_dir="${1:-$BACKUP_BASE_DIR}"
    local available_gb=$(df -BG "$target_dir" | awk 'NR==2 {print $4}' | sed 's/G//')

    if [[ $available_gb -lt $MIN_FREE_SPACE_GB ]]; then
        return 1  # Not enough space
    fi
    return 0  # Sufficient space
}

# Utility function: Get database size
get_database_size() {
    sudo -u postgres psql -t -c "SELECT pg_size_pretty(pg_database_size('$PGDATABASE'));" | xargs
}

# Utility function: Send alert
send_alert() {
    local subject="$1"
    local message="$2"
    local level="${3:-INFO}"  # INFO, WARNING, ERROR

    if [[ "$ALERT_ENABLED" != "true" ]]; then
        return 0
    fi

    # Check if should send based on level
    case "$level" in
        ERROR)
            [[ "$ALERT_ON_FAILURE" != "true" ]] && return 0
            ;;
        WARNING)
            [[ "$ALERT_ON_WARNING" != "true" ]] && return 0
            ;;
        SUCCESS)
            [[ "$ALERT_ON_SUCCESS" != "true" ]] && return 0
            ;;
    esac

    # Send email if mail command is available
    if command -v mail &> /dev/null && [[ -n "$ALERT_EMAIL" ]]; then
        echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
    fi

    # Log to monitoring API if enabled
    if [[ "$MONITORING_ENABLED" == "true" ]] && [[ -n "$MONITORING_API_URL" ]]; then
        curl -s -X POST "$MONITORING_API_URL/alert" \
            -H "Content-Type: application/json" \
            -d "{\"level\":\"$level\",\"subject\":\"$subject\",\"message\":\"$message\"}" \
            &> /dev/null || true
    fi
}

# Utility function: Calculate checksum
calculate_checksum() {
    local file="$1"
    if [[ -f "$file" ]]; then
        sha256sum "$file" | awk '{print $1}'
    else
        echo "ERROR: File not found"
        return 1
    fi
}

# Utility function: Verify checksum
verify_checksum() {
    local file="$1"
    local expected_checksum="$2"

    if [[ ! -f "$file" ]]; then
        return 1
    fi

    local actual_checksum=$(calculate_checksum "$file")

    if [[ "$actual_checksum" == "$expected_checksum" ]]; then
        return 0  # Match
    else
        return 1  # Mismatch
    fi
}

# Utility function: Encrypt file
encrypt_file() {
    local input_file="$1"
    local output_file="${input_file}.gpg"

    if [[ "$BACKUP_ENCRYPTION_ENABLED" != "true" ]]; then
        echo "$input_file"  # Return original file
        return 0
    fi

    if [[ -z "$GPG_KEY_ID" ]] && [[ -z "$GPG_RECIPIENT" ]]; then
        echo "ERROR: Encryption enabled but no GPG key configured"
        return 1
    fi

    local gpg_opts=""
    if [[ -n "$GPG_RECIPIENT" ]]; then
        gpg_opts="--recipient $GPG_RECIPIENT"
    elif [[ -n "$GPG_KEY_ID" ]]; then
        gpg_opts="--recipient $GPG_KEY_ID"
    fi

    if gpg --encrypt --trust-model always $gpg_opts --output "$output_file" "$input_file" 2>/dev/null; then
        rm -f "$input_file"  # Remove unencrypted file
        echo "$output_file"
        return 0
    else
        echo "ERROR: Encryption failed"
        return 1
    fi
}

# Utility function: Decrypt file
decrypt_file() {
    local input_file="$1"
    local output_file="${input_file%.gpg}"

    if [[ ! -f "$input_file" ]]; then
        echo "ERROR: Input file not found"
        return 1
    fi

    if gpg --decrypt --output "$output_file" "$input_file" 2>/dev/null; then
        echo "$output_file"
        return 0
    else
        echo "ERROR: Decryption failed"
        return 1
    fi
}

# Utility function: Upload to remote
upload_to_remote() {
    local local_file="$1"
    local remote_path="${2:-$(basename $local_file)}"

    if [[ "$REMOTE_BACKUP_ENABLED" != "true" ]]; then
        return 0  # Remote backup disabled
    fi

    case "$REMOTE_BACKUP_TYPE" in
        s3)
            if command -v aws &> /dev/null; then
                aws s3 cp "$local_file" "s3://${S3_BUCKET}/${remote_path}" \
                    --region "$S3_REGION" &> /dev/null
                return $?
            else
                echo "ERROR: AWS CLI not found"
                return 1
            fi
            ;;
        rsync)
            if command -v rsync &> /dev/null && [[ -n "$REMOTE_BACKUP_HOST" ]]; then
                rsync -avz --progress "$local_file" \
                    "${REMOTE_BACKUP_USER}@${REMOTE_BACKUP_HOST}:${REMOTE_BACKUP_PATH}/${remote_path}" \
                    &> /dev/null
                return $?
            else
                echo "ERROR: rsync not configured properly"
                return 1
            fi
            ;;
        *)
            echo "ERROR: Unknown remote backup type: $REMOTE_BACKUP_TYPE"
            return 1
            ;;
    esac
}

# Initialize - create directories on load
create_backup_directories

# Export all functions
export -f create_backup_directories
export -f check_disk_space
export -f get_database_size
export -f send_alert
export -f calculate_checksum
export -f verify_checksum
export -f encrypt_file
export -f decrypt_file
export -f upload_to_remote
