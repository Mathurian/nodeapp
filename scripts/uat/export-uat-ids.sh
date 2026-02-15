#!/usr/bin/env bash
set -euo pipefail

# Export tenant-scoped UAT IDs and suggested scenarios as JSON.
#
# Example:
#   scripts/uat/export-uat-ids.sh --tenant-slug febtest1
#   scripts/uat/export-uat-ids.sh --tenant-slug febtest1 --out /tmp/febtest1-uat-ids.json

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-event_manager}"
DB_USER="${DB_USER:-event_manager}"
DB_PASSWORD="${DB_PASSWORD:-dittibop}"
TENANT_SLUG="${TENANT_SLUG:-}"
OUT_FILE=""

usage() {
  cat <<'USAGE'
Usage:
  scripts/uat/export-uat-ids.sh --tenant-slug <slug> [--out <path>]

Options:
  --tenant-slug <slug>   Required tenant slug (example: febtest1)
  --out <path>           Output JSON file path
  -h, --help             Show help

Environment overrides:
  DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, TENANT_SLUG
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --tenant-slug)
      TENANT_SLUG="${2:-}"
      shift 2
      ;;
    --out)
      OUT_FILE="${2:-}"
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

if [[ -z "${OUT_FILE}" ]]; then
  OUT_FILE="docs/UAT-IDs-${TENANT_SLUG}.json"
fi

mkdir -p "$(dirname "${OUT_FILE}")"

ESCAPED_TENANT_SLUG="${TENANT_SLUG//\'/\'\'}"

read -r -d '' SQL <<SQL || true
WITH tenant AS (
  SELECT id, slug, name
  FROM tenants
  WHERE slug = '${ESCAPED_TENANT_SLUG}'
  LIMIT 1
),
category_data AS (
  SELECT
    ca.id AS category_id,
    ca.name AS category_name,
    ca."contestId" AS contest_id,
    co."eventId" AS event_id,
    COALESCE(
      jsonb_agg(
        DISTINCT jsonb_build_object(
          'id', con.id,
          'name', con.name,
          'contestantNumber', con."contestantNumber"
        )
      ) FILTER (WHERE con.id IS NOT NULL),
      '[]'::jsonb
    ) AS contestants,
    COALESCE(
      jsonb_agg(DISTINCT con.id) FILTER (WHERE con.id IS NOT NULL),
      '[]'::jsonb
    ) AS contestant_ids,
    COUNT(DISTINCT con.id)::int AS contestant_count
  FROM tenant t
  JOIN categories ca
    ON ca."tenantId" = t.id
   AND ca."deletedAt" IS NULL
  JOIN contests co
    ON co.id = ca."contestId"
   AND co."tenantId" = t.id
   AND co."deletedAt" IS NULL
  JOIN events e
    ON e.id = co."eventId"
   AND e."tenantId" = t.id
   AND e."deletedAt" IS NULL
  LEFT JOIN category_contestants cc
    ON cc."tenantId" = t.id
   AND cc."categoryId" = ca.id
  LEFT JOIN contestants con
    ON con."tenantId" = t.id
   AND con.id = cc."contestantId"
  GROUP BY ca.id, ca.name, ca."contestId", co."eventId"
),
contest_data AS (
  SELECT
    co.id AS contest_id,
    co.name AS contest_name,
    co."eventId" AS event_id,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', cd.category_id,
          'name', cd.category_name,
          'contestantCount', cd.contestant_count,
          'contestantIds', cd.contestant_ids,
          'contestants', cd.contestants
        )
        ORDER BY cd.category_name
      ) FILTER (WHERE cd.category_id IS NOT NULL),
      '[]'::jsonb
    ) AS categories,
    COUNT(cd.category_id)::int AS category_count,
    COUNT(*) FILTER (WHERE cd.contestant_count > 0)::int AS categories_with_contestants
  FROM tenant t
  JOIN contests co
    ON co."tenantId" = t.id
   AND co."deletedAt" IS NULL
  JOIN events e
    ON e.id = co."eventId"
   AND e."tenantId" = t.id
   AND e."deletedAt" IS NULL
  LEFT JOIN category_data cd
    ON cd.contest_id = co.id
  GROUP BY co.id, co.name, co."eventId"
),
event_data AS (
  SELECT
    e.id AS event_id,
    e.name AS event_name,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', ct.contest_id,
          'name', ct.contest_name,
          'categoryCount', ct.category_count,
          'categoriesWithContestants', ct.categories_with_contestants,
          'categories', ct.categories
        )
        ORDER BY ct.contest_name
      ) FILTER (WHERE ct.contest_id IS NOT NULL),
      '[]'::jsonb
    ) AS contests
  FROM tenant t
  JOIN events e
    ON e."tenantId" = t.id
   AND e."deletedAt" IS NULL
  LEFT JOIN contest_data ct
    ON ct.event_id = e.id
  GROUP BY e.id, e.name
),
single_category_suggestion AS (
  SELECT jsonb_build_object(
    'eventId', e.id,
    'eventName', e.name,
    'contestId', co.id,
    'contestName', co.name,
    'categoryId', ca.id,
    'categoryName', ca.name,
    'contestantIds', cd.contestant_ids
  ) AS payload
  FROM tenant t
  JOIN events e
    ON e."tenantId" = t.id
   AND e."deletedAt" IS NULL
  JOIN contests co
    ON co."tenantId" = t.id
   AND co."eventId" = e.id
   AND co."deletedAt" IS NULL
  JOIN categories ca
    ON ca."tenantId" = t.id
   AND ca."contestId" = co.id
   AND ca."deletedAt" IS NULL
  JOIN category_data cd
    ON cd.category_id = ca.id
  WHERE cd.contestant_count > 0
  ORDER BY e.name, co.name, ca.name
  LIMIT 1
),
multi_category_suggestion AS (
  SELECT jsonb_build_object(
    'eventId', e.id,
    'eventName', e.name,
    'contestId', co.id,
    'contestName', co.name,
    'categoryIds', (
      SELECT COALESCE(jsonb_agg(cd.category_id ORDER BY cd.category_name), '[]'::jsonb)
      FROM category_data cd
      WHERE cd.contest_id = co.id
        AND cd.contestant_count > 0
    ),
    'contestantIds', (
      SELECT COALESCE(jsonb_agg(DISTINCT cc."contestantId"), '[]'::jsonb)
      FROM category_contestants cc
      JOIN categories ca2 ON ca2.id = cc."categoryId"
      WHERE cc."tenantId" = t.id
        AND ca2."contestId" = co.id
        AND ca2."deletedAt" IS NULL
    )
  ) AS payload
  FROM tenant t
  JOIN events e
    ON e."tenantId" = t.id
   AND e."deletedAt" IS NULL
  JOIN contests co
    ON co."tenantId" = t.id
   AND co."eventId" = e.id
   AND co."deletedAt" IS NULL
  JOIN contest_data ctd
    ON ctd.contest_id = co.id
  WHERE ctd.categories_with_contestants >= 2
  ORDER BY e.name, co.name
  LIMIT 1
)
SELECT jsonb_pretty(
  jsonb_build_object(
    'generatedAt', NOW(),
    'tenant', (SELECT jsonb_build_object('id', id, 'slug', slug, 'name', name) FROM tenant),
    'singleCategoryScenario', (SELECT payload FROM single_category_suggestion),
    'multiCategoryScenario', (SELECT payload FROM multi_category_suggestion),
    'events', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', ed.event_id,
            'name', ed.event_name,
            'contests', ed.contests
          )
          ORDER BY ed.event_name
        ),
        '[]'::jsonb
      )
      FROM event_data ed
    )
  )
) AS payload;
SQL

echo "Exporting UAT IDs for tenant slug: ${TENANT_SLUG}"

PGPASSWORD="${DB_PASSWORD}" psql \
  -h "${DB_HOST}" \
  -p "${DB_PORT}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  -v ON_ERROR_STOP=1 \
  -tA \
  -c "${SQL}" > "${OUT_FILE}"

if [[ ! -s "${OUT_FILE}" || "$(tr -d '[:space:]' < "${OUT_FILE}")" == "null" ]]; then
  echo "No data exported. Check tenant slug or tenant data completeness." >&2
  exit 2
fi

echo "Wrote: ${OUT_FILE}"
