import { getManagedCryptoConfig } from '../config/managedCrypto.config';
import { getReplayPayloadCryptoProvider } from '../config/replayPayloadCrypto';
import { EncryptedPayloadEnvelope } from '../types/security.types';

const buildReplayPayloadAad = (routeKey: string): Buffer => Buffer.from(`replay:${routeKey}`, 'utf8');

const resolveReplayKeyRef = (): { keyRef: string; keyVersion?: string } => {
  const config = getManagedCryptoConfig();

  switch (config.provider) {
    case 'env':
      return {
        keyRef: config.env?.replayKeyId || 'local-replay-key',
        keyVersion: config.env?.replayKeyVersion,
      };

    case 'local':
      return {
        keyRef: config.local?.replayKeyId || 'local-replay-key',
        keyVersion: config.local?.replayKeyVersion,
      };

    case 'aws':
      if (!config.aws?.replayKeyId) {
        throw new Error('CRYPTO_AWS_REPLAY_KEY_ID is required for aws crypto provider');
      }
      return { keyRef: config.aws.replayKeyId };

    case 'vault':
      if (!config.vault?.replayKeyName) {
        throw new Error('CRYPTO_VAULT_REPLAY_KEY_NAME is required for vault crypto provider');
      }
      return { keyRef: config.vault.replayKeyName };
  }
};

export const encryptReplayPayload = async (
  payload: unknown,
  routeKey: string,
): Promise<EncryptedPayloadEnvelope> => {
  const provider = await getReplayPayloadCryptoProvider();
  const { keyRef, keyVersion } = resolveReplayKeyRef();

  return provider.encrypt(Buffer.from(JSON.stringify(payload ?? null), 'utf8'), {
    keyRef,
    keyVersion,
    aad: buildReplayPayloadAad(routeKey),
  });
};

export const decryptReplayPayload = async <T>(
  envelope: EncryptedPayloadEnvelope,
  routeKey: string,
): Promise<T> => {
  const provider = await getReplayPayloadCryptoProvider();
  const { keyRef } = resolveReplayKeyRef();
  const decrypted = await provider.decrypt(envelope, {
    keyRef,
    aad: buildReplayPayloadAad(routeKey),
  });

  return JSON.parse(decrypted.toString('utf8')) as T;
};
