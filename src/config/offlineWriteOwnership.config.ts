import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { QUERY_TIMEOUTS } from './queryTimeouts';
import { env } from './env';
import {
  matchOfflineWriteOwnership as matchGeneratedOfflineWriteOwnership,
  offlineWriteOwnershipManifest as generatedOfflineWriteOwnershipManifest,
  normalizeOfflineOwnershipPath,
  OfflineWriteOwnershipManifest,
  OfflineWriteOwnershipRoute,
} from '../generated/offlineWriteOwnership.manifest';
import { verifyManifestSignature } from '../security/manifestSignature';
import { DetachedSignatureEnvelope } from '../types/security.types';
import { createLogger } from '../utils/logger';

const logger = createLogger('offline-write-ownership');

const resolveManifestSourcePath = (): string =>
  process.env['OFFLINE_WRITE_MANIFEST_SOURCE_PATH'] ||
  path.resolve(process.cwd(), 'config', 'offline-write-ownership.manifest.json');

const resolveManifestSignaturePath = (): string =>
  process.env['OFFLINE_WRITE_MANIFEST_SIGNATURE_PATH'] ||
  path.resolve(process.cwd(), 'config', 'offline-write-ownership.manifest.sig');

const resolveManifestAcceptedStatePath = (): string =>
  process.env['OFFLINE_WRITE_MANIFEST_STATE_PATH'] ||
  path.join(os.tmpdir(), 'event-manager', 'offline-write-ownership.accepted.json');

type AcceptedManifestState = {
  version: number;
  manifestHash: string;
  acceptedAt: string;
};

type ManifestIntegrityState = {
  initialized: boolean;
  valid: boolean;
  strict: boolean;
  requireSignature: boolean;
  usingFallback: boolean;
  verifiedSignature: boolean;
  reason: string | null;
  manifestHash: string;
  version: number;
  loadedAt: string | null;
  acceptedStatePath: string | null;
};

let manifestState: ManifestIntegrityState = {
  initialized: false,
  valid: false,
  strict: env.isProduction(),
  requireSignature: env.isProduction(),
  usingFallback: true,
  verifiedSignature: false,
  reason: 'Manifest not initialized',
  manifestHash: '',
  version: generatedOfflineWriteOwnershipManifest.version,
  loadedAt: null,
  acceptedStatePath: null,
};

let activeManifest: OfflineWriteOwnershipManifest = generatedOfflineWriteOwnershipManifest;

const readBoolean = (key: string, fallback: boolean): boolean => {
  const raw = process.env[key];
  if (typeof raw !== 'string') {
    return fallback;
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return fallback;
};

const readDate = (key: string): Date | null => {
  const raw = process.env[key];
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return null;
  }

  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? new Date(parsed) : null;
};

const computeHash = (payload: string): string =>
  crypto.createHash('sha256').update(payload, 'utf8').digest('hex');

const stableStringify = (value: unknown): string => JSON.stringify(value);

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeManifestPattern = (pattern: string): string => {
  const collapsed = pattern.replace(/\/{2,}/g, '/').trim();
  if (!collapsed || collapsed === '/') {
    return '/';
  }

  return collapsed.endsWith('/') ? collapsed.slice(0, -1) : collapsed;
};

const buildMatchExpression = (pattern: string): string => {
  const normalized = normalizeManifestPattern(pattern);
  if (normalized === '/') {
    return '^/$';
  }

  const segments = normalized
    .split('/')
    .filter(Boolean)
    .map((segment) => (segment.startsWith(':') ? '[^/]+' : escapeRegex(segment)));

  return `^/${segments.join('/')}$`;
};

const isOfflineWriteMethod = (value: string): value is OfflineWriteOwnershipRoute['method'] =>
  ['POST', 'PUT', 'PATCH', 'DELETE'].includes(value);

const isOfflineWriteQueueOwner = (
  value: string,
): value is OfflineWriteOwnershipRoute['queueOwner'] => ['app', 'sw', 'none'].includes(value);

const validateManifest = (input: unknown): OfflineWriteOwnershipManifest => {
  if (!input || typeof input !== 'object') {
    throw new Error('Offline write ownership manifest must be an object');
  }

  const manifest = input as Partial<OfflineWriteOwnershipManifest>;
  if (!Number.isInteger(manifest.version) || !Array.isArray(manifest.routes)) {
    throw new Error('Offline write ownership manifest is missing version or routes');
  }

  const unique = new Set<string>();
  const routes = manifest.routes.map((route) => {
    if (!route || typeof route !== 'object') {
      throw new Error('Offline write ownership route entries must be objects');
    }

    const candidate = route as Partial<OfflineWriteOwnershipRoute>;
    if (
      typeof candidate.id !== 'string' ||
      !isOfflineWriteMethod(String(candidate.method || '')) ||
      typeof candidate.pattern !== 'string' ||
      !isOfflineWriteQueueOwner(String(candidate.queueOwner || '')) ||
      typeof candidate.idempotencyRequired !== 'boolean' ||
      typeof candidate.idempotencyPhase !== 'string' ||
      typeof candidate.timeoutProfile !== 'string'
    ) {
      throw new Error(`Invalid manifest route entry: ${JSON.stringify(candidate)}`);
    }

    const identity = `${candidate.method}:${candidate.pattern}`;
    if (unique.has(identity)) {
      throw new Error(`Duplicate manifest route entry detected: ${identity}`);
    }
    unique.add(identity);

    const method = String(candidate.method) as OfflineWriteOwnershipRoute['method'];
    const queueOwner = String(candidate.queueOwner) as OfflineWriteOwnershipRoute['queueOwner'];

    return {
      id: candidate.id,
      method,
      pattern: candidate.pattern,
      matchExpression:
        typeof candidate.matchExpression === 'string'
          ? candidate.matchExpression
          : buildMatchExpression(candidate.pattern),
      queueOwner,
      idempotencyRequired: candidate.idempotencyRequired,
      idempotencyPhase: candidate.idempotencyPhase,
      timeoutProfile: candidate.timeoutProfile,
      backgroundSync: candidate.backgroundSync,
    };
  });

  return {
    version: Number(manifest.version),
    routes,
  };
};

const parseSignatureEnvelope = (raw: string): DetachedSignatureEnvelope => {
  const parsed = JSON.parse(raw) as DetachedSignatureEnvelope;
  if (
    parsed.version !== 1 ||
    typeof parsed.provider !== 'string' ||
    typeof parsed.algorithm !== 'string' ||
    typeof parsed.keyId !== 'string' ||
    typeof parsed.manifestHash !== 'string' ||
    typeof parsed.signature !== 'string' ||
    typeof parsed.signedAt !== 'string'
  ) {
    throw new Error('Manifest signature envelope is invalid');
  }

  return parsed;
};

const resolveRuntimeConfig = (): {
  strict: boolean;
  requireSignature: boolean;
  rollbackBreakglassUntil: Date | null;
  acceptedStatePath: string;
} => ({
  strict: readBoolean('OFFLINE_WRITE_MANIFEST_STRICT', env.isProduction()),
  requireSignature: readBoolean(
    'OFFLINE_WRITE_MANIFEST_REQUIRE_SIGNATURE',
    env.isProduction(),
  ),
  rollbackBreakglassUntil: readDate('OFFLINE_WRITE_MANIFEST_ALLOW_ROLLBACK_UNTIL'),
  acceptedStatePath: resolveManifestAcceptedStatePath(),
});

const ensureParentDir = (filePath: string): void => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
};

const readAcceptedManifestState = (filePath: string): AcceptedManifestState | null => {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8')) as Partial<AcceptedManifestState>;
  if (
    !Number.isInteger(parsed.version) ||
    typeof parsed.manifestHash !== 'string' ||
    typeof parsed.acceptedAt !== 'string'
  ) {
    throw new Error('Accepted manifest state file is invalid');
  }

  return {
    version: Number(parsed.version),
    manifestHash: parsed.manifestHash,
    acceptedAt: parsed.acceptedAt,
  };
};

const persistAcceptedManifestState = (
  filePath: string,
  state: AcceptedManifestState,
): void => {
  ensureParentDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
};

const isRollbackBreakglassActive = (rollbackBreakglassUntil: Date | null): boolean =>
  !!rollbackBreakglassUntil && rollbackBreakglassUntil.getTime() > Date.now();

const assertNoRollback = (
  current: { version: number; manifestHash: string },
  accepted: AcceptedManifestState | null,
  rollbackBreakglassUntil: Date | null,
): void => {
  if (!accepted) {
    return;
  }

  const versionRolledBack = current.version < accepted.version;
  const hashChangedAtSameVersion =
    current.version === accepted.version && current.manifestHash !== accepted.manifestHash;

  if (!versionRolledBack && !hashChangedAtSameVersion) {
    return;
  }

  if (isRollbackBreakglassActive(rollbackBreakglassUntil)) {
    logger.warn('Manifest rollback breakglass override is active', {
      acceptedVersion: accepted.version,
      currentVersion: current.version,
      rollbackBreakglassUntil: rollbackBreakglassUntil?.toISOString() || null,
    });
    return;
  }

  throw new Error(
    'Offline write ownership manifest failed anti-rollback validation against the last accepted manifest state',
  );
};

const matchAgainstManifest = (
  manifest: OfflineWriteOwnershipManifest,
  method: string,
  requestPath: string,
): OfflineWriteOwnershipRoute | null => {
  const normalizedMethod = String(method || '').toUpperCase();
  const normalizedPath = normalizeOfflineOwnershipPath(requestPath);

  for (const route of manifest.routes) {
    if (route.method !== normalizedMethod) {
      continue;
    }

    if (new RegExp(route.matchExpression).test(normalizedPath)) {
      return route;
    }
  }

  return null;
};

const applyManifestState = (
  nextState: Partial<ManifestIntegrityState>,
  manifest: OfflineWriteOwnershipManifest,
): ManifestIntegrityState => {
  activeManifest = manifest;
  manifestState = {
    ...manifestState,
    ...nextState,
    version: manifest.version,
  };
  return manifestState;
};

export const initializeOfflineWriteOwnershipManifest = async (): Promise<ManifestIntegrityState> => {
  const runtimeConfig = resolveRuntimeConfig();
  const loadedAt = new Date().toISOString();
  const manifestSourcePath = resolveManifestSourcePath();
  const manifestSignaturePath = resolveManifestSignaturePath();

  try {
    const manifestPayload = fs.readFileSync(manifestSourcePath, 'utf8');
    const manifest = validateManifest(JSON.parse(manifestPayload));
    const manifestHash = computeHash(manifestPayload);
    const normalizedGeneratedManifestHash = computeHash(
      stableStringify(validateManifest(generatedOfflineWriteOwnershipManifest)),
    );
    const normalizedManifestHash = computeHash(stableStringify(manifest));

    if (normalizedManifestHash !== normalizedGeneratedManifestHash) {
      throw new Error(
        'Offline write ownership manifest is out of sync with generated backend artifacts; regenerate before startup',
      );
    }

    let verifiedSignature = false;
    if (runtimeConfig.requireSignature) {
      if (!fs.existsSync(manifestSignaturePath)) {
        throw new Error(`Manifest signature file is missing at ${manifestSignaturePath}`);
      }

      const signature = parseSignatureEnvelope(fs.readFileSync(manifestSignaturePath, 'utf8'));
      verifiedSignature = await verifyManifestSignature(manifestPayload, signature);
      if (!verifiedSignature) {
        throw new Error('Manifest signature verification failed');
      }

      const acceptedState = readAcceptedManifestState(runtimeConfig.acceptedStatePath);
      assertNoRollback(
        { version: manifest.version, manifestHash },
        acceptedState,
        runtimeConfig.rollbackBreakglassUntil,
      );
      persistAcceptedManifestState(runtimeConfig.acceptedStatePath, {
        version: manifest.version,
        manifestHash,
        acceptedAt: loadedAt,
      });
    }

    const nextState = applyManifestState(
      {
        initialized: true,
        valid: true,
        strict: runtimeConfig.strict,
        requireSignature: runtimeConfig.requireSignature,
        usingFallback: false,
        verifiedSignature,
        reason: null,
        manifestHash,
        loadedAt,
        acceptedStatePath: runtimeConfig.acceptedStatePath,
      },
      manifest,
    );

    logger.info('Offline write ownership manifest initialized', {
      version: nextState.version,
      manifestHash: nextState.manifestHash,
      strict: nextState.strict,
      requireSignature: nextState.requireSignature,
      verifiedSignature: nextState.verifiedSignature,
    });

    return nextState;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const fallbackPayload = JSON.stringify(generatedOfflineWriteOwnershipManifest);
    const nextState = applyManifestState(
      {
        initialized: true,
        valid: false,
        strict: runtimeConfig.strict,
        requireSignature: runtimeConfig.requireSignature,
        usingFallback: true,
        verifiedSignature: false,
        reason,
        manifestHash: computeHash(fallbackPayload),
        loadedAt,
        acceptedStatePath: runtimeConfig.acceptedStatePath,
      },
      generatedOfflineWriteOwnershipManifest,
    );

    logger.error('Offline write ownership manifest initialization failed', {
      reason,
      strict: nextState.strict,
      requireSignature: nextState.requireSignature,
      usingFallback: nextState.usingFallback,
    });

    if (runtimeConfig.strict) {
      throw error;
    }

    return nextState;
  }
};

export const getOfflineWriteOwnershipManifestState = (): ManifestIntegrityState => manifestState;

export const getOfflineWriteOwnershipManifest = (): OfflineWriteOwnershipManifest => activeManifest;

export const matchOfflineWriteOwnershipRoute = (
  method: string,
  requestPath: string,
): OfflineWriteOwnershipRoute | null => {
  if (activeManifest.routes.length > 0) {
    return matchAgainstManifest(activeManifest, method, requestPath);
  }

  return matchGeneratedOfflineWriteOwnership(method, requestPath);
};

export const isOfflineWriteManifestReadyForRoute = (
  method: string,
  requestPath: string,
): { ready: boolean; route: OfflineWriteOwnershipRoute | null; reason?: string } => {
  const route = matchOfflineWriteOwnershipRoute(method, requestPath);
  if (!route) {
    return { ready: true, route: null };
  }

  const state = getOfflineWriteOwnershipManifestState();
  if (state.valid) {
    return { ready: true, route };
  }

  return {
    ready: false,
    route,
    reason:
      state.reason ||
      'Offline write ownership manifest is unavailable; covered write routes are temporarily disabled',
  };
};

export const getOfflineWriteTimeoutMs = (
  route: OfflineWriteOwnershipRoute | null,
): number => {
  switch (route?.timeoutProfile) {
    case 'upload':
      return QUERY_TIMEOUTS.complex;
    case 'mutation':
    default:
      return QUERY_TIMEOUTS.standard;
  }
};
