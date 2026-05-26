#!/usr/bin/env node

require('reflect-metadata');

const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');
const { ScoreSheetImportService } = require('../../dist/services/ScoreSheetImportService');
const { scoreSheetImportTemplateMap } = require('../../dist/config/scoreSheetImportTemplates');

const DEFAULT_INPUT_DIR = 'temp/scoresheet-corpus-intake';
const DEFAULT_OUTPUT_DIR = 'temp/scoresheet-corpus-intake/diagnostics';
const DEFAULT_IMAGE_NAMES = Array.from({ length: 8 }, (_value, index) => `IMG_${5152 + index}.jpeg`);

const VARIANTS = [
  { id: 'standard', preprocessingMode: 'standard', thresholdStrategy: 'none' },
  { id: 'scan_bw_otsu', preprocessingMode: 'scan_bw', thresholdStrategy: 'otsu' },
  { id: 'scan_bw_fixed_150', preprocessingMode: 'scan_bw', thresholdStrategy: 'fixed_150' },
  { id: 'scan_bw_fixed_170', preprocessingMode: 'scan_bw', thresholdStrategy: 'fixed_170' },
  { id: 'scan_bw_fixed_190', preprocessingMode: 'scan_bw', thresholdStrategy: 'fixed_190' },
];

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    inputDir: DEFAULT_INPUT_DIR,
    outputDir: DEFAULT_OUTPUT_DIR,
    imageNames: DEFAULT_IMAGE_NAMES,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];
    if ((arg === '--input-dir' || arg === '--input') && next) {
      options.inputDir = next;
      index += 1;
    } else if ((arg === '--output-dir' || arg === '--out') && next) {
      options.outputDir = next;
      index += 1;
    } else if (arg === '--images' && next) {
      options.imageNames = next.split(',').map((value) => value.trim()).filter(Boolean);
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      console.log([
        'Usage: node scripts/ops/score-sheet-v3-diagnostics.js [options]',
        '',
        'Options:',
        '  --input-dir <path>   Source image directory (default: temp/scoresheet-corpus-intake)',
        '  --output-dir <path>  Diagnostic artifact directory (default: temp/scoresheet-corpus-intake/diagnostics)',
        '  --images <csv>       Comma-separated image names to evaluate',
      ].join('\n'));
      process.exit(0);
    }
  }

  return {
    inputDir: path.resolve(process.cwd(), options.inputDir),
    outputDir: path.resolve(process.cwd(), options.outputDir),
    imageNames: options.imageNames,
  };
};

const escapeXml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const artifactBaseName = (imageName, variantId) =>
  `${path.basename(imageName, path.extname(imageName))}-${variantId}`;

const writeRawPng = async (image, outputPath) => {
  await sharp(image.data, {
    raw: {
      width: image.width,
      height: image.height,
      channels: image.channels,
    },
  })
    .png()
    .toFile(outputPath);
};

const writeRawOverlayPng = async (image, svg, outputPath) => {
  await sharp(image.data, {
    raw: {
      width: image.width,
      height: image.height,
      channels: image.channels,
    },
  })
    .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
    .png()
    .toFile(outputPath);
};

const drawSourceOverlaySvg = (report, imageName, variantId) => {
  const { width, height } = report.normalizedImage;
  const corners = report.fiducials.corners || {};
  const cornerEntries = Object.entries(corners);
  const polygonPoints = ['tl', 'tr', 'br', 'bl']
    .map((key) => corners[key] ? `${corners[key].x},${corners[key].y}` : null)
    .filter(Boolean)
    .join(' ');
  const cornerRects = cornerEntries.map(([label, point]) => {
    const left = point.x - (point.width / 2);
    const top = point.y - (point.height / 2);
    const color = report.fiducials.detected ? '#16a34a' : '#dc2626';
    return [
      `<rect x="${left}" y="${top}" width="${point.width}" height="${point.height}" fill="none" stroke="${color}" stroke-width="4" />`,
      `<text x="${point.x + 8}" y="${point.y - 8}" class="label ${report.fiducials.detected ? 'ok' : 'bad'}">${escapeXml(label)} ${point.fillRatio}</text>`,
    ].join('\n');
  }).join('\n');
  const notes = report.diagnosticNotes.slice(0, 4).map((note, index) =>
    `<text x="20" y="${height - 86 + (index * 20)}" class="note">${escapeXml(note)}</text>`,
  ).join('\n');

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    .title { font: 700 18px Arial, sans-serif; fill: #0f172a; paint-order: stroke; stroke: #fff; stroke-width: 4px; }
    .label { font: 700 16px Arial, sans-serif; paint-order: stroke; stroke: #fff; stroke-width: 4px; }
    .ok { fill: #15803d; }
    .bad { fill: #b91c1c; }
    .note { font: 700 14px Arial, sans-serif; fill: #111827; paint-order: stroke; stroke: #fff; stroke-width: 4px; }
  </style>
  <rect x="4" y="4" width="${width - 8}" height="${height - 8}" fill="none" stroke="#2563eb" stroke-width="4" stroke-dasharray="16 10" />
  ${polygonPoints ? `<polygon points="${polygonPoints}" fill="rgba(37,99,235,0.08)" stroke="#2563eb" stroke-width="3" />` : ''}
  ${cornerRects}
  <text x="20" y="32" class="title">${escapeXml(imageName)} ${escapeXml(variantId)} source fiducials: ${report.fiducials.detected ? 'accepted' : 'rejected'}</text>
  ${notes}
</svg>`;
};

const drawCanonicalOverlaySvg = (report, imageName, variantId) => {
  const { width, height } = report.canonicalImage;
  const selectedCells = [];
  const sampleCircles = [];
  const rowLabels = [];

  report.rows.forEach((row) => {
    row.cells.forEach((cell) => {
      let stroke = '#94a3b8';
      let fill = 'rgba(148,163,184,0.04)';
      let strokeWidth = 1.5;
      if (cell.markedAsMultiMark) {
        stroke = '#7c3aed';
        fill = 'rgba(124,58,237,0.16)';
        strokeWidth = 4;
      } else if (cell.selected && row.ambiguous) {
        stroke = '#f97316';
        fill = 'rgba(249,115,22,0.18)';
        strokeWidth = 4;
      } else if (cell.selected) {
        stroke = '#16a34a';
        fill = 'rgba(22,163,74,0.18)';
        strokeWidth = 4;
      }

      selectedCells.push(
        `<rect x="${cell.bounds.left}" y="${cell.bounds.top}" width="${cell.bounds.width}" height="${cell.bounds.height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`,
      );
      if (cell.selected || cell.markedAsMultiMark) {
        sampleCircles.push(
          `<circle cx="${cell.sample.centerX}" cy="${cell.sample.centerY}" r="${cell.sample.radius}" fill="none" stroke="${stroke}" stroke-width="3" />`,
        );
      }
    });

    const firstCell = row.cells[0];
    if (firstCell) {
      const label = row.ambiguous
        ? `row ${row.rowIndex + 1}: ${row.rejectionReason || 'ambiguous'} top=${row.topCellScore}`
        : `row ${row.rowIndex + 1}: score=${row.detectedScore} top=${row.topCellScore}`;
      rowLabels.push(
        `<text x="12" y="${firstCell.bounds.top + 18}" class="${row.ambiguous ? 'rowbad' : 'rowok'}">${escapeXml(label)}</text>`,
      );
    }
  });

  const anchorRects = Object.entries(report.canonicalAnchors).map(([label, point]) =>
    `<g><circle cx="${point.x}" cy="${point.y}" r="11" fill="none" stroke="#2563eb" stroke-width="4" /><text x="${point.x + 12}" y="${point.y - 8}" class="anchor">${escapeXml(label)}</text></g>`,
  ).join('\n');
  const ignoredRegions = report.ignoredRegions.map((region) => {
    const left = region.left * width;
    const top = region.top * height;
    const regionWidth = (region.right - region.left) * width;
    const regionHeight = (region.bottom - region.top) * height;
    return `<rect x="${left}" y="${top}" width="${regionWidth}" height="${regionHeight}" fill="rgba(2,132,199,0.05)" stroke="#0284c7" stroke-width="3" stroke-dasharray="12 8" />`;
  }).join('\n');

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    .title { font: 700 18px Arial, sans-serif; fill: #0f172a; paint-order: stroke; stroke: #fff; stroke-width: 4px; }
    .rowok { font: 700 13px Arial, sans-serif; fill: #166534; paint-order: stroke; stroke: #fff; stroke-width: 4px; }
    .rowbad { font: 700 13px Arial, sans-serif; fill: #b91c1c; paint-order: stroke; stroke: #fff; stroke-width: 4px; }
    .anchor { font: 700 14px Arial, sans-serif; fill: #1d4ed8; paint-order: stroke; stroke: #fff; stroke-width: 4px; }
  </style>
  <rect x="4" y="4" width="${width - 8}" height="${height - 8}" fill="none" stroke="#2563eb" stroke-width="4" />
  ${ignoredRegions}
  ${selectedCells.join('\n')}
  ${sampleCircles.join('\n')}
  ${anchorRects}
  ${rowLabels.join('\n')}
  <text x="20" y="32" class="title">${escapeXml(imageName)} ${escapeXml(variantId)} canonical grid: ${escapeXml(report.failureClassification)}</text>
</svg>`;
};

const stripImageData = (image) => ({
  width: image.width,
  height: image.height,
  channels: image.channels,
  bounds: image.bounds,
  preprocessing: image.preprocessing,
});

const toSerializableReport = (report, artifacts) => ({
  ...report,
  normalizedImage: stripImageData(report.normalizedImage),
  canonicalImage: stripImageData(report.canonicalImage),
  artifacts,
});

const chooseBestVariant = (variants) => variants
  .slice()
  .sort((left, right) =>
    right.report.markQuality.acceptedRowCount - left.report.markQuality.acceptedRowCount
    || left.report.markQuality.rejectedRowCount - right.report.markQuality.rejectedRowCount
    || right.report.overallConfidence - left.report.overallConfidence
  )[0];

const buildEducationCriteria = (template) => template.criteria.map((criterion, index) => ({
  id: `criterion-${index + 1}`,
  name: criterion.label,
  maxScore: 6,
}));

const main = async () => {
  const { inputDir, outputDir, imageNames } = parseArgs();
  const service = new ScoreSheetImportService({});
  const template = scoreSheetImportTemplateMap.get('education_omr_v3');
  if (!template) {
    throw new Error('Missing education_omr_v3 template');
  }

  await fs.mkdir(outputDir, { recursive: true });
  const criteria = buildEducationCriteria(template);
  const summary = {
    generatedAt: new Date().toISOString(),
    inputDir: path.relative(process.cwd(), inputDir),
    outputDir: path.relative(process.cwd(), outputDir),
    templateKey: 'education_omr_v3',
    images: [],
  };

  for (const imageName of imageNames) {
    const inputPath = path.join(inputDir, imageName);
    const fileBuffer = await fs.readFile(inputPath);
    const imageSummary = {
      imageName,
      variants: [],
      bestVariant: null,
    };

    for (const variant of VARIANTS) {
      const report = await service.buildV3PhonePhotoDiagnosticReport({
        fileBuffer,
        criteria,
        template,
        preprocessingMode: variant.preprocessingMode,
        thresholdStrategy: variant.thresholdStrategy,
      });
      const baseName = artifactBaseName(imageName, variant.id);
      const artifacts = {
        normalizedImage: `${baseName}-normalized.png`,
        sourceOverlay: `${baseName}-source-overlay.png`,
        canonicalImage: `${baseName}-canonical.png`,
        canonicalOverlay: `${baseName}-canonical-overlay.png`,
        reportJson: `${baseName}.json`,
      };

      await writeRawPng(report.normalizedImage, path.join(outputDir, artifacts.normalizedImage));
      await writeRawOverlayPng(
        report.normalizedImage,
        drawSourceOverlaySvg(report, imageName, variant.id),
        path.join(outputDir, artifacts.sourceOverlay),
      );
      await writeRawPng(report.canonicalImage, path.join(outputDir, artifacts.canonicalImage));
      await writeRawOverlayPng(
        report.canonicalImage,
        drawCanonicalOverlaySvg(report, imageName, variant.id),
        path.join(outputDir, artifacts.canonicalOverlay),
      );
      await fs.writeFile(
        path.join(outputDir, artifacts.reportJson),
        `${JSON.stringify(toSerializableReport(report, artifacts), null, 2)}\n`,
      );

      imageSummary.variants.push({
        variantId: variant.id,
        acceptedRows: report.markQuality.acceptedRowCount,
        rejectedRows: report.markQuality.rejectedRowCount,
        failureClassification: report.failureClassification,
        geometryWarnings: report.geometryWarnings,
        perspectiveCorrected: report.perspectiveCorrected,
        fiducialsDetected: report.fiducials.detected,
        fiducialConfidence: report.fiducials.confidence,
        qualityGate: report.qualityGate.decision,
        reportJson: artifacts.reportJson,
        canonicalOverlay: artifacts.canonicalOverlay,
        sourceOverlay: artifacts.sourceOverlay,
        report,
      });
    }

    const best = chooseBestVariant(imageSummary.variants);
    imageSummary.bestVariant = best?.variantId || null;
    summary.images.push({
      imageName,
      bestVariant: imageSummary.bestVariant,
      variants: imageSummary.variants.map(({ report, ...variant }) => variant),
    });

    console.log(`${imageName}: best=${imageSummary.bestVariant}`);
    imageSummary.variants.forEach((variant) => {
      console.log(
        `  ${variant.variantId}: accepted=${variant.acceptedRows}/10 rejected=${variant.rejectedRows}/10 `
        + `class=${variant.failureClassification} fiducials=${variant.fiducialsDetected ? 'yes' : 'no'} `
        + `geometryWarnings=${variant.geometryWarnings.length} gate=${variant.qualityGate}`,
      );
    });
  }

  await fs.writeFile(
    path.join(outputDir, 'v3-diagnostics-summary.json'),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  console.log(`Wrote ${path.relative(process.cwd(), outputDir)}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
