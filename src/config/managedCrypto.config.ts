import fs from 'fs';
import path from 'path';
import { env } from './env';
import {
  AwsManagedCryptoProviderConfig,
  EnvManagedCryptoProviderConfig,
  LocalManagedCryptoProviderConfig,
  ManagedCryptoProviderConfig,
  ManagedCryptoProviderName,
  VaultManagedCryptoProviderConfig,
} from '../types/security.types';

const DEFAULT_MANIFEST_KEY_ID = 'local-manifest-key';
const DEFAULT_REPLAY_KEY_ID = 'local-replay-key';

const readString = (key: string): string | undefined => {
  const value = process.env[key];
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return fallback;
};

const resolveProvider = (): ManagedCryptoProviderName => {
  const configured = (readString('CRYPTO_PROVIDER') ||
    readString('SECRETS_PROVIDER') ||
    'env') as ManagedCryptoProviderName;

  if (configured === 'env' || configured === 'local' || configured === 'aws' || configured === 'vault') {
    return configured;
  }

  return 'env';
};

const resolveAllowInsecureProviders = (): boolean => {
  const defaultValue = env.isDevelopment() || env.isTest();
  return parseBoolean(readString('CRYPTO_ALLOW_INSECURE_PROVIDERS'), defaultValue);
};

const resolveEnvProviderConfig = (): EnvManagedCryptoProviderConfig => ({
  manifestKeyId: readString('MANIFEST_SIGNING_KEY_ID') || DEFAULT_MANIFEST_KEY_ID,
  manifestPrivateKeyPem: readString('MANIFEST_SIGNING_PRIVATE_KEY') || '',
  manifestPublicKeyPem: readString('MANIFEST_SIGNING_PUBLIC_KEY') || '',
  replayKeyId: readString('REPLAY_PAYLOAD_KEY_ID') || DEFAULT_REPLAY_KEY_ID,
  replayKeyVersion: readString('REPLAY_PAYLOAD_KEY_VERSION'),
  replayEncryptionKey: readString('REPLAY_PAYLOAD_ENCRYPTION_KEY') || '',
});

const resolveLocalProviderConfig = (): LocalManagedCryptoProviderConfig => ({
  manifestKeyId: readString('MANIFEST_SIGNING_KEY_ID') || DEFAULT_MANIFEST_KEY_ID,
  manifestPrivateKeyPath:
    readString('MANIFEST_SIGNING_PRIVATE_KEY_PATH') ||
    path.resolve(process.cwd(), 'config/keys/manifest-signing-private.pem'),
  manifestPublicKeyPath:
    readString('MANIFEST_SIGNING_PUBLIC_KEY_PATH') ||
    path.resolve(process.cwd(), 'config/keys/manifest-signing-public.pem'),
  replayKeyId: readString('REPLAY_PAYLOAD_KEY_ID') || DEFAULT_REPLAY_KEY_ID,
  replayKeyVersion: readString('REPLAY_PAYLOAD_KEY_VERSION'),
  replayEncryptionKeyPath:
    readString('REPLAY_PAYLOAD_ENCRYPTION_KEY_PATH') ||
    path.resolve(process.cwd(), 'config/keys/replay-payload.key'),
});

const resolveAwsProviderConfig = (): AwsManagedCryptoProviderConfig => ({
  region: readString('CRYPTO_AWS_REGION') || readString('AWS_REGION') || 'us-east-1',
  manifestKeyId: readString('CRYPTO_AWS_MANIFEST_KEY_ID'),
  replayKeyId: readString('CRYPTO_AWS_REPLAY_KEY_ID'),
});

const resolveVaultProviderConfig = (): VaultManagedCryptoProviderConfig => ({
  address: readString('CRYPTO_VAULT_ADDR') || readString('VAULT_ADDR') || 'http://localhost:8200',
  token: readString('CRYPTO_VAULT_TOKEN') || readString('VAULT_TOKEN'),
  namespace: readString('CRYPTO_VAULT_NAMESPACE') || readString('VAULT_NAMESPACE'),
  transitMount: readString('CRYPTO_VAULT_TRANSIT_MOUNT') || 'transit',
  manifestKeyName: readString('CRYPTO_VAULT_MANIFEST_KEY_NAME'),
  replayKeyName: readString('CRYPTO_VAULT_REPLAY_KEY_NAME'),
});

export const getManagedCryptoConfig = (): ManagedCryptoProviderConfig => {
  const provider = resolveProvider();

  return {
    provider,
    allowInsecureProviders: resolveAllowInsecureProviders(),
    env: resolveEnvProviderConfig(),
    local: resolveLocalProviderConfig(),
    aws: resolveAwsProviderConfig(),
    vault: resolveVaultProviderConfig(),
  };
};

export const assertManagedCryptoProviderAllowed = (config: ManagedCryptoProviderConfig): void => {
  if (config.allowInsecureProviders) {
    return;
  }

  if (config.provider === 'aws' || config.provider === 'vault') {
    return;
  }

  throw new Error(
    `CRYPTO_PROVIDER=${config.provider} is not allowed in ${env.get(
      'NODE_ENV',
    )}. Use a production-grade provider or explicitly allow insecure providers for local-only runtimes.`,
  );
};

export const readRequiredFile = (filePath: string): string => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required crypto file not found: ${filePath}`);
  }

  return fs.readFileSync(filePath, 'utf8');
};

export const decodeSymmetricKeyMaterial = (raw: string): Buffer => {
  const value = raw.trim();

  if (!value) {
    throw new Error('Replay payload encryption key is empty');
  }

  if (value.startsWith('base64:')) {
    return Buffer.from(value.slice('base64:'.length), 'base64');
  }

  if (value.startsWith('hex:')) {
    return Buffer.from(value.slice('hex:'.length), 'hex');
  }

  return Buffer.from(value, 'utf8');
};
