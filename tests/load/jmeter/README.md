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

`live_ids.csv` drives category/contestant/score IDs used by concurrent actions.

## Run examples

```bash
jmeter -n -t tests/load/jmeter/active-event-concurrency.jmx -l tests/load/jmeter/results.jtl
```

Override runtime values from CLI:

```bash
jmeter -n \
  -JbaseUrl=http://localhost:3000 \
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
