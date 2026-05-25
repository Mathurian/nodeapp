# OCR Scoresheet Education UAT And Rollout Decision

## Scope

This document records the `TASK-34.10` UAT pass for the first supported Phase 1 scoresheet-import family:

- `education_saturday_day_v1`

Phase 1 scope remains:

- `scores-only`
- `template-aware`
- `review-required`
- using the existing contestant-scoped `score-file` upload flow
- scanner/PDF-first; real handset-photo support is not validated

## UAT Inputs

Source packet:

- [DD_Scores copy.pdf](/srv/event-manager/dev/temp/DD_Scores%20copy.pdf:1)
- expanded scanner corpus uploaded for `TASK-34.12` under `temp/scoresheet-corpus-intake/`

Ground truth:

- [route66-phase1-ground-truth.json](/srv/event-manager/dev/tests/examples/scoresheet-import/route66-phase1-ground-truth.json:1)
- [route66-2026-pet-education-scanner-ground-truth.json](/srv/event-manager/dev/tests/examples/scoresheet-import/route66-2026-pet-education-scanner-ground-truth.json:1)

Repeatable UAT harness:

- [score-sheet-import-uat.js](/srv/event-manager/dev/scripts/ops/score-sheet-import-uat.js:1)
- `npm run test:scoresheet-import:uat`

Upload profiles evaluated:

- `representative_scan`: the six clean Education pages rendered from the source PDF
- `synthetic_phone_photo_supported`: six locally generated phone-style variants with mild skew, light shadow, and JPEG compression
- `synthetic_phone_photo_borderline`: six locally generated borderline variants with stronger skew, darker lighting, mild blur, and tighter framing

Important limitation:

- no real handset photo set exists locally yet
- additional scanner PDFs exist, but they do not prove phone-photo, skewed-page, or poor-lighting reliability
- the phone-photo profiles above are synthetic proxies derived from the clean packet
- they are sufficient for a no-go recommendation, but not sufficient for production approval

## Measured Results

### Aggregate summary

| Upload profile | Exact row match | Avg incorrect rows / page | Avg ambiguous rows / page | Max total delta |
| --- | ---: | ---: | ---: | ---: |
| Clean PDF scan | `50.0%` | `5.00` | `0.33` | `11` |
| Phone-style mild skew and shadow | `46.7%` | `5.33` | `1.00` | `16` |
| Phone-style borderline lighting and skew | `53.3%` | `4.67` | `0.67` | `7` |

### Clean scan page detail

- page `1`: `4/10` exact rows, total `49/48`, incorrect rows `6`
- page `2`: `7/10` exact rows, total `57/58`, incorrect rows `3`
- page `3`: `7/10` exact rows, total `48/59`, incorrect rows `3`
- page `4`: `3/10` exact rows, total `52/56`, incorrect rows `7`
- page `5`: `6/10` exact rows, total `39/39`, incorrect rows `4`
- page `6`: `3/10` exact rows, total `52/57`, incorrect rows `7`

### Observations

- The calibrated Education extractor is materially better than the original generic baseline, but still far below rollout quality.
- Even on the cleanest scans, the reviewer must correct about half the criteria on average.
- The synthetic phone-style variants do not collapse completely, but they do not become reliable either.
- Page-level behavior is inconsistent. The same template family ranges from `3/10` exact rows to `8/10` exact rows depending on the sheet.
- Total recomputation remains untrustworthy enough that the uploader cannot treat it as a validation shortcut.

## Supported And Unsupported Conditions

### What should be treated as supported today

Only for internal calibration or supervised experimentation:

- full-page upright Education sheets
- clear scans or very clean uploads
- mandatory human review before any score acceptance
- operators who are prepared to correct multiple criteria manually
- uploads that pass the backend quality gate and are explicitly shown as reviewable drafts

### What should not be presented as supported to judges or operators

- self-service production use by judges
- any workflow that assumes upload review will be faster than delegated entry
- any workflow that trusts computed totals without row-by-row correction
- any phone-photo capture, because no real phone-photo corpus is available yet
- any use of handwritten comments extraction

### Backend quality gate

`TASK-34.14` adds a backend quality gate to every processed scoresheet-import draft. A draft is only usable for review when `extraction.qualityGate.decision` is `accepted_for_review` and the draft status is `processed`.

The backend rejects the upload into same-user manual-entry fallback when any blocking condition is present:

- the printed score grid cannot be anchored on both axes
- more than `1` row is ambiguous
- more than `3` rows are estimated to need manual correction
- overall extraction confidence is below the configured review floor
- contrast, darkness, or despeckle signals indicate a blank, too-dark, shadowed, or noisy upload

Rejected uploads are stored with status `rejected` plus diagnostic `qualityGate` and `reviewBurdenMetrics` metadata. They are not usable as review drafts.

### Attempt limit and manual fallback

Allow at most `2` import attempts for the same physical sheet. After two rejected or obviously low-quality attempts, stop retrying OCR and enter the scores manually in the same scoring context as the person attempting the upload.

Do not default this fallback to a delegate role. If the current actor is the judge, the judge manually enters the scores. If the current actor is an authorized delegate already acting for a judge, the same represented-judge context remains in force.

### When to fall back immediately

- the sheet is from any family other than `Education`
- the upload is cropped, shadowed across the grid, blurred, noticeably skewed, or photographed by phone
- the backend quality gate returns `manual_entry_required`
- the draft shows more than `1` ambiguous row
- the computed total differs visibly from the paper total
- the operator would need to correct multiple criteria anyway

## Review Burden Compared With Delegated Entry

Manual entry is already implemented and deterministic. For one Education scoresheet, the current authorized scorer enters `10` criterion scores once and can proceed through the established attribution and certification workflow.

The current OCR-assisted path requires:

1. upload the sheet,
2. process the draft,
3. review every extracted row,
4. correct roughly `5` rows on average,
5. verify the recomputed total,
6. then submit the corrected scores manually.

That is not a labor win. It is usually equal to or worse than direct manual entry, while also carrying extraction risk. Under current UAT results, OCR import does not outperform the shipped fallback.

## Final Rollout Recommendation

Recommendation: `No-Go` for production rollout of `education_saturday_day_v1`.

Reason:

- rollout regression already fails on the clean packet
- UAT still requires roughly half the rows to be corrected manually
- the current implementation does not beat delegated entry operationally
- no real handset-photo corpus exists yet for production approval

## Remaining Blockers

Before Education can be reconsidered for rollout:

1. Collect a real handset-photo UAT packet for Education, not only synthetic proxies.
2. Raise exact row match reliability materially above the current `46-53%` range.
3. Reduce review edits far below the current `4.67-5.33` incorrect rows per page.
4. Eliminate the current page-to-page inconsistency inside the same template family.
5. Complete the template versioning and recalibration workflow in [TASK-34.11](/srv/event-manager/dev/backlog/tasks/task-34.11%20-%20Define-template-versioning-and-recalibration-workflow-for-supported-scoresheet-imports.md).
6. Keep the quality gate enabled so weak uploads cannot become misleading review drafts.

## Operational Direction

For now:

- keep the scoresheet-import path as an internal calibration workflow only
- do not advertise it as a production upload feature
- continue using same-user manual entry as the fallback when uploads are rejected or review burden is too high
