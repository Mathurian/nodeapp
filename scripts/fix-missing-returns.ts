#!/usr/bin/env ts-node

/**
 * Fix missing return statements in TypeScript
 *
 * This script adds explicit return statements where TypeScript complains
 * about "Not all code paths return a value" (TS7030)
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface ErrorLocation {
  file: string;
  line: number;
  column: number;
}

// Get all TS7030 errors from TypeScript compiler
function getTS7030Errors(): ErrorLocation[] {
  const command = 'npx tsc --noEmit --noUnusedLocals --noUnusedParameters --noImplicitReturns 2>&1';
  const output = execSync(command, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });

  const errors: ErrorLocation[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    const match = line.match(/^(.+)\((\d+),(\d+)\): error TS7030:/);
    if (match) {
      errors.push({
        file: match[1],
        line: parseInt(match[2]),
        column: parseInt(match[3])
      });
    }
  }

  return errors;
}

// Fix a specific file
function fixFile(filePath: string, errorLines: number[]):void {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  let modified = false;
  const fixedLines = new Set<number>();

  // Sort error lines in descending order to fix from bottom to top
  errorLines.sort((a, b) => b - a);

  for (const errorLine of errorLines) {
    if (fixedLines.has(errorLine)) continue;

    const lineIndex = errorLine - 1;
    if (lineIndex < 0 || lineIndex >= lines.length) continue;

    const line = lines[lineIndex];

    // Find the function this line belongs to
    let functionStartIndex = -1;
    let braceCount = 0;

    for (let i = lineIndex; i >= 0; i--) {
      const currentLine = lines[i];

      // Count braces to find function boundary
      for (let j = currentLine.length - 1; j >= 0; j--) {
        if (currentLine[j] === '}') braceCount++;
        if (currentLine[j] === '{') braceCount--;
      }

      // Check if this is a function declaration
      if (braceCount === -1 && (
        currentLine.includes('= async (') ||
        currentLine.includes('async (') ||
        currentLine.includes('function ') ||
        currentLine.includes(') => {') ||
        currentLine.includes(') {')
      )) {
        functionStartIndex = i;
        break;
      }
    }

    if (functionStartIndex === -1) continue;

    // Find the closing brace of this function
    braceCount = 0;
    let foundOpeningBrace = false;

    for (let i = functionStartIndex; i < lines.length; i++) {
      const currentLine = lines[i];

      for (const char of currentLine) {
        if (char === '{') {
          braceCount++;
          foundOpeningBrace = true;
        }
        if (char === '}') braceCount--;
      }

      // Found the end of the function
      if (foundOpeningBrace && braceCount === 0) {
        // Check if the last statement in the function is in a catch block
        // that calls next(error)
        for (let j = i; j > functionStartIndex; j--) {
          const checkLine = lines[j].trim();

          // Look for next(error) without return
          if (checkLine.includes('next(error)') && !checkLine.includes('return')) {
            // Add return before next(error)
            lines[j] = lines[j].replace(/(\s+)next\(error\)/, '$1return next(error)');
            modified = true;
            fixedLines.add(errorLine);
            break;
          }

          // Look for res.send/res.json without return
          if ((checkLine.includes('res.send(') || checkLine.includes('res.json(')) &&
              !checkLine.includes('return')) {
            lines[j] = lines[j].replace(/(\s+)(res\.(send|json)\()/, '$1return $2');
            modified = true;
            fixedLines.add(errorLine);
            break;
          }
        }
        break;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    console.log(`✓ Fixed ${filePath}`);
    return;
  }
}

// Main execution
function main() {
  console.log('Finding TS7030 errors...');
  const errors = getTS7030Errors();

  console.log(`Found ${errors.length} missing return statement errors`);

  // Group errors by file
  const errorsByFile = new Map<string, number[]>();

  for (const error of errors) {
    if (!errorsByFile.has(error.file)) {
      errorsByFile.set(error.file, []);
    }
    errorsByFile.get(error.file)!.push(error.line);
  }

  console.log(`Affected files: ${errorsByFile.size}`);

  // Fix each file
  for (const [file, lines] of errorsByFile) {
    try {
      fixFile(file, lines);
    } catch (error) {
      console.error(`✗ Error fixing ${file}:`, error);
    }
  }

  console.log('\nDone! Re-running TypeScript to check...');

  try {
    const result = execSync('npx tsc --noEmit --noUnusedLocals --noUnusedParameters --noImplicitReturns 2>&1 | grep "error TS7030" | wc -l',
      { encoding: 'utf-8' });
    const remaining = parseInt(result.trim());
    console.log(`Remaining TS7030 errors: ${remaining}`);
  } catch (error) {
    console.log('Could not count remaining errors');
  }
}

main();
