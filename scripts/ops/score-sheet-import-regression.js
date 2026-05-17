#!/usr/bin/env node

require('reflect-metadata');

const path = require('path');
const groundTruth = require('../../tests/examples/scoresheet-import/route66-phase1-ground-truth.json');
const thresholdConfig = require('../../tests/examples/scoresheet-import/route66-phase1-thresholds.json');
const { ScoreSheetImportService } = require('../../dist/services/ScoreSheetImportService');

const VALID_MODES = new Set(['calibration', 'rollout']);

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

const evaluateFamily = async (service, pdfPath, family, mode) => {
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

  for (const sample of family.samples) {
    const rendered = await service.renderPdfPage(pdfPath, sample.page);
    const normalized = await service.normalizePage(rendered.buffer);
    const result = service.extractScoresFromNormalizedImage(normalized, orderedCriteria, template);
    const rows = result.payload.criteria.map((criterion) => {
      const expectedScore = sample.criterionScores[criterion.criterionName];
      const exactMatch = criterion.detectedScore === expectedScore;
      if (exactMatch) {
        exactRowMatches += 1;
      }
      if (criterion.ambiguous) {
        ambiguousRows += 1;
      }
      totalRows += 1;

      return {
        criterionName: criterion.criterionName,
        expectedScore,
        detectedScore: criterion.detectedScore,
        exactMatch,
        ambiguous: criterion.ambiguous,
        confidence: criterion.confidence,
      };
    });

    const totalDelta = Math.abs((sample.handwrittenTotal || 0) - (result.computedTotal || 0));
    const exactRowCount = rows.filter((row) => row.exactMatch).length;
    const ambiguousRowCount = rows.filter((row) => row.ambiguous).length;

    perPage.push({
      page: sample.page,
      contestantName: sample.contestantName,
      expectedTotal: sample.handwrittenTotal,
      computedTotal: result.computedTotal,
      totalDelta,
      exactRowCount,
      rowCount: rows.length,
      exactRowMatchRate: rows.length > 0 ? exactRowCount / rows.length : 0,
      ambiguousRowCount,
      passesModeThresholds:
        totalDelta <= thresholds.maxPageTotalDelta
        && ambiguousRowCount <= thresholds.maxAmbiguousRowsPerPage,
      rows,
    });
  }

  const exactRowMatchRate = totalRows > 0 ? exactRowMatches / totalRows : 0;
  const maxPageTotalDelta = perPage.reduce((max, page) => Math.max(max, page.totalDelta), 0);
  const maxAmbiguousRowsPerPage = perPage.reduce((max, page) => Math.max(max, page.ambiguousRowCount), 0);

  const pass =
    exactRowMatchRate >= thresholds.minExactRowMatchRate
    && maxPageTotalDelta <= thresholds.maxPageTotalDelta
    && maxAmbiguousRowsPerPage <= thresholds.maxAmbiguousRowsPerPage
    && perPage.every((page) => page.passesModeThresholds);

  return {
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
      maxPageTotalDelta,
      maxAmbiguousRowsPerPage,
    },
    perPage,
  };
};

const printHumanReport = (report) => {
  console.log(`Scoresheet import regression report (${report.mode})`);
  console.log(`Result: ${report.pass ? 'PASS' : 'FAIL'}`);

  for (const family of report.templates) {
    console.log('');
    console.log(`${family.displayName} [${family.templateKey}]`);
    console.log(
      `  exact-row-match: ${(family.metrics.exactRowMatchRate * 100).toFixed(1)}%`
      + ` (threshold ${(family.thresholds.minExactRowMatchRate * 100).toFixed(1)}%)`,
    );
    console.log(
      `  max total delta: ${family.metrics.maxPageTotalDelta}`
      + ` (threshold ${family.thresholds.maxPageTotalDelta})`,
    );
    console.log(
      `  max ambiguous rows/page: ${family.metrics.maxAmbiguousRowsPerPage}`
      + ` (threshold ${family.thresholds.maxAmbiguousRowsPerPage})`,
    );

    family.perPage.forEach((page) => {
      console.log(
        `  - page ${page.page}: total ${page.computedTotal}/${page.expectedTotal}`
        + ` (delta ${page.totalDelta}), exact rows ${page.exactRowCount}/${page.rowCount},`
        + ` ambiguous ${page.ambiguousRowCount}, ${page.passesModeThresholds ? 'pass' : 'fail'}`,
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
