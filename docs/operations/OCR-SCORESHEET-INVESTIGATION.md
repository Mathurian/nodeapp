# OCR Scoresheet Investigation

## Scope

This investigation covers OCR approaches for uploaded or captured paper scoresheets in support of [TASK-34](/srv/event-manager/dev/backlog/tasks/task-34%20-%20Add-scoresheet-image-import-into-verified-online-scoring-flow.md).

The recommendation is based on two constraints:

- OCR must fit the score-file and staged scoring workflow already in the application.
- OCR must not bypass the verified review and certification model delivered under `TASK-94`.

## Current Application Fit

The current application already has the right ingestion point for OCR:

- `/api/score-files` accepts uploads for score-related attachments.
- Allowed file types currently include `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `image/gif`, `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `text/csv`, and `text/plain`.
- Current upload size limit is `10 MB`.
- Score files are stored with `pending` status and already preserve ordinary vs delegated entry context.

This means OCR should be implemented as:

1. upload paper scoresheet into the existing score-file path,
2. run OCR and field extraction against that source file,
3. stage extracted values for review and correction,
4. only create or update real score records after explicit human acceptance.

That approach fits the existing delegated-entry and certification boundaries better than direct OCR-to-score mutation.

## Evaluated Options

### Azure AI Document Intelligence

Fit:

- Strong fit for mixed print and handwriting.
- Strong fit for fixed-layout scoresheets because custom template models are intended for highly structured documents with defined visual templates.
- Best privacy posture of the managed options because Microsoft supports containers for Document Intelligence.

Strengths:

- Read OCR extracts print and handwritten text from PDFs and scanned images.
- OCR output includes confidence and handwriting-style detection.
- Custom template models are specifically intended for highly structured forms.
- Containers are available, and Microsoft states the containers do not send customer document content to Microsoft, though they still require Azure connectivity for metering.
- Microsoft states cloud processing occurs in the same region as the resource, with temporary storage of analysis data and results.

Weaknesses:

- Container mode is not fully disconnected unless you buy the disconnected licensing model.
- Exact public price benchmarking is harder from the public pricing page than AWS or Google because many visible values resolve through Azure pricing tooling and account context.
- Still requires labeled examples and evaluation against real event scoresheets.

Best use here:

- Preferred option if we want a managed OCR service that still leaves a viable path for stricter data-governance deployments later.

### Amazon Textract

Fit:

- Strong fit for handwriting plus structured form extraction.
- Good fit if the team prefers AWS and can live with cloud-only processing.

Strengths:

- Supports typed and handwritten text detection.
- Analyze Document supports forms, tables, queries, and signatures.
- Custom Queries adapters allow use-case-specific tuning without building a full extraction model from scratch.
- Public pricing is straightforward to benchmark.

Weaknesses:

- Customization is centered around queries/adapters, which is less naturally aligned to a fixed scoring schema than an explicit custom template extractor.
- Synchronous PDF and TIFF processing is limited to one page.
- Privacy posture is weaker than Azure container or a fully self-hosted option because processing remains AWS-managed.

Cost notes:

- Detect Document Text pricing examples show `0.0015 USD` per page for the first million pages.
- Analyze Document forms plus tables examples imply roughly `0.065 USD` per page for combined structured extraction on the first million pages.
- Custom Queries examples show `0.025 USD` per page for the first million pages.

Best use here:

- Best AWS-native fallback if we decide vendor alignment matters more than custom template flexibility.

### Google Cloud Document AI

Fit:

- Good technical fit, especially if multiple scoresheet layouts are expected over time.
- More expensive than AWS Textract for structured extraction based on publicly listed pricing.

Strengths:

- Form Parser extracts key-value pairs, tables, checkboxes, and text.
- Google demonstrates Form Parser against a handwritten medical intake sample.
- Custom Extractor supports three modes:
  - foundation model,
  - custom model,
  - template.
- Template extraction can be viable with as few as `3` fixed-layout examples.
- Confidence scores are explicit and suitable for human review thresholds.

Weaknesses:

- Form Parser is pre-trained and cannot be up-trained.
- Custom processor hosting is a separate cost area.
- The custom-based extraction flow defaults to Google-managed dataset storage.
- Regional choices are narrower than Azure's broad global availability, though `us`, `eu`, and several single regions are supported.

Cost notes:

- Enterprise Document OCR Processor is listed at `1.50 USD` per `1,000` pages for the first `5,000,000` pages per month.
- Form Parser is listed at `30 USD` per `1,000` pages for the first `1,000,000` pages per month.
- Custom Extractor is listed at `30 USD` per `1,000` pages for the first `1,000,000` pages per month.

Best use here:

- Good alternative if the team wants a model spectrum from fixed templates to more variable layouts and is already comfortable with GCP.

### Tesseract

Fit:

- Acceptable only as a low-cost, self-hosted baseline for printed text.
- Poor fit for the actual priority use case, which includes handwritten scoresheets and structured field extraction.

Strengths:

- Open source and self-hosted.
- Large language pack ecosystem.
- No per-page vendor charges.

Weaknesses:

- Tesseract’s own FAQ says handwriting can work but "won’t work very well" because it is designed for printed text.
- Does not read PDF inputs directly.
- No first-class structured form extraction, template extraction, or managed confidence pipeline comparable to the cloud options.
- Would require extra preprocessing and significantly more custom parsing logic around the OCR output.

Best use here:

- Only if requirements collapse to printed-only forms and cloud OCR is completely disallowed.

## Recommendation

Preferred approach: `Azure AI Document Intelligence`.

Recommended model strategy:

1. Start with `Read OCR` plus a `custom template` extraction model if the paper scoresheet layout is fixed.
2. Use `custom neural` or broader custom extraction only if we confirm there are multiple materially different scoresheet layouts.
3. Keep OCR output behind mandatory human review and correction before score mutation or certification.

Why Azure is the best fit:

- It is the cleanest match for a structured scoresheet with handwritten fields.
- It has a better privacy and deployment story than the other managed options because containers are available.
- Its confidence and handwriting metadata are useful for review-driven acceptance.
- It aligns well with the existing application requirement that imported paper scores never bypass review, attribution, delegation, or certification controls.

## Recommended Implementation Shape For TASK-34

1. Keep the paper image or PDF as the source artifact in `score-files`.
2. Add an OCR job that produces structured extraction output and confidence data.
3. Map extracted fields into a staged scoring draft, not directly into accepted scores.
4. Build a review UI that shows:
   - extracted criterion values,
   - low-confidence highlights,
   - missing or ambiguous fields,
   - represented judge,
   - source file preview.
5. Require explicit human acceptance before creating normal score rows.
6. Leave certification behavior unchanged:
   - normal judge certification when the judge certifies,
   - delegated certification only if the `TASK-94.7` safeguard is enabled and the delegate is authorized.

## Prerequisites

- Define the canonical paper scoresheet template or templates.
- Collect representative sample scans and photos from real events.
- Decide whether the deployment target is:
  - Azure-hosted processing, or
  - Azure container deployment for stricter data-governance needs.
- Define the extraction schema:
  - event or category identity,
  - contestant identity,
  - represented judge identity,
  - criterion values,
  - deductions or remarks,
  - signature or certification markers if any are present on paper.
- Decide whether current upload constraints are sufficient.

Current likely gap:

- The application currently allows common images and PDFs but not `TIFF` or `HEIF`, both of which can appear in scan workflows.

## Risks

- Handwriting quality may vary too widely across judges for unattended extraction.
- Phone photos can introduce blur, skew, glare, or cropping loss.
- Some judges may mark values in non-standard ways such as circles, cross-outs, arrows, or margin notes.
- If multiple paper form versions are used, extraction quality may degrade unless models are trained per template or classifier routing is added.
- OCR may read numeric fields well but still struggle with free-form commentary.
- Signature presence on paper should not be treated as equivalent to application certification without a deliberate product decision.

## Practical Next Steps

1. Collect real scoresheet examples from at least:
   - one clean printed sample,
   - several handwritten samples,
   - several phone-photo samples,
   - any alternate layout variants.
2. Run a small proof-of-concept with Azure Document Intelligence on those samples.
3. Measure field-level accuracy for:
   - judge name,
   - contestant,
   - criterion score values,
   - totals,
   - deductions,
   - remarks.
4. Define a review threshold policy using confidence and validation rules.
5. If the proof-of-concept is weak on handwriting, continue using the delegated-entry fallback from `TASK-94` as the primary operational workaround.

## Source Links

- AWS Textract overview: https://docs.aws.amazon.com/textract/latest/dg/what-is.html
- AWS Textract pricing: https://aws.amazon.com/textract/pricing/
- AWS Textract limits: https://docs.aws.amazon.com/textract/latest/dg/limits-document.html
- AWS Textract custom queries: https://docs.aws.amazon.com/textract/latest/dg/how-it-works-custom-queries.html
- Azure Document Intelligence Read model: https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/prebuilt/read?view=doc-intel-4.0.0
- Azure custom template model: https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/train/custom-template?view=doc-intel-3.1.0
- Azure data privacy and security: https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/document-intelligence/data-privacy-security
- Azure containers: https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/containers/install-run?tabs=read&view=doc-intel-3.0.0&viewFallbackFrom=form-recog-3.0.0
- Azure pricing: https://azure.microsoft.com/en-us/pricing/details/document-intelligence/
- Google Form Parser: https://docs.cloud.google.com/document-ai/docs/form-parser
- Google Custom Extractor overview: https://docs.cloud.google.com/document-ai/docs/custom-extractor-overview
- Google regions: https://docs.cloud.google.com/document-ai/docs/regions
- Google pricing: https://cloud.google.com/document-ai/pricing
- Tesseract user manual: https://tesseract-ocr.github.io/tessdoc/
- Tesseract FAQ: https://tesseract-ocr.github.io/tessdoc/FAQ.html
- Tesseract input formats: https://tesseract-ocr.github.io/tessdoc/InputFormats.html
