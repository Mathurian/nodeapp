import crypto from 'crypto';
import { resetManagedCryptoProviderForTests, getManagedCryptoProvider } from '../../../src/security/managedCryptoProvider';
import { signManifestPayload } from '../../../src/security/manifestSigningClient';
import { verifyManifestSignature } from '../../../src/security/manifestSignature';
import { decryptReplayPayload, encryptReplayPayload } from '../../../src/security/replayPayloadCrypto';

const TEST_MANIFEST_KEY_PAIR = {
  privateKey: `-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIJWrYbLY69pNqxdJajNFz0I9IanXxAZ8/9T+0v1MFu3V
-----END PRIVATE KEY-----`,
  publicKey: `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA4XIpZ0qUcs6qA9mOnTLpWd7Zy5GaeTTwDwNFYkoPLag=
-----END PUBLIC KEY-----`,
};

describe('managed crypto provider abstraction', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.resetModules();
    resetManagedCryptoProviderForTests();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('supports env provider signing and verification', async () => {
    process.env.NODE_ENV = 'test';
    process.env.CRYPTO_PROVIDER = 'env';
    process.env.MANIFEST_SIGNING_KEY_ID = 'manifest-test-key';
    process.env.MANIFEST_SIGNING_PRIVATE_KEY = TEST_MANIFEST_KEY_PAIR.privateKey;
    process.env.MANIFEST_SIGNING_PUBLIC_KEY = TEST_MANIFEST_KEY_PAIR.publicKey;
    process.env.REPLAY_PAYLOAD_KEY_ID = 'replay-test-key';
    process.env.REPLAY_PAYLOAD_ENCRYPTION_KEY = `base64:${crypto.randomBytes(32).toString('base64')}`;

    const provider = await getManagedCryptoProvider();
    expect(provider.providerName).toBe('env');
    expect(provider.isProductionGrade()).toBe(false);

    const signature = await signManifestPayload(Buffer.from('manifest-payload', 'utf8'));
    await expect(
      verifyManifestSignature(Buffer.from('manifest-payload', 'utf8'), signature),
    ).resolves.toBe(true);
  });

  it('rejects expired manifest signatures when max signature age is enforced', async () => {
    process.env.NODE_ENV = 'test';
    process.env.CRYPTO_PROVIDER = 'env';
    process.env.MANIFEST_SIGNING_KEY_ID = 'manifest-test-key';
    process.env.MANIFEST_SIGNING_PRIVATE_KEY = TEST_MANIFEST_KEY_PAIR.privateKey;
    process.env.MANIFEST_SIGNING_PUBLIC_KEY = TEST_MANIFEST_KEY_PAIR.publicKey;
    process.env.REPLAY_PAYLOAD_KEY_ID = 'replay-test-key';
    process.env.REPLAY_PAYLOAD_ENCRYPTION_KEY = `base64:${crypto.randomBytes(32).toString('base64')}`;
    process.env.MANIFEST_TRUST_MAX_SIGNATURE_AGE_MS = '1000';

    const signature = await signManifestPayload(Buffer.from('manifest-payload', 'utf8'));

    await expect(
      verifyManifestSignature(Buffer.from('manifest-payload', 'utf8'), {
        ...signature,
        signedAt: '2000-01-01T00:00:00.000Z',
      }),
    ).resolves.toBe(false);
  });

  it('supports replay payload encryption round trips', async () => {
    process.env.NODE_ENV = 'test';
    process.env.CRYPTO_PROVIDER = 'env';
    process.env.MANIFEST_SIGNING_KEY_ID = 'manifest-test-key';
    process.env.MANIFEST_SIGNING_PRIVATE_KEY = TEST_MANIFEST_KEY_PAIR.privateKey;
    process.env.MANIFEST_SIGNING_PUBLIC_KEY = TEST_MANIFEST_KEY_PAIR.publicKey;
    process.env.REPLAY_PAYLOAD_KEY_ID = 'replay-test-key';
    process.env.REPLAY_PAYLOAD_KEY_VERSION = 'v1';
    process.env.REPLAY_PAYLOAD_ENCRYPTION_KEY = `base64:${crypto.randomBytes(32).toString('base64')}`;

    const envelope = await encryptReplayPayload({ ok: true, nested: { value: 7 } }, 'POST:/api/v1/scoring');
    const decrypted = await decryptReplayPayload<{ ok: boolean; nested: { value: number } }>(
      envelope,
      'POST:/api/v1/scoring',
    );

    expect(decrypted).toEqual({ ok: true, nested: { value: 7 } });
  });

  it('rejects insecure providers in production-like runtimes', async () => {
    process.env.NODE_ENV = 'production';
    process.env.CRYPTO_PROVIDER = 'env';
    process.env.CRYPTO_ALLOW_INSECURE_PROVIDERS = 'false';
    process.env.MANIFEST_SIGNING_PRIVATE_KEY = TEST_MANIFEST_KEY_PAIR.privateKey;
    process.env.MANIFEST_SIGNING_PUBLIC_KEY = TEST_MANIFEST_KEY_PAIR.publicKey;
    process.env.REPLAY_PAYLOAD_ENCRYPTION_KEY = `base64:${crypto.randomBytes(32).toString('base64')}`;

    await expect(getManagedCryptoProvider()).rejects.toThrow(
      /CRYPTO_PROVIDER=env is not allowed/,
    );
  });
});
