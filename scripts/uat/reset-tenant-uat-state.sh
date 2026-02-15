#!/usr/bin/env bash
set -euo pipefail

# Tenant-scoped UAT reset helper.
# Default mode is VERIFY-ONLY. Use --apply to execute reset.
#
# Preserves (preseeded scenario):
# - tenant record
# - users, judges, contestants
# - events/contests/categories/criteria structure
# - role and assignment setup
#
# Resets:
# - scores and score comments/files
# - certifications and governance requests
# - deductions and approvals
# - winner signatures/publication flags
# - optional logs/reports/notifications/search history

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-event_manager}"
DB_USER="${DB_USER:-event_manager}"
DB_PASSWORD="${DB_PASSWORD:-dittibop}"
TENANT_SLUG="${TENANT_SLUG:-}"
APPLY=0
CLEAR_LOGS=1
SCENARIO="${SCENARIO:-preseeded}"

usage() {
  cat <<'USAGE'
Usage:
  scripts/uat/reset-tenant-uat-state.sh --tenant-slug <slug> [--apply] [--keep-logs] [--scenario preseeded|empty-tenant]

Options:
  --tenant-slug <slug>   Required tenant slug (example: febtest1)
  --apply                Execute reset (without this flag, script is verify-only)
  --keep-logs            Preserve notifications/reports/log/search artifacts
  --scenario <mode>      Reset mode:
                         preseeded    = keep event/contest/category setup
                         empty-tenant = also remove event/contest/category setup and assignments
  -h, --help             Show this help

Environment overrides:
  DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, TENANT_SLUG, SCENARIO
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tenant-slug)
      TENANT_SLUG="${2:-}"
      shift 2
      ;;
    --apply)
      APPLY=1
      shift
      ;;
    --keep-logs)
      CLEAR_LOGS=0
      shift
      ;;
    --scenario)
      SCENARIO="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "${TENANT_SLUG}" ]]; then
  echo "Error: --tenant-slug is required." >&2
  usage
  exit 1
fi

if [[ "${SCENARIO}" != "preseeded" && "${SCENARIO}" != "empty-tenant" ]]; then
  echo "Error: --scenario must be 'preseeded' or 'empty-tenant'." >&2
  usage
  exit 1
fi

psql_cmd() {
  PGPASSWORD="${DB_PASSWORD}" psql \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    "$@"
}

echo "UAT reset target tenant slug: ${TENANT_SLUG}"
echo "Mode: $([[ ${APPLY} -eq 1 ]] && echo APPLY || echo VERIFY-ONLY)"
echo "Clear logs/reports/search/notifications: $([[ ${CLEAR_LOGS} -eq 1 ]] && echo YES || echo NO)"
echo "Scenario: ${SCENARIO}"
echo

TENANT_ID="$(psql_cmd -tA -c "SELECT id FROM tenants WHERE slug = '${TENANT_SLUG}' LIMIT 1;")"
if [[ -z "${TENANT_ID}" ]]; then
  echo "Error: tenant slug '${TENANT_SLUG}' not found." >&2
  exit 1
fi

echo "Resolved tenantId: ${TENANT_ID}"
echo

echo "Current UAT artifact counts:"
psql_cmd -P pager=off -c "
SELECT 'scores' AS table_name, COUNT(*)::bigint AS row_count FROM scores WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'score_comments', COUNT(*) FROM score_comments WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'score_files', COUNT(*) FROM score_files WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'judge_comments', COUNT(*) FROM judge_comments WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'overall_deductions', COUNT(*) FROM overall_deductions WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'deduction_requests', COUNT(*) FROM deduction_requests WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'deduction_approvals', COUNT(*) FROM deduction_approvals WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'judge_certifications', COUNT(*) FROM judge_certifications WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'judge_contestant_certifications', COUNT(*) FROM judge_contestant_certifications WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'category_certifications', COUNT(*) FROM category_certifications WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'contest_certifications', COUNT(*) FROM contest_certifications WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'certifications', COUNT(*) FROM certifications WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'review_judge_score_certifications', COUNT(*) FROM review_judge_score_certifications WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'review_contestant_certifications', COUNT(*) FROM review_contestant_certifications WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'score_governance_requests', COUNT(*) FROM score_governance_requests WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'score_governance_approvals', COUNT(*) FROM score_governance_approvals WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'score_removal_requests', COUNT(*) FROM score_removal_requests WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'judge_score_removal_requests', COUNT(*) FROM judge_score_removal_requests WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'judge_uncertification_requests', COUNT(*) FROM judge_uncertification_requests WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'winner_signatures', COUNT(*) FROM winner_signatures WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'report_instances', COUNT(*) FROM report_instances WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'reports', COUNT(*) FROM reports WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'search_history', COUNT(*) FROM search_history WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'saved_searches', COUNT(*) FROM saved_searches WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'event_logs', COUNT(*) FROM event_logs WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'activity_logs', COUNT(*) FROM activity_logs WHERE \"tenantId\"='${TENANT_ID}'
ORDER BY table_name;
"

echo
echo "Structure sanity snapshot:"
psql_cmd -P pager=off -c "
SELECT
  (SELECT COUNT(*) FROM users WHERE \"tenantId\"='${TENANT_ID}') AS users,
  (SELECT COUNT(*) FROM events WHERE \"tenantId\"='${TENANT_ID}' AND \"deletedAt\" IS NULL) AS events,
  (SELECT COUNT(*) FROM contests WHERE \"tenantId\"='${TENANT_ID}' AND \"deletedAt\" IS NULL) AS contests,
  (SELECT COUNT(*) FROM categories WHERE \"tenantId\"='${TENANT_ID}' AND \"deletedAt\" IS NULL) AS categories,
  (SELECT COUNT(*) FROM assignments WHERE \"tenantId\"='${TENANT_ID}') AS assignments,
  (SELECT COUNT(*) FROM role_assignments WHERE \"tenantId\"='${TENANT_ID}' AND \"isActive\"=true) AS active_role_assignments;
"

if [[ ${APPLY} -ne 1 ]]; then
  echo
  echo "Verify-only mode complete. Re-run with --apply to execute reset."
  exit 0
fi

echo
echo "Applying tenant-scoped UAT reset..."

LOG_SQL=""
if [[ ${CLEAR_LOGS} -eq 1 ]]; then
  LOG_SQL="
    DELETE FROM report_instances WHERE \"tenantId\"='${TENANT_ID}';
    DELETE FROM reports WHERE \"tenantId\"='${TENANT_ID}';
    DELETE FROM notifications WHERE \"tenantId\"='${TENANT_ID}';
    DELETE FROM search_history WHERE \"tenantId\"='${TENANT_ID}';
    DELETE FROM saved_searches WHERE \"tenantId\"='${TENANT_ID}';
    DELETE FROM event_logs WHERE \"tenantId\"='${TENANT_ID}';
    DELETE FROM activity_logs WHERE \"tenantId\"='${TENANT_ID}';
  "
fi

STRUCTURE_SQL=""
if [[ "${SCENARIO}" == "empty-tenant" ]]; then
  STRUCTURE_SQL="
    DELETE FROM emcee_scripts WHERE \"tenantId\"='${TENANT_ID}';
    DELETE FROM role_assignments WHERE \"tenantId\"='${TENANT_ID}';
    DELETE FROM assignments WHERE \"tenantId\"='${TENANT_ID}';
    DELETE FROM tally_master_assignments WHERE \"tenantId\"='${TENANT_ID}';
    DELETE FROM auditor_assignments WHERE \"tenantId\"='${TENANT_ID}';
    DELETE FROM contest_judges WHERE \"tenantId\"='${TENANT_ID}';
    DELETE FROM category_judges WHERE \"tenantId\"='${TENANT_ID}';
    DELETE FROM contest_contestants WHERE \"tenantId\"='${TENANT_ID}';
    DELETE FROM category_contestants WHERE \"tenantId\"='${TENANT_ID}';
    DELETE FROM criteria WHERE \"tenantId\"='${TENANT_ID}';
    DELETE FROM categories WHERE \"tenantId\"='${TENANT_ID}';
    DELETE FROM contests WHERE \"tenantId\"='${TENANT_ID}';
    DELETE FROM events WHERE \"tenantId\"='${TENANT_ID}';
  "
fi

psql_cmd -v ON_ERROR_STOP=1 -c "
BEGIN;
  DELETE FROM score_governance_approvals WHERE \"tenantId\"='${TENANT_ID}';
  DELETE FROM score_governance_requests WHERE \"tenantId\"='${TENANT_ID}';

  DELETE FROM deduction_approvals WHERE \"tenantId\"='${TENANT_ID}';
  DELETE FROM deduction_requests WHERE \"tenantId\"='${TENANT_ID}';
  DELETE FROM overall_deductions WHERE \"tenantId\"='${TENANT_ID}';

  DELETE FROM judge_score_removal_requests WHERE \"tenantId\"='${TENANT_ID}';
  DELETE FROM score_removal_requests WHERE \"tenantId\"='${TENANT_ID}';
  DELETE FROM judge_uncertification_requests WHERE \"tenantId\"='${TENANT_ID}';

  DELETE FROM review_judge_score_certifications WHERE \"tenantId\"='${TENANT_ID}';
  DELETE FROM review_contestant_certifications WHERE \"tenantId\"='${TENANT_ID}';
  DELETE FROM judge_contestant_certifications WHERE \"tenantId\"='${TENANT_ID}';
  DELETE FROM judge_certifications WHERE \"tenantId\"='${TENANT_ID}';
  DELETE FROM category_certifications WHERE \"tenantId\"='${TENANT_ID}';
  DELETE FROM contest_certifications WHERE \"tenantId\"='${TENANT_ID}';
  DELETE FROM winner_signatures WHERE \"tenantId\"='${TENANT_ID}';
  DELETE FROM certifications WHERE \"tenantId\"='${TENANT_ID}';

  DELETE FROM score_comments WHERE \"tenantId\"='${TENANT_ID}';
  DELETE FROM score_files WHERE \"tenantId\"='${TENANT_ID}';
  DELETE FROM judge_comments WHERE \"tenantId\"='${TENANT_ID}';
  DELETE FROM scores WHERE \"tenantId\"='${TENANT_ID}';

  UPDATE categories
    SET \"totalsCertified\"=false,
        \"boardApproved\"=false,
        \"approvedAt\"=NULL,
        \"approvedBy\"=NULL
  WHERE \"tenantId\"='${TENANT_ID}';

  UPDATE contests
    SET \"winnersPublished\"=false,
        \"publishedAt\"=NULL,
        \"publishedBy\"=NULL,
        \"isLocked\"=false,
        \"lockedAt\"=NULL,
        \"lockVerifiedBy\"=NULL
  WHERE \"tenantId\"='${TENANT_ID}';

  UPDATE events
    SET \"isLocked\"=false,
        \"lockedAt\"=NULL,
        \"lockVerifiedBy\"=NULL
  WHERE \"tenantId\"='${TENANT_ID}';

  ${LOG_SQL}
  ${STRUCTURE_SQL}
COMMIT;
"

echo "Reset complete."
echo
echo "Post-reset artifact counts:"
psql_cmd -P pager=off -c "
SELECT 'scores' AS table_name, COUNT(*)::bigint AS row_count FROM scores WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'certifications', COUNT(*) FROM certifications WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'category_certifications', COUNT(*) FROM category_certifications WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'judge_contestant_certifications', COUNT(*) FROM judge_contestant_certifications WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'score_governance_requests', COUNT(*) FROM score_governance_requests WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'deduction_requests', COUNT(*) FROM deduction_requests WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'winner_signatures', COUNT(*) FROM winner_signatures WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'assignments', COUNT(*) FROM assignments WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'role_assignments', COUNT(*) FROM role_assignments WHERE \"tenantId\"='${TENANT_ID}'
UNION ALL SELECT 'events', COUNT(*) FROM events WHERE \"tenantId\"='${TENANT_ID}' AND \"deletedAt\" IS NULL
UNION ALL SELECT 'contests', COUNT(*) FROM contests WHERE \"tenantId\"='${TENANT_ID}' AND \"deletedAt\" IS NULL
UNION ALL SELECT 'categories', COUNT(*) FROM categories WHERE \"tenantId\"='${TENANT_ID}' AND \"deletedAt\" IS NULL
ORDER BY table_name;
"
