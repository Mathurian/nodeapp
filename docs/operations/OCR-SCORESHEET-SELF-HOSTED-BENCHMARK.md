# Scoresheet Import Self-Hosted Benchmark

## Scope

This document records the `TASK-34.18` benchmark for preserving the current Education scoresheet while checking whether free or self-hosted extraction options can materially improve import reliability.

The benchmark intentionally does not change the production import path. It evaluates candidate extractors against the existing Education ground-truth packet:

- [DD_Scores copy.pdf](/srv/event-manager/dev/temp/DD_Scores%20copy.pdf:1)
- [route66-phase1-ground-truth.json](/srv/event-manager/dev/tests/examples/scoresheet-import/route66-phase1-ground-truth.json:1)
- [score-sheet-import-extractor-benchmark.js](/srv/event-manager/dev/scripts/ops/score-sheet-import-extractor-benchmark.js:1)

Run it with:

```bash
npm run test:scoresheet-import:benchmark
```

## Candidate Set

The repeatable harness compares:

- current production extractor using the standard normalized image
- fixed-template local OMR using the current ink scorer
- connected-component local OMR with printed-edge suppression
- CPU-local mark-classifier proxy using leave-one-page-out scoring
- free/self-hosted OCR/layout availability checks for Tesseract, PaddleOCR/PP-Structure, Surya, and docTR

Paid cloud services are intentionally excluded from the recommended production path.

## Environment Availability

Available locally:

- Node.js backend
- Sharp image normalization
- `pdftoppm` PDF rendering fallback

Not installed in this environment:

- Tesseract CLI
- PaddleOCR / PP-Structure Python package
- Surya OCR Python package
- docTR Python package
- OpenCV Python package

External tool references reviewed:

- Tesseract command-line OCR: https://tesseract-ocr.github.io/tessdoc/
- PaddleOCR PP-StructureV3: https://www.paddleocr.ai/latest/en/version3.x/pipeline_usage/PP-StructureV3.html
- Surya OCR/layout: https://github.com/datalab-to/surya
- docTR OCR: https://github.com/mindee/doctr
- OpenCV homography/form alignment: https://docs.opencv.org/4.x/d1/de0/tutorial_py_feature_homography.html
- OpenCV thresholding: https://docs.opencv.org/master/d7/d4d/tutorial_py_thresholding.html

## Measured Results

Corpus:

- `6` Education pages
- `60` score rows
- current score sheet format unchanged

| Candidate | Exact row match | Exact sheet match | Incorrect rows/page | Ambiguous rows/page | False high-confidence marks | Rejected rows | Runtime |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Current production extractor | `50.0%` | `0/6` | `5.00` | `0.33` | `12` | `3.3%` | `157.8ms` |
| Fixed-template local OMR using current ink score | `40.0%` | `0/6` | `6.00` | `1.17` | `1` | `11.7%` | `43.1ms` |
| Connected-component local OMR | `23.3%` | `0/6` | `7.67` | `3.33` | `3` | `33.3%` | `77.6ms` |
| CPU mark-classifier proxy | `25.0%` | `0/6` | `7.50` | `3.50` | `11` | `35.0%` | `15.7ms` |

No candidate reached a high-assurance threshold. The current extractor remains the highest exact-row performer, but it is still far below production reliability and emits too many false high-confidence wrong marks.

## OCR/Layout Candidate Result

The free/self-hosted OCR/layout candidates were not executable in this environment because the required binaries or Python packages are not installed.

More importantly, these tools are not direct replacements for the current mark detector:

- OCR can help read printed labels and sometimes recover page layout.
- OCR does not decide which handwritten score cell is marked.
- The hard production problem remains page registration plus score-cell mark classification.

That means a free OCR/layout fallback is not accurate enough to place behind tenant opt-in controls yet. A tenant opt-in fallback should wait until a complete self-hosted pipeline can score marks, reject unsupported uploads, and prove reliability on a representative corpus.

## Recommendation

Recommendation: do not proceed to production auto-submit or auto-certification from the current extraction family.

The best measured path is still the current production extractor, but it is not good enough to implement as the selected high-assurance path:

- `50.0%` exact row match is too low.
- `0/6` exact sheets means every page still needs human correction or rejection.
- `12` false high-confidence wrong marks is incompatible with skipping review.
- the small six-page corpus is not enough to certify any model or threshold.

For `TASK-34.19`, do not simply promote the current extractor. The next useful work should be one of:

1. add real form registration with OpenCV-style homography/template alignment, then rerun the benchmark;
2. collect a larger representative corpus of clean scans and real phone photos before training or calibrating a local classifier;
3. if preserving the current paper format remains mandatory, prototype a self-hosted registration-plus-mark-classifier service in isolation before touching the reviewed-draft workflow.

If those still do not materially improve accuracy, the reliable path will require either score-sheet form changes that add registration anchors/filled bubbles or staying with manual entry after rejected uploads.

## Operational Decision

For now:

- keep the reviewed-draft workflow for any scoresheet imports
- do not remove correction/review before certification
- do not enable tenant opt-in free OCR fallback
- keep paid cloud services out of the recommended production path
- require more corpus coverage before any assurance-band routing can be considered
