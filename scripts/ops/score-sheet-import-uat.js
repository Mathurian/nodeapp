#!/usr/bin/env node

require('reflect-metadata');

const path = require('path');
const sharp = require('sharp');
const groundTruth = require('../../tests/examples/scoresheet-import/route66-phase1-ground-truth.json');
const { ScoreSheetImportService } = require('../../dist/services/ScoreSheetImportService');

const buildCriteriaForTemplate = (family) =>
  family.criterionOrder
    .slice()
    .sort((left, right) => left.localeCompare(right))
    .map((name, index) => ({
      id: `criterion-${index + 1}`,
      name,
      maxScore: 6,
    }));

const buildShadowSvg = (width, height, opacity) => Buffer.from(`
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="shadow" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="rgba(0,0,0,${opacity})"/>
        <stop offset="45%" stop-color="rgba(0,0,0,${opacity * 0.55})"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${width}" height="${height}" fill="url(#shadow)"/>
  </svg>
`);

const buildGlareSvg = (width, height, opacity) => Buffer.from(`
  <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="glare" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="rgba(255,255,255,0)"/>
        <stop offset="48%" stop-color="rgba(255,255,255,0)"/>
        <stop offset="70%" stop-color="rgba(255,255,255,${opacity})"/>
        <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${width}" height="${height}" fill="url(#glare)"/>
  </svg>
`);

const applyPhoneTransforms = async (buffer, profile) => {
  const base = sharp(buffer).flatten({ background: '#ffffff' });

  if (profile.id === 'scan_clean') {
    return base.png().toBuffer();
  }

  const extended = base.extend({
    top: profile.extend,
    bottom: profile.extend,
    left: profile.extend,
    right: profile.extend,
    background: '#ffffff',
  });

  let image = extended
    .affine(
      [
        [1, profile.skewX],
        [profile.skewY, 1],
      ],
      { background: '#ffffff' },
    )
    .rotate(profile.rotate, { background: '#ffffff' })
    .modulate({
      brightness: profile.brightness,
      saturation: profile.saturation,
    });

  if (profile.blurSigma > 0) {
    image = image.blur(profile.blurSigma);
  }

  const metadata = await image.metadata();
  const width = metadata.width || 1600;
  const height = metadata.height || 2200;

  image = image.composite([
    {
      input: buildShadowSvg(width, height, profile.shadowOpacity),
      blend: 'multiply',
    },
    {
      input: buildGlareSvg(width, height, profile.glareOpacity),
      blend: 'screen',
    },
  ]);

  if (profile.cropInset > 0) {
    image = image.extract({
      left: profile.cropInset,
      top: profile.cropInset,
      width: Math.max(1, width - (profile.cropInset * 2)),
      height: Math.max(1, height - (profile.cropInset * 2)),
    });
  }

  return image.jpeg({ quality: profile.jpegQuality }).toBuffer();
};

const PROFILES = [
  {
    id: 'scan_clean',
    label: 'Clean PDF scan',
    captureType: 'representative_scan',
  },
  {
    id: 'phone_supported_mild',
    label: 'Phone-style mild skew and shadow',
    captureType: 'synthetic_phone_photo_supported',
    extend: 44,
    rotate: 1.25,
    skewX: -0.018,
    skewY: 0.01,
    brightness: 0.97,
    saturation: 0.92,
    blurSigma: 0.3,
    shadowOpacity: 0.09,
    glareOpacity: 0.04,
    cropInset: 0,
    jpegQuality: 88,
  },
  {
    id: 'phone_borderline',
    label: 'Phone-style borderline lighting and skew',
    captureType: 'synthetic_phone_photo_borderline',
    extend: 54,
    rotate: -2.2,
    skewX: 0.03,
    skewY: -0.02,
    brightness: 0.92,
    saturation: 0.88,
    blurSigma: 0.75,
    shadowOpacity: 0.16,
    glareOpacity: 0.08,
    cropInset: 16,
    jpegQuality: 76,
  },
];

const evaluatePage = (result, sample) => {
  const rows = result.payload.criteria.map((criterion) => {
    const expectedScore = sample.criterionScores[criterion.criterionName];
    const exactMatch = criterion.detectedScore === expectedScore;

    return {
      criterionName: criterion.criterionName,
      expectedScore,
      detectedScore: criterion.detectedScore,
      exactMatch,
      ambiguous: criterion.ambiguous,
      confidence: criterion.confidence,
    };
  });

  const exactRowCount = rows.filter((row) => row.exactMatch).length;
  const ambiguousRowCount = rows.filter((row) => row.ambiguous).length;
  const incorrectRowCount = rows.length - exactRowCount;

  return {
    expectedTotal: sample.handwrittenTotal,
    computedTotal: result.computedTotal,
    totalDelta: Math.abs((sample.handwrittenTotal || 0) - (result.computedTotal || 0)),
    exactRowCount,
    rowCount: rows.length,
    ambiguousRowCount,
    incorrectRowCount,
    exactRowMatchRate: rows.length > 0 ? exactRowCount / rows.length : 0,
    rows,
  };
};

const summarizeRuns = (runs) => {
  const aggregate = {
    pages: runs.length,
    exactRowCount: 0,
    rowCount: 0,
    ambiguousRowCount: 0,
    incorrectRowCount: 0,
    maxTotalDelta: 0,
  };

  for (const run of runs) {
    aggregate.exactRowCount += run.metrics.exactRowCount;
    aggregate.rowCount += run.metrics.rowCount;
    aggregate.ambiguousRowCount += run.metrics.ambiguousRowCount;
    aggregate.incorrectRowCount += run.metrics.incorrectRowCount;
    aggregate.maxTotalDelta = Math.max(aggregate.maxTotalDelta, run.metrics.totalDelta);
  }

  return {
    pages: aggregate.pages,
    exactRowMatchRate: aggregate.rowCount > 0 ? aggregate.exactRowCount / aggregate.rowCount : 0,
    averageIncorrectRowsPerPage: aggregate.pages > 0 ? aggregate.incorrectRowCount / aggregate.pages : 0,
    averageAmbiguousRowsPerPage: aggregate.pages > 0 ? aggregate.ambiguousRowCount / aggregate.pages : 0,
    maxTotalDelta: aggregate.maxTotalDelta,
  };
};

const printHumanReport = (report) => {
  console.log(`Scoresheet import UAT report for ${report.displayName} [${report.templateKey}]`);
  console.log(`Source PDF: ${report.sourcePdf}`);
  console.log('');

  report.profiles.forEach((profile) => {
    console.log(`${profile.label} (${profile.captureType})`);
    console.log(
      `  exact-row-match: ${(profile.summary.exactRowMatchRate * 100).toFixed(1)}%`
      + `, avg incorrect rows/page: ${profile.summary.averageIncorrectRowsPerPage.toFixed(2)}`
      + `, avg ambiguous rows/page: ${profile.summary.averageAmbiguousRowsPerPage.toFixed(2)}`
      + `, max total delta: ${profile.summary.maxTotalDelta}`,
    );

    profile.pages.forEach((page) => {
      console.log(
        `  - page ${page.page}: exact rows ${page.metrics.exactRowCount}/${page.metrics.rowCount},`
        + ` incorrect ${page.metrics.incorrectRowCount}, ambiguous ${page.metrics.ambiguousRowCount},`
        + ` total ${page.metrics.computedTotal}/${page.metrics.expectedTotal}`
        + ` (delta ${page.metrics.totalDelta})`,
      );
    });

    console.log('');
  });
};

const main = async () => {
  const family = groundTruth.intendedPhase1Families.find(
    (candidate) => candidate.templateKey === 'education_saturday_day_v1',
  );

  if (!family) {
    throw new Error('Education family is missing from the ground-truth dataset');
  }

  const service = new ScoreSheetImportService({});
  const pdfPath = path.resolve(process.cwd(), groundTruth.sourcePdf);
  const criteria = buildCriteriaForTemplate(family);
  const template = service.resolveTemplate(criteria, { intent: 'SCORESHEET_IMPORT' }, {
    templateKey: family.templateKey,
  });
  const orderedCriteria = service.orderCriteriaForTemplate(criteria, template);

  const profiles = [];

  for (const profile of PROFILES) {
    const pageRuns = [];

    for (const sample of family.samples) {
      const rendered = await service.renderPdfPage(pdfPath, sample.page);
      const captureBuffer = await applyPhoneTransforms(rendered.buffer, profile);
      const normalized = await service.normalizePage(captureBuffer);
      const result = service.extractScoresFromNormalizedImage(normalized, orderedCriteria, template);
      const metrics = evaluatePage(result, sample);

      pageRuns.push({
        page: sample.page,
        contestantName: sample.contestantName,
        judgeName: sample.judgeName,
        captureType: profile.captureType,
        metrics,
      });
    }

    profiles.push({
      id: profile.id,
      label: profile.label,
      captureType: profile.captureType,
      summary: summarizeRuns(pageRuns),
      pages: pageRuns,
    });
  }

  const report = {
    templateKey: family.templateKey,
    displayName: family.displayName,
    sourcePdf: groundTruth.sourcePdf,
    profiles,
  };

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  printHumanReport(report);
};

main().catch((error) => {
  console.error('Scoresheet import UAT harness failed');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
