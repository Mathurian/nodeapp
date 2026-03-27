import { getManagedCryptoConfig, readRequiredFile } from './managedCrypto.config';
import { ManifestTrustStore } from '../types/security.types';

const splitCsv = (value: string | undefined): string[] => {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const readPositiveNumber = (value: string | undefined): number | null => {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const resolveAllowedAlgorithms = (): string[] => {
  const algorithms = splitCsv(process.env['MANIFEST_TRUST_ALLOWED_ALGORITHMS'] || 'ed25519,rsa-sha256');
  return algorithms.length > 0 ? algorithms : ['ed25519', 'rsa-sha256'];
};

const resolveRevokedKeyIds = (): string[] =>
  splitCsv(process.env['MANIFEST_TRUST_REVOKED_KEY_IDS']);

const resolveMaxSignatureAgeMs = (): number | null =>
  readPositiveNumber(process.env['MANIFEST_TRUST_MAX_SIGNATURE_AGE_MS']);

const buildStore = (allowedKeys: ManifestTrustStore['allowedKeys']): ManifestTrustStore => ({
  allowedKeys,
  revokedKeyIds: resolveRevokedKeyIds(),
  allowedAlgorithms: resolveAllowedAlgorithms(),
  maxSignatureAgeMs: resolveMaxSignatureAgeMs(),
});

export const getManifestTrustStore = (): ManifestTrustStore => {
  const config = getManagedCryptoConfig();

  switch (config.provider) {
    case 'env':
      return buildStore([
          {
            keyId: config.env?.manifestKeyId || 'local-manifest-key',
            provider: 'env',
          },
        ]);

    case 'local':
      return buildStore([
          {
            keyId: config.local?.manifestKeyId || 'local-manifest-key',
            provider: 'local',
          },
        ]);

    case 'aws':
      return buildStore(
        splitCsv(process.env['CRYPTO_AWS_TRUSTED_MANIFEST_KEY_IDS'] || config.aws?.manifestKeyId).map(
          (keyId) => ({
            keyId,
            provider: 'aws' as const,
          }),
        ),
      );

    case 'vault':
      return buildStore(
        splitCsv(
          process.env['CRYPTO_VAULT_TRUSTED_MANIFEST_KEY_IDS'] || config.vault?.manifestKeyName,
        ).map((keyId) => ({
          keyId,
          provider: 'vault' as const,
        })),
      );
  }
};

export const getLocalManifestVerificationKeyPem = (): string | null => {
  const config = getManagedCryptoConfig();

  if (config.provider === 'env') {
    return config.env?.manifestPublicKeyPem || null;
  }

  if (config.provider === 'local' && config.local?.manifestPublicKeyPath) {
    return readRequiredFile(config.local.manifestPublicKeyPath);
  }

  return null;
};
