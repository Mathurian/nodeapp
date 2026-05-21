#!/usr/bin/env node

require('reflect-metadata');

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { performance } = require('perf_hooks');
const sharp = require('sharp');
const groundTruth = require('../../tests/examples/scoresheet-import/route66-phase1-ground-truth.json');
const { ScoreSheetImportService } = require('../../dist/services/ScoreSheetImportService');

const FALSE_HIGH_CONFIDENCE_THRESHOLD = 0.75;
const RECOMMENDED_HIGH_ASSURANCE_EXACT_ROW_RATE = 0.99;
const RECOMMENDED_MAX_FALSE_HIGH_CONFIDENCE_MARKS = 0;
const RECOMMENDED_MAX_INCORRECT_ROWS_PER_PAGE = 0.1;

const parseArgs = (argv) => {
  const args = { json: false };

  for (const arg of argv) {
    if (arg === '--json') {
      args.json = true;
    }
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

const buildFallbackBoundaries = (imageDimension, startRatio, endRatio, segmentCount) => {
  const start = Math.round(imageDimension * startRatio);
  const end = Math.round(imageDimension * endRatio);
  const segmentSize = (end - start) / segmentCount;

  return Array.from({ length: segmentCount + 1 }, (_value, index) =>
    Math.round(start + (segmentSize * index)),
  );
};

const boundedBox = (image, left, top, width, height) => {
  const boundedLeft = Math.max(0, Math.min(image.width - 1, left));
  const boundedTop = Math.max(0, Math.min(image.height - 1, top));
  return {
    left: boundedLeft,
    top: boundedTop,
    width: Math.max(1, Math.min(width, image.width - boundedLeft)),
    height: Math.max(1, Math.min(height, image.height - boundedTop)),
  };
};

const getCellBox = (image, template, geometry, rowIndex, columnIndex, paddingOverride) => {
  const columnLeftBoundary = geometry.verticalBoundaries[columnIndex] ?? 0;
  const columnRightBoundary = geometry.verticalBoundaries[columnIndex + 1] ?? image.width;
  const rowTopBoundary = geometry.horizontalBoundaries[rowIndex] ?? 0;
  const rowBottomBoundary = geometry.horizontalBoundaries[rowIndex + 1] ?? image.height;
  const columnWidth = Math.max(1, columnRightBoundary - columnLeftBoundary);
  const rowHeight = Math.max(1, rowBottomBoundary - rowTopBoundary);
  const horizontalPadding =
    paddingOverride?.horizontal ?? template.grid.cellHorizontalPadding;
  const verticalPadding =
    paddingOverride?.vertical ?? template.grid.cellVerticalPadding;

  return boundedBox(
    image,
    Math.round(columnLeftBoundary + (columnWidth * horizontalPadding)),
    Math.round(rowTopBoundary + (rowHeight * verticalPadding)),
    Math.max(4, Math.round(columnWidth * (1 - (horizontalPadding * 2)))),
    Math.max(4, Math.round(rowHeight * (1 - (verticalPadding * 2)))),
  );
};

const fixedTemplateGeometry = (image, template, rowCount) => ({
  horizontalBoundaries: buildFallbackBoundaries(
    image.height,
    template.grid.top,
    template.grid.bottom,
    rowCount,
  ),
  verticalBoundaries: buildFallbackBoundaries(
    image.width,
    template.grid.left,
    template.grid.right,
    template.scoreColumns.length,
  ),
});

const percentile = (values, ratio) => {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((left, right) => left - right);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.round((sorted.length - 1) * ratio)));
  return sorted[index] ?? 0;
};

const rankCells = (cellScores, template, options = {}) => {
  const ranked = cellScores
    .map((scoreValue, index) => ({ scoreValue, index }))
    .sort((left, right) => right.scoreValue - left.scoreValue);
  const topCell = ranked[0];
  const secondCell = ranked[1] || { scoreValue: 0, index: topCell?.index ?? 0 };
  const median = percentile(cellScores, 0.5);
  const confidence = topCell
    ? Math.max(
      0,
      Math.min(1, (topCell.scoreValue - secondCell.scoreValue) / Math.max(topCell.scoreValue, 0.0001)),
    )
    : 0;
  const minimumScore = options.minimumScore ?? template.grid.minCellInkScore;
  const minimumGap = options.minimumGap ?? template.grid.minConfidenceGap;
  const minimumSeparationFromNoise = options.minimumSeparationFromNoise ?? 1;
  const separatedFromNoise = topCell
    ? topCell.scoreValue >= Math.max(minimumScore, median * minimumSeparationFromNoise)
    : false;
  const ambiguous = !topCell || !separatedFromNoise || confidence < minimumGap;
  const resolvedScoreValue = topCell ? (template.scoreColumns[topCell.index] ?? null) : null;

  return {
    detectedScore: ambiguous ? null : resolvedScoreValue,
    detectedColumnLabel: ambiguous || !topCell ? null : String(template.scoreColumns[topCell.index]),
    confidence,
    ambiguous,
    winningColumnIndex: topCell?.index ?? null,
  };
};

const buildRowsFromCellScores = (context, cellScoreRows, rankOptions = {}) => {
  let computedTotal = 0;
  const rows = context.orderedCriteria.map((criterion, rowIndex) => {
    const cellInkScores = cellScoreRows[rowIndex] ?? [];
    const ranked = rankCells(cellInkScores, context.template, rankOptions);

    if (ranked.detectedScore !== null) {
      computedTotal += ranked.detectedScore;
    }

    return {
      rowIndex,
      criterionId: criterion.id,
      criterionName: criterion.name,
      expectedScore: context.sample.criterionScores[criterion.name],
      detectedScore: ranked.detectedScore,
      detectedColumnLabel: ranked.detectedColumnLabel,
      confidence: Number(ranked.confidence.toFixed(6)),
      ambiguous: ranked.ambiguous,
      cellInkScores: cellInkScores.map((value) => Number(value.toFixed(6))),
    };
  });

  return { rows, computedTotal };
};

const extractWithServiceInkAndFixedGeometry = (service, context) => {
  const geometry = fixedTemplateGeometry(
    context.normalized,
    context.template,
    context.orderedCriteria.length,
  );
  const cellScoreRows = context.orderedCriteria.map((_criterion, rowIndex) =>
    context.template.scoreColumns.map((_scoreValue, columnIndex) => {
      const box = getCellBox(context.normalized, context.template, geometry, rowIndex, columnIndex);
      return service.measureCellInk(
        context.normalized.data,
        context.normalized.width,
        context.normalized.height,
        context.normalized.channels,
        box.left,
        box.top,
        box.width,
        box.height,
      );
    }),
  );

  return buildRowsFromCellScores(context, cellScoreRows);
};

const pixelSignals = (image, offset) => {
  const r = image.data[offset] ?? 255;
  const g = image.data[offset + 1] ?? r;
  const b = image.data[offset + 2] ?? r;
  const luminance = (r * 0.299) + (g * 0.587) + (b * 0.114);
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  const purpleSignal = Math.max(0, (((r + b) / 2) - g - 2) / 255);
  const darkSignal = luminance < 155 ? (155 - luminance) / 155 : 0;
  const coloredDarkSignal = chroma > 10 && luminance < 215 ? (chroma / 255) * ((215 - luminance) / 215) : 0;
  const markSignal = Math.max(purpleSignal * 1.7, coloredDarkSignal * 1.1, darkSignal * (chroma > 10 ? 0.6 : 0.06));

  return { luminance, chroma, purpleSignal, darkSignal, coloredDarkSignal, markSignal };
};

const largestConnectedComponent = (mask, width, height) => {
  const visited = new Uint8Array(mask.length);
  let largest = 0;
  let largestTouchesEdge = false;

  for (let startIndex = 0; startIndex < mask.length; startIndex += 1) {
    if (!mask[startIndex] || visited[startIndex]) continue;

    const stack = [startIndex];
    visited[startIndex] = 1;
    let size = 0;
    let touchesEdge = false;

    while (stack.length > 0) {
      const index = stack.pop();
      size += 1;
      const x = index % width;
      const y = Math.floor(index / width);
      if (x <= 1 || y <= 1 || x >= width - 2 || y >= height - 2) {
        touchesEdge = true;
      }

      const neighbors = [
        x > 0 ? index - 1 : -1,
        x < width - 1 ? index + 1 : -1,
        y > 0 ? index - width : -1,
        y < height - 1 ? index + width : -1,
      ];

      for (const neighbor of neighbors) {
        if (neighbor < 0 || visited[neighbor] || !mask[neighbor]) continue;
        visited[neighbor] = 1;
        stack.push(neighbor);
      }
    }

    if (size > largest) {
      largest = size;
      largestTouchesEdge = touchesEdge;
    }
  }

  return { largest, largestTouchesEdge };
};

const extractCellFeatures = (image, box) => {
  const area = box.width * box.height;
  const mask = new Uint8Array(area);
  let weightedSignal = 0;
  let activePixels = 0;
  let darkPixels = 0;
  let purpleSignalSum = 0;
  let centerWeightedSignal = 0;
  let edgeActivePixels = 0;
  let neutralDarkSignal = 0;

  for (let localY = 0; localY < box.height; localY += 1) {
    for (let localX = 0; localX < box.width; localX += 1) {
      const x = box.left + localX;
      const y = box.top + localY;
      const offset = ((y * image.width) + x) * image.channels;
      const signals = pixelSignals(image, offset);
      const edgeDistanceX = Math.min(localX, box.width - 1 - localX);
      const edgeDistanceY = Math.min(localY, box.height - 1 - localY);
      const edgeDistance = Math.min(edgeDistanceX, edgeDistanceY);
      const edgeWeight = edgeDistance <= 2 ? 0.05 : edgeDistance <= 5 ? 0.35 : 1;
      const centerX = Math.abs((localX + 0.5) - (box.width / 2)) / (box.width / 2);
      const centerY = Math.abs((localY + 0.5) - (box.height / 2)) / (box.height / 2);
      const centerWeight = centerX <= 0.82 && centerY <= 0.82 ? 1 : 0.35;
      const markSignal = signals.markSignal * edgeWeight * centerWeight;
      const isActive = markSignal > 0.028;
      const maskIndex = (localY * box.width) + localX;

      weightedSignal += markSignal;
      purpleSignalSum += signals.purpleSignal * edgeWeight;
      if (signals.luminance < 150) {
        darkPixels += 1;
      }
      if (signals.luminance < 145 && signals.chroma <= 10) {
        neutralDarkSignal += signals.darkSignal * edgeWeight;
      }
      if (isActive) {
        activePixels += 1;
        mask[maskIndex] = 1;
        if (edgeDistance <= 5) {
          edgeActivePixels += 1;
        }
      }
      if (centerWeight === 1) {
        centerWeightedSignal += markSignal;
      }
    }
  }

  const component = largestConnectedComponent(mask, box.width, box.height);
  const activeRatio = area > 0 ? activePixels / area : 0;
  const weightedSignalRatio = area > 0 ? weightedSignal / area : 0;
  const centerSignalRatio = area > 0 ? centerWeightedSignal / area : 0;
  const largestComponentRatio = area > 0 ? component.largest / area : 0;
  const edgeActiveRatio = activePixels > 0 ? edgeActivePixels / activePixels : 0;
  const purpleSignalRatio = area > 0 ? purpleSignalSum / area : 0;
  const darkPixelRatio = area > 0 ? darkPixels / area : 0;
  const neutralDarkRatio = area > 0 ? neutralDarkSignal / area : 0;
  const componentPenalty = component.largestTouchesEdge ? largestComponentRatio * 0.35 : 0;
  const edgePenalty = edgeActiveRatio > 0.55 ? (edgeActiveRatio - 0.55) * activeRatio * 0.8 : 0;
  const neutralDarkPenalty = Math.min(0.01, neutralDarkRatio * 0.7);
  const score =
    (weightedSignalRatio * 1.55)
    + (centerSignalRatio * 0.8)
    + (activeRatio * 0.35)
    + (largestComponentRatio * 0.95)
    + (purpleSignalRatio * 0.8)
    - componentPenalty
    - edgePenalty
    - neutralDarkPenalty;

  return {
    score: Math.max(0, score),
    vector: [
      weightedSignalRatio,
      centerSignalRatio,
      activeRatio,
      largestComponentRatio,
      purpleSignalRatio,
      darkPixelRatio,
      edgeActiveRatio,
      neutralDarkRatio,
    ],
  };
};

const extractComponentOmr = (context) => {
  const geometry = fixedTemplateGeometry(
    context.normalized,
    context.template,
    context.orderedCriteria.length,
  );
  const cellScoreRows = context.orderedCriteria.map((_criterion, rowIndex) =>
    context.template.scoreColumns.map((_scoreValue, columnIndex) => {
      const box = getCellBox(
        context.normalized,
        context.template,
        geometry,
        rowIndex,
        columnIndex,
        { horizontal: 0.18, vertical: 0.12 },
      );
      return extractCellFeatures(context.normalized, box).score;
    }),
  );

  return buildRowsFromCellScores(context, cellScoreRows, {
    minimumScore: 0.0016,
    minimumGap: 0.08,
    minimumSeparationFromNoise: 1.3,
  });
};

const buildFeatureMatrix = (contexts) =>
  contexts.flatMap((context) => {
    const geometry = fixedTemplateGeometry(
      context.normalized,
      context.template,
      context.orderedCriteria.length,
    );

    return context.orderedCriteria.flatMap((criterion, rowIndex) =>
      context.template.scoreColumns.map((scoreValue, columnIndex) => {
        const box = getCellBox(
          context.normalized,
          context.template,
          geometry,
          rowIndex,
          columnIndex,
          { horizontal: 0.18, vertical: 0.12 },
        );
        const features = extractCellFeatures(context.normalized, box);

        return {
          page: context.sample.page,
          rowIndex,
          columnIndex,
          expectedScore: context.sample.criterionScores[criterion.name],
          scoreValue,
          isMarked: context.sample.criterionScores[criterion.name] === scoreValue,
          vector: features.vector,
          componentScore: features.score,
        };
      }),
    );
  });

const meanVector = (items, dimensionCount, selector) => {
  const output = Array.from({ length: dimensionCount }, () => 0);
  if (items.length === 0) return output;

  for (const item of items) {
    const vector = selector(item);
    for (let index = 0; index < dimensionCount; index += 1) {
      output[index] += vector[index] ?? 0;
    }
  }

  return output.map((value) => value / items.length);
};

const stdVector = (items, dimensionCount, means, selector) => {
  const output = Array.from({ length: dimensionCount }, () => 0.000001);
  if (items.length <= 1) return output;

  for (const item of items) {
    const vector = selector(item);
    for (let index = 0; index < dimensionCount; index += 1) {
      const delta = (vector[index] ?? 0) - means[index];
      output[index] += delta * delta;
    }
  }

  return output.map((value) => Math.max(0.000001, Math.sqrt(value / (items.length - 1))));
};

const distanceToProfile = (vector, means, stds) =>
  vector.reduce((sum, value, index) => {
    const standardized = (value - means[index]) / (stds[index] || 0.000001);
    return sum + (standardized * standardized);
  }, 0);

const classifyCell = (cell, profile) => {
  const distanceToMarked = distanceToProfile(cell.vector, profile.markedMean, profile.stds);
  const distanceToUnmarked = distanceToProfile(cell.vector, profile.unmarkedMean, profile.stds);

  return (distanceToUnmarked - distanceToMarked) + (cell.componentScore * 24);
};

const extractClassifierProxy = (context, featureMatrix) => {
  const dimensionCount = featureMatrix[0]?.vector.length ?? 0;
  const training = featureMatrix.filter((cell) => cell.page !== context.sample.page);
  const marked = training.filter((cell) => cell.isMarked);
  const unmarked = training.filter((cell) => !cell.isMarked);
  const allTraining = training.length > 0 ? training : featureMatrix;
  const allMean = meanVector(allTraining, dimensionCount, (cell) => cell.vector);
  const profile = {
    markedMean: meanVector(marked, dimensionCount, (cell) => cell.vector),
    unmarkedMean: meanVector(unmarked, dimensionCount, (cell) => cell.vector),
    stds: stdVector(allTraining, dimensionCount, allMean, (cell) => cell.vector),
  };
  const pageCells = featureMatrix.filter((cell) => cell.page === context.sample.page);
  const cellScoreRows = context.orderedCriteria.map((_criterion, rowIndex) =>
    context.template.scoreColumns.map((_scoreValue, columnIndex) => {
      const cell = pageCells.find(
        (candidateCell) =>
          candidateCell.rowIndex === rowIndex && candidateCell.columnIndex === columnIndex,
      );
      return cell ? classifyCell(cell, profile) : 0;
    }),
  );

  return buildRowsFromCellScores(context, cellScoreRows, {
    minimumScore: 0.3,
    minimumGap: 0.08,
    minimumSeparationFromNoise: 1.02,
  });
};

const rowsFromProductionAnalysis = (context, analysis) => {
  let computedTotal = 0;
  const rows = analysis.payload.criteria.map((criterion) => {
    if (criterion.detectedScore !== null) {
      computedTotal += criterion.detectedScore;
    }

    return {
      rowIndex: criterion.rowIndex,
      criterionId: criterion.criterionId,
      criterionName: criterion.criterionName,
      expectedScore: context.sample.criterionScores[criterion.criterionName],
      detectedScore: criterion.detectedScore,
      detectedColumnLabel: criterion.detectedColumnLabel,
      confidence: criterion.confidence,
      ambiguous: criterion.ambiguous,
      cellInkScores: criterion.cellInkScores,
    };
  });

  return { rows, computedTotal };
};

const evaluateAvailableCandidate = async (candidate, contexts) => {
  const startedAt = performance.now();
  const perPage = [];

  for (const context of contexts) {
    const result = await candidate.extract(context);
    const rows = result.rows.map((row) => {
      const exactMatch = row.detectedScore === row.expectedScore;
      const rejected = row.detectedScore === null || row.ambiguous;
      const falseHighConfidenceMark =
        !exactMatch
        && !rejected
        && row.confidence >= FALSE_HIGH_CONFIDENCE_THRESHOLD;

      return {
        ...row,
        exactMatch,
        rejected,
        falseHighConfidenceMark,
      };
    });
    const exactRowCount = rows.filter((row) => row.exactMatch).length;
    const ambiguousRowCount = rows.filter((row) => row.ambiguous).length;
    const rejectedRowCount = rows.filter((row) => row.rejected).length;
    const falseHighConfidenceMarkCount = rows.filter((row) => row.falseHighConfidenceMark).length;
    const nonRejectedWrongRowCount = rows.filter((row) => !row.exactMatch && !row.rejected).length;
    const computedTotal = result.computedTotal;
    const expectedTotal = context.sample.handwrittenTotal;

    perPage.push({
      page: context.sample.page,
      contestantName: context.sample.contestantName,
      expectedTotal,
      computedTotal,
      totalDelta: Math.abs((expectedTotal || 0) - (computedTotal || 0)),
      exactRowCount,
      rowCount: rows.length,
      exactRowMatchRate: rows.length > 0 ? exactRowCount / rows.length : 0,
      exactSheetMatch: exactRowCount === rows.length,
      incorrectRowCount: rows.length - exactRowCount,
      nonRejectedWrongRowCount,
      ambiguousRowCount,
      rejectedRowCount,
      falseHighConfidenceMarkCount,
      rows,
    });
  }

  const runtimeMs = performance.now() - startedAt;
  const pageCount = perPage.length;
  const totalRows = perPage.reduce((sum, page) => sum + page.rowCount, 0);
  const exactRowMatches = perPage.reduce((sum, page) => sum + page.exactRowCount, 0);
  const exactSheetMatches = perPage.filter((page) => page.exactSheetMatch).length;
  const incorrectRows = perPage.reduce((sum, page) => sum + page.incorrectRowCount, 0);
  const nonRejectedWrongRows = perPage.reduce((sum, page) => sum + page.nonRejectedWrongRowCount, 0);
  const ambiguousRows = perPage.reduce((sum, page) => sum + page.ambiguousRowCount, 0);
  const rejectedRows = perPage.reduce((sum, page) => sum + page.rejectedRowCount, 0);
  const rejectedPages = perPage.filter((page) => page.rejectedRowCount > 0).length;
  const falseHighConfidenceMarks = perPage.reduce(
    (sum, page) => sum + page.falseHighConfidenceMarkCount,
    0,
  );
  const maxPageTotalDelta = perPage.reduce((max, page) => Math.max(max, page.totalDelta), 0);
  const exactRowMatchRate = totalRows > 0 ? exactRowMatches / totalRows : 0;
  const exactSheetMatchRate = pageCount > 0 ? exactSheetMatches / pageCount : 0;
  const averageIncorrectRowsPerPage = pageCount > 0 ? incorrectRows / pageCount : 0;

  return {
    candidateId: candidate.id,
    label: candidate.label,
    type: candidate.type,
    status: 'available',
    hostingRequirements: candidate.hostingRequirements,
    operationalRisks: candidate.operationalRisks,
    notes: candidate.notes,
    metrics: {
      exactRowMatchRate,
      exactRowMatches,
      exactSheetMatchRate,
      exactSheetMatches,
      totalPages: pageCount,
      totalRows,
      incorrectRows,
      nonRejectedWrongRows,
      averageIncorrectRowsPerPage,
      ambiguousRows,
      averageAmbiguousRowsPerPage: pageCount > 0 ? ambiguousRows / pageCount : 0,
      falseHighConfidenceMarks,
      averageFalseHighConfidenceMarksPerPage: pageCount > 0 ? falseHighConfidenceMarks / pageCount : 0,
      rejectedRows,
      rowRejectionRate: totalRows > 0 ? rejectedRows / totalRows : 0,
      rejectedPages,
      pageRejectionRate: pageCount > 0 ? rejectedPages / pageCount : 0,
      maxPageTotalDelta,
      runtimeMs: Number(runtimeMs.toFixed(1)),
    },
    productionHighAssuranceEligible:
      exactRowMatchRate >= RECOMMENDED_HIGH_ASSURANCE_EXACT_ROW_RATE
      && averageIncorrectRowsPerPage <= RECOMMENDED_MAX_INCORRECT_ROWS_PER_PAGE
      && falseHighConfidenceMarks <= RECOMMENDED_MAX_FALSE_HIGH_CONFIDENCE_MARKS,
    perPage,
  };
};

const commandAvailable = (command) => {
  try {
    execFileSync('which', [command], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

const pythonPackageAvailable = (packageName) => {
  try {
    execFileSync('python3', ['-m', 'pip', 'show', packageName], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

const detectExternalCandidateStatus = () => [
  {
    candidateId: 'tesseract_cli_ocr_layout',
    label: 'Tesseract CLI OCR/layout smoke candidate',
    type: 'free_self_hosted_ocr_layout',
    status: commandAvailable('tesseract') ? 'available_not_scored' : 'unavailable',
    blocker: commandAvailable('tesseract')
      ? 'Installed, but not scored here because OCR text alone does not classify handwritten marks on this fixed scoresheet.'
      : 'tesseract executable is not installed in this environment.',
    metrics: null,
    hostingRequirements: 'Self-hosted native OCR binary plus language data; CPU execution is possible.',
    operationalRisks:
      'OCR can help locate printed labels, but handwritten score-cell mark classification still requires separate OMR.',
  },
  {
    candidateId: 'paddleocr_pp_structure',
    label: 'PaddleOCR / PP-Structure self-hosted candidate',
    type: 'free_self_hosted_ocr_layout',
    status: pythonPackageAvailable('paddleocr') ? 'available_not_scored' : 'unavailable',
    blocker: pythonPackageAvailable('paddleocr')
      ? 'Installed, but not scored here because the current benchmark avoids adding a Python inference path without explicit dependency approval.'
      : 'Python package paddleocr is not installed in this environment.',
    metrics: null,
    hostingRequirements: 'Self-hosted Python inference service; CPU possible, GPU improves latency.',
    operationalRisks:
      'Useful for document layout/OCR, but mark scoring would still need template registration and handwritten-mark classification.',
  },
  {
    candidateId: 'surya_ocr_layout',
    label: 'Surya OCR/layout self-hosted candidate',
    type: 'free_self_hosted_ocr_layout',
    status: pythonPackageAvailable('surya-ocr') ? 'available_not_scored' : 'unavailable',
    blocker: pythonPackageAvailable('surya-ocr')
      ? 'Installed, but not scored here because the current benchmark avoids adding a Python inference path without explicit dependency approval.'
      : 'Python package surya-ocr is not installed in this environment.',
    metrics: null,
    hostingRequirements: 'Self-hosted Python model runtime; practical deployment usually needs model-cache and memory planning.',
    operationalRisks:
      'OCR/layout output does not by itself solve score-cell mark classification or confidence calibration.',
  },
  {
    candidateId: 'doctr_ocr_layout',
    label: 'docTR OCR/layout self-hosted candidate',
    type: 'free_self_hosted_ocr_layout',
    status: pythonPackageAvailable('python-doctr') ? 'available_not_scored' : 'unavailable',
    blocker: pythonPackageAvailable('python-doctr')
      ? 'Installed, but not scored here because the current benchmark avoids adding a Python inference path without explicit dependency approval.'
      : 'Python package python-doctr is not installed in this environment.',
    metrics: null,
    hostingRequirements: 'Self-hosted Python OCR stack backed by TensorFlow or PyTorch.',
    operationalRisks:
      'OCR is a supporting layout tool; handwritten mark extraction still depends on OMR/classifier reliability.',
  },
];

const renderAndNormalizeContexts = async (service, pdfPath) => {
  const contexts = [];

  for (const family of groundTruth.intendedPhase1Families) {
    const criteria = buildCriteriaForTemplate(family);
    const template = service.resolveTemplate(criteria, { intent: 'SCORESHEET_IMPORT' }, undefined);
    const orderedCriteria = service.orderCriteriaForTemplate(criteria, template);

    for (const sample of family.samples) {
      const rendered = await service.renderPdfPage(pdfPath, sample.page);
      const normalized = await service.normalizePage(rendered.buffer, {
        preprocessingMode: 'standard',
        thresholdStrategy: 'none',
      });

      contexts.push({
        family,
        criteria,
        template,
        orderedCriteria,
        sample,
        normalized,
      });
    }
  }

  return contexts;
};

const scoreFreeHostedFallback = (results) => {
  const freeHostedCandidate = results.externalCandidates.find((candidate) =>
    candidate.type === 'free_self_hosted_ocr_layout' && candidate.status === 'available',
  );

  if (!freeHostedCandidate) {
    return {
      accurateEnoughForTenantOptIn: false,
      rationale:
        'No free hosted/self-hosted OCR/layout candidate executed in this environment, and OCR/layout alone would not remove the need for OMR mark scoring.',
    };
  }

  return {
    accurateEnoughForTenantOptIn: false,
    rationale:
      'Available OCR/layout candidates need a separate mark-classification path before tenant opt-in can be evaluated.',
  };
};

const buildRecommendation = (candidateResults, externalCandidates) => {
  const availableResults = candidateResults.filter((candidate) => candidate.status === 'available');
  const ranked = availableResults
    .slice()
    .sort((left, right) => {
      const exactDelta = right.metrics.exactRowMatchRate - left.metrics.exactRowMatchRate;
      if (Math.abs(exactDelta) > 0.000001) return exactDelta;
      const falseHighConfidenceDelta =
        left.metrics.falseHighConfidenceMarks - right.metrics.falseHighConfidenceMarks;
      if (falseHighConfidenceDelta !== 0) return falseHighConfidenceDelta;
      return left.metrics.averageIncorrectRowsPerPage - right.metrics.averageIncorrectRowsPerPage;
    });
  const best = ranked[0] ?? null;
  const highAssuranceCandidate = ranked.find((candidate) => candidate.productionHighAssuranceEligible) ?? null;
  const fallback = scoreFreeHostedFallback({ externalCandidates });
  const baselineIsBest = best?.candidateId === 'current_service_standard';

  return {
    primaryExtractionPath: best
      ? {
        candidateId: best.candidateId,
        label: best.label,
        exactRowMatchRate: best.metrics.exactRowMatchRate,
        exactSheetMatchRate: best.metrics.exactSheetMatchRate,
        averageIncorrectRowsPerPage: best.metrics.averageIncorrectRowsPerPage,
        falseHighConfidenceMarks: best.metrics.falseHighConfidenceMarks,
        highAssuranceEligible: best.productionHighAssuranceEligible,
      }
      : null,
    autoCertificationRecommendation: highAssuranceCandidate
      ? `Do not enable globally yet; ${highAssuranceCandidate.label} only qualifies on this small corpus and needs a larger representative phone-photo corpus first.`
      : 'Do not enable auto-submit or auto-certification from the current corpus; no candidate reaches the empirical assurance target.',
    freeHostedFallback: fallback,
    paidCloudRecommendation:
      'Exclude paid cloud services from the production path for now; the benchmark focus is deterministic local OMR plus free/self-hosted options that preserve the current scoresheet.',
    nextStep: !best
      ? 'Collect additional scans and phone-photo samples before selecting a production extractor.'
      : baselineIsBest
        ? 'Do not promote TASK-34.19 into production implementation from this benchmark alone; first expand the corpus and prototype stronger registration/classification outside the current production extractor.'
        : `Use ${best.label} as the leading TASK-34.19 implementation candidate only after expanding calibration samples and preserving rejection gates.`,
  };
};

const printCandidateMetrics = (candidate) => {
  const metrics = candidate.metrics;
  console.log(`  - ${candidate.label} [${candidate.candidateId}]`);
  console.log(`    exact row match: ${(metrics.exactRowMatchRate * 100).toFixed(1)}%`);
  console.log(`    exact sheet match: ${metrics.exactSheetMatches}/${metrics.totalPages} (${(metrics.exactSheetMatchRate * 100).toFixed(1)}%)`);
  console.log(`    incorrect rows/page: ${metrics.averageIncorrectRowsPerPage.toFixed(2)}`);
  console.log(`    ambiguous rows/page: ${metrics.averageAmbiguousRowsPerPage.toFixed(2)}`);
  console.log(`    false high-confidence marks: ${metrics.falseHighConfidenceMarks}`);
  console.log(`    rejection rate: ${(metrics.rowRejectionRate * 100).toFixed(1)}% rows, ${(metrics.pageRejectionRate * 100).toFixed(1)}% pages`);
  console.log(`    max total delta: ${metrics.maxPageTotalDelta}`);
  console.log(`    runtime: ${metrics.runtimeMs.toFixed(1)}ms`);
  console.log(`    high-assurance eligible: ${candidate.productionHighAssuranceEligible ? 'yes' : 'no'}`);
};

const printHumanReport = (report) => {
  console.log('Scoresheet import extractor benchmark');
  console.log(`Corpus: ${report.corpus.sourcePdf}`);
  console.log(`Rows: ${report.corpus.totalRows}; pages: ${report.corpus.totalPages}`);
  console.log('');
  console.log('Available extraction candidates');
  for (const candidate of report.candidates) {
    printCandidateMetrics(candidate);
  }
  console.log('');
  console.log('Free/self-hosted OCR/layout candidates');
  for (const candidate of report.externalCandidates) {
    console.log(`  - ${candidate.label} [${candidate.candidateId}]: ${candidate.status}`);
    console.log(`    blocker: ${candidate.blocker}`);
    console.log(`    hosting: ${candidate.hostingRequirements}`);
    console.log(`    risk: ${candidate.operationalRisks}`);
  }
  console.log('');
  console.log('Recommendation');
  if (report.recommendation.primaryExtractionPath) {
    const primary = report.recommendation.primaryExtractionPath;
    console.log(`  primary: ${primary.label} [${primary.candidateId}]`);
    console.log(`  exact row match: ${(primary.exactRowMatchRate * 100).toFixed(1)}%`);
    console.log(`  exact sheet match: ${(primary.exactSheetMatchRate * 100).toFixed(1)}%`);
    console.log(`  incorrect rows/page: ${primary.averageIncorrectRowsPerPage.toFixed(2)}`);
    console.log(`  false high-confidence marks: ${primary.falseHighConfidenceMarks}`);
  } else {
    console.log('  primary: none selected');
  }
  console.log(`  auto-certification: ${report.recommendation.autoCertificationRecommendation}`);
  console.log(`  free fallback: ${report.recommendation.freeHostedFallback.rationale}`);
  console.log(`  paid cloud: ${report.recommendation.paidCloudRecommendation}`);
  console.log(`  next: ${report.recommendation.nextStep}`);
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const service = new ScoreSheetImportService({});
  const pdfPath = path.resolve(process.cwd(), groundTruth.sourcePdf);
  const contexts = await renderAndNormalizeContexts(service, pdfPath);
  const featureMatrix = buildFeatureMatrix(contexts);

  const candidates = [
    {
      id: 'current_service_standard',
      label: 'Current production extractor',
      type: 'current_backend_omr',
      hostingRequirements: 'Existing Node.js backend, Sharp, and pdftoppm fallback.',
      operationalRisks:
        'Current grid detection can select the wrong score row/column sequence and still emit high-confidence wrong marks.',
      notes: 'Baseline production logic using standard normalized images.',
      extract: async (context) =>
        rowsFromProductionAnalysis(
          context,
          service.extractScoresFromNormalizedImage(
            context.normalized,
            context.orderedCriteria,
            context.template,
          ),
        ),
    },
    {
      id: 'fixed_template_service_ink',
      label: 'Fixed-template local OMR using current ink score',
      type: 'improved_local_omr',
      hostingRequirements: 'Existing Node.js backend and Sharp; no new runtime dependencies.',
      operationalRisks:
        'Depends on stable document normalization and fixed template ratios; skewed phone photos still need rejection or registration.',
      notes: 'Uses calibrated template geometry instead of detected grid lines, then reuses the current cell-ink scorer.',
      extract: async (context) => extractWithServiceInkAndFixedGeometry(service, context),
    },
    {
      id: 'component_local_omr',
      label: 'Connected-component local OMR',
      type: 'improved_local_omr',
      hostingRequirements: 'Existing Node.js backend and Sharp; no new runtime dependencies.',
      operationalRisks:
        'Heuristic mark scoring can overfit this packet and needs more handwriting/camera variation before production use.',
      notes: 'Suppresses printed edges and favors centered colored/dark connected components in each score cell.',
      extract: async (context) => extractComponentOmr(context),
    },
    {
      id: 'leave_one_page_out_cpu_classifier_proxy',
      label: 'CPU mark-classifier proxy',
      type: 'cpu_local_mark_classification',
      hostingRequirements:
        'Prototype uses in-process numeric features; a production classifier would require versioned training data and calibration artifacts.',
      operationalRisks:
        'The six-page corpus is too small for production training; this is only a feasibility proxy.',
      notes: 'Leave-one-page-out score-cell classifier trained from cell features in the remaining pages.',
      extract: async (context) => extractClassifierProxy(context, featureMatrix),
    },
  ];

  const candidateResults = [];
  for (const candidate of candidates) {
    candidateResults.push(await evaluateAvailableCandidate(candidate, contexts));
  }

  const externalCandidates = detectExternalCandidateStatus();
  const report = {
    generatedAt: new Date().toISOString(),
    corpus: {
      sourcePdf: groundTruth.sourcePdf,
      totalPages: contexts.length,
      totalRows: contexts.reduce((sum, context) => sum + context.orderedCriteria.length, 0),
      missingRequiredSamples: groundTruth.missingRequiredSamples,
    },
    assuranceTargets: {
      exactRowMatchRate: RECOMMENDED_HIGH_ASSURANCE_EXACT_ROW_RATE,
      maxIncorrectRowsPerPage: RECOMMENDED_MAX_INCORRECT_ROWS_PER_PAGE,
      maxFalseHighConfidenceMarks: RECOMMENDED_MAX_FALSE_HIGH_CONFIDENCE_MARKS,
    },
    candidates: candidateResults,
    externalCandidates,
    recommendation: buildRecommendation(candidateResults, externalCandidates),
  };

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHumanReport(report);
  }
};

main().catch((error) => {
  console.error('Scoresheet import extractor benchmark failed');
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
