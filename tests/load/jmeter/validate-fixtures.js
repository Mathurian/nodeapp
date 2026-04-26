#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

function getArg(flag, fallback = null) {
  const index = args.indexOf(flag);
  if (index === -1 || index === args.length - 1) {
    return fallback;
  }
  return args[index + 1];
}

const planArg = getArg('--plan', 'tests/load/jmeter/workflow-simulation.jmx');
const explicitMode = getArg('--mode', null);
const planPath = path.resolve(process.cwd(), planArg);

if (!fs.existsSync(planPath)) {
  console.error(`Plan not found: ${planPath}`);
  process.exit(1);
}

const xml = fs.readFileSync(planPath, 'utf8');
const mode = explicitMode || (path.basename(planPath).includes('stress') ? 'stress' : 'workflow');
const errors = [];
const warnings = [];

const PLACEHOLDER_PATTERNS = [
  /REPLACE_/i,
  /example\.invalid/i,
  /^csv-template$/i,
  /^required_tenant_slug$/i,
];

const ID_PATTERNS = [
  /^[a-z][a-z0-9]{8,}$/i,
  /^[0-9a-f]{32}$/i,
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
];

const THREAD_TO_FILE = {
  judgeThreads: 'judges.csv',
  tallyThreads: 'tally.csv',
  auditorThreads: 'auditors.csv',
  boardThreads: 'board.csv',
  adminThreads: 'admins.csv',
};

const HEADER_RULES = {
  'judges.csv': ['email', 'password'],
  'tally.csv': ['email', 'password'],
  'auditors.csv': ['email', 'password'],
  'board.csv': ['email', 'password'],
  'admins.csv': ['email', 'password'],
  'live_ids.csv': ['category_id', 'contestant_id', 'score_id', 'judge_id', 'criterion_id'],
  'judge_create_targets.csv': ['category_id', 'contestant_id', 'criterion_id'],
};

function decodeXml(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parsePlanVariables(content) {
  const vars = {};
  const pattern = /<elementProp name="([^"]+)" elementType="Argument">[\s\S]*?<stringProp name="Argument.value">([\s\S]*?)<\/stringProp>/g;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    vars[match[1]] = decodeXml(match[2].trim());
  }
  return vars;
}

function parseCsvRefs(content) {
  const refs = [];
  const pattern = /<CSVDataSet[\s\S]*?testname="([^"]+)"[\s\S]*?<stringProp name="filename">([^<]+)<\/stringProp>[\s\S]*?<stringProp name="variableNames">([^<]*)<\/stringProp>/g;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    refs.push({
      testName: match[1],
      filename: decodeXml(match[2].trim()),
      variableNames: decodeXml(match[3].trim()),
    });
  }
  return refs;
}

function splitCsvLine(line) {
  return line.split(',').map((part) => part.trim());
}

function isPlaceholder(value) {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
}

function isValidId(value) {
  return ID_PATTERNS.some((pattern) => pattern.test(value));
}

function validateCsv(ref, planDir, variables) {
  const candidatePaths = [
    path.resolve(process.cwd(), ref.filename),
    path.resolve(planDir, ref.filename),
  ];
  const filePath = candidatePaths.find((candidate) => fs.existsSync(candidate));

  if (!filePath) {
    errors.push(`Missing CSV file referenced by plan: ${ref.filename}`);
    return null;
  }

  const basename = path.basename(filePath);
  const expectedHeader = HEADER_RULES[basename];

  const raw = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
  const lines = raw.split('\n').filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    errors.push(`${ref.filename}: requires at least one data row`);
    return { basename, rowCount: 0 };
  }

  const header = splitCsvLine(lines[0]);
  if (expectedHeader && header.join(',') !== expectedHeader.join(',')) {
    errors.push(
      `${ref.filename}: header mismatch. Expected ${expectedHeader.join(',')} but found ${header.join(',')}`
    );
  }

  const rowCount = lines.length - 1;
  const duplicates = new Set();

  for (let index = 1; index < lines.length; index += 1) {
    const rowNumber = index + 1;
    const values = splitCsvLine(lines[index]);

    if (values.length !== header.length) {
      errors.push(`${ref.filename}:${rowNumber}: expected ${header.length} columns, found ${values.length}`);
      continue;
    }

    const duplicateKey = values.join(',');
    if (duplicates.has(duplicateKey)) {
      warnings.push(`${ref.filename}:${rowNumber}: duplicate row detected`);
    } else {
      duplicates.add(duplicateKey);
    }

    values.forEach((value, valueIndex) => {
      const column = header[valueIndex] || `col_${valueIndex + 1}`;
      if (!value) {
        errors.push(`${ref.filename}:${rowNumber}: ${column} is empty`);
        return;
      }
      if (isPlaceholder(value)) {
        errors.push(`${ref.filename}:${rowNumber}: ${column} still contains a placeholder value`);
      }
      if (column === 'email' && !value.includes('@')) {
        errors.push(`${ref.filename}:${rowNumber}: email is not valid`);
      }
      if (column.endsWith('_id') && !isValidId(value)) {
        errors.push(`${ref.filename}:${rowNumber}: ${column} is not a recognized ID format`);
      }
    });
  }

  if (basename === 'live_ids.csv' && mode === 'workflow') {
    const judgeThreads = Number.parseInt(variables.judgeThreads || '0', 10);
    if (rowCount < judgeThreads * 2) {
      warnings.push(
        `${ref.filename}: only ${rowCount} rows for ${judgeThreads} judge threads; workflow runs are more stable with a larger live-state pool`
      );
    }
  }

  if (basename === 'judge_create_targets.csv') {
    const judgeThreads = Number.parseInt(variables.judgeThreads || '0', 10);
    if (rowCount < judgeThreads) {
      const message = `${ref.filename}: only ${rowCount} create targets for ${judgeThreads} judge threads`;
      if (mode === 'workflow') {
        errors.push(message);
      } else {
        warnings.push(message);
      }
    }
  }

  return { basename, rowCount };
}

const variables = parsePlanVariables(xml);
const csvRefs = parseCsvRefs(xml);
const planDir = path.dirname(planPath);
const counts = {};
const validatedFiles = new Set();

csvRefs.forEach((ref) => {
  if (validatedFiles.has(ref.filename)) {
    return;
  }
  validatedFiles.add(ref.filename);
  const result = validateCsv(ref, planDir, variables);
  if (result) {
    counts[result.basename] = result.rowCount;
  }
});

Object.entries(THREAD_TO_FILE).forEach(([threadVar, fileName]) => {
  const threadCount = Number.parseInt(variables[threadVar] || '0', 10);
  const credentialCount = counts[fileName];
  if (!threadCount || credentialCount === undefined) {
    return;
  }

  if (credentialCount < threadCount) {
    const message = `${fileName}: ${credentialCount} credentials for ${threadCount} configured threads`;
    if (mode === 'workflow') {
      errors.push(message);
    } else {
      warnings.push(message);
    }
  }
});

console.log(`Fixture validation mode: ${mode}`);
console.log(`Plan: ${planPath}`);

if (warnings.length > 0) {
  console.log('\nWarnings:');
  warnings.forEach((warning) => console.log(`- ${warning}`));
}

if (errors.length > 0) {
  console.log('\nErrors:');
  errors.forEach((error) => console.log(`- ${error}`));
  process.exit(1);
}

console.log('\nFixture validation passed.');
