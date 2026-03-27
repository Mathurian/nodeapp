import { getManifestTrustStore } from '../config/manifestTrustStore';
import { getManagedCryptoConfig } from '../config/managedCrypto.config';
import { DetachedSignatureEnvelope } from '../types/security.types';
import { getManagedCryptoProvider } from './managedCryptoProvider';
import crypto from 'crypto';

const canonicalizeManifestPayload = (payload: Buffer | string): Buffer =>
  Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'utf8');

const computeManifestHash = (payload: Buffer): string =>
  crypto.createHash('sha256').update(payload).digest('hex');

export const verifyManifestSignature = async (
  payload: Buffer | string,
  signature: DetachedSignatureEnvelope,
): Promise<boolean> => {
  const canonicalPayload = canonicalizeManifestPayload(payload);
  const trustStore = getManifestTrustStore();
  const signedAt = Date.parse(signature.signedAt);
  const manifestHash = computeManifestHash(canonicalPayload);

  if (signature.manifestHash !== manifestHash) {
    return false;
  }

  if (!Number.isFinite(signedAt)) {
    return false;
  }

  if (
    trustStore.maxSignatureAgeMs !== null &&
    Date.now() - signedAt > trustStore.maxSignatureAgeMs
  ) {
    return false;
  }

  if (!trustStore.allowedAlgorithms.includes(signature.algorithm)) {
    return false;
  }

  if (trustStore.revokedKeyIds.includes(signature.keyId)) {
    return false;
  }

  const isTrustedKey = trustStore.allowedKeys.some(
    (key) => key.keyId === signature.keyId && key.provider === signature.provider,
  );

  if (!isTrustedKey) {
    return false;
  }

  const provider = await getManagedCryptoProvider();
  const config = getManagedCryptoConfig();
  const keyRef =
    signature.provider === 'local'
      ? config.local?.manifestKeyId
      : signature.provider === 'env'
        ? config.env?.manifestKeyId
        : signature.provider === 'aws'
          ? config.aws?.manifestKeyId
          : config.vault?.manifestKeyName;

  if (!keyRef) {
    return false;
  }

  return provider.verify(canonicalPayload, signature, { keyRef });
};
