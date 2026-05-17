# OCR Scoresheet Sample Corpus For Phase 1

## Purpose

This document packages the current sample corpus for `TASK-34.7` and defines the first supported template family for Phase 1 scoresheet-import reliability work.

The machine-readable ground-truth dataset lives at:

- [route66-phase1-ground-truth.json](/srv/event-manager/dev/tests/examples/scoresheet-import/route66-phase1-ground-truth.json:1)

## First Supported Phase 1 Family

The first family selected for production-calibration work is:

- `education_saturday_day_v1`

Reason:

- it has six locally available examples in the shared packet
- it already exposed the current detector failure clearly in `TASK-34.5`
- it includes useful marking variation across the same printed layout
- it is sufficient to build the first real calibration and regression harness before adding more families

The rest of the packet is inventoried below, but not yet in the first support scope.

## Local Packet Inventory

Source packet:

- [DD_Scores copy.pdf](/srv/event-manager/dev/temp/DD_Scores%20copy.pdf:1)

Observed page blocks in the packet:

- pages `1-6`: `Education`
- pages `7-12`: `Formal Wear & Speech`
- pages `13-18`: `Hot Wear & Pop-Question`
- pages `19-24`: `Personal Interview`
- pages `25-30`: `Public Image`

Current state of the local corpus:

- every currently observed sample is a `pdf_scan`
- no dedicated phone-photo capture set is available yet
- every page is `letter portrait`
- every page is a single front-side scoresheet with comments present below the score grid

## Ground-Truth Coverage Included Now

The JSON dataset currently includes criterion-level ground truth for:

- all six `Education` pages

For each page, the dataset records:

- page number
- contestant name
- judge name
- capture type
- mark-style notes
- visible handwritten total
- per-criterion expected score values in sheet order

This is enough for:

- template-family selection
- first-pass calibration work in `TASK-34.8`
- row-level extraction regression checks in `TASK-34.9`

It is not yet enough for:

- production rollout approval
- supported phone-upload guidance
- multi-family release support

## Supported Calibration Assumptions

The first supported family should be calibrated under these assumptions:

- full front-side page is visible
- page is upright in portrait orientation
- score grid is not cropped
- printed form lines are intact and readable
- each criterion has at most one intended marked score cell
- marks are dark enough to stand out from the printed grid
- manual review remains mandatory before score acceptance

## Unsupported Or Not-Yet-Supported Capture Conditions

These conditions should be treated as unsupported or out-of-scope until explicitly validated:

- phone photos with severe skew or perspective distortion
- glare or shadow crossing the score grid
- cropped pages missing any part of the score table
- blurred or low-light captures
- folded or obstructed pages
- multi-page batch images
- handwritten comments extraction
- automatic judge certification from paper

## Additional Samples Still Required

Before reconsidering rollout for `education_saturday_day_v1`, collect at minimum:

- `6` representative phone-photo captures of the Education sheet
- `3` borderline-but-usable captures to define the support boundary
- `4` more marking-variation examples across the same sheet family

Those additions should include:

- mild skew
- realistic room lighting variance
- different pen pressure and stroke styles
- more than one judge and contestant combination

## How Follow-On Tasks Should Use This Corpus

`TASK-34.8` should use this corpus to:

- replace the current generic detector with explicit `education_saturday_day_v1` support
- calibrate row mapping and score-column windows against the recorded ground truth
- verify that false-positive behavior from `TASK-34.5` is materially reduced

`TASK-34.9` should use this corpus to:

- compute row-level exact-match accuracy
- detect regressions against the six Education pages
- define release thresholds before adding more families

## Recommendation

Do not widen scope yet.

The correct next step is:

- make `Education` reliable first
- add phone-photo validation for that one family
- only then decide whether to extend support to `Formal Wear & Speech`, `Hot Wear & Pop-Question`, `Personal Interview`, and `Public Image`
