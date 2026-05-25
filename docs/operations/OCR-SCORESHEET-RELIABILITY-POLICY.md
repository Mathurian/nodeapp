# OCR Scoresheet Reliability Policy

## Purpose

This document defines the automated reliability policy introduced for `TASK-34.9`.

It applies to the current Phase 1 scoresheet-import scope:

- `scores-only`
- `template-aware`
- `review-required`
- `Education` is the only currently calibrated template family
- scanner/PDF-first; real phone-photo capture is not approved

The machine-readable thresholds live at:

- [route66-phase1-thresholds.json](/srv/event-manager/dev/tests/examples/scoresheet-import/route66-phase1-thresholds.json:1)

The sample corpus lives at:

- [route66-phase1-ground-truth.json](/srv/event-manager/dev/tests/examples/scoresheet-import/route66-phase1-ground-truth.json:1)

## Regression Harness

The automated harness is:

- [score-sheet-import-regression.js](/srv/event-manager/dev/scripts/ops/score-sheet-import-regression.js:1)
- [score-sheet-import-uat.js](/srv/event-manager/dev/scripts/ops/score-sheet-import-uat.js:1)

Available commands:

- `npm run test:scoresheet-import:calibration`
- `npm run test:scoresheet-import:rollout`
- `npm run test:scoresheet-import:uat`

Both commands build the backend and then evaluate supported templates against the shared ground-truth packet.

## Two Modes

The harness intentionally supports two modes.

### Calibration mode

Calibration mode answers:

- has the extractor materially improved,
- is the currently supported template family still behaving within the expected calibration envelope,
- and did a code change regress the first calibrated family.

Calibration mode is the current development gate.

### Rollout mode

Rollout mode answers:

- is the supported template family reliable enough to consider real operational rollout,
- and is the current extractor good enough to compete with delegated entry as a practical workflow.

Rollout mode is intentionally stricter than calibration mode.

At the current project state, calibration mode is expected to pass for the Education family, while rollout mode is expected to fail until more tuning and UAT are complete.

## Current Thresholds

### Education calibration thresholds

- minimum exact row match rate: `50%`
- maximum page total delta: `25`
- maximum ambiguous rows per page: `4`

These thresholds are not a release target. They exist to ensure the Education template stays materially better than the original generic-detector baseline from `TASK-34.5`.

### Education rollout thresholds

- minimum exact row match rate: `90%`
- maximum page total delta: `5`
- maximum ambiguous rows per page: `1`

These are the blocking thresholds for considering the Education family operationally reliable enough for rollout review.

## Failure Policy

The harness should fail when any supported template family violates its active mode thresholds.

That includes:

- overall exact row match rate below threshold
- any page total delta above threshold
- any page ambiguous-row count above threshold
- unsupported or misconfigured template families that cannot be evaluated

## Capture-Quality Gate

The runtime import path uses a backend quality gate in addition to the regression thresholds. The gate is intentionally conservative: it blocks uploads that would otherwise create misleading review drafts.

The draft status is:

- `processed` when the upload passes the gate and can be reviewed row by row
- `rejected` when the upload is supported in principle but fails capture-quality gates
- `failed` when processing cannot complete or the template is unsupported

Rejected drafts keep diagnostic extraction metadata for troubleshooting, but they are not usable as score-review drafts. Operators may retry with a clearer scanner PDF up to `2` attempts for the same physical sheet. After that, the current attempting user should enter scores manually in the same scoring context.

The gate records:

- `qualityGate`: decision, blocking reasons, retryability, attempt limit, and manual-entry owner
- `reviewBurdenMetrics`: row count, ambiguous rows, low-confidence rows, missing scores, estimated correction rows, and warning count

## V3 Machine-Readable Direction

`TASK-34.27` through `TASK-34.31` pivot the high-assurance path away from the current handwritten-mark sheet and toward a machine-readable sheet with fixed anchors, explicit score bubbles, and an ignored commentary region.

The original v2 contract is:

- [OCR-SCORESHEET-V2-MACHINE-READABLE-CONTRACT.md](/srv/event-manager/dev/docs/operations/OCR-SCORESHEET-V2-MACHINE-READABLE-CONTRACT.md:1)

The approved implementation target is now `education_omr_v3`, which keeps the v2 machine-readable requirements and adds a judge commentary box below the score grid. Import reads only the anchored score grid and records the commentary block as an ignored region.

The current v1 extractor remains useful only as a review-required/manual-fallback calibration path. V3 work is evaluated separately so v1/current sheets are never accidentally given v3 assurance bands.

## V3 Assurance Bands

The v3 thresholds live in the shared threshold packet under `machineReadableThresholds.education_omr_v3`:

- review-required band:
  - exact row match rate at least `98%`
  - exact sheet match rate at least `95%`
  - false high-confidence marks exactly `0`
  - unexpected rejected rows exactly `0`
- auto-submit band:
  - exact row match rate `100%`
  - exact sheet match rate `100%`
  - false high-confidence marks exactly `0`
  - unexpected rejected rows exactly `0`
  - rejected rows on otherwise accepted sheets exactly `0`
  - at least `30` real scanner sheets in evidence
- auto-certify band:
  - all auto-submit thresholds
  - at least `100` real scanner sheets in evidence
  - operational UAT evidence present

Auto-certification is disabled unless the auto-certify band is met. Synthetic generated samples alone are not enough to enable auto-submit or auto-certification.

## Current V3 Validation Result

`TASK-34.30` added v3 synthetic validation to the regression harness. The current synthetic v3 evidence reports:

- exact row match: `100%`
- exact sheet match: `100%`
- rejected rows: `2`, both expected challenge rows
- unexpected rejected rows: `0`
- false high-confidence marks: `0`
- total delta sum: `0`
- manual-entry comparison: `2/40` rows need attention, a `95%` row-reduction estimate versus same-user manual entry

Current guidance:

- `GO` for controlled review-required v3 UAT.
- `NO-GO` for auto-submit.
- `NO-GO` for auto-certification.

The blocker is evidence quality, not the synthetic v3 result: no real marked scanner samples exist yet for the v3 form.

## Operational Meaning

Passing calibration mode means:

- the calibrated Education extractor is still working inside its current development envelope
- regressions should be investigated before more template work proceeds

Passing rollout mode would mean:

- the Education family is strong enough to move into UAT and rollout review with serious confidence

Failing rollout mode today is expected and should not be treated as a bug by itself.

## Current Boundary

This policy does not mean:

- all scoresheet families are supported
- phone-photo uploads are validated
- handwritten comments are supported
- OCR import is ready to replace delegated entry operationally
- v1/current sheets qualify for auto-submit or auto-certification

It only means:

- Education has an automated regression policy,
- changes to that family can be measured repeatably,
- and the project now has a clear line between calibration progress and rollout readiness.

## Current Rollout Status

`TASK-34.10` completed the first Education-family UAT pass and the result is still `No-Go` for production rollout.

See:

- [OCR-SCORESHEET-UAT-EDUCATION.md](/srv/event-manager/dev/docs/operations/OCR-SCORESHEET-UAT-EDUCATION.md:1)

The next architecture and operations dependency is:

- [TASK-34.30](/srv/event-manager/dev/backlog/tasks/task-34.30%20-%20Validate-v3-scoresheet-assurance-and-rollout-policy.md:1)
