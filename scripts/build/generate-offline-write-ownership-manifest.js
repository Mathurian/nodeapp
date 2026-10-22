const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');
const sourcePath = path.join(rootDir, 'config', 'offline-write-ownership.manifest.json');
const frontendJsonPath = path.join(
  rootDir,
  'frontend',
  'src',
  'config',
  'offlineWriteOwnership.manifest.json',
);
const frontendTsPath = path.join(
  rootDir,
  'frontend',
  'src',
  'config',
  'offlineWriteOwnership.manifest.ts',
);
const backendJsonPath = path.join(
  rootDir,
  'src',
  'generated',
  'offlineWriteOwnership.manifest.json',
);
const backendTsPath = path.join(
  rootDir,
  'src',
  'generated',
  'offlineWriteOwnership.manifest.ts',
);
const sharedRouteCanonicalizerPath = path.join(
  rootDir,
  'shared',
  'idempotency',
  'routeCanonicalizer.ts',
);
const sharedRequestCanonicalizerPath = path.join(
  rootDir,
  'shared',
  'idempotency',
  'requestHashCanonicalizer.ts',
);
const backendGeneratedDir = path.join(rootDir, 'src', 'generated', 'idempotency');
const frontendGeneratedDir = path.join(rootDir, 'frontend', 'src', 'generated', 'idempotency');

const manifest = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizePattern = (pattern) => {
  const collapsed = pattern.replace(/\/{2,}/g, '/').trim();
  if (!collapsed || collapsed === '/') {
    return '/';
  }
  return collapsed.endsWith('/') ? collapsed.slice(0, -1) : collapsed;
};

const buildMatchExpression = (pattern) => {
  const normalized = normalizePattern(pattern);
  if (normalized === '/') {
    return '^/$';
  }

  const segments = normalized
    .split('/')
    .filter(Boolean)
    .map((segment) => (segment.startsWith(':') ? '[^/]+' : escapeRegex(segment)));

  return `^/${segments.join('/')}$`;
};

const validateManifest = (input) => {
  if (!input || typeof input !== 'object') {
    throw new Error('Offline write ownership manifest must be an object');
  }

  if (!Array.isArray(input.routes) || input.routes.length === 0) {
    throw new Error('Offline write ownership manifest must define at least one route');
  }

  const unique = new Set();
  const workboxQueueNames = new Set();
  for (const route of input.routes) {
    if (!route.id || !route.method || !route.pattern || !route.queueOwner) {
      throw new Error(`Manifest route is missing required fields: ${JSON.stringify(route)}`);
    }

    const identity = `${route.method}:${route.pattern}`;
    if (unique.has(identity)) {
      throw new Error(`Duplicate offline write ownership entry: ${identity}`);
    }
    unique.add(identity);

    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(route.method)) {
      throw new Error(`Unsupported manifest method ${route.method} for ${route.id}`);
    }

    if (!['app', 'sw', 'none'].includes(route.queueOwner)) {
      throw new Error(`Unsupported queue owner ${route.queueOwner} for ${route.id}`);
    }

    if (route.queueOwner === 'sw' && route.backgroundSync?.queueName) {
      const queueName = route.backgroundSync.queueName;
      if (workboxQueueNames.has(queueName)) {
        throw new Error(`Duplicate Workbox background sync queue name ${queueName}`);
      }
      workboxQueueNames.add(queueName);
    }
  }
};

validateManifest(manifest);

const generatedRoutes = manifest.routes.map((route) => ({
  ...route,
  pattern: normalizePattern(route.pattern),
  matchExpression: buildMatchExpression(route.pattern),
}));

const generatedManifest = {
  version: manifest.version,
  routes: generatedRoutes,
};

fs.mkdirSync(path.dirname(frontendJsonPath), { recursive: true });
fs.writeFileSync(frontendJsonPath, `${JSON.stringify(generatedManifest, null, 2)}\n`, 'utf8');
fs.mkdirSync(path.dirname(backendJsonPath), { recursive: true });
fs.writeFileSync(backendJsonPath, `${JSON.stringify(generatedManifest, null, 2)}\n`, 'utf8');

fs.mkdirSync(backendGeneratedDir, { recursive: true });
fs.mkdirSync(frontendGeneratedDir, { recursive: true });
fs.copyFileSync(
  sharedRouteCanonicalizerPath,
  path.join(backendGeneratedDir, 'routeCanonicalizer.ts'),
);
fs.copyFileSync(
  sharedRouteCanonicalizerPath,
  path.join(frontendGeneratedDir, 'routeCanonicalizer.ts'),
);
fs.copyFileSync(
  sharedRequestCanonicalizerPath,
  path.join(backendGeneratedDir, 'requestHashCanonicalizer.ts'),
);
fs.copyFileSync(
  sharedRequestCanonicalizerPath,
  path.join(frontendGeneratedDir, 'requestHashCanonicalizer.ts'),
);

const frontendTsSource = `import { normalizeConcreteRoutePath } from '../generated/idempotency/routeCanonicalizer';

export type OfflineWriteQueueOwner = 'app' | 'sw' | 'none';
export type OfflineWriteMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface OfflineWriteOwnershipRoute {
  id: string;
  method: OfflineWriteMethod;
  pattern: string;
  matchExpression: string;
  queueOwner: OfflineWriteQueueOwner;
  idempotencyRequired: boolean;
  idempotencyPhase: string;
  timeoutProfile: string;
  backgroundSync?: {
    queueName: string;
    maxRetentionMinutes: number;
  };
}

export interface OfflineWriteOwnershipManifest {
  version: number;
  routes: OfflineWriteOwnershipRoute[];
}

export const offlineWriteOwnershipManifest: OfflineWriteOwnershipManifest = ${JSON.stringify(generatedManifest, null, 2)} as const;

export const normalizeOfflineOwnershipPath = (value: string): string => {
  return normalizeConcreteRoutePath(value);
};

export const matchOfflineWriteOwnership = (
  method: string,
  value: string,
): OfflineWriteOwnershipRoute | null => {
  const normalizedMethod = String(method || '').toUpperCase();
  const normalizedPath = normalizeOfflineOwnershipPath(value);

  for (const route of offlineWriteOwnershipManifest.routes) {
    if (route.method !== normalizedMethod) {
      continue;
    }

    if (new RegExp(route.matchExpression).test(normalizedPath)) {
      return route;
    }
  }

  return null;
};

export const getWorkboxOwnedRoutes = (): OfflineWriteOwnershipRoute[] =>
  offlineWriteOwnershipManifest.routes.filter((route) => route.queueOwner === 'sw' && route.backgroundSync);

export const getAppQueueOwnedRoutes = (): OfflineWriteOwnershipRoute[] =>
  offlineWriteOwnershipManifest.routes.filter((route) => route.queueOwner === 'app');
`;

const backendTsSource = `import { normalizeConcreteRoutePath } from './idempotency/routeCanonicalizer';

export type OfflineWriteQueueOwner = 'app' | 'sw' | 'none';
export type OfflineWriteMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface OfflineWriteOwnershipRoute {
  id: string;
  method: OfflineWriteMethod;
  pattern: string;
  matchExpression: string;
  queueOwner: OfflineWriteQueueOwner;
  idempotencyRequired: boolean;
  idempotencyPhase: string;
  timeoutProfile: string;
  backgroundSync?: {
    queueName: string;
    maxRetentionMinutes: number;
  };
}

export interface OfflineWriteOwnershipManifest {
  version: number;
  routes: OfflineWriteOwnershipRoute[];
}

export const offlineWriteOwnershipManifest: OfflineWriteOwnershipManifest = ${JSON.stringify(generatedManifest, null, 2)} as const;

export const normalizeOfflineOwnershipPath = (value: string): string => {
  return normalizeConcreteRoutePath(value);
};

export const matchOfflineWriteOwnership = (
  method: string,
  value: string,
): OfflineWriteOwnershipRoute | null => {
  const normalizedMethod = String(method || '').toUpperCase();
  const normalizedPath = normalizeOfflineOwnershipPath(value);

  for (const route of offlineWriteOwnershipManifest.routes) {
    if (route.method !== normalizedMethod) {
      continue;
    }

    if (new RegExp(route.matchExpression).test(normalizedPath)) {
      return route;
    }
  }

  return null;
};
`;

fs.writeFileSync(frontendTsPath, `${frontendTsSource}\n`, 'utf8');
fs.writeFileSync(backendTsPath, `${backendTsSource}\n`, 'utf8');

process.stdout.write(
  `Generated offline write ownership manifest (${generatedRoutes.length} routes) and shared idempotency helpers\n`,
);
