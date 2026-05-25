#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  buildScoreSheetV2Html,
  buildScoreSheetV2SampleInput,
} = require('../../dist/utils/scoreSheetV2Renderer');

const outputDir = path.resolve(process.cwd(), 'tests/examples/scoresheet-import/v2');
const outputPath = path.join(outputDir, 'education-omr-v2-sample.html');

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, buildScoreSheetV2Html(buildScoreSheetV2SampleInput()), 'utf8');

console.log(`Generated ${path.relative(process.cwd(), outputPath)}`);
