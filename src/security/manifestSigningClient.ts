import { getManagedCryptoProvider } from './managedCryptoProvider';
import { DetachedSignatureEnvelope } from '../types/security.types';
import { getManagedCryptoConfig } from '../config/managedCrypto.config';
import crypto from 'crypto';

const MANIFEST_CANONICALIZATION_VERSION = 'manifest-v1';

const canonicalizeManifestPayload = (payload: Buffer | string): Buffer => {
  if (Buffer.isBuffer(payload)) {
    return payload;
  }

  return Buffer.from(payload, 'utf8');
};

export const signManifestPayload = async (
  payload: Buffer | string,
): Promise<DetachedSignatureEnvelope> => {
  const canonicalPayload = canonicalizeManifestPayload(payload);
  const provider = await getManagedCryptoProvider();
  const config = getManagedCryptoConfig();
  const keyRef =
    config.provider === 'local'
      ? config.local?.manifestKeyId
      : config.provider === 'env'
        ? config.env?.manifestKeyId
        : config.provider === 'aws'
          ? config.aws?.manifestKeyId
          : config.vault?.manifestKeyName;

  if (!keyRef) {
    throw new Error('Manifest signing key reference is not configured');
  }

  const signature = await provider.sign(canonicalPayload, {
    keyRef,
    keyVersion: MANIFEST_CANONICALIZATION_VERSION,
  });

  return {
    ...signature,
    manifestHash: crypto.createHash('sha256').update(canonicalPayload).digest('hex'),
  };
};
