#!/usr/bin/env node

/**
 * Generates a tenant-enforcement inventory and endpoint matrix.
 *
 * Outputs:
 * - docs/operations/TENANT-ENFORCEMENT-MATRIX.md
 */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const schemaPath = path.join(repoRoot, 'prisma', 'schema.prisma');
const routesConfigPath = path.join(repoRoot, 'src', 'config', 'routes.config.ts');
const outputPath = path.join(repoRoot, 'docs', 'operations', 'TENANT-ENFORCEMENT-MATRIX.md');

const DB_TOUCH_PATTERNS = [
  /\breq\.prisma\b/,
  /\bthis\.prisma\b/,
  /\bprisma\.[A-Za-z_]/,
  /from\s+['"].*\/(config\/database|utils\/prisma)['"]/,
  /\$queryRaw(?:Unsafe)?\(/,
  /\$executeRaw(?:Unsafe)?\(/,
  /new\s+PrismaClient\s*\(/
];

const RAW_SQL_PATTERNS = [
  /\$queryRaw(?:Unsafe)?\(/,
  /\$executeRaw(?:Unsafe)?\(/
];

const GLOBAL_PRISMA_IMPORT = /import\s+\{?\s*prisma\s*\}?\s+from\s+['"]\.{1,2}\/(config\/database|utils\/prisma)['"]|import\s+prisma\s+from\s+['"]\.{1,2}\/(config\/database|utils\/prisma)['"]/;

const PUBLIC_ROUTE_FILES = new Set([
  'healthRoutes.ts',
  'docs.ts',
  'publicTenantRoutes.ts'
]);

function walkFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const out = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkFiles(fullPath));
      continue;
    }
    out.push(fullPath);
  }
  return out;
}

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function toRepoPath(absPath) {
  return path.relative(repoRoot, absPath).replace(/\\/g, '/');
}

function parseSchemaModels() {
  const lines = readFile(schemaPath).split(/\r?\n/);
  const models = [];
  let currentModel = null;
  let braceDepth = 0;
  let tenantIdType = null;

  for (const line of lines) {
    const modelStart = line.match(/^model\s+(\w+)\s*\{/);
    if (modelStart) {
      currentModel = modelStart[1];
      braceDepth = 1;
      tenantIdType = null;
      continue;
    }

    if (!currentModel) {
      continue;
    }

    braceDepth += (line.match(/\{/g) || []).length;
    braceDepth -= (line.match(/\}/g) || []).length;

    const tenantMatch = line.match(/^\s*tenantId\s+([A-Za-z0-9_?]+)/);
    if (tenantMatch) {
      tenantIdType = tenantMatch[1];
    }

    if (braceDepth <= 0) {
      let classification = 'GLOBAL_OR_SYSTEM';
      if (tenantIdType) {
        classification = tenantIdType.includes('?')
          ? 'TENANT_SCOPED_OPTIONAL'
          : 'TENANT_SCOPED_REQUIRED';
      }

      models.push({
        model: currentModel,
        tenantIdType: tenantIdType || '-',
        classification
      });

      currentModel = null;
      braceDepth = 0;
      tenantIdType = null;
    }
  }

  return models.sort((a, b) => a.model.localeCompare(b.model));
}

function parseRoutesConfig() {
  const content = readFile(routesConfigPath);
  const symbolToRouteFile = new Map();
  const routeFileToBases = new Map();

  const importRegex = /import\s+([A-Za-z0-9_]+)\s+from\s+['"]\.\.\/routes\/([^'"]+)['"]/g;
  let importMatch;
  while ((importMatch = importRegex.exec(content)) !== null) {
    const symbol = importMatch[1];
    const moduleName = importMatch[2];
    const routeFile = moduleName.endsWith('.ts')
      ? `src/routes/${moduleName}`
      : `src/routes/${moduleName}.ts`;
    symbolToRouteFile.set(symbol, routeFile);
  }

  const addBase = (routeFile, basePath) => {
    if (!routeFile) return;
    if (!routeFileToBases.has(routeFile)) {
      routeFileToBases.set(routeFile, new Set());
    }
    routeFileToBases.get(routeFile).add(basePath);
  };

  const registerRegex = /registerRoute\(\s*app\s*,\s*['"]([^'"]+)['"]\s*,\s*([A-Za-z0-9_]+)\s*\)/g;
  let registerMatch;
  while ((registerMatch = registerRegex.exec(content)) !== null) {
    const routePath = registerMatch[1];
    const symbol = registerMatch[2];
    const routeFile = symbolToRouteFile.get(symbol);
    addBase(routeFile, `/api/v1${routePath}`);
  }

  const appUseRegex = /app\.use\(\s*['"]([^'"]+)['"]\s*,\s*([A-Za-z0-9_]+)\s*\)/g;
  let appUseMatch;
  while ((appUseMatch = appUseRegex.exec(content)) !== null) {
    const mountPath = appUseMatch[1];
    const symbol = appUseMatch[2];
    const routeFile = symbolToRouteFile.get(symbol);
    if (mountPath.startsWith('/api')) {
      addBase(routeFile, mountPath);
    }
  }

  const normalized = new Map();
  for (const [routeFile, bases] of routeFileToBases.entries()) {
    normalized.set(routeFile, Array.from(bases).sort());
  }
  return normalized;
}

function parseRolesFromExpression(expr) {
  const roles = [];
  const roleRegex = /['"]([A-Z_]+)['"]/g;
  let roleMatch;
  while ((roleMatch = roleRegex.exec(expr)) !== null) {
    roles.push(roleMatch[1]);
  }
  return roles;
}

function uniqueSorted(items) {
  return Array.from(new Set(items)).sort((a, b) => a.localeCompare(b));
}

function joinEndpoint(base, routePath) {
  const safeBase = base.endsWith('/') ? base.slice(0, -1) : base;
  if (!routePath || routePath === '/') {
    return safeBase || '/';
  }
  if (routePath.startsWith('/')) {
    return `${safeBase}${routePath}`;
  }
  return `${safeBase}/${routePath}`;
}

function classifyEndpoint({ routeFile, routePath, roles, fileRequiresAuth, routeHasAuth, fileSuperAdminOnly }) {
  const basename = path.basename(routeFile);

  if (PUBLIC_ROUTE_FILES.has(basename)) {
    return 'PUBLIC';
  }

  if (basename === 'authRoutes.ts') {
    if (routePath === '/profile' || routePath === '/permissions' || routeHasAuth) {
      return 'TENANT_SCOPED';
    }
    return 'PUBLIC_AUTH_FLOW';
  }

  if (fileSuperAdminOnly) {
    return 'SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT';
  }

  if (roles.length === 1 && roles[0] === 'SUPER_ADMIN') {
    return 'SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT';
  }

  if (!fileRequiresAuth && !routeHasAuth) {
    return 'PUBLIC';
  }

  return 'TENANT_SCOPED';
}

function parseRouteEndpoints(routeFilePath, bases) {
  const content = readFile(routeFilePath);
  const fileRequiresAuth = /router\.use\(\s*authenticateToken/.test(content);
  const fileSuperAdminOnly =
    /router\.use\(\s*superAdminOnly/.test(content) ||
    /router\.use\(\s*checkRoles\(\s*\[\s*['"]SUPER_ADMIN['"]\s*\]\s*\)\s*\)/.test(content) ||
    /router\.use\(\s*requireRole\(\s*\[\s*['"]SUPER_ADMIN['"]\s*\]\s*\)\s*\)/.test(content);

  const fileRoleExpressions = [];
  for (const match of content.matchAll(/router\.use\(\s*(?:requireRole|checkRoles)\(\s*(\[[^\)]*\])\s*\)\s*\)/g)) {
    fileRoleExpressions.push(match[1]);
  }

  const fileRoles = uniqueSorted(
    fileRoleExpressions.flatMap((expr) => parseRolesFromExpression(expr))
  );

  const endpoints = [];
  const routeRegex = /^[ \t]*(?!\/\/)router\.(get|post|put|patch|delete|options|all)\(\s*(['"`])([^'"`]+)\2/gm;
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const routePath = match[3];
    const snippet = content.slice(match.index, match.index + 550);
    const routeHasAuth = /authenticateToken/.test(snippet);

    const routeRoleExpressions = [];
    for (const roleMatch of snippet.matchAll(/(?:requireRole|checkRoles)\(\s*(\[[^\)]*\])\s*\)/g)) {
      routeRoleExpressions.push(roleMatch[1]);
    }

    const symbolicRoles =
      /checkRoles\(\s*TEMPLATE_ADMIN_ROLES/.test(snippet)
        ? ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD']
        : [];

    const roles = uniqueSorted([
      ...fileRoles,
      ...routeRoleExpressions.flatMap((expr) => parseRolesFromExpression(expr)),
      ...symbolicRoles
    ]);

    const scope = classifyEndpoint({
      routeFile: routeFilePath,
      routePath,
      roles,
      fileRequiresAuth,
      routeHasAuth,
      fileSuperAdminOnly
    });

    const mountBases = bases.length > 0 ? bases : ['/api/v1'];
    for (const base of mountBases) {
      endpoints.push({
        method,
        endpoint: joinEndpoint(base, routePath),
        scope,
        roles: roles.length > 0 ? roles.join(', ') : '-',
        routeFile: toRepoPath(routeFilePath)
      });
    }
  }

  return endpoints;
}

function collectDbTouchingFiles() {
  const selfPath = toRepoPath(__filename);
  const roots = [
    path.join(repoRoot, 'src'),
    path.join(repoRoot, 'scripts')
  ];

  const dbTouch = [];
  const rawSqlPaths = [];
  const globalPrismaImports = [];

  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const files = walkFiles(root).filter((file) => /\.(ts|js|sh)$/.test(file));
    for (const file of files) {
      const repoPath = toRepoPath(file);
      if (repoPath === selfPath) {
        continue;
      }
      const content = readFile(file);
      const touchesDb = DB_TOUCH_PATTERNS.some((pattern) => pattern.test(content));
      if (touchesDb) {
        dbTouch.push(repoPath);
      }

      if (RAW_SQL_PATTERNS.some((pattern) => pattern.test(content))) {
        rawSqlPaths.push(repoPath);
      }

      if (GLOBAL_PRISMA_IMPORT.test(content)) {
        globalPrismaImports.push(repoPath);
      }
    }
  }

  return {
    dbTouch: uniqueSorted(dbTouch),
    rawSqlPaths: uniqueSorted(rawSqlPaths),
    globalPrismaImports: uniqueSorted(globalPrismaImports)
  };
}

function layerOfFile(filePath) {
  if (filePath.startsWith('src/routes/')) return 'routes';
  if (filePath.startsWith('src/controllers/')) return 'controllers';
  if (filePath.startsWith('src/services/')) return 'services';
  if (filePath.startsWith('src/repositories/')) return 'repositories';
  if (filePath.startsWith('src/jobs/')) return 'jobs';
  if (filePath.startsWith('src/events/handlers/')) return 'event_handlers';
  if (filePath.startsWith('src/middleware/')) return 'middleware';
  if (filePath.startsWith('src/config/')) return 'config';
  if (filePath.startsWith('scripts/')) return 'scripts';
  return 'other';
}

function groupByLayer(files) {
  const grouped = new Map();
  for (const file of files) {
    const layer = layerOfFile(file);
    if (!grouped.has(layer)) grouped.set(layer, []);
    grouped.get(layer).push(file);
  }
  const out = [];
  for (const [layer, entries] of grouped.entries()) {
    out.push({
      layer,
      files: entries.sort((a, b) => a.localeCompare(b))
    });
  }
  return out.sort((a, b) => a.layer.localeCompare(b.layer));
}

function buildMarkdown({
  generatedAt,
  models,
  dbTouchGrouped,
  rawSqlPaths,
  globalPrismaImports,
  endpointMatrix,
  unmountedRouteFiles
}) {
  const modelCounts = {
    required: models.filter((m) => m.classification === 'TENANT_SCOPED_REQUIRED').length,
    optional: models.filter((m) => m.classification === 'TENANT_SCOPED_OPTIONAL').length,
    global: models.filter((m) => m.classification === 'GLOBAL_OR_SYSTEM').length
  };

  const lines = [];
  lines.push('# Tenant Enforcement Matrix');
  lines.push('');
  lines.push(`Generated: ${generatedAt}`);
  lines.push('Source command: `node scripts/ops/generate-tenant-enforcement-matrix.js`');
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Endpoint entries discovered (v1/direct mounts): ${endpointMatrix.length}`);
  lines.push(`- Route modules with no active mount in routes config: ${unmountedRouteFiles.length}`);
  lines.push(`- DB-touching files discovered: ${dbTouchGrouped.reduce((sum, item) => sum + item.files.length, 0)}`);
  lines.push(`- Prisma models: ${models.length}`);
  lines.push(`- Tenant-scoped required models: ${modelCounts.required}`);
  lines.push(`- Tenant-scoped optional models: ${modelCounts.optional}`);
  lines.push(`- Global/system models: ${modelCounts.global}`);
  lines.push('');
  lines.push('## Endpoint Scope Matrix');
  lines.push('');
  lines.push('| Method | Endpoint | Expected scope | Roles | Route file |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const row of endpointMatrix) {
    lines.push(`| ${row.method} | \`${row.endpoint}\` | ${row.scope} | ${row.roles} | \`${row.routeFile}\` |`);
  }
  lines.push('');
  lines.push('## DB-Touching Surface Inventory');
  lines.push('');
  for (const group of dbTouchGrouped) {
    lines.push(`### ${group.layer}`);
    lines.push('');
    for (const file of group.files) {
      lines.push(`- \`${file}\``);
    }
    lines.push('');
  }
  lines.push('## Prisma Model Classification');
  lines.push('');
  lines.push('| Model | tenantId field | Classification |');
  lines.push('| --- | --- | --- |');
  for (const model of models) {
    lines.push(`| ${model.model} | ${model.tenantIdType} | ${model.classification} |`);
  }
  lines.push('');
  lines.push('## Unmounted Route Modules');
  lines.push('');
  if (unmountedRouteFiles.length === 0) {
    lines.push('- None');
  } else {
    for (const file of unmountedRouteFiles) {
      lines.push(`- \`${file}\``);
    }
  }
  lines.push('');
  lines.push('## Raw SQL Paths');
  lines.push('');
  if (rawSqlPaths.length === 0) {
    lines.push('- None');
  } else {
    for (const file of rawSqlPaths) {
      lines.push(`- \`${file}\``);
    }
  }
  lines.push('');
  lines.push('## Direct Global Prisma Imports');
  lines.push('');
  if (globalPrismaImports.length === 0) {
    lines.push('- None');
  } else {
    for (const file of globalPrismaImports) {
      lines.push(`- \`${file}\``);
    }
  }
  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- This matrix is generated from source patterns and should be reviewed when adding new routes or DB access paths.');
  lines.push('- `SUPER_ADMIN_GLOBAL_OR_EXPLICIT_TENANT` means super admins may run global views or explicitly scoped tenant operations.');
  lines.push('- `TENANT_SCOPED_OPTIONAL` models include rows that can be tenant-scoped or platform-global by design.');
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function main() {
  const routeMounts = parseRoutesConfig();
  const routeFiles = walkFiles(path.join(repoRoot, 'src', 'routes'))
    .filter((file) => file.endsWith('.ts'))
    .sort((a, b) => a.localeCompare(b));

  const endpointMatrix = [];
  const unmountedRouteFiles = [];
  for (const routeFile of routeFiles) {
    const routeRepoPath = toRepoPath(routeFile);
    const bases = routeMounts.get(routeRepoPath) || routeMounts.get(routeFile) || [];
    if (bases.length === 0) {
      unmountedRouteFiles.push(routeRepoPath);
      continue;
    }
    endpointMatrix.push(...parseRouteEndpoints(routeFile, bases));
  }

  endpointMatrix.sort((a, b) => {
    if (a.endpoint !== b.endpoint) return a.endpoint.localeCompare(b.endpoint);
    if (a.method !== b.method) return a.method.localeCompare(b.method);
    return a.routeFile.localeCompare(b.routeFile);
  });

  const models = parseSchemaModels();
  const { dbTouch, rawSqlPaths, globalPrismaImports } = collectDbTouchingFiles();
  const dbTouchGrouped = groupByLayer(dbTouch);

  const markdown = buildMarkdown({
    generatedAt: new Date().toISOString(),
    models,
    dbTouchGrouped,
    rawSqlPaths,
    globalPrismaImports,
    endpointMatrix,
    unmountedRouteFiles: unmountedRouteFiles.sort((a, b) => a.localeCompare(b))
  });

  fs.writeFileSync(outputPath, markdown);
  process.stdout.write(`Wrote ${toRepoPath(outputPath)}\n`);
}

main();
