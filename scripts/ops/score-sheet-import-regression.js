#!/usr/bin/env node

require('reflect-metadata');

const fs = require('fs');
const path = require('path');
const { ScoreSheetImportService } = require('../../dist/services/ScoreSheetImportService');

const VALID_MODES = new Set(['calibration', 'rollout']);
const DEFAULT_GROUND_TRUTH_PATH = 'tests/examples/scoresheet-import/route66-phase1-ground-truth.json';
const DEFAULT_THRESHOLDS_PATH = 'tests/examples/scoresheet-import/route66-phase1-thresholds.json';
const FALSE_HIGH_CONFIDENCE_THRESHOLD = 0.75;
const MATERIAL_EXACT_ROW_MATCH_IMPROVEMENT = 0.05;
const NORMALIZED_WIDTH = 1000;
const NORMALIZED_HEIGHT = 1400;
const CHANNELS = 3;
const V3_TEMPLATE_KEY = 'education_omr_v3';
const V3_VERSION_BITS = [1, 1, 0, 0, 0, 0, 1, 1];
const V3_SCORE_GRID = {
  left: 0.367,
  right: 0.95,
  top: 0.266,
  bottom: 0.634,
};
const V3_ANCHOR = {
  left: 0.3 / 8.5,
  top: 0.3 / 11,
  width: 0.22 / 8.5,
  height: 0.22 / 11,
  right: (8.5 - 0.3 - 0.22) / 8.5,
  bottom: (11 - 0.3 - 0.22) / 11,
};
const V3_ASSURANCE_THRESHOLDS = {
  reviewRequired: {
    minExactRowMatchRate: 0.98,
    minExactSheetMatchRate: 0.95,
    maxFalseHighConfidenceMarks: 0,
    maxUnexpectedRejectedRows: 0,
  },
  autoSubmit: {
    minExactRowMatchRate: 1,
    minExactSheetMatchRate: 1,
    maxFalseHighConfidenceMarks: 0,
    maxUnexpectedRejectedRows: 0,
    maxRejectedRowsPerAcceptedSheet: 0,
    minRealScannerSheets: 30,
  },
  autoCertify: {
    minExactRowMatchRate: 1,
    minExactSheetMatchRate: 1,
    maxFalseHighConfidenceMarks: 0,
    maxUnexpectedRejectedRows: 0,
    maxRejectedRowsPerAcceptedSheet: 0,
    minRealScannerSheets: 100,
    requiresOperationalUat: true,
  },
};
const V3_PHONE_PHOTO_SAMPLES = [
  'IMG_5145.jpeg',
  ...Array.from({ length: 8 }, (_value, index) => `IMG_${5152 + index}.jpeg`),
].map((fileName) => ({
  id: `v3-phone-${fileName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
  label: `V3 phone photo ${fileName.replace('.jpeg', '')}`,
  captureType: 'phone_photo',
  sourcePath: `temp/scoresheet-corpus-intake/${fileName}`,
  contestantName: 'Retro',
  judgeName: 'Daddie Danger',
  expectedRejectedRows: [],
}));
const PREPROCESSING_VARIANTS = [
  {
    id: 'standard',
    label: 'Standard normalized image',
    preprocessingMode: 'standard',
    thresholdStrategy: 'none',
  },
  {
    id: 'scan_bw_otsu',
    label: 'Scan-normalized black-and-white (Otsu)',
    preprocessingMode: 'scan_bw',
    thresholdStrategy: 'otsu',
  },
  {
    id: 'scan_bw_fixed_150',
    label: 'Scan-normalized black-and-white (fixed 150)',
    preprocessingMode: 'scan_bw',
    thresholdStrategy: 'fixed_150',
  },
  {
    id: 'scan_bw_fixed_170',
    label: 'Scan-normalized black-and-white (fixed 170)',
    preprocessingMode: 'scan_bw',
    thresholdStrategy: 'fixed_170',
  },
  {
    id: 'scan_bw_fixed_190',
    label: 'Scan-normalized black-and-white (fixed 190)',
    preprocessingMode: 'scan_bw',
    thresholdStrategy: 'fixed_190',
  },
];

const parseArgs = (argv) => {
  const args = {
    mode: 'calibration',
    json: false,
    groundTruthPath: DEFAULT_GROUND_TRUTH_PATH,
    thresholdsPath: DEFAULT_THRESHOLDS_PATH,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') {
      args.json = true;
      continue;
    }

    if (arg === '--mode') {
      args.mode = argv[index + 1] || '';
      index += 1;
      continue;
    }

    if (arg && arg.startsWith('--mode=')) {
      args.mode = arg.slice('--mode='.length);
      continue;
    }

    if (arg === '--ground-truth') {
      args.groundTruthPath = argv[index + 1] || '';
      index += 1;
      continue;
    }

    if (arg && arg.startsWith('--ground-truth=')) {
      args.groundTruthPath = arg.slice('--ground-truth='.length);
      continue;
    }

    if (arg === '--thresholds') {
      args.thresholdsPath = argv[index + 1] || '';
      index += 1;
      continue;
    }

    if (arg && arg.startsWith('--thresholds=')) {
      args.thresholdsPath = arg.slice('--thresholds='.length);
    }
  }

  if (!VALID_MODES.has(args.mode)) {
    throw new Error(`Unsupported mode "${args.mode}". Use --mode=calibration or --mode=rollout.`);
  }

  return args;
};

const loadJson = (relativePath) => require(path.resolve(process.cwd(), relativePath));

const measureRuntimeMs = (startedAt) => Number(process.hrtime.bigint() - startedAt) / 1_000_000;

const buildCriteriaForTemplate = (family) =>
  family.criterionOrder
    .slice()
    .sort((left, right) => left.localeCompare(right))
    .map((name, index) => ({
      id: `criterion-${index + 1}`,
      name,
      maxScore: 6,
    }));

const resolveSamplePdfPath = (groundTruth, family, sample) => {
  const sourcePdf = sample.sourcePdf || family.sourcePdf || groundTruth.sourcePdf;
  if (!sourcePdf) {
    throw new Error(`Missing source PDF for ${family.templateKey} page ${sample.page}`);
  }

  return path.resolve(process.cwd(), sourcePdf);
};

const evaluateFamilyVariant = async (service, groundTruth, thresholdConfig, family, mode, variant) => {
  const criteria = buildCriteriaForTemplate(family);
  const template = service.resolveTemplate(criteria, { intent: 'SCORESHEET_IMPORT' }, undefined);
  const orderedCriteria = service.orderCriteriaForTemplate(criteria, template);
  const thresholds = thresholdConfig.templateThresholds[family.templateKey]?.[mode];

  if (!thresholds) {
    throw new Error(`Missing ${mode} thresholds for template ${family.templateKey}`);
  }

  const perPage = [];
  let exactRowMatches = 0;
  let totalRows = 0;
  let ambiguousRows = 0;
  let incorrectRows = 0;
  let falseHighConfidenceMarks = 0;
  let qualityGateRejectedPages = 0;
  let estimatedManualCorrectionRows = 0;

  for (const sample of family.samples) {
    const samplePdfPath = resolveSamplePdfPath(groundTruth, family, sample);
    const rendered = await service.renderPdfPage(samplePdfPath, sample.page);
    const normalized = await service.normalizePage(rendered.buffer, {
      preprocessingMode: variant.preprocessingMode,
      thresholdStrategy: variant.thresholdStrategy,
    });
    const result = service.extractScoresFromNormalizedImage(normalized, orderedCriteria, template);
    const rows = result.payload.criteria.map((criterion) => {
      const expectedScore = sample.criterionScores[criterion.criterionName];
      const exactMatch = criterion.detectedScore === expectedScore;
      const falseHighConfidenceMark = !exactMatch
        && criterion.detectedScore !== null
        && !criterion.ambiguous
        && criterion.confidence >= FALSE_HIGH_CONFIDENCE_THRESHOLD;

      if (exactMatch) {
        exactRowMatches += 1;
      } else {
        incorrectRows += 1;
      }
      if (criterion.ambiguous) {
        ambiguousRows += 1;
      }
      if (falseHighConfidenceMark) {
        falseHighConfidenceMarks += 1;
      }
      totalRows += 1;

      return {
        criterionName: criterion.criterionName,
        expectedScore,
        detectedScore: criterion.detectedScore,
        exactMatch,
        ambiguous: criterion.ambiguous,
        confidence: criterion.confidence,
        falseHighConfidenceMark,
      };
    });

    const totalDelta = Math.abs((sample.handwrittenTotal || 0) - (result.computedTotal || 0));
    const exactRowCount = rows.filter((row) => row.exactMatch).length;
    const ambiguousRowCount = rows.filter((row) => row.ambiguous).length;
    const incorrectRowCount = rows.length - exactRowCount;
    const falseHighConfidenceMarkCount = rows.filter((row) => row.falseHighConfidenceMark).length;
    const qualityGateDecision = result.payload.qualityGate?.decision || 'accepted_for_review';
    const reviewBurdenMetrics = result.payload.reviewBurdenMetrics || null;

    if (qualityGateDecision === 'manual_entry_required') {
      qualityGateRejectedPages += 1;
    }
    estimatedManualCorrectionRows += reviewBurdenMetrics?.estimatedManualCorrectionRows || 0;

    perPage.push({
      sourcePdf: sample.sourcePdf || family.sourcePdf || groundTruth.sourcePdf,
      sourcePdfKey: sample.sourcePdfKey,
      page: sample.page,
      contestantName: sample.contestantName,
      preprocessingMode: result.payload.preprocessingMode,
      thresholdStrategy: result.payload.thresholdStrategy,
      qualitySignals: result.payload.qualitySignals,
      gridAnchoring: result.payload.gridAnchoring,
      qualityGate: result.payload.qualityGate,
      reviewBurdenMetrics,
      expectedTotal: sample.handwrittenTotal,
      computedTotal: result.computedTotal,
      totalDelta,
      exactRowCount,
      rowCount: rows.length,
      exactRowMatchRate: rows.length > 0 ? exactRowCount / rows.length : 0,
      incorrectRowCount,
      ambiguousRowCount,
      manualCorrectionRowCount: incorrectRowCount,
      falseHighConfidenceMarkCount,
      passesModeThresholds:
        totalDelta <= thresholds.maxPageTotalDelta
        && ambiguousRowCount <= thresholds.maxAmbiguousRowsPerPage,
      rows,
    });
  }

  const exactRowMatchRate = totalRows > 0 ? exactRowMatches / totalRows : 0;
  const maxPageTotalDelta = perPage.reduce((max, page) => Math.max(max, page.totalDelta), 0);
  const maxAmbiguousRowsPerPage = perPage.reduce((max, page) => Math.max(max, page.ambiguousRowCount), 0);
  const pageCount = perPage.length;

  const pass =
    exactRowMatchRate >= thresholds.minExactRowMatchRate
    && maxPageTotalDelta <= thresholds.maxPageTotalDelta
    && maxAmbiguousRowsPerPage <= thresholds.maxAmbiguousRowsPerPage
    && perPage.every((page) => page.passesModeThresholds);

  return {
    variantId: variant.id,
    variantLabel: variant.label,
    preprocessingMode: variant.preprocessingMode,
    thresholdStrategy: variant.thresholdStrategy,
    templateKey: family.templateKey,
    displayName: family.displayName,
    mode,
    pass,
    thresholds,
    metrics: {
      exactRowMatchRate,
      exactRowMatches,
      totalRows,
      ambiguousRows,
      incorrectRows,
      averageIncorrectRowsPerPage: pageCount > 0 ? incorrectRows / pageCount : 0,
      averageAmbiguousRowsPerPage: pageCount > 0 ? ambiguousRows / pageCount : 0,
      maxPageTotalDelta,
      maxAmbiguousRowsPerPage,
      falseHighConfidenceMarks,
      averageFalseHighConfidenceMarksPerPage: pageCount > 0 ? falseHighConfidenceMarks / pageCount : 0,
      qualityGateRejectedPages,
      qualityGateRejectedPageRate: pageCount > 0 ? qualityGateRejectedPages / pageCount : 0,
      estimatedManualCorrectionRows,
      averageEstimatedManualCorrectionRowsPerPage:
        pageCount > 0 ? estimatedManualCorrectionRows / pageCount : 0,
    },
    perPage,
  };
};

const compareVariantMetrics = (left, right) => {
  const exactRowMatchDelta = left.metrics.exactRowMatchRate - right.metrics.exactRowMatchRate;
  if (Math.abs(exactRowMatchDelta) > 0.000001) return exactRowMatchDelta;

  const incorrectRowsDelta = right.metrics.averageIncorrectRowsPerPage - left.metrics.averageIncorrectRowsPerPage;
  if (Math.abs(incorrectRowsDelta) > 0.000001) return incorrectRowsDelta;

  const totalDeltaDifference = right.metrics.maxPageTotalDelta - left.metrics.maxPageTotalDelta;
  if (totalDeltaDifference !== 0) return totalDeltaDifference;

  return right.metrics.falseHighConfidenceMarks - left.metrics.falseHighConfidenceMarks;
};

const materiallyImprovesBaseline = (candidate, baseline) =>
  candidate.pass
  && candidate.metrics.exactRowMatchRate
    >= baseline.metrics.exactRowMatchRate + MATERIAL_EXACT_ROW_MATCH_IMPROVEMENT
  && candidate.metrics.averageIncorrectRowsPerPage < baseline.metrics.averageIncorrectRowsPerPage
  && candidate.metrics.maxPageTotalDelta <= baseline.metrics.maxPageTotalDelta
  && candidate.metrics.falseHighConfidenceMarks <= baseline.metrics.falseHighConfidenceMarks;

const regressesBaseline = (candidate, baseline) =>
  candidate.metrics.exactRowMatchRate < baseline.metrics.exactRowMatchRate
  || candidate.metrics.averageIncorrectRowsPerPage > baseline.metrics.averageIncorrectRowsPerPage
  || candidate.metrics.maxPageTotalDelta > baseline.metrics.maxPageTotalDelta
  || candidate.metrics.falseHighConfidenceMarks > baseline.metrics.falseHighConfidenceMarks;

const selectPreprocessingVariant = (variants) => {
  const baseline = variants.find((variant) => variant.variantId === 'standard');
  if (!baseline) {
    throw new Error('Missing standard scoresheet preprocessing baseline');
  }

  const improvingVariants = variants
    .filter((variant) => variant.variantId !== baseline.variantId)
    .filter((variant) => materiallyImprovesBaseline(variant, baseline))
    .sort((left, right) => compareVariantMetrics(right, left));

  const selected = improvingVariants[0] || baseline;

  return {
    baseline,
    selected,
    selectedImprovesBaseline: selected.variantId !== baseline.variantId,
    selectedRegressesBaseline: selected.variantId !== baseline.variantId
      ? regressesBaseline(selected, baseline)
      : false,
  };
};

const evaluateFamily = async (service, groundTruth, thresholdConfig, family, mode) => {
  const variants = [];
  for (const variant of PREPROCESSING_VARIANTS) {
    variants.push(await evaluateFamilyVariant(service, groundTruth, thresholdConfig, family, mode, variant));
  }

  const selection = selectPreprocessingVariant(variants);
  const pass = selection.baseline.pass
    && selection.selected.pass
    && !selection.selectedRegressesBaseline;

  return {
    ...selection.selected,
    pass,
    selectedVariantId: selection.selected.variantId,
    selectedVariantLabel: selection.selected.variantLabel,
    selectedImprovesBaseline: selection.selectedImprovesBaseline,
    selectedRegressesBaseline: selection.selectedRegressesBaseline,
    baselineVariantId: selection.baseline.variantId,
    variants,
  };
};

const createBlankV3Image = () => Buffer.alloc(NORMALIZED_WIDTH * NORMALIZED_HEIGHT * CHANNELS, 255);

const paintRatioRect = (
  buffer,
  leftRatio,
  topRatio,
  widthRatio,
  heightRatio,
  color = [0, 0, 0],
) => {
  const left = Math.max(0, Math.round(NORMALIZED_WIDTH * leftRatio));
  const top = Math.max(0, Math.round(NORMALIZED_HEIGHT * topRatio));
  const right = Math.min(NORMALIZED_WIDTH - 1, Math.round(NORMALIZED_WIDTH * (leftRatio + widthRatio)));
  const bottom = Math.min(NORMALIZED_HEIGHT - 1, Math.round(NORMALIZED_HEIGHT * (topRatio + heightRatio)));

  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) {
      const offset = ((y * NORMALIZED_WIDTH) + x) * CHANNELS;
      buffer[offset] = color[0];
      buffer[offset + 1] = color[1];
      buffer[offset + 2] = color[2];
    }
  }
};

const paintV3MachineReadableMetadata = (buffer) => {
  paintRatioRect(buffer, V3_ANCHOR.left, V3_ANCHOR.top, V3_ANCHOR.width, V3_ANCHOR.height);
  paintRatioRect(buffer, V3_ANCHOR.right, V3_ANCHOR.top, V3_ANCHOR.width, V3_ANCHOR.height);
  paintRatioRect(buffer, V3_ANCHOR.left, V3_ANCHOR.bottom, V3_ANCHOR.width, V3_ANCHOR.height);
  paintRatioRect(buffer, V3_ANCHOR.right, V3_ANCHOR.bottom, V3_ANCHOR.width, V3_ANCHOR.height);

  const bitWidth = 0.12 / 8.5;
  const bitHeight = 0.12 / 11;
  const gap = 0.035 / 8.5;
  V3_VERSION_BITS.forEach((bit, bitIndex) => {
    if (bit === 1) {
      paintRatioRect(buffer, 0.68 + (bitIndex * (bitWidth + gap)), 0.085, bitWidth, bitHeight);
    }
  });
};

const paintV3Grid = (buffer, rowCount, scoreColumns) => {
  const gridLeft = Math.round(NORMALIZED_WIDTH * V3_SCORE_GRID.left);
  const gridRight = Math.round(NORMALIZED_WIDTH * V3_SCORE_GRID.right);
  const gridTop = Math.round(NORMALIZED_HEIGHT * V3_SCORE_GRID.top);
  const gridBottom = Math.round(NORMALIZED_HEIGHT * V3_SCORE_GRID.bottom);
  const rowHeight = (gridBottom - gridTop) / rowCount;
  const columnWidth = (gridRight - gridLeft) / scoreColumns.length;

  for (let rowIndex = 0; rowIndex <= rowCount; rowIndex += 1) {
    const y = Math.round(gridTop + (rowHeight * rowIndex));
    for (let lineOffset = -1; lineOffset <= 1; lineOffset += 1) {
      for (let x = gridLeft; x <= gridRight; x += 1) {
        const offset = (((y + lineOffset) * NORMALIZED_WIDTH) + x) * CHANNELS;
        buffer[offset] = 0;
        buffer[offset + 1] = 0;
        buffer[offset + 2] = 0;
      }
    }
  }

  for (let columnIndex = 0; columnIndex <= scoreColumns.length; columnIndex += 1) {
    const x = Math.round(gridLeft + (columnWidth * columnIndex));
    for (let lineOffset = -1; lineOffset <= 1; lineOffset += 1) {
      for (let y = gridTop; y <= gridBottom; y += 1) {
        const offset = ((y * NORMALIZED_WIDTH) + x + lineOffset) * CHANNELS;
        buffer[offset] = 0;
        buffer[offset + 1] = 0;
        buffer[offset + 2] = 0;
      }
    }
  }
};

const paintV3Cell = (buffer, rowIndex, rowCount, columnIndex, scoreColumns) => {
  const rowHeight = (V3_SCORE_GRID.bottom - V3_SCORE_GRID.top) / rowCount;
  const columnWidth = (V3_SCORE_GRID.right - V3_SCORE_GRID.left) / scoreColumns.length;
  const centerX = NORMALIZED_WIDTH * (V3_SCORE_GRID.left + (columnIndex * columnWidth) + (columnWidth / 2));
  const centerY = NORMALIZED_HEIGHT * (V3_SCORE_GRID.top + (rowIndex * rowHeight) + (rowHeight / 2));
  const radiusX = Math.max(5, Math.round(NORMALIZED_WIDTH * columnWidth * 0.16));
  const radiusY = Math.max(5, Math.round(NORMALIZED_HEIGHT * rowHeight * 0.18));

  for (let y = Math.round(centerY - radiusY); y <= Math.round(centerY + radiusY); y += 1) {
    for (let x = Math.round(centerX - radiusX); x <= Math.round(centerX + radiusX); x += 1) {
      const normalizedX = (x - centerX) / radiusX;
      const normalizedY = (y - centerY) / radiusY;
      if ((normalizedX * normalizedX) + (normalizedY * normalizedY) <= 1) {
        const offset = ((y * NORMALIZED_WIDTH) + x) * CHANNELS;
        buffer[offset] = 20;
        buffer[offset + 1] = 20;
        buffer[offset + 2] = 20;
      }
    }
  }
};

const paintV3CommentaryScribble = (buffer) => {
  for (let lineIndex = 0; lineIndex < 5; lineIndex += 1) {
    const y = Math.round(NORMALIZED_HEIGHT * (0.69 + (lineIndex * 0.035)));
    for (let x = Math.round(NORMALIZED_WIDTH * 0.08); x < Math.round(NORMALIZED_WIDTH * 0.9); x += 8) {
      const scribbleY = Math.max(0, Math.min(NORMALIZED_HEIGHT - 1, y + (x % 17)));
      const offset = ((scribbleY * NORMALIZED_WIDTH) + x) * CHANNELS;
      buffer[offset] = 10;
      buffer[offset + 1] = 10;
      buffer[offset + 2] = 10;
    }
  }
};

const buildV3SyntheticSamples = (criteria, scoreColumns) => [
  {
    id: 'v3-clean-full-grid',
    label: 'Clean v3 grid',
    captureType: 'synthetic_generated',
    scores: [6, 5, 4, 3, 2, 1, 0, 6, 5, 4],
    commentaryScribble: false,
    expectedRejectedRows: [],
  },
  {
    id: 'v3-commentary-scribble',
    label: 'V3 grid with dark commentary scribble',
    captureType: 'synthetic_generated',
    scores: [0, 1, 2, 3, 4, 5, 6, 0, 1, 2],
    commentaryScribble: true,
    expectedRejectedRows: [],
  },
  {
    id: 'v3-multi-mark-row',
    label: 'V3 multi-mark rejection',
    captureType: 'synthetic_generated',
    scores: [null, 5, 4, 3, 2, 1, 0, 6, 5, 4],
    commentaryScribble: false,
    expectedRejectedRows: [0],
    extraMarks: [{ rowIndex: 0, score: 6 }, { rowIndex: 0, score: 5 }],
  },
  {
    id: 'v3-missing-mark-row',
    label: 'V3 missing-mark rejection',
    captureType: 'synthetic_generated',
    scores: [6, 5, 4, null, 2, 1, 0, 6, 5, 4],
    commentaryScribble: true,
    expectedRejectedRows: [3],
  },
].map((sample) => ({
  ...sample,
  expectedScoresByCriterion: Object.fromEntries(
    criteria.map((criterion, rowIndex) => [criterion.name, sample.scores[rowIndex] ?? null]),
  ),
  expectedTotal: sample.scores.reduce((sum, score) => sum + (score ?? 0), 0),
  scoreColumns,
}));

const renderV3SyntheticSample = (sample, criteria, scoreColumns) => {
  const image = createBlankV3Image();
  paintV3MachineReadableMetadata(image);
  paintV3Grid(image, criteria.length, scoreColumns);

  sample.scores.forEach((score, rowIndex) => {
    if (score === null) return;
    const columnIndex = scoreColumns.indexOf(score);
    if (columnIndex >= 0) {
      paintV3Cell(image, rowIndex, criteria.length, columnIndex, scoreColumns);
    }
  });

  (sample.extraMarks || []).forEach((extraMark) => {
    const columnIndex = scoreColumns.indexOf(extraMark.score);
    if (columnIndex >= 0) {
      paintV3Cell(image, extraMark.rowIndex, criteria.length, columnIndex, scoreColumns);
    }
  });

  if (sample.commentaryScribble) {
    paintV3CommentaryScribble(image);
  }

  return {
    data: image,
    width: NORMALIZED_WIDTH,
    height: NORMALIZED_HEIGHT,
    channels: CHANNELS,
    bounds: { left: 0, top: 0, width: NORMALIZED_WIDTH, height: NORMALIZED_HEIGHT },
  };
};

const normalizeCriterionName = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const resolveExpectedCriterionScore = (sample, criterionName) => {
  if (
    sample.expectedScoresByCriterion
    && Object.prototype.hasOwnProperty.call(sample.expectedScoresByCriterion, criterionName)
  ) {
    return sample.expectedScoresByCriterion[criterionName];
  }

  if (!sample.criterionScores) {
    return undefined;
  }

  if (Object.prototype.hasOwnProperty.call(sample.criterionScores, criterionName)) {
    return sample.criterionScores[criterionName];
  }

  const normalizedCriterionName = normalizeCriterionName(criterionName);
  const matchedEntry = Object.entries(sample.criterionScores).find(([candidateName]) => {
    const normalizedCandidateName = normalizeCriterionName(candidateName);
    return normalizedCandidateName === normalizedCriterionName
      || normalizedCandidateName.startsWith(`${normalizedCriterionName} `)
      || normalizedCriterionName.startsWith(`${normalizedCandidateName} `);
  });

  return matchedEntry ? matchedEntry[1] : undefined;
};

const findV3PhonePhotoGroundTruth = (family, phonePhotoSample) =>
  family.samples.find((sample) =>
    sample.contestantName === phonePhotoSample.contestantName
    && sample.judgeName === phonePhotoSample.judgeName,
  );

const inferUploadFileType = (sourcePath) => {
  const extension = path.extname(sourcePath || '').toLowerCase();
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.png') return 'image/png';
  if (extension === '.heic') return 'image/heic';
  if (extension === '.heif') return 'image/heif';
  if (extension === '.pdf') return 'application/pdf';
  return 'application/octet-stream';
};

const classifyPhonePhotoSkipCategory = (reason, sourcePath) => {
  const normalizedReason = String(reason || '').toLowerCase();
  if (normalizedReason.includes('source file not found')) return 'source_file_missing';
  if (normalizedReason.includes('missing v3 phone-photo ground truth')) return 'missing_ground_truth';
  if (
    normalizedReason.includes('convert')
    || normalizedReason.includes('unsupported')
    || normalizedReason.includes('invalid image')
  ) {
    return 'upload_conversion_failure';
  }
  if (sourcePath && !['.jpg', '.jpeg', '.png', '.heic', '.heif', '.pdf'].includes(path.extname(sourcePath).toLowerCase())) {
    return 'upload_conversion_failure';
  }
  return 'parser_or_runtime_failure';
};

const classifyV3SampleOutcome = (result, rows) => {
  const categories = [];
  const reasons = [];
  const machineReadable = result.payload.machineReadable || null;
  const anchorQuality = machineReadable?.anchorQuality || null;
  const fiducials = anchorQuality?.fiducials || null;
  const rejectedRows = machineReadable?.rejectedRows || [];
  const qualityGate = result.payload.qualityGate;

  if (qualityGate.blockingReasons.length > 0) {
    categories.push('quality_gate');
    reasons.push(...qualityGate.blockingReasons);
  }
  if ((fiducials && !fiducials.detected) || (anchorQuality && !anchorQuality.detected)) {
    categories.push('parser_geometry');
    reasons.push(...(fiducials?.failureReasons || []));
  }
  if (rejectedRows.length > 0) {
    categories.push('mark_rejections');
  }
  if (rows.some((row) => row.unexpectedRejected)) {
    categories.push('unexpected_rejection');
  }
  if (rows.some((row) => !row.exactMatch && !row.ambiguous)) {
    categories.push('extraction_mismatch');
  }

  return {
    failureCategories: categories.length > 0 ? Array.from(new Set(categories)) : ['none'],
    failureReasons: Array.from(new Set(reasons)),
  };
};

const buildExpectedScoresByCriterion = (criteria, groundTruthSample, phonePhotoSample) => {
  const expectedScoresByCriterion = Object.fromEntries(
    criteria.map((criterion) => [
      criterion.name,
      resolveExpectedCriterionScore(groundTruthSample, criterion.name),
    ]),
  );
  const missingCriteria = Object.entries(expectedScoresByCriterion)
    .filter(([, score]) => score === undefined)
    .map(([criterionName]) => criterionName);

  if (missingCriteria.length > 0) {
    throw new Error(
      `Missing v3 phone-photo ground truth for ${phonePhotoSample.id}: ${missingCriteria.join(', ')}`,
    );
  }

  return expectedScoresByCriterion;
};

const sumExpectedScores = (expectedScoresByCriterion) =>
  Object.values(expectedScoresByCriterion).reduce((sum, score) => sum + (score || 0), 0);

const evaluateV3Policy = (metrics, thresholds = V3_ASSURANCE_THRESHOLDS) => {
  const realScannerSheetCount = metrics.captureTypeCounts.scanner_pdf || 0;
  const realPhonePhotoSheetCount = metrics.captureTypeCounts.phone_photo || 0;
  const operationalUatEvidence = false;
  const reviewRequiredEligible =
    metrics.exactRowMatchRate >= thresholds.reviewRequired.minExactRowMatchRate
    && metrics.exactSheetMatchRate >= thresholds.reviewRequired.minExactSheetMatchRate
    && metrics.falseHighConfidenceMarks <= thresholds.reviewRequired.maxFalseHighConfidenceMarks
    && metrics.unexpectedRejectedRows <= thresholds.reviewRequired.maxUnexpectedRejectedRows;
  const autoSubmitEligible =
    reviewRequiredEligible
    && metrics.exactRowMatchRate >= thresholds.autoSubmit.minExactRowMatchRate
    && metrics.exactSheetMatchRate >= thresholds.autoSubmit.minExactSheetMatchRate
    && metrics.falseHighConfidenceMarks <= thresholds.autoSubmit.maxFalseHighConfidenceMarks
    && metrics.unexpectedRejectedRows <= thresholds.autoSubmit.maxUnexpectedRejectedRows
    && metrics.maxRejectedRowsOnAcceptedSheet <= thresholds.autoSubmit.maxRejectedRowsPerAcceptedSheet
    && realScannerSheetCount >= thresholds.autoSubmit.minRealScannerSheets;
  const autoCertifyEligible =
    autoSubmitEligible
    && metrics.exactRowMatchRate >= thresholds.autoCertify.minExactRowMatchRate
    && metrics.exactSheetMatchRate >= thresholds.autoCertify.minExactSheetMatchRate
    && realScannerSheetCount >= thresholds.autoCertify.minRealScannerSheets
    && operationalUatEvidence;

  let recommendedBand = 'manual_fallback';
  if (autoCertifyEligible) {
    recommendedBand = 'auto_certify';
  } else if (autoSubmitEligible) {
    recommendedBand = 'auto_submit';
  } else if (reviewRequiredEligible) {
    recommendedBand = 'review_required';
  }

  return {
    thresholds,
    evidence: {
      syntheticSheetCount: metrics.captureTypeCounts.synthetic_generated || 0,
      realScannerSheetCount,
      realPhonePhotoSheetCount,
      operationalUatEvidence,
    },
    eligibleBands: {
      reviewRequired: reviewRequiredEligible,
      autoSubmit: autoSubmitEligible,
      autoCertify: autoCertifyEligible,
    },
    recommendedBand,
    autoSubmitEnabled: autoSubmitEligible,
    autoCertifyEnabled: autoCertifyEligible,
    goNoGo:
      recommendedBand === 'review_required'
        ? 'GO for controlled review-required v3 UAT; NO-GO for auto-submit or auto-certify until real scanner evidence meets thresholds.'
        : 'NO-GO for v3 rollout beyond manual fallback until reliability thresholds are met.',
  };
};

const evaluateMachineReadableV3 = async (service, groundTruth, thresholdConfig, mode) => {
  const family = groundTruth.intendedPhase1Families.find(
    (candidate) => candidate.templateKey === 'education_saturday_day_v1',
  );
  if (!family) {
    throw new Error('Missing Education family needed to validate education_omr_v3');
  }

  const criteria = buildCriteriaForTemplate(family);
  const template = service.resolveTemplate(
    criteria,
    { intent: 'SCORESHEET_IMPORT', templateKey: V3_TEMPLATE_KEY },
    undefined,
  );
  const orderedCriteria = service.orderCriteriaForTemplate(criteria, template);
  const syntheticSamples = buildV3SyntheticSamples(orderedCriteria, [...template.scoreColumns]);
  const perPage = [];
  const skippedPhonePhotoSamples = [];
  let exactRowMatches = 0;
  let exactSheetMatches = 0;
  let totalRows = 0;
  let ambiguousRows = 0;
  let rejectedRows = 0;
  let unexpectedRejectedRows = 0;
  let incorrectRows = 0;
  let falseHighConfidenceMarks = 0;
  let totalDeltaSum = 0;
  let runtimeMsTotal = 0;
  let maxRejectedRowsOnAcceptedSheet = 0;
  let manualAttentionRows = 0;
  const captureTypeCounts = {};

  const recordV3SampleResult = (sample, result, runtimeMs) => {
    captureTypeCounts[sample.captureType] = (captureTypeCounts[sample.captureType] || 0) + 1;
    runtimeMsTotal += runtimeMs;

    const rejectedRowIndexes = new Set(
      (result.payload.machineReadable?.rejectedRows || []).map((row) => row.rowIndex),
    );
    const rows = result.payload.criteria.map((criterion) => {
      const expectedScore = resolveExpectedCriterionScore(sample, criterion.criterionName);
      const exactMatch = criterion.detectedScore === expectedScore;
      const expectedRejected = expectedScore === null
        || (sample.expectedRejectedRows || []).includes(criterion.rowIndex);
      const rejected = rejectedRowIndexes.has(criterion.rowIndex);
      const unexpectedRejected = rejected && !expectedRejected;
      const falseHighConfidenceMark = !exactMatch
        && criterion.detectedScore !== null
        && !criterion.ambiguous
        && criterion.confidence >= FALSE_HIGH_CONFIDENCE_THRESHOLD;

      if (exactMatch) exactRowMatches += 1;
      if (!exactMatch) incorrectRows += 1;
      if (criterion.ambiguous) ambiguousRows += 1;
      if (rejected) rejectedRows += 1;
      if (unexpectedRejected) unexpectedRejectedRows += 1;
      if (falseHighConfidenceMark) falseHighConfidenceMarks += 1;
      totalRows += 1;

      return {
        criterionName: criterion.criterionName,
        expectedScore,
        detectedScore: criterion.detectedScore,
        exactMatch,
        ambiguous: criterion.ambiguous,
        confidence: criterion.confidence,
        rejected,
        unexpectedRejected,
        falseHighConfidenceMark,
      };
    });

    const exactRowCount = rows.filter((row) => row.exactMatch).length;
    const exactSheetMatch = exactRowCount === rows.length;
    const totalDelta = Math.abs(sample.expectedTotal - result.computedTotal);
    const rejectedRowCount = result.payload.machineReadable?.markQuality?.rejectedRowCount || 0;
    const acceptedSheet = (sample.expectedRejectedRows || []).length === 0;
    const manualAttentionRowCount = rows.filter((row) =>
      row.ambiguous
      || row.rejected
      || !row.exactMatch,
    ).length;
    manualAttentionRows += manualAttentionRowCount;
    if (acceptedSheet) {
      maxRejectedRowsOnAcceptedSheet = Math.max(maxRejectedRowsOnAcceptedSheet, rejectedRowCount);
    }
    if (exactSheetMatch) exactSheetMatches += 1;
    totalDeltaSum += totalDelta;
    const sampleOutcome = classifyV3SampleOutcome(result, rows);

    perPage.push({
      id: sample.id,
      label: sample.label,
      captureType: sample.captureType,
      context: {
        contestantName: sample.contestantName || null,
        judgeName: sample.judgeName || null,
      },
      upload: {
        sourcePath: sample.sourcePath || null,
        originalFileType: sample.sourcePath ? inferUploadFileType(sample.sourcePath) : 'synthetic/generated',
        normalizedFileType: 'image/raw-rgb-normalized',
        conversionRequired: false,
        converted: false,
        conversionFailure: null,
      },
      templateKey: result.payload.templateKey,
      sheetVersion: result.payload.machineReadable?.sheetVersion || null,
      templateVersion: result.payload.machineReadable?.templateVersion || null,
      parserVersion: result.payload.machineReadable?.templateVersion || null,
      preprocessingMode: result.payload.preprocessingMode,
      thresholdStrategy: result.payload.thresholdStrategy,
      sourcePath: sample.sourcePath || null,
      expectedTotal: sample.expectedTotal,
      computedTotal: result.computedTotal,
      totalDelta,
      exactRowCount,
      rowCount: rows.length,
      exactRowMatchRate: rows.length > 0 ? exactRowCount / rows.length : 0,
      exactSheetMatch,
      ambiguousRowCount: rows.filter((row) => row.ambiguous).length,
      rejectedRowCount,
      expectedRejectedRows: sample.expectedRejectedRows || [],
      rejectedRows: result.payload.machineReadable?.rejectedRows || [],
      falseHighConfidenceMarkCount: rows.filter((row) => row.falseHighConfidenceMark).length,
      failureCategories: sampleOutcome.failureCategories,
      failureReasons: sampleOutcome.failureReasons,
      anchorQuality: result.payload.machineReadable?.anchorQuality || null,
      markQuality: result.payload.machineReadable?.markQuality || null,
      ignoredRegions: result.payload.machineReadable?.ignoredRegions || [],
      qualityGate: result.payload.qualityGate,
      runtimeMs: Number(runtimeMs.toFixed(2)),
      rows,
    });
  };

  for (const sample of syntheticSamples) {
    const normalized = renderV3SyntheticSample(sample, orderedCriteria, [...template.scoreColumns]);
    const startedAt = process.hrtime.bigint();
    const result = service.extractScoresFromNormalizedImage(normalized, orderedCriteria, template);
    const runtimeMs = measureRuntimeMs(startedAt);
    recordV3SampleResult(sample, result, runtimeMs);
  }

  for (const phonePhotoSample of V3_PHONE_PHOTO_SAMPLES) {
    const sourcePath = path.resolve(process.cwd(), phonePhotoSample.sourcePath);
    if (!fs.existsSync(sourcePath)) {
      skippedPhonePhotoSamples.push({
        id: phonePhotoSample.id,
        sourcePath: phonePhotoSample.sourcePath,
        upload: {
          originalFileType: inferUploadFileType(phonePhotoSample.sourcePath),
          conversionRequired: false,
        },
        skipCategory: 'source_file_missing',
        reason: 'source file not found',
      });
      continue;
    }

    try {
      const groundTruthSample = findV3PhonePhotoGroundTruth(family, phonePhotoSample);
      if (!groundTruthSample) {
        throw new Error(
          `Missing v3 phone-photo ground truth for ${phonePhotoSample.id}: `
          + `${phonePhotoSample.judgeName} / ${phonePhotoSample.contestantName}`,
        );
      }

      const expectedScoresByCriterion = buildExpectedScoresByCriterion(
        orderedCriteria,
        groundTruthSample,
        phonePhotoSample,
      );
      const expectedTotal = groundTruthSample.handwrittenTotal
        ?? sumExpectedScores(expectedScoresByCriterion);
      const sourceBuffer = fs.readFileSync(sourcePath);
      const startedAt = process.hrtime.bigint();
      const normalized = await service.normalizePage(sourceBuffer, {
        preprocessingMode: 'standard',
        thresholdStrategy: 'none',
      });
      const result = service.extractScoresFromNormalizedImage(normalized, orderedCriteria, template);
      const runtimeMs = measureRuntimeMs(startedAt);

      recordV3SampleResult(
        {
          ...phonePhotoSample,
          expectedScoresByCriterion,
          expectedTotal,
        },
        result,
        runtimeMs,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      skippedPhonePhotoSamples.push({
        id: phonePhotoSample.id,
        sourcePath: phonePhotoSample.sourcePath,
        upload: {
          originalFileType: inferUploadFileType(phonePhotoSample.sourcePath),
          conversionRequired: false,
        },
        skipCategory: classifyPhonePhotoSkipCategory(reason, phonePhotoSample.sourcePath),
        reason,
      });
    }
  }

  const sheetCount = perPage.length;
  const metrics = {
    exactRowMatchRate: totalRows > 0 ? exactRowMatches / totalRows : 0,
    exactSheetMatchRate: sheetCount > 0 ? exactSheetMatches / sheetCount : 0,
    exactRowMatches,
    totalRows,
    exactSheetMatches,
    totalSheets: sheetCount,
    ambiguousRows,
    rejectedRows,
    unexpectedRejectedRows,
    incorrectRows,
    falseHighConfidenceMarks,
    totalDeltaSum,
    averageTotalDelta: sheetCount > 0 ? totalDeltaSum / sheetCount : 0,
    averageRuntimeMs: sheetCount > 0 ? runtimeMsTotal / sheetCount : 0,
    maxRejectedRowsOnAcceptedSheet,
    captureTypeCounts,
    skippedPhonePhotoSampleCount: skippedPhonePhotoSamples.length,
    sameUserManualEntryRows: totalRows,
    v3ManualAttentionRows: manualAttentionRows,
    estimatedManualEntryRowReductionRate: totalRows > 0
      ? 1 - (manualAttentionRows / totalRows)
      : 0,
  };
  const rolloutPolicy = evaluateV3Policy(
    metrics,
    thresholdConfig.machineReadableThresholds?.[V3_TEMPLATE_KEY] || V3_ASSURANCE_THRESHOLDS,
  );

  return {
    templateKey: V3_TEMPLATE_KEY,
    displayName: 'Education OMR v3',
    mode,
    pass: rolloutPolicy.eligibleBands.reviewRequired
      && rolloutPolicy.autoCertifyEnabled === false,
    metrics,
    rolloutPolicy,
    legacyAssuranceGuard: {
      v1TemplateKey: 'education_saturday_day_v1',
      v3TemplateKey: V3_TEMPLATE_KEY,
      protected: true,
      reason: 'education_omr_v3 is explicit/detected only; criteria-only inference remains education_saturday_day_v1.',
    },
    perPage,
    skippedPhonePhotoSamples,
  };
};

const printHumanReport = (report) => {
  console.log(`Scoresheet import regression report (${report.mode})`);
  console.log(`Result: ${report.pass ? 'PASS' : 'FAIL'}`);

  for (const family of report.templates) {
    console.log('');
    console.log(`${family.displayName} [${family.templateKey}]`);
    console.log(
      `  selected preprocessing: ${family.selectedVariantLabel}`
      + ` (${family.selectedImprovesBaseline ? 'adopted improvement' : 'baseline retained'})`,
    );
    console.log(
      `  exact-row-match: ${(family.metrics.exactRowMatchRate * 100).toFixed(1)}%`
      + ` (threshold ${(family.thresholds.minExactRowMatchRate * 100).toFixed(1)}%)`,
    );
    console.log(
      `  avg incorrect rows/page: ${family.metrics.averageIncorrectRowsPerPage.toFixed(2)}`,
    );
    console.log(
      `  max total delta: ${family.metrics.maxPageTotalDelta}`
      + ` (threshold ${family.thresholds.maxPageTotalDelta})`,
    );
    console.log(
      `  max ambiguous rows/page: ${family.metrics.maxAmbiguousRowsPerPage}`
      + ` (threshold ${family.thresholds.maxAmbiguousRowsPerPage})`,
    );
    console.log(
      `  false high-confidence marks: ${family.metrics.falseHighConfidenceMarks}`,
    );
    console.log(
      `  quality-gate rejected pages: ${family.metrics.qualityGateRejectedPages}/${family.perPage.length}`
      + ` (${(family.metrics.qualityGateRejectedPageRate * 100).toFixed(1)}%)`,
    );
    console.log(
      `  avg estimated correction rows/page: ${family.metrics.averageEstimatedManualCorrectionRowsPerPage.toFixed(2)}`,
    );

    family.variants.forEach((variant) => {
      console.log(
        `  - ${variant.variantLabel}: exact ${(variant.metrics.exactRowMatchRate * 100).toFixed(1)}%,`
        + ` incorrect/page ${variant.metrics.averageIncorrectRowsPerPage.toFixed(2)},`
        + ` ambiguous/page ${variant.metrics.averageAmbiguousRowsPerPage.toFixed(2)},`
        + ` estimated corrections/page ${variant.metrics.averageEstimatedManualCorrectionRowsPerPage.toFixed(2)},`
        + ` gate rejects ${variant.metrics.qualityGateRejectedPages}/${variant.perPage.length},`
        + ` max delta ${variant.metrics.maxPageTotalDelta},`
        + ` false high-confidence ${variant.metrics.falseHighConfidenceMarks},`
        + ` ${variant.pass ? 'pass' : 'fail'}`,
      );
    });

    console.log('  selected pages:');
    family.perPage.forEach((page) => {
      const sourcePrefix = page.sourcePdfKey ? `${page.sourcePdfKey} ` : '';
      console.log(
        `    ${sourcePrefix}page ${page.page}: total ${page.computedTotal}/${page.expectedTotal}`
        + ` (delta ${page.totalDelta}), exact rows ${page.exactRowCount}/${page.rowCount},`
        + ` incorrect ${page.incorrectRowCount}, ambiguous ${page.ambiguousRowCount},`
        + ` estimated corrections ${page.reviewBurdenMetrics?.estimatedManualCorrectionRows ?? 'n/a'},`
        + ` gate ${page.qualityGate?.decision ?? 'n/a'},`
        + ` false high-confidence ${page.falseHighConfidenceMarkCount},`
        + ` ${page.passesModeThresholds ? 'pass' : 'fail'}`,
      );
    });
  }

  if (report.machineReadableV3) {
    const v3 = report.machineReadableV3;
    console.log('');
    console.log(`${v3.displayName} [${v3.templateKey}] assurance validation`);
    console.log(
      `  exact-row-match: ${(v3.metrics.exactRowMatchRate * 100).toFixed(1)}%`,
    );
    console.log(
      `  exact-sheet-match: ${(v3.metrics.exactSheetMatchRate * 100).toFixed(1)}%`
      + ` (${v3.metrics.exactSheetMatches}/${v3.metrics.totalSheets})`,
    );
    console.log(
      `  ambiguous rows: ${v3.metrics.ambiguousRows}; rejected rows: ${v3.metrics.rejectedRows};`
      + ` unexpected rejected rows: ${v3.metrics.unexpectedRejectedRows}`,
    );
    console.log(
      `  false high-confidence marks: ${v3.metrics.falseHighConfidenceMarks}`,
    );
    console.log(
      `  total delta sum: ${v3.metrics.totalDeltaSum}; avg runtime: ${v3.metrics.averageRuntimeMs.toFixed(2)}ms/sheet`,
    );
    console.log(
      `  evidence: synthetic ${v3.rolloutPolicy.evidence.syntheticSheetCount},`
      + ` phone-photo ${v3.rolloutPolicy.evidence.realPhonePhotoSheetCount},`
      + ` scanner ${v3.rolloutPolicy.evidence.realScannerSheetCount}`,
    );
    console.log(
      `  manual-entry comparison: ${v3.metrics.v3ManualAttentionRows}/${v3.metrics.sameUserManualEntryRows}`
      + ` rows need attention (${(v3.metrics.estimatedManualEntryRowReductionRate * 100).toFixed(1)}% row reduction)`,
    );
    console.log(
      `  policy band: ${v3.rolloutPolicy.recommendedBand}; auto-submit ${v3.rolloutPolicy.autoSubmitEnabled ? 'enabled' : 'disabled'};`
      + ` auto-certify ${v3.rolloutPolicy.autoCertifyEnabled ? 'enabled' : 'disabled'}`,
    );
    console.log(`  go/no-go: ${v3.rolloutPolicy.goNoGo}`);
    console.log(`  legacy guard: ${v3.legacyAssuranceGuard.reason}`);
    console.log('  selected v3 samples:');
    v3.perPage.forEach((page) => {
      console.log(
        `    ${page.id}: exact rows ${page.exactRowCount}/${page.rowCount},`
        + ` sheet ${page.exactSheetMatch ? 'match' : 'mismatch'},`
        + ` rejected ${page.rejectedRowCount}, ambiguous ${page.ambiguousRowCount},`
        + ` false high-confidence ${page.falseHighConfidenceMarkCount},`
        + ` failure ${page.failureCategories.join('/')},`
        + ` upload ${page.upload.originalFileType},`
        + ` total ${page.computedTotal}/${page.expectedTotal} (delta ${page.totalDelta}),`
        + ` runtime ${page.runtimeMs}ms`,
      );
    });
    if (v3.skippedPhonePhotoSamples.length > 0) {
      console.log('  skipped phone-photo samples:');
      v3.skippedPhonePhotoSamples.forEach((sample) => {
        console.log(`    ${sample.id}: ${sample.skipCategory} - ${sample.reason} (${sample.sourcePath})`);
      });
    }
  }
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const groundTruth = loadJson(args.groundTruthPath);
  const thresholdConfig = loadJson(args.thresholdsPath);
  const service = new ScoreSheetImportService({});

  const templates = [];
  for (const family of groundTruth.intendedPhase1Families) {
    templates.push(await evaluateFamily(service, groundTruth, thresholdConfig, family, args.mode));
  }
  const machineReadableV3 = await evaluateMachineReadableV3(
    service,
    groundTruth,
    thresholdConfig,
    args.mode,
  );

  const report = {
    mode: args.mode,
    groundTruthPath: args.groundTruthPath,
    thresholdsPath: args.thresholdsPath,
    pass: templates.every((template) => template.pass) && machineReadableV3.pass,
    templates,
    machineReadableV3,
  };

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHumanReport(report);
  }

  process.exit(report.pass ? 0 : 1);
};

main().catch((error) => {
  console.error('Scoresheet import regression harness failed');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
