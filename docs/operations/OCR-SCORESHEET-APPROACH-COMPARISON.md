# Scoresheet Import Approach Comparison

## Scope

This document evaluates whether classic OCR is the best path for [TASK-34](/srv/event-manager/dev/backlog/tasks/task-34%20-%20Add-scoresheet-image-import-into-verified-online-scoring-flow.md), or whether another extraction family is more appropriate.

This comparison is grounded in:

- the live scoring and review workflow already in the application
- the provided sample packet in [DD_Scores copy.pdf](/srv/event-manager/dev/temp/DD_Scores%20copy.pdf:1)
- the business constraint that current usage is expected to remain under `1,000 pages/month`
- the current product decision to focus Phase 1 on `scores-only`

## Real Problem Shape From The Sample

The sample packet changes the evaluation materially.

What the sample shows:

- fixed portrait scoresheets with a highly regular printed layout
- score values represented by handwritten checkmarks in a fixed `6` through `0` grid
- handwritten totals that can be recomputed
- handwritten prose comments that are visibly harder to read than the score marks

That means the core Phase 1 task is not "read arbitrary handwriting from a document."

It is:

1. identify the sheet template,
2. align the page to known geometry,
3. detect which score cell is marked for each criterion row,
4. recompute the total,
5. stage the result for review.

That is a template interpretation problem first, and an OCR problem second.

## Approach Families

### 1. Classic OCR or document extraction

Examples:

- Azure AI Document Intelligence
- AWS Textract
- Google Document AI
- Mistral OCR
- PaddleOCR when used primarily as OCR or document parsing

Strengths:

- strong for printed field extraction
- good for structured document parsing
- managed services can return confidence and layout information
- some offerings include free tier or low-volume affordability

Weaknesses for this use case:

- generic OCR is not the most direct way to resolve checkmarks in a fixed score grid
- handwritten comments remain the accuracy bottleneck
- for a scores-only Phase 1, OCR may do more work than necessary and introduce extra ambiguity

Fit assessment:

- `good` for general document parsing
- `acceptable` for fixed printed labels
- `less optimal` than template-first mark detection for the specific score-grid problem

### 2. OCR plus LLM normalization

Examples:

- OCR text/layout extraction followed by an LLM that maps the result into a scoring schema

Strengths:

- can help normalize messy OCR output
- can help with ambiguous free-form comment text
- can produce structured JSON-like output from noisy text

Weaknesses for this use case:

- adds another probabilistic layer on top of OCR
- makes score extraction less deterministic
- increases audit complexity for a workflow that needs exact score values
- not necessary for a fixed grid if the target is scores-only

Fit assessment:

- `useful later` for comments or low-confidence fallback handling
- `not recommended` as the primary Phase 1 scoring extractor

### 3. Direct vision-language model extraction

Examples:

- Qwen2.5-VL
- PaddleOCR-VL
- other document-focused VLMs

Strengths:

- can understand layout and broader document context
- can localize content and emit structured outputs
- may help more than OCR on mixed visual tasks

Weaknesses for this use case:

- less deterministic for exact score-cell extraction than a template-first pipeline
- heavier operationally than a narrow score-grid detector
- harder to make auditable for exact scoring if the model is reasoning rather than detecting within fixed regions

Fit assessment:

- `promising` for later experiments or comments-heavy extraction
- `not the best first production foundation` for a fixed score grid

### 4. Template-first mark detection

Examples:

- page registration or alignment
- fixed region inspection per criterion row and score column
- checkmark or mark detection in known cells
- optional light OCR only for printed headers if needed

Strengths:

- cheapest runtime path when self-hosted
- most deterministic for the provided sample style
- directly aligned to the actual score-extraction problem
- avoids relying on handwriting OCR for the critical score values
- totals can be recomputed instead of trusting handwritten totals

Weaknesses:

- depends on stable template families
- sensitive to image quality, skew, cropping, and unusual markings
- requires template definitions per sheet family
- does not solve comments import

Fit assessment:

- `best Phase 1 fit`

## Managed, Free-Tier, and Self-Hosted Options

### Azure AI Document Intelligence

Why it still matters:

- technically the strongest managed OCR fit from the earlier evaluation
- free tier exists for `0 - 500 pages free per month`
- custom extraction and containers are available

Why it is not the Phase 1 first choice:

- the Phase 1 score-grid problem does not require general handwriting OCR for the main score values
- a template-first self-hosted path is more direct if comments are deferred

### AWS Textract

Useful benchmark:

- free tier for new accounts includes `1,000 pages/month` for Detect Document Text for three months and smaller free-tier allowances for Analyze Document features
- raw OCR pricing example is `0.0015 USD` per page
- structured forms plus tables examples are much higher than raw OCR

Why it is not the Phase 1 first choice:

- still more generic than needed for fixed-grid score extraction
- comments remain the hard part

### Google Document AI

Useful benchmark:

- public pricing examples show roughly `0.10 USD` for parsing a `1-10` page document and `1 USD` for a `91-100` page document
- supported file/page accounting includes `JPEG/JPG`, `PNG`, `BMP`, `HEIF`, `PDF`, and `TIFF`

Why it is not the Phase 1 first choice:

- stronger fit if we were optimizing for broader document parsing, not a fixed mark-detection task

### PaddleOCR

Why it matters:

- self-hosted
- supports structured outputs and broader document parsing
- explicitly positions itself as a lightweight OCR and document AI toolkit

Why it is not the sole answer:

- for the sample score-grid problem, even good self-hosted OCR is still not as direct as template-first mark detection
- it is more attractive as a helper or fallback component than as the core score-grid resolver

### TrOCR

Why it matters:

- has distinct printed and handwritten model checkpoints

Why it is not the Phase 1 first choice:

- it is a handwriting recognition path, which is more relevant to comments than to the fixed score grid

### Qwen2.5-VL and similar VLMs

Why they matter:

- can parse documents, analyze layout, and emit structured outputs

Why they are not the Phase 1 first choice:

- heavier and less deterministic than a narrow template-based score extractor
- better reserved for future experimentation or comments-heavy workflows

### Mistral OCR

Why it matters:

- supports images and PDFs
- returns confidence scores
- supports structured document content handling

Why it is not the Phase 1 first choice:

- still fundamentally a managed OCR path
- comments aside, Phase 1 score extraction does not need a general OCR engine as the primary primitive

## Cost Perspective Under 1,000 Pages Per Month

At this volume, managed OCR costs are not prohibitive.

Important implication:

- cost alone is no longer the main reason to avoid managed OCR
- the stronger reason to avoid managed OCR as the Phase 1 core is that it is not the cleanest technical fit for extracting score-grid marks from a fixed template

If the requirement is:

- `no external OCR charges beyond our own hosting/networking`

then template-first self-hosted extraction is the best match for Phase 1.

If the requirement later expands to:

- `import handwritten comments accurately too`

then the economics still remain manageable at this page volume, and a managed or hybrid path becomes much more reasonable.

## Recommendation

### Phase 1 recommendation

Use `template-first mark detection` as the primary extraction family.

Implementation shape:

1. upload scoresheet through the existing score-file path,
2. detect or select the sheet template,
3. align the page,
4. inspect fixed score cells,
5. resolve criterion scores,
6. recompute totals,
7. stage for human review,
8. write accepted values through the normal score submission path.

### What to avoid in Phase 1

Do not make these the primary extractor:

- generic OCR-only
- OCR plus LLM normalization
- direct VLM document reasoning

They may still have limited supporting roles, but they should not define the first shipped architecture for score-only import.

### Future use of OCR, LLM, or VLM

Reserve those for:

- handwritten comments extraction
- low-confidence fallback review aids
- alternate or messier sheet families that exceed what template-first extraction can handle

## Final Decision

`OCR is not the best primary path for Phase 1 scores-only import.`

The best Phase 1 path is:

- self-hosted
- template-first
- review-required
- scores-only

`OCR remains relevant`, but mainly as:

- a later comments-phase enabler,
- a fallback/helper component,
- or a managed-path alternative if Phase 1 broadens beyond structured grid extraction.

## Source Links

- Azure pricing: https://azure.microsoft.com/en-us/pricing/details/document-intelligence/
- AWS Textract pricing: https://aws.amazon.com/textract/pricing/
- Google Document AI pricing: https://cloud.google.com/document-ai/pricing
- PaddleOCR: https://github.com/PaddlePaddle/PaddleOCR
- TrOCR: https://github.com/microsoft/unilm/blob/master/trocr/README.md
- Qwen2.5-VL: https://qwenlm.github.io/blog/qwen2.5-vl/
- Mistral OCR: https://docs.mistral.ai/studio-api/document-processing/basic_ocr
