# OCR Scoresheet Reliability Policy

## Purpose

This document defines the automated reliability policy introduced for `TASK-34.9`.

It applies to the current Phase 1 scoresheet-import scope:

- `scores-only`
- `template-aware`
- `review-required`
- `Education` is the only currently calibrated template family

The machine-readable thresholds live at:

- [route66-phase1-thresholds.json](/srv/event-manager/dev/tests/examples/scoresheet-import/route66-phase1-thresholds.json:1)

The sample corpus lives at:

- [route66-phase1-ground-truth.json](/srv/event-manager/dev/tests/examples/scoresheet-import/route66-phase1-ground-truth.json:1)

## Regression Harness

The automated harness is:

- [score-sheet-import-regression.js](/srv/event-manager/dev/scripts/ops/score-sheet-import-regression.js:1)

Available commands:

- `npm run test:scoresheet-import:calibration`
- `npm run test:scoresheet-import:rollout`

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

It only means:

- Education has an automated regression policy,
- changes to that family can be measured repeatably,
- and the project now has a clear line between calibration progress and rollout readiness.

## Next Dependency

`TASK-34.10` remains the task that should decide whether the first supported template family is actually ready for rollout after:

- additional tuning if needed
- phone-photo sample collection
- UAT against realistic uploads
- comparison against delegated entry workload and failure handling
