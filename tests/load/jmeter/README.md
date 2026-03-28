# JMeter Active Event Concurrency Plan

This folder contains a JMeter test plan to simulate a live event where multiple roles perform actions concurrently:

- Judges submit scores and commentary.
- Tally Master certifies judge and contestant scores.
- Auditors verify scores and submit final certifications.
- Board members process pending approvals and submit board certification.
- Admin/Organizer users monitor and run low-frequency operations.

## Files

- `active-event-concurrency.jmx` — primary JMeter test plan.
- `data/*.csv` — role datasets and runtime IDs.

## Required CSV data

Update these files before execution:

- `data/judges.csv`
- `data/tally.csv`
- `data/auditors.csv`
- `data/board.csv`
- `data/admins.csv`
- `data/live_ids.csv`

## What is `live_ids.csv`?

`live_ids.csv` is the **live event entity map** used by JMeter threads for high-concurrency operations.

The JMeter plan reads these columns on each loop:

```csv
category_id,contestant_id,score_id,judge_id
```

### Column meanings

- `category_id`: Category being scored/certified.
- `contestant_id`: Contestant in that category.
- `score_id`: Existing score row to update/verify.
- `judge_id`: Judge tied to certification endpoints.

### Where should this data come from?

Use data from the **same tenant and event** you are load-testing (staging/UAT clone, not production).

Good sources:

1. **Test-event setup flow / seeded fixture data** created for your load run.
2. **Database export/query** from the target tenant right before test execution.
3. **Pre-test API discovery script** that fetches categories/contestants/scores and writes CSV.

### How to build it (DB query example)

Use a tenant-scoped query to build realistic pairs. Example PostgreSQL query:

```sql
SELECT
  s."categoryId"   AS category_id,
  s."contestantId" AS contestant_id,
  s.id              AS score_id,
  s."judgeId"      AS judge_id
FROM scores s
JOIN categories c ON c.id = s."categoryId"
WHERE s."tenantId" = '<TENANT_ID>'
  AND c."deletedAt" IS NULL
LIMIT 5000;
```

Export that result to CSV and save it to `tests/load/jmeter/data/live_ids.csv`.

### Data quality rules (important)

- Keep all IDs from **one tenant** only.
- Prefer IDs from the **active event window** (the event/contests you are simulating).
- Provide enough unique rows for your concurrency level (at least 10x thread count is a good baseline).
- Ensure `score_id` is valid for the given `(category_id, contestant_id, judge_id)` pair.
- Avoid placeholder IDs (`cat-1`, `score-1`) outside local smoke checks.

### Minimal example (shape only)

```csv
category_id,contestant_id,score_id,judge_id
cm2abc123...,cm2con456...,cm2sc789...,cm2jd111...
cm2abc124...,cm2con457...,cm2sc790...,cm2jd222...
```

## Run examples

```bash
jmeter -n -t tests/load/jmeter/active-event-concurrency.jmx -l tests/load/jmeter/results.jtl
```

Override runtime values from CLI:

```bash
jmeter -n \
  -Jprotocol=http \
  -Jhost=localhost \
  -Jport=3000 \
  -JtenantSlug=dev-tenant \
  -JtestDurationSecs=1800 \
  -JrampUpSecs=120 \
  -JjudgeThreads=120 \
  -JtallyThreads=20 \
  -JauditorThreads=20 \
  -JboardThreads=16 \
  -JadminThreads=14 \
  -t tests/load/jmeter/active-event-concurrency.jmx \
  -l tests/load/jmeter/results.jtl
```

## Notes

- Endpoints target `/api/*` (legacy path) and are compatible with `/api/v1/*` if you change `apiPrefix`.
- Test plan sends `X-Tenant-Slug` for multi-tenant routing.
- Write requests include `Idempotency-Key` headers using JMeter's `${__UUID()}` function.
