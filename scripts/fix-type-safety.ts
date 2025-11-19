#!/usr/bin/env ts-node
/**
 * Automated Type Safety Fix Script
 * Helps identify and suggest fixes for `any` types in services
 */

import * as fs from 'fs';
import * as path from 'path';

interface TypeIssue {
  file: string;
  line: number;
  content: string;
  suggestion?: string;
}

const servicesDir = path.join(__dirname, '..', 'src', 'services');

// Common patterns that can be automatically fixed
const patterns = [
  // Pattern: const variable: any = await prisma...
  {
    regex: /const\s+(\w+):\s*any\s*=\s*await\s+this\.prisma\.(\w+)\./g,
    fix: (match: RegExpMatchArray) => {
      const varName = match[1];
      const model = match[2];
      const capitalizedModel = model.charAt(0).toUpperCase() + model.slice(1);
      return `// TODO: Replace with proper Prisma type for ${capitalizedModel}`;
    }
  },
  // Pattern: (param: any) =>
  {
    regex: /\((\w+):\s*any\)\s*=>/g,
    fix: (match: RegExpMatchArray) => {
      const paramName = match[1];
      return `// TODO: Add proper type for ${paramName}`;
    }
  },
  // Pattern: } as any
  {
    regex: /}\s*as\s*any/g,
    fix: () => '// TODO: Remove type assertion and add proper Prisma payload type'
  }
];

function analyzeFile(filePath: string): TypeIssue[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const issues: TypeIssue[] = [];

  lines.forEach((line, index) => {
    if (line.includes('any')) {
      issues.push({
        file: path.basename(filePath),
        line: index + 1,
        content: line.trim(),
      });
    }
  });

  return issues;
}

function scanServices(): Map<string, TypeIssue[]> {
  const results = new Map<string, TypeIssue[]>();

  const files = fs.readdirSync(servicesDir)
    .filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    .map(f => path.join(servicesDir, f));

  files.forEach(file => {
    const issues = analyzeFile(file);
    if (issues.length > 0) {
      results.set(file, issues);
    }
  });

  return results;
}

function generateReport(): void {
  const results = scanServices();
  let totalIssues = 0;

  console.log('='.repeat(80));
  console.log('TYPE SAFETY AUDIT REPORT');
  console.log('='.repeat(80));
  console.log();

  // Sort by number of issues
  const sorted = Array.from(results.entries())
    .sort((a, b) => b[1].length - a[1].length);

  console.log('TOP 20 SERVICES WITH TYPE SAFETY ISSUES:\n');
  console.log('Rank | File | Issues');
  console.log('-'.repeat(80));

  sorted.slice(0, 20).forEach(([file, issues], index) => {
    console.log(`${(index + 1).toString().padStart(4)} | ${path.basename(file).padEnd(40)} | ${issues.length}`);
    totalIssues += issues.length;
  });

  console.log('\n' + '='.repeat(80));
  console.log(`TOTAL ISSUES IN TOP 20: ${totalIssues}`);
  console.log(`TOTAL FILES WITH ISSUES: ${results.size}`);
  console.log('='.repeat(80));
}

// Run the report
generateReport();
