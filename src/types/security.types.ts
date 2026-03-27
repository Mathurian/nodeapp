export type ManagedCryptoProviderName = 'env' | 'local' | 'aws' | 'vault';

export interface CryptoOperationContext {
  keyRef: string;
  keyVersion?: string;
  aad?: Buffer;
}

export interface DetachedSignatureEnvelope {
  version: 1;
  provider: ManagedCryptoProviderName;
  algorithm: string;
  keyId: string;
  manifestHash: string;
  signature: string;
  signedAt: string;
}

export interface EncryptedPayloadEnvelope {
  version: 1;
  provider: ManagedCryptoProviderName;
  algorithm: 'aes-256-gcm';
  keyId: string;
  keyVersion?: string;
  iv: string;
  authTag: string;
  ciphertext: string;
}

export interface ManagedCryptoProvider {
  readonly providerName: ManagedCryptoProviderName;

  isProductionGrade(): boolean;

  sign(payload: Buffer, context: CryptoOperationContext): Promise<DetachedSignatureEnvelope>;

  verify(
    payload: Buffer,
    signature: DetachedSignatureEnvelope,
    context: CryptoOperationContext,
  ): Promise<boolean>;

  encrypt(
    plaintext: Buffer,
    context: CryptoOperationContext,
  ): Promise<EncryptedPayloadEnvelope>;

  decrypt(
    envelope: EncryptedPayloadEnvelope,
    context: CryptoOperationContext,
  ): Promise<Buffer>;
}

export interface ManifestTrustKey {
  keyId: string;
  provider: ManagedCryptoProviderName;
}

export interface ManifestTrustStore {
  allowedKeys: ManifestTrustKey[];
  revokedKeyIds: string[];
  allowedAlgorithms: string[];
  maxSignatureAgeMs: number | null;
}

export interface EnvManagedCryptoProviderConfig {
  manifestKeyId: string;
  manifestPrivateKeyPem: string;
  manifestPublicKeyPem: string;
  replayKeyId: string;
  replayKeyVersion?: string;
  replayEncryptionKey: string;
}

export interface LocalManagedCryptoProviderConfig {
  manifestKeyId: string;
  manifestPrivateKeyPath: string;
  manifestPublicKeyPath: string;
  replayKeyId: string;
  replayKeyVersion?: string;
  replayEncryptionKeyPath: string;
}

export interface AwsManagedCryptoProviderConfig {
  region: string;
  manifestKeyId?: string;
  replayKeyId?: string;
}

export interface VaultManagedCryptoProviderConfig {
  address: string;
  token?: string;
  namespace?: string;
  transitMount: string;
  manifestKeyName?: string;
  replayKeyName?: string;
}

export interface ManagedCryptoProviderConfig {
  provider: ManagedCryptoProviderName;
  allowInsecureProviders: boolean;
  env?: EnvManagedCryptoProviderConfig;
  local?: LocalManagedCryptoProviderConfig;
  aws?: AwsManagedCryptoProviderConfig;
  vault?: VaultManagedCryptoProviderConfig;
}
