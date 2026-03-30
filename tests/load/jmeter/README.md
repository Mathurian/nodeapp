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

The checked-in CSV rows are placeholders only. They are intentionally non-runnable and must be replaced with real tenant-scoped data before any meaningful load run.


## Why are there multiple CSV files?

They serve **different concerns** and are intentionally separate:

- `judges.csv`, `tally.csv`, `auditors.csv`, `board.csv`, `admins.csv` = **who is logged in** (authentication identity per virtual user thread).
- `live_ids.csv` = **what record is being acted on** (target category/contestant/score/judge IDs in business workflows).

This is normal in load tests because one authenticated user may act on many different records over time, and many users may concurrently touch overlapping sets of records.

### Example

- A thread logs in as `judge1@example.com` from `judges.csv`.
- That thread iterates across many rows in `live_ids.csv` and submits/updates different scores.
- A tally/auditor/board thread (different credentials file) can use the same `live_ids.csv` rows to certify/verify/approve those records.

So this is **not duplicate data in different formats**; it is identity-vs-target separation.

### Could we collapse into one CSV?

Yes, but it makes role orchestration harder and less realistic. Keeping identity and target data separate lets you:

- scale each role independently (thread counts per role),
- reuse the same live event target set across roles,
- and refresh targets (`live_ids.csv`) without rotating account credentials.

## What is `live_ids.csv`?

`live_ids.csv` is the **live event entity map** used by JMeter threads for high-concurrency operations.

The JMeter plan reads these columns on each loop:

```csv
category_id,contestant_id,score_id,judge_id,criterion_id
```

### Column meanings

- `category_id`: Category being scored/certified.
- `contestant_id`: Contestant in that category.
- `score_id`: Existing score row to update/verify.
- `judge_id`: Judge tied to certification endpoints.
- `criterion_id`: Criterion attached to the score/commentary row.

### Where should this data come from?

Use data from the **same tenant and event** you are load-testing.

Prefer staging/UAT clone data. If you intentionally run against production, every CSV value and the `tenantSlug` JMX variable must come from that exact prod tenant and active event window.

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
  s."judgeId"      AS judge_id,
  s."criterionId"  AS criterion_id
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
- Ensure `score_id` is valid for the given `(category_id, contestant_id, judge_id, criterion_id)` tuple.
- For judge write paths, ensure each row's `judge_id` belongs to the authenticated judge account that will consume that row. If it does not, score updates will correctly return `403`.
- Avoid placeholder IDs (`cat-1`, `score-1`) outside local smoke checks.

### Minimal example (shape only)

```csv
category_id,contestant_id,score_id,judge_id,criterion_id
cm2abc123...,cm2con456...,cm2sc789...,cm2jd111...,cm2crit999...
cm2abc124...,cm2con457...,cm2sc790...,cm2jd222...,cm2crit998...
```

## Run examples

```bash
jmeter -n -t tests/load/jmeter/active-event-concurrency.jmx -l tests/load/jmeter/results.jtl
```

Override runtime values by editing **User Defined Variables** inside the JMX (`protocol`, `host`, `port`, `apiPrefix`, `tenantSlug`, thread counts, ramp, duration).

The checked-in JMX now defaults `tenantSlug` to `REQUIRED_TENANT_SLUG`. Set it explicitly before any real run.

Example production-like values:

- `protocol=https`
- `host=conmgr.com`
- `port=443`
- `tenantSlug=okckw`

Then run:

```bash
jmeter -n -t tests/load/jmeter/active-event-concurrency.jmx -l tests/load/jmeter/results.jtl
```

## Notes

- Endpoints target `/api/*` (legacy path) and are compatible with `/api/v1/*` if you change `apiPrefix`.
- Test plan sends `X-Tenant-Slug` for multi-tenant routing.
- Authentication in this plan is cookie-based (`access_token` cookie from `/auth/login`) using JMeter `HTTP Cookie Manager`; it does not require Bearer token headers.
- The plan fetches CSRF token from `${apiPrefix}/csrf-token` and sends it as `X-CSRF-Token` on mutating requests.
- Session bootstrap now runs once per virtual user. Repeating CSRF fetch + login inside the main loop will turn the public/auth rate limiters into the dominant bottleneck and will mostly measure edge protection, not the target business workflow.
- Write requests include the required `x-idempotency-key` header using JMeter's `${__UUID()}` function.
- Score submission includes `criterionId` from `live_ids.csv` and uses a conservative score of `1` to avoid fixture-dependent max-score noise.
- Judge commentary and score-update samplers now use only the score ID returned by that thread's preceding submit response. If submit does not return an ID, those follow-on samplers are skipped rather than falling back to a shared `live_ids.csv` score.
- Auditor verification uses the current API contract: `verified`, `comments`, and `issues`.
- Auditor final certification submit uses the current API contract: `confirmation1` and `confirmation2`.
- Auditor final certification is gated by the status endpoint so JMeter only submits when `readyForFinalCertification=true`.
- Checked-in CSV files are examples of required shape only; they do not represent valid accounts, tenants, or record IDs in any deployed environment.

## Interpreting failures

- `429`:
  - Expected if you intentionally run through the public hostname at a rate above the configured IP/user/tenant limits.
  - Unexpected noise if it comes mainly from `${apiPrefix}/csrf-token` or repeated login calls. The included plan now avoids that by bootstrapping the session once per virtual user.
- `400`:
  - Usually indicates stale or malformed fixture data.
  - Commentary requests now require `score_id`, `criterion_id`, `contestant_id`, and `comment`.
  - Auditor final certification will also return `400` if the category has not reached `readyForFinalCertification=true` yet.
- `403`:
  - Usually indicates the authenticated role is not allowed to perform the action on the supplied row.
  - The most common case during judge load is a thread trying to update a score owned by a different judge.
  - The included plan now avoids most of that noise by skipping judge commentary/update when the thread did not receive a fresh score ID from its own submit response.
- `404`:
  - Usually means the request is pointed at the wrong tenant or placeholder fixture data.
  - `Tenant not found` specifically means the `X-Tenant-Slug` value does not exist in the target environment.
