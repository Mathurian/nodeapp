#!/usr/bin/env node
/**
 * Verifies tenant-scoped Prisma models in schema.prisma match the middleware scope list.
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const schemaPath = path.join(repoRoot, 'prisma', 'schema.prisma');
const middlewarePath = path.join(repoRoot, 'src', 'middleware', 'tenantMiddleware.ts');

const schema = fs.readFileSync(schemaPath, 'utf8').split(/\r?\n/);
const middleware = fs.readFileSync(middlewarePath, 'utf8');

const extractTenantModelsFromSchema = () => {
  const models = [];
  let currentModel = null;
  let braceDepth = 0;
  let hasTenantId = false;

  for (const line of schema) {
    const modelStart = line.match(/^model\s+(\w+)\s*\{/);
    if (modelStart) {
      currentModel = modelStart[1];
      braceDepth = 1;
      hasTenantId = false;
      continue;
    }

    if (!currentModel) continue;

    braceDepth += (line.match(/\{/g) || []).length;
    braceDepth -= (line.match(/\}/g) || []).length;

    if (/\btenantId\b/.test(line)) {
      hasTenantId = true;
    }

    if (braceDepth <= 0) {
      if (hasTenantId && currentModel) {
        models.push(currentModel.toLowerCase());
      }
      currentModel = null;
      braceDepth = 0;
      hasTenantId = false;
    }
  }

  return models.sort();
};

const extractTenantModelsFromMiddleware = () => {
  const blockMatch = middleware.match(/const TENANT_SCOPED_MODELS = new Set\(\[(?<values>[\s\S]*?)\]\.map/);
  if (!blockMatch || !blockMatch.groups || !blockMatch.groups['values']) {
    throw new Error('Unable to parse TENANT_SCOPED_MODELS from tenantMiddleware.ts');
  }

  return Array.from(blockMatch.groups['values'].matchAll(/'([^']+)'/g))
    .map((match) => match[1].toLowerCase())
    .sort();
};

const schemaModels = extractTenantModelsFromSchema();
const middlewareModels = extractTenantModelsFromMiddleware();

const middlewareSet = new Set(middlewareModels);
const schemaSet = new Set(schemaModels);

const missing = schemaModels.filter(model => !middlewareSet.has(model));
const extra = middlewareModels.filter(model => !schemaSet.has(model));

if (missing.length === 0 && extra.length === 0) {
  console.log(`Tenant scope parity OK (${schemaModels.length} models).`);
  process.exit(0);
}

console.error('Tenant scope parity FAILED.');
if (missing.length) {
  console.error(`Missing in middleware (${missing.length}): ${missing.join(', ')}`);
}
if (extra.length) {
  console.error(`Extra in middleware (${extra.length}): ${extra.join(', ')}`);
}
process.exit(1);
