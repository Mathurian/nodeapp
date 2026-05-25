#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  buildScoreSheetV3Html,
  buildScoreSheetV3SampleInput,
} = require('../../dist/utils/scoreSheetV3Renderer');

const outputDir = path.resolve(process.cwd(), 'tests/examples/scoresheet-import/v3');
const outputPath = path.join(outputDir, 'education-omr-v3-sample.html');

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, buildScoreSheetV3Html(buildScoreSheetV3SampleInput()), 'utf8');

console.log(`Generated ${path.relative(process.cwd(), outputPath)}`);
