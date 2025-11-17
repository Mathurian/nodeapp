#!/usr/bin/env node
/**
 * Safely fix only TRULY unused variables
 * This script is conservative and only fixes obvious cases
 */

const fs = require('fs');
const { execSync } = require('child_process');

// Get TypeScript errors
let output;
try {
  output = execSync('npx tsc --noEmit --noUnusedLocals --noUnusedParameters --noImplicitReturns 2>&1',
    { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
} catch (error) {
  output = error.output ? error.output.join('') : error.stdout || '';
}

const fixes = [];
const lines = output.split('\n');

for (const line of lines) {
  const match = line.match(/^(.+)\((\d+),(\d+)\): error TS6133: '(.+)' is declared but its value is never read\./);
  if (match) {
    fixes.push({
      file: match[1],
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      variable: match[4]
    });
  }
}

console.log(`Found ${fixes.length} unused variables`);

// Group by file
const byFile = {};
for (const fix of fixes) {
  if (!byFile[fix.file]) byFile[fix.file] = [];
  byFile[fix.file].push(fix);
}

let fixedCount = 0;

// Safe fixes only
for (const [file, fileFixes] of Object.entries(byFile)) {
  try {
    let content = fs.readFileSync(file, 'utf-8');
    let modified = false;

    for (const fix of fileFixes) {
      const varName = fix.variable;

      // Safe fix 1: Remove unused destructured variables that are alone
      if (content.includes(`const { ${varName} } =`)) {
        // This is risky - skip
        continue;
      }

      // Safe fix 2: Prefix unused callback parameters
      if (content.includes(`(${varName}:`) &&
          ['next', 'res', 'req', 'target', 'error', 'job'].includes(varName)) {
        // Check if it's actually used in the function body
        const regex = new RegExp(`\\(${varName}:[^)]+\\)`, 'g');
        const match = content.match(regex);
        if (match) {
          // Only prefix if truly unused - check for usage
          const funcMatch = content.match(new RegExp(`\\(${varName}:[^)]+\\)[^{]*\\{([^}]+)\\}`));
          if (funcMatch && !funcMatch[1].includes(varName)) {
            content = content.replace(new RegExp(`\\(${varName}:`, 'g'), `(_${varName}:`);
            modified = true;
            fixedCount++;
          }
        }
      }
    }

    if (modified) {
      fs.writeFileSync(file, content, 'utf-8');
      console.log(`✓ Fixed ${file}`);
    }
  } catch (error) {
    console.error(`✗ Error with ${file}:`, error.message);
  }
}

console.log(`\nSafely fixed ${fixedCount} variables`);
console.log('Manual review needed for remaining complex cases');
