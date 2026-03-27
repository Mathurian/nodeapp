import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

const realFs = jest.requireActual('fs') as typeof import('fs');

const TEST_MANIFEST_KEY_PAIR = {
  privateKey: `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIJWrYbLY69pNqxdJajNFz0I9IanXxAZ8/9T+0v1MFu3V
-----END PRIVATE KEY-----`,
  publicKey: `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA4XIpZ0qUcs6qA9mOnTLpWd7Zy5GaeTTwDwNFYkoPLag=
-----END PUBLIC KEY-----`,
};

describe('offline write ownership runtime configuration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('loads the manifest and resolves route ownership when signature enforcement is disabled', async () => {
    process.env.NODE_ENV = 'test';
    process.env.OFFLINE_WRITE_MANIFEST_STRICT = 'false';
    process.env.OFFLINE_WRITE_MANIFEST_REQUIRE_SIGNATURE = 'false';

    const config = await import('../../../src/config/offlineWriteOwnership.config');

    const state = await config.initializeOfflineWriteOwnershipManifest();
    const route = config.matchOfflineWriteOwnershipRoute(
      'DELETE',
      '/api/v1/score-files/example-id',
    );

    expect(state.valid).toBe(true);
    expect(state.usingFallback).toBe(false);
    expect(route).toMatchObject({
      id: 'score-files-delete',
      queueOwner: 'none',
      timeoutProfile: 'upload',
    });
    expect(config.getOfflineWriteTimeoutMs(route)).toBe(15000);
  });

  it('blocks covered writes in non-strict mode when signature enforcement is enabled but signature is unavailable', async () => {
    process.env.NODE_ENV = 'test';
    process.env.OFFLINE_WRITE_MANIFEST_STRICT = 'false';
    process.env.OFFLINE_WRITE_MANIFEST_REQUIRE_SIGNATURE = 'true';

    const config = await import('../../../src/config/offlineWriteOwnership.config');
    await config.initializeOfflineWriteOwnershipManifest();

    const { offlineWriteOwnershipGuard } = await import(
      '../../../src/middleware/offlineWriteOwnershipGuard'
    );

    const req = {
      method: 'POST',
      originalUrl: '/api/v1/commentary',
      path: '/api/v1/commentary',
      id: 'req-test',
      correlationId: 'corr-test',
    } as any;

    const res = {
      statusCode: 200,
      body: null as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.body = payload;
        return this;
      },
    } as any;

    const next = jest.fn();

    offlineWriteOwnershipGuard(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(503);
    expect(res.body).toMatchObject({
      success: false,
      code: 'TRANSIENT_UPSTREAM_FAILURE',
      retryable: true,
      details: {
        routeId: 'commentary-create',
      },
    });
  });

  it('falls back in non-strict mode when anti-rollback validation fails', async () => {
    const tmpDir = realFs.mkdtempSync(path.join(os.tmpdir(), 'manifest-anti-rollback-'));
    const manifestPath = path.join(tmpDir, 'offline-write-ownership.manifest.json');
    const signaturePath = path.join(tmpDir, 'offline-write-ownership.manifest.sig');
    const statePath = path.join(tmpDir, 'offline-write-ownership.accepted.json');
    const repoManifestPath = path.resolve(
      __dirname,
      '../../../config/offline-write-ownership.manifest.json',
    );
    const manifestPayload = realFs.readFileSync(repoManifestPath, 'utf8');
    const manifest = JSON.parse(manifestPayload) as { version: number };
    process.env.NODE_ENV = 'test';
    process.env.CRYPTO_PROVIDER = 'env';
    process.env.MANIFEST_SIGNING_KEY_ID = 'manifest-test-key';
    process.env.MANIFEST_SIGNING_PRIVATE_KEY = TEST_MANIFEST_KEY_PAIR.privateKey;
    process.env.MANIFEST_SIGNING_PUBLIC_KEY = TEST_MANIFEST_KEY_PAIR.publicKey;
    process.env.REPLAY_PAYLOAD_KEY_ID = 'replay-test-key';
    process.env.REPLAY_PAYLOAD_ENCRYPTION_KEY = `base64:${crypto.randomBytes(32).toString('base64')}`;
    process.env.OFFLINE_WRITE_MANIFEST_STRICT = 'false';
    process.env.OFFLINE_WRITE_MANIFEST_REQUIRE_SIGNATURE = 'true';
    process.env.OFFLINE_WRITE_MANIFEST_SOURCE_PATH = manifestPath;
    process.env.OFFLINE_WRITE_MANIFEST_SIGNATURE_PATH = signaturePath;
    process.env.OFFLINE_WRITE_MANIFEST_STATE_PATH = statePath;

    realFs.writeFileSync(manifestPath, manifestPayload, 'utf8');

    const { signManifestPayload } = await import('../../../src/security/manifestSigningClient');
    realFs.writeFileSync(
      signaturePath,
      `${JSON.stringify(await signManifestPayload(manifestPayload), null, 2)}\n`,
      'utf8',
    );
    realFs.writeFileSync(
      statePath,
      `${JSON.stringify(
        {
          version: manifest.version + 1,
          manifestHash: 'different-hash',
          acceptedAt: new Date().toISOString(),
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    const config = await import('../../../src/config/offlineWriteOwnership.config');
    const state = await config.initializeOfflineWriteOwnershipManifest();

    expect(state.valid).toBe(false);
    expect(state.usingFallback).toBe(true);
    expect(state.reason).toMatch(/anti-rollback validation/);
  });
});
