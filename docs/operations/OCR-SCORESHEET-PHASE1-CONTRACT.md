# OCR Scoresheet Phase 1 Contract

## Scope

This document defines the implementation contract for Phase 1 of [TASK-34](/srv/event-manager/dev/backlog/tasks/task-34%20-%20Add-scoresheet-image-import-into-verified-online-scoring-flow.md).

Phase 1 is intentionally limited to `scores-only` import.

Out of scope for Phase 1:

- handwritten comments extraction
- judge-signature extraction from paper
- automatic certification from uploaded paper
- automatic deductions extraction
- unattended final score acceptance without review

Deferred handwritten comments work is tracked separately in [TASK-95](/srv/event-manager/dev/backlog/tasks/task-95%20-%20Add-optional-handwritten-comments-extraction-for-scoresheet-imports.md).

## Why Phase 1 Is Scores-Only

Based on the sample packet in [DD_Scores copy.pdf](/srv/event-manager/dev/temp/DD_Scores%20copy.pdf:1):

- the scoresheet layout is highly regular
- criterion scores are represented by marks in a fixed grid
- totals are handwritten but can be recomputed from the marked grid
- handwritten comments are the least reliable extraction area

That makes Phase 1 a structured form-interpretation problem, not a general handwriting OCR problem.

## Current Application Write Contract

### Score rows

The current scoring write path persists one `Score` row per:

- `tenantId`
- `categoryId`
- `contestantId`
- `judgeId`
- `criterionId`

The live uniqueness rule is:

- `tenantId + categoryId + contestantId + judgeId + criterionId`

The score write path currently accepts:

- `categoryId`
- `contestantId`
- `criteriaId`
- `score`
- optional `comments`
- optional `representedJudgeId`

The backend then resolves:

- actual `judgeId`
- `entryMode`
- `delegationGrantId`
- `enteredByUserId`

That means OCR import should target staged draft values that eventually map into the same score-submit path rather than inventing a parallel scoring data model.

### Score files

The existing source-artifact path is `ScoreFile`.

Current upload contract:

- path: `/api/score-files`
- source artifact is retained with `pending` status by default
- current allowed upload types:
  - `image/jpeg`
  - `image/jpg`
  - `image/png`
  - `image/webp`
  - `image/gif`
  - `application/pdf`
  - `application/msword`
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - `application/vnd.ms-excel`
  - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
  - `text/csv`
  - `text/plain`
- current file size limit: `10 MB`

Phase 1 should attach imported score drafts to that existing score-file record or a directly related OCR draft record, not bypass file retention.

## Phase 1 Extraction Contract

### Required user-provided context

Phase 1 should not depend on OCR to identify everything on the page.

The uploader should provide or confirm:

- `categoryId`
- represented `judgeId`
- optionally `contestantId` if the upload is per contestant

The system may prefill these from the current scoring context when upload starts from a contestant scoring screen.

### Data Phase 1 should extract

Per uploaded scoresheet page, Phase 1 should extract:

- `templateId` or recognized sheet type
- sheet confidence or template-match status
- per-row criterion mark location
- resolved criterion score value per row
- optional detected handwritten total as a non-authoritative check value

### Data Phase 1 should derive

The system should derive, not trust OCR for:

- total numeric score
- criterion-to-row mapping after template alignment
- final persisted `Score` rows

The authoritative total should be recomputed from accepted criterion values after human review.

### Data Phase 1 should not extract

Phase 1 should not attempt to import:

- handwritten comments
- signature meaning
- certification intent
- deductions from free text
- contestant identity from handwriting

### Review model

Before any score rows are written, the review step must show:

- uploaded page preview
- detected sheet/template type
- each criterion name
- extracted numeric value for each criterion
- confidence or ambiguity flags where available
- recomputed total
- optional detected paper total for mismatch warning only

The reviewer must be able to:

- accept the extracted value
- correct any criterion value manually
- reject the import

## Recommended Template Assumption

Phase 1 should assume `template-driven extraction`, not unconstrained OCR.

For the provided sample:

- page size is letter portrait
- score columns are fixed from `6` through `0`
- criterion labels are printed
- marks are handwritten checkmarks or similar strokes
- comments occupy a separate lower block

That makes the most logical approach:

1. identify the sheet family
2. align the uploaded page to a stored template
3. inspect known cell regions
4. resolve which score column is marked for each criterion row
5. stage results for review

## Sample Packet Requirements

Phase 1 implementation should not proceed on a single PDF alone. The working sample packet should include:

- clean exported or scanned PDFs
- phone-photo images with mild skew
- phone-photo images with realistic lighting variance
- multiple filled sheets from the same template
- any alternate sheet layouts used across categories or contest segments
- examples of ambiguous or messy markings

For each sample, capture:

- event or tenant
- sheet type or category
- whether image or PDF
- whether the ground-truth score values are known
- whether the page includes comments

## Acceptance Target For Phase 1

Phase 1 should be considered viable if it can reliably:

- detect the correct template
- map each criterion row correctly
- resolve the intended marked score for each criterion
- flag low-confidence or conflicting marks for human correction
- avoid writing accepted scores without review

Phase 1 does not need to:

- transcribe handwritten prose comments
- eliminate all manual review
- certify anything automatically

## Known Implementation Gaps

### File-type gaps

Current score-file upload types do not include common scan formats such as:

- `image/tiff`
- `image/heif`
- `image/heic`

If real users are likely to upload scanner-native TIFFs or modern phone HEIC images, `TASK-34.3` should decide whether to:

- expand accepted upload types, or
- require client-side conversion before upload

### OCR is not the core Phase 1 primitive

For Phase 1, the primary extraction mechanism should probably be:

- template alignment
- region inspection
- mark detection

Generic OCR should be treated as optional support for printed headers, not the core scoring extractor.

### Upload context

If uploads can start outside a contestant scoring screen, the UI must require explicit context selection for:

- category
- represented judge
- contestant

Otherwise the importer will be forced to infer identity from sheet text, which is unnecessary and less reliable.

## Ownership By Follow-On Tasks

### TASK-34.3

Should own:

- template recognition strategy
- alignment and mark-detection backend
- any OCR provider or self-hosted engine integration
- OCR draft persistence model
- file-type expansion decisions if needed

### TASK-34.4

Should own:

- review UI
- correction workflow
- mismatch warnings
- acceptance into normal score submission flow

### TASK-34.5

Should own:

- measured extraction accuracy
- low-confidence review thresholds
- go/no-go rollout recommendation

### TASK-34.6

Should own:

- final recommendation on classic OCR versus hybrid or vision-model extraction
- whether Phase 1 remains template-first or shifts to another extraction family

## Recommended Phase 1 Decision

Proceed with a `scores-only`, `template-first`, `review-required` import path.

That means:

1. keep the uploaded page as a score-file artifact,
2. detect scores from the fixed grid,
3. ignore comments,
4. recompute totals,
5. require review before score creation,
6. leave certification behavior unchanged.
