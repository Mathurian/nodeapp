# Scoresheet Import Self-Hosted Benchmark

## Scope

This retained summary records the `TASK-34.18`, `TASK-34.25`, and `TASK-34.26` scoresheet extraction evaluations, plus a follow-up viability screen for DOTS.mOCR and IBM Granite Docling 258M.

The goal is to preserve the current Education scoresheet while checking whether free or self-hosted extraction options can materially improve import reliability enough to reduce or remove review before certification. The benchmark work did not change the production import path, reviewed-draft workflow, or paper format.

After the cleanup request, only this summary document remains from the evaluation test implementation:

- generated benchmark npm scripts were removed from `package.json`
- generated benchmark/setup runner scripts were removed from `scripts/ops`
- generated temp benchmark outputs were removed from `temp`
- evaluation Python virtual environments and model caches were removed from `/tmp`, `/home/mat/.cache`, and `/home/mat/.paddlex`
- system packages installed for the evaluation were removed

Backlog task records remain as project history and should continue to be managed only through the Backlog CLI.

## Candidate Set

The completed evaluation compared:

- current production extractor using the standard normalized image
- fixed-template local OMR using the current ink scorer
- connected-component local OMR with printed-edge suppression
- CPU-local mark-classifier proxy using leave-one-page-out scoring
- installed free/self-hosted OCR/layout contenders: Tesseract, PaddleOCR/PP-Structure, Surya, docTR, and DocStrange

DOTS.mOCR and IBM Granite Docling 258M were not installed after cleanup. They were screened from primary project/model documentation for fit, hosting burden, license posture, and whether they plausibly solve the score-cell mark classification problem.

Paid cloud services are intentionally excluded from the recommended production path.

## Environment Availability

The following versions were installed during the evaluation, then removed during cleanup:

- Tesseract `5.3.4` from Ubuntu packages
- docTR `python-doctr 1.0.1`
- Surya `surya-ocr 0.17.1`
- PaddleOCR `3.5.0` and PaddlePaddle `3.3.1`
- DocStrange `docstrange 1.1.8`, whose CLI reported `docstrange v1.1.5`

Measured local footprint before cleanup:

- `/tmp/scoresheet-selfhosted`: `4.1G`
- `/home/mat/.cache/datalab`: `1.5G`
- `/home/mat/.cache/doctr`: `124M`
- `/home/mat/.paddlex`: `85M`
- `/tmp/scoresheet-docstrange`: `2.2G` during the DocStrange evaluation

The generated scripts, npm aliases, benchmark output directories, Python environments, model caches, and evaluation system packages are intentionally not retained. This document is the retained record.

External tool references reviewed:

- Tesseract command-line OCR: https://tesseract-ocr.github.io/tessdoc/
- PaddleOCR PP-StructureV3: https://www.paddleocr.ai/latest/en/version3.x/pipeline_usage/PP-StructureV3.html
- Surya OCR/layout: https://github.com/datalab-to/surya
- docTR OCR: https://github.com/mindee/doctr
- DocStrange: https://github.com/NanoNets/docstrange
- DOTS.mOCR: https://github.com/rednote-hilab/dots.mocr
- DOTS.mOCR license agreement: https://raw.githubusercontent.com/rednote-hilab/dots.mocr/main/dots.mocr%20LICENSE%20AGREEMENT
- IBM Granite Docling 258M: https://huggingface.co/ibm-granite/granite-docling-258M
- OpenCV homography/form alignment: https://docs.opencv.org/4.x/d1/de0/tutorial_py_feature_homography.html
- OpenCV thresholding: https://docs.opencv.org/master/d7/d4d/tutorial_py_thresholding.html

## Measured Results

Corpus:

- `6` Education pages
- `60` score rows
- current score sheet format unchanged

Baseline local candidates from `TASK-34.18`:

| Candidate | Exact row match | Exact sheet match | Incorrect rows/page | Ambiguous rows/page | False high-confidence marks | Rejected rows | Runtime |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Current production extractor | `50.0%` | `0/6` | `5.00` | `0.33` | `12` | `3.3%` | `157.8ms` |
| Fixed-template local OMR using current ink score | `40.0%` | `0/6` | `6.00` | `1.17` | `1` | `11.7%` | `43.1ms` |
| Connected-component local OMR | `23.3%` | `0/6` | `7.67` | `3.33` | `3` | `33.3%` | `77.6ms` |
| CPU mark-classifier proxy | `25.0%` | `0/6` | `7.50` | `3.50` | `11` | `35.0%` | `15.7ms` |

No candidate reached a high-assurance threshold. The current extractor remains the highest exact-row performer, but it is still far below production reliability and emits too many false high-confidence wrong marks.

Installed self-hosted contenders from `TASK-34.25` and `TASK-34.26`:

| Candidate | Status | Exact row match | Exact sheet match | Incorrect rows/page | Ambiguous rows/page | False high-confidence marks | Rejected rows | Failure rate | Runtime |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Tesseract OCR mark-token mapping | Available | `3.3%` | `0/6` | `9.67` | `8.83` | `5` | `88.3%` | `0.0%` | `10.6s` |
| docTR OCR mark-token mapping | Available | `6.7%` | `0/6` | `9.33` | `8.83` | `3` | `88.3%` | `0.0%` | `154.7s` |
| PaddleOCR / PP-Structure | Blocked | n/a | n/a | n/a | n/a | n/a | n/a | n/a | `1.8s` diagnostic |
| Surya OCR/layout | Blocked | n/a | n/a | n/a | n/a | n/a | n/a | n/a | `120.5s` diagnostic timeout |
| DocStrange local OCR/layout | Blocked | n/a | n/a | n/a | n/a | n/a | n/a | n/a | `27.0s` internal CPU diagnostic |

## OCR/Layout Candidate Result

Tesseract and docTR were executable against the full six-page Education corpus. Both were far worse than the current extractor because OCR output does not reliably identify handwritten score-cell marks.

PaddleOCR / PP-Structure is blocked because `import paddle` crashes with a fatal illegal-instruction fault in the installed `paddlepaddle 3.3.1` CPU runtime on this host.

Surya is blocked as operationally impractical on this CPU-only host. With `surya-ocr 0.17.1`, CPU PyTorch, and `transformers==4.57.1`, the benchmark one-page diagnostic reached text recognition but did not complete within the 120 second cap. A separate manual one-page run reached `39/40` recognition items after almost six minutes and still had to be stopped.

DocStrange is blocked for self-hosted use on this host:

- Its public local mode requires a CUDA GPU. `DocumentExtractor(gpu=True)` fails immediately when no GPU is available.
- Its default mode is cloud processing, which was not used for this benchmark because the evaluation is limited to self-hosted processing and the scoresheet corpus should not be uploaded to a third-party service without explicit approval.
- The package's internal local CPU OCR path was tested through `ImageProcessor` with caches isolated under `/tmp/scoresheet-docstrange`; it crashes before returning one page with a native `SIGILL`/invalid-opcode fault in `libtorch_cpu.so`.
- Because it never returned page OCR/layout output locally, no score-row metrics are defensible.

More importantly, these tools are not direct replacements for the current mark detector:

- OCR can help read printed labels and sometimes recover page layout.
- OCR does not decide which handwritten score cell is marked.
- The hard production problem remains page registration plus score-cell mark classification.

That means a free OCR/layout fallback is not accurate enough to place behind tenant opt-in controls yet. A tenant opt-in fallback should wait until a complete self-hosted pipeline can score marks, reject unsupported uploads, and prove reliability on a representative corpus.

## Additional Viability Screen

### DOTS.mOCR

DOTS.mOCR is a 3B-parameter multimodal OCR/document parsing model. Its project documentation describes layout detection, text recognition, formula/table extraction, SVG parsing, and structured document output. The documented deployment path strongly leans toward GPU/vLLM: the README recommends vLLM deployment, shows CUDA device usage for serving, and the Hugging Face example uses Flash Attention, `torch.bfloat16`, `device_map="auto"`, and `trust_remote_code`.

Viability for this scoresheet effort: low as an immediate contender.

Reasons:

- it is a document parser, not a score-cell mark classifier
- the runtime is materially heavier than the current CPU-only host profile
- production use would need model-serving operations, GPU planning, cache management, and dependency/security maintenance
- the model license posture is not just a simple repository MIT badge; the repo also includes a model-specific agreement with acceptable-use, privacy, attribution, jurisdiction, and version-migration terms that need legal review
- even if it parsed printed grid structure well, we would still need a separate registered-cell mark scorer before considering review removal

Recommendation: do not install/run DOTS.mOCR next on this host unless GPU capacity is available and the goal is explicitly broadened to document parsing research. It is lower priority than a purpose-built registration-plus-mark classifier and lower priority than Granite Docling for a lightweight document VLM proof of concept.

### IBM Granite Docling 258M

IBM Granite Docling 258M is a much smaller image-to-text document conversion model. The model card lists Apache-2.0 licensing, Docling integration, full-page-to-DocTags/Markdown conversion, table/code/equation extraction, and standard Transformers usage. Its example chooses CUDA when available and CPU otherwise, so it is a more plausible future self-hosted CPU/GPU proof of concept than DOTS.mOCR.

Viability for this scoresheet effort: medium for future layout/text research, low as a direct import-accuracy solution.

Reasons:

- Apache-2.0 licensing is cleaner for commercial self-hosting than contenders with GPL or custom model terms
- 258M parameters is operationally more realistic than 3B-class document VLMs
- Docling integration and DocTags output could be useful for printed labels, tables, and page structure
- it still converts document images; it does not directly classify handwritten marks in fixed score cells
- CPU inference may be slow, and a proper test would still need isolated model download/cache handling and corpus scoring

Recommendation: if another self-hosted model proof of concept is approved, Granite Docling 258M is the better first candidate of these two. Treat it as an isolated layout/text experiment, not as a candidate for auto-certification or review removal until it is paired with explicit form registration and mark classification.

## Hosting And Operational Risk

| Contender | Measured version | License posture | Runtime/cache before cleanup | Offline viability | Operational risk |
| --- | --- | --- | --- | --- | --- |
| Tesseract | `5.3.4` from Ubuntu packages | Apache-2.0 | Small system package, CPU-only | Good after package install | Easy to host, but OCR tokens do not solve handwritten score-cell mark classification and measured accuracy is unusable. |
| docTR | `python-doctr 1.0.1` with CPU PyTorch | Apache-2.0 | Python venv under `/tmp/scoresheet-selfhosted`; docTR cache about `124M`; full self-hosted root about `4.1G` including all venvs | Works after model cache is populated | Completes on CPU but is slow, emits unsupported NNPACK hardware warnings, and still needs separate mark classification. |
| PaddleOCR / PP-Structure | `paddleocr 3.5.0`, `paddlepaddle 3.3.1` | Apache-2.0 | Python venv plus attempted model cache about `85M` | Not proven because runtime fails | Current CPU wheel is incompatible with this host; production would need a compatible CPU build, container image, or different CPU target before scoring can begin. |
| Surya | `surya-ocr 0.17.1` with CPU PyTorch | GPL-3.0-or-later | Python venv plus Datalab model cache about `1.5G`; requires `transformers==4.57.1` pin | Only after large model cache, but not practical here | GPL license review required, large model footprint, dependency pinning, and CPU inference does not complete in a practical window. |
| DocStrange | `docstrange 1.1.8` package, CLI prints `1.1.5` | MIT | Python venv plus docling/EasyOCR model caches under `/tmp/scoresheet-docstrange`, about `2.2G` after install and one-page diagnostics | Public local mode requires CUDA GPU; internal CPU path is not usable here | Default mode is cloud, public local API is GPU-only, internal CPU route traps in `libtorch_cpu.so`, and output would still be OCR/layout rather than score-cell mark classification. |
| DOTS.mOCR | Not installed after cleanup | MIT repo plus model-specific agreement | Not measured locally; docs point to GPU/vLLM-oriented deployment | Not proven locally | Heavy 3B-class VLM stack, custom model agreement review, and still not a direct score-cell mark classifier. |
| IBM Granite Docling 258M | Not installed after cleanup | Apache-2.0 | Not measured locally; model card lists 258M parameters and Transformers/vLLM usage | Plausible after model/cache setup; docs include CPU fallback in Transformers example | Best next document-VLM research target, but still needs registration and mark classification to solve import accuracy. |

Security and maintenance concerns are highest for the Python model stacks because they introduce large transitive dependencies, model-download/cache management, dependency pinning, and regular CVE/update work. Tesseract has the simplest operational profile but the worst fit for the actual scoring problem.

## Recommendation

Recommendation: do not proceed to production auto-submit or auto-certification from the current extraction family or from any evaluated free/self-hosted OCR/layout contender.

The best measured path is still the current production extractor, but it is not good enough to implement as the selected high-assurance path:

- `50.0%` exact row match in the current extractor is too low.
- `0/6` exact sheets means every page still needs human correction or rejection.
- `12` false high-confidence wrong marks is incompatible with skipping review.
- Tesseract reached only `3.3%` exact row match.
- docTR reached only `6.7%` exact row match and took `154.7s` for six pages.
- PaddleOCR and Surya are not viable on this CPU-only host without additional platform work.
- DocStrange is not viable as a self-hosted option on this host because public local mode requires CUDA GPU and the internal CPU route crashes before one-page output.
- DOTS.mOCR is too heavy and not sufficiently aligned with the mark-classification problem to be the next implementation step.
- Granite Docling 258M is the more viable future document-VLM experiment, but it is still not a complete score import solution.
- the small six-page corpus is not enough to certify any model or threshold.

For `TASK-34.19`, do not simply promote the current extractor or wrap a generic OCR/layout tool around the existing score sheet. The next useful work should be:

1. collect a larger representative corpus of clean scans and real phone photos;
2. add real form registration with OpenCV-style homography/template alignment;
3. prototype a purpose-built self-hosted mark-classifier against registered score cells;
4. rerun calibration with assurance bands that explicitly track false high-confidence marks, exact sheet rate, rejected uploads, and correction burden.

After `TASK-34.14`, the project chose the lower-maintenance form-change path instead of continuing current-sheet extractor research. The v2 contract is:

- [OCR-SCORESHEET-V2-MACHINE-READABLE-CONTRACT.md](/srv/event-manager/dev/docs/operations/OCR-SCORESHEET-V2-MACHINE-READABLE-CONTRACT.md:1)

V2 keeps the scoring workflow intact while adding registration anchors and filled score mark regions so future extraction can use deterministic OMR rather than generic OCR/layout or handwritten-mark inference.

## Operational Decision

For now:

- keep the reviewed-draft workflow for any scoresheet imports
- do not remove correction/review before certification
- do not enable tenant opt-in free OCR fallback
- keep paid cloud services out of the recommended production path
- route high-assurance work through the v2 machine-readable sheet path
- continue preserving attempt-limit and same-user manual entry requirements for future workflow design
