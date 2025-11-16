#!/bin/bash

################################################################################
# Test Report Generator
#
# Generates HTML report from test results
################################################################################

set -euo pipefail

OUTPUT_FILE="/var/log/backup-test-report-$(date +%Y%m%d).html"
LOG_DIR="/var/log"

generate_report() {
    cat > "$OUTPUT_FILE" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Backup Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .success { color: green; font-weight: bold; }
        .failure { color: red; font-weight: bold; }
        .warning { color: orange; font-weight: bold; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4CAF50; color: white; }
        .summary { background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>Event Manager - Backup Test Report</h1>
    <p>Generated: DATE_PLACEHOLDER</p>

    <div class="summary">
        <h2>Test Summary</h2>
        <p>Recovery Test: STATUS_RECOVERY</p>
        <p>Integrity Test: STATUS_INTEGRITY</p>
        <p>Total Duration: DURATION_PLACEHOLDER</p>
    </div>

    <h2>Test Details</h2>
    <pre>LOG_CONTENT_PLACEHOLDER</pre>

    <h2>Recommendations</h2>
    <ul>
        <li>Verify backups are being created daily</li>
        <li>Monitor disk space for backup storage</li>
        <li>Review and test disaster recovery procedures quarterly</li>
    </ul>
</body>
</html>
EOF

    # Replace placeholders
    sed -i "s/DATE_PLACEHOLDER/$(date '+%Y-%m-%d %H:%M:%S')/" "$OUTPUT_FILE"

    echo "Report generated: $OUTPUT_FILE"

    # Email report if configured
    if command -v mail &> /dev/null && [[ -n "${ALERT_EMAIL:-}" ]]; then
        cat "$OUTPUT_FILE" | mail -s "Backup Test Report - $(date +%Y-%m-%d)" "$ALERT_EMAIL" || true
    fi
}

generate_report

exit 0
