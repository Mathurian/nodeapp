# Scoresheet Import Calibration And Rollout Decision

## Status

This document records the pre-UAT calibration baseline from `TASK-34.5`.

The final Education-family UAT and rollout decision now lives at:

- [OCR-SCORESHEET-UAT-EDUCATION.md](/srv/event-manager/dev/docs/operations/OCR-SCORESHEET-UAT-EDUCATION.md:1)

Current final recommendation after `TASK-34.10`:

- `No-Go` for production rollout of `education_saturday_day_v1`
- continue using delegated entry as the operational fallback

The sections below are kept as the historical calibration baseline that led into the later UAT pass.

## Scope

This document records the Phase 1 calibration outcome for [TASK-34](/srv/event-manager/dev/backlog/tasks/task-34%20-%20Add-scoresheet-image-import-into-verified-online-scoring-flow.md).

Phase 1 scope remains:

- `scores-only`
- `template-first`
- `review-required`
- using the existing `score-file` workflow

The purpose of this calibration pass was to determine whether the current implementation is ready for production rollout or whether delegated entry should remain the primary operational fallback.

## Sample Set Used

Primary sample packet:

- [DD_Scores copy.pdf](/srv/event-manager/dev/temp/DD_Scores%20copy.pdf:1)

Rendered baseline pages used for calibration:

- `/tmp/dd_scores_cal-01.png`
- `/tmp/dd_scores_cal-02.png`
- `/tmp/dd_scores_cal-03.png`
- `/tmp/dd_scores_cal-04.png`
- `/tmp/dd_scores_cal-05.png`
- `/tmp/dd_scores_cal-06.png`

Important observation:

- the packet is not a single sheet family
- it includes multiple scoresheet layouts or categories
- at least pages `1` and `2` are the same `Education` family
- later pages include different sheet structures and criterion sets

That means any production solution needs template-family awareness, not one generic row map.

Coverage limitation:

- the available packet is sufficient to support a `no-go` decision because the current detector is already materially wrong on the shared sample family
- a dedicated phone-photo sample set was not available for this pass
- rollout should not be reconsidered until template-family calibration is repeated on both clean scans and phone-photo captures

## Current Detector Baseline

The current `ScoreSheetImportService` pipeline is structurally working:

- upload source file
- render and normalize page
- create a staged import draft
- emit per-row extracted values with confidence and ambiguity indicators

However, the calibration baseline shows that the current extraction is not accurate enough for production use.

### Measured behavior on sample pages

Detector sweep across pages `1` through `6` produced:

- page 1 computed total: `1`
- page 2 computed total: `1`
- page 3 computed total: `13`
- page 4 computed total: `24`
- page 5 computed total: `25`
- page 6 computed total: `13`

Overall confidence remained low:

- page 1: `0.120`
- page 2: `0.098`
- page 3: `0.153`
- page 4: `0.211`
- page 5: `0.178`
- page 6: `0.121`

### Manual ground-truth comparison

For the two clearly readable `Education` sheets:

Page `1` visible total on paper:

- `48`

Page `2` visible total on paper:

- `58`

Current detector result for both pages:

- `1`

That is not a small miss. It is a structural extraction failure.

### Important failure mode

The current detector also shows false confidence on wrong values.

Example pattern observed:

- `Appropriate Attire` was repeatedly extracted as score `1`
- confidence sometimes looked comparatively strong
- but the visible mark placement on the page does not support that extracted value

This means the current confidence signal is not yet trustworthy enough to serve as a rollout gate by itself.

## Root Causes Identified

### 1. Template-family mismatch

The current implementation uses a generic fixed grid assumption.

The sample packet contains multiple distinct scoresheet families, so one generic row map is insufficient.

### 2. Weak page alignment

The current normalization step finds page bounds, but it does not yet robustly anchor the actual score grid using form structure.

That causes cell windows to drift relative to the true mark positions.

### 3. Mark detection is too naive

The current detector uses cell-region signal scoring, but it still confuses:

- form lines,
- label ink,
- page artifacts,
- and actual score marks.

### 4. Category criteria are not enough by themselves

Even when the category criteria are known, the extraction still needs:

- correct template family,
- correct row-to-criterion alignment,
- and reliable score-column localization.

## Review Threshold Recommendation

Until the detector is materially better, production review rules should be strict.

Recommended rules:

- any row marked `ambiguous` requires manual correction
- any import draft with `overallConfidence < 0.85` should be treated as untrusted
- any import where the recomputed total visibly conflicts with the paper total should be treated as untrusted
- any import with more than `1` ambiguous row should not be considered time-saving enough to replace ordinary manual delegated entry

Under the current calibration baseline, those rules would cause nearly every sample page to require essentially full manual review.

## Go / No-Go Decision

Current recommendation: `No-Go for production rollout`.

Reason:

- the implemented pipeline is architecturally correct for Phase 1
- but extraction accuracy is not yet good enough to provide reliable operational value
- on the shared `Education` sheet family, the baseline result is materially wrong
- later pages also show that a single generic detector is not enough for the mixed sample packet

## Operational Recommendation

For now, `delegated entry` should remain the primary fallback for unavailable judges.

The Phase 1 scoresheet import path can continue as:

- a prototype,
- a tuning branch,
- or a limited internal experiment,

but it should not be presented as a production-ready workflow yet.

## What Would Need To Change Before Reconsidering Rollout

At minimum:

1. Define explicit template families per sheet type.
2. Add stronger grid anchoring or alignment against form structure.
3. Calibrate row windows and column windows against real examples for each template family.
4. Re-run accuracy checks against a broader sample set including:
   - clean scans
   - phone photos
   - multiple judges
   - multiple templates
5. Demonstrate materially better exact-match row accuracy on representative sheets before rollout review.

## Suggested Success Criteria For Revisit

Before reconsidering rollout, target something like:

- at least `90%` exact row-level score extraction accuracy on representative samples within a template family
- no persistent high-confidence false positives of the kind seen in the current baseline
- enough real-world performance improvement that the review step is faster than ordinary delegated entry for the same sheet

## Final Recommendation

`TASK-34` should not be treated as ready for production release at this time.

The practical answer today is:

- keep the implemented scoresheet import path as an internal or experimental workflow,
- continue using delegated entry as the real fallback,
- only revisit rollout after template-specific calibration materially improves extraction accuracy.
