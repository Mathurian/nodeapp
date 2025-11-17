#!/usr/bin/env node
/**
 * Intelligently fix unused `req` parameters
 * Only prefixes with _ if req is truly unused in the function body
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get list of files with unused req errors
let output;
try {
  output = execSync('npx tsc --noEmit --noUnusedLocals --noUnusedParameters --noImplicitReturns 2>&1',
    { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
} catch (error) {
  // execSync throws when command exits with non-zero, but we still get the output
  output = error.output ? error.output.join('') : error.stdout || '';
}

const errors = [];
const lines = output.split('\n');

for (const line of lines) {
  // Match: src/file.ts(123,45): error TS6133: 'req' is declared but its value is never read.
  const match = line.match(/^(.+)\((\d+),(\d+)\): error TS6133: 'req' is declared/);
  if (match) {
    errors.push({
      file: match[1],
      line: parseInt(match[2]),
      column: parseInt(match[3])
    });
  }
}

console.log(`Found ${errors.length} unused req parameters`);

// Group by file
const fileErrors = new Map();
for (const error of errors) {
  if (!fileErrors.has(error.file)) {
    fileErrors.set(error.file, []);
  }
  fileErrors.get(error.file).push(error.line);
}

console.log(`Affected files: ${fileErrors.size}`);

let fixedCount = 0;

for (const [filePath, errorLines] of fileErrors) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    let modified = false;

    for (const errorLine of errorLines) {
      const lineIndex = errorLine - 1;
      if (lineIndex < 0 || lineIndex >= lines.length) continue;

      const line = lines[lineIndex];

      // Check if this line contains a function with req parameter
      if (line.includes('req: Request') && !line.includes('_req: Request')) {
        // Simple heuristic: replace 'req: Request' with '_req: Request'
        // This is safe because TS already confirmed req is unused
        lines[lineIndex] = line.replace(/\breq: Request\b/, '_req: Request');
        modified = true;
        fixedCount++;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
      console.log(`✓ Fixed ${filePath}`);
    }
  } catch (error) {
    console.error(`✗ Error fixing ${filePath}:`, error.message);
  }
}

console.log(`\nFixed ${fixedCount} unused req parameters`);
console.log('\nRe-running TypeScript to verify...');

try {
  const result = execSync('npx tsc --noEmit --noUnusedLocals --noUnusedParameters --noImplicitReturns 2>&1 | grep "error TS6133.*req" | wc -l',
    { encoding: 'utf-8' });
  const remaining = parseInt(result.trim());
  console.log(`Remaining unused req errors: ${remaining}`);
} catch (error) {
  console.log('Could not count remaining errors');
}
