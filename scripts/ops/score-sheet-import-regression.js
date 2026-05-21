#!/usr/bin/env node

require('reflect-metadata');

const path = require('path');
const groundTruth = require('../../tests/examples/scoresheet-import/route66-phase1-ground-truth.json');
const thresholdConfig = require('../../tests/examples/scoresheet-import/route66-phase1-thresholds.json');
const { ScoreSheetImportService } = require('../../dist/services/ScoreSheetImportService');

const VALID_MODES = new Set(['calibration', 'rollout']);
const FALSE_HIGH_CONFIDENCE_THRESHOLD = 0.75;
const MATERIAL_EXACT_ROW_MATCH_IMPROVEMENT = 0.05;
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
  const args = { mode: 'calibration', json: false };

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
    }
  }

  if (!VALID_MODES.has(args.mode)) {
    throw new Error(`Unsupported mode "${args.mode}". Use --mode=calibration or --mode=rollout.`);
  }

  return args;
};

const buildCriteriaForTemplate = (family) =>
  family.criterionOrder
    .slice()
    .sort((left, right) => left.localeCompare(right))
    .map((name, index) => ({
      id: `criterion-${index + 1}`,
      name,
      maxScore: 6,
    }));

const evaluateFamilyVariant = async (service, pdfPath, family, mode, variant) => {
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

  for (const sample of family.samples) {
    const rendered = await service.renderPdfPage(pdfPath, sample.page);
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

    perPage.push({
      page: sample.page,
      contestantName: sample.contestantName,
      preprocessingMode: result.payload.preprocessingMode,
      thresholdStrategy: result.payload.thresholdStrategy,
      qualitySignals: result.payload.qualitySignals,
      expectedTotal: sample.handwrittenTotal,
      computedTotal: result.computedTotal,
      totalDelta,
      exactRowCount,
      rowCount: rows.length,
      exactRowMatchRate: rows.length > 0 ? exactRowCount / rows.length : 0,
      incorrectRowCount,
      ambiguousRowCount,
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

const evaluateFamily = async (service, pdfPath, family, mode) => {
  const variants = [];
  for (const variant of PREPROCESSING_VARIANTS) {
    variants.push(await evaluateFamilyVariant(service, pdfPath, family, mode, variant));
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

    family.variants.forEach((variant) => {
      console.log(
        `  - ${variant.variantLabel}: exact ${(variant.metrics.exactRowMatchRate * 100).toFixed(1)}%,`
        + ` incorrect/page ${variant.metrics.averageIncorrectRowsPerPage.toFixed(2)},`
        + ` ambiguous/page ${variant.metrics.averageAmbiguousRowsPerPage.toFixed(2)},`
        + ` max delta ${variant.metrics.maxPageTotalDelta},`
        + ` false high-confidence ${variant.metrics.falseHighConfidenceMarks},`
        + ` ${variant.pass ? 'pass' : 'fail'}`,
      );
    });

    console.log('  selected pages:');
    family.perPage.forEach((page) => {
      console.log(
        `    page ${page.page}: total ${page.computedTotal}/${page.expectedTotal}`
        + ` (delta ${page.totalDelta}), exact rows ${page.exactRowCount}/${page.rowCount},`
        + ` incorrect ${page.incorrectRowCount}, ambiguous ${page.ambiguousRowCount},`
        + ` false high-confidence ${page.falseHighConfidenceMarkCount},`
        + ` ${page.passesModeThresholds ? 'pass' : 'fail'}`,
      );
    });
  }
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const service = new ScoreSheetImportService({});
  const pdfPath = path.resolve(process.cwd(), groundTruth.sourcePdf);

  const templates = [];
  for (const family of groundTruth.intendedPhase1Families) {
    templates.push(await evaluateFamily(service, pdfPath, family, args.mode));
  }

  const report = {
    mode: args.mode,
    pass: templates.every((template) => template.pass),
    templates,
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
