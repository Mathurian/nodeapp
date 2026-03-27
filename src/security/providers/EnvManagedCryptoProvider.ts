import crypto, { KeyObject } from 'crypto';
import {
  CryptoOperationContext,
  DetachedSignatureEnvelope,
  EncryptedPayloadEnvelope,
  EnvManagedCryptoProviderConfig,
  ManagedCryptoProvider,
} from '../../types/security.types';
import { decodeSymmetricKeyMaterial } from '../../config/managedCrypto.config';

const SIGNING_ALGORITHM = 'ed25519';
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

export class EnvManagedCryptoProvider implements ManagedCryptoProvider {
  readonly providerName: 'env' | 'local';

  private readonly signingPrivateKey: KeyObject;
  private readonly signingPublicKey: KeyObject;
  private readonly replayEncryptionKey: Buffer;
  private readonly manifestKeyId: string;
  private readonly replayKeyId: string;
  private readonly replayKeyVersion?: string;

  constructor(config: EnvManagedCryptoProviderConfig, providerName: 'env' | 'local' = 'env') {
    if (!config.manifestPrivateKeyPem || !config.manifestPublicKeyPem) {
      throw new Error('MANIFEST_SIGNING_PRIVATE_KEY and MANIFEST_SIGNING_PUBLIC_KEY are required for env crypto provider');
    }

    this.signingPrivateKey = crypto.createPrivateKey(config.manifestPrivateKeyPem);
    this.signingPublicKey = crypto.createPublicKey(config.manifestPublicKeyPem);
    this.replayEncryptionKey = decodeSymmetricKeyMaterial(config.replayEncryptionKey);
    this.providerName = providerName;

    if (this.replayEncryptionKey.length !== 32) {
      throw new Error('REPLAY_PAYLOAD_ENCRYPTION_KEY must decode to exactly 32 bytes for aes-256-gcm');
    }

    this.manifestKeyId = config.manifestKeyId;
    this.replayKeyId = config.replayKeyId;
    this.replayKeyVersion = config.replayKeyVersion;
  }

  isProductionGrade(): boolean {
    return false;
  }

  async sign(payload: Buffer, context: CryptoOperationContext): Promise<DetachedSignatureEnvelope> {
    this.assertManifestKeyRef(context.keyRef);
    const signature = crypto.sign(null, payload, this.signingPrivateKey);

    return {
      version: 1,
      provider: this.providerName,
      algorithm: SIGNING_ALGORITHM,
      keyId: this.manifestKeyId,
      manifestHash: crypto.createHash('sha256').update(payload).digest('hex'),
      signature: signature.toString('base64'),
      signedAt: new Date().toISOString(),
    };
  }

  async verify(
    payload: Buffer,
    signature: DetachedSignatureEnvelope,
    context: CryptoOperationContext,
  ): Promise<boolean> {
    this.assertManifestKeyRef(context.keyRef);

    if (signature.provider !== this.providerName || signature.keyId !== this.manifestKeyId) {
      return false;
    }

    return crypto.verify(
      null,
      payload,
      this.signingPublicKey,
      Buffer.from(signature.signature, 'base64'),
    );
  }

  async encrypt(
    plaintext: Buffer,
    context: CryptoOperationContext,
  ): Promise<EncryptedPayloadEnvelope> {
    this.assertReplayKeyRef(context.keyRef);

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, this.replayEncryptionKey, iv);
    if (context.aad) {
      cipher.setAAD(context.aad);
    }

    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      version: 1,
      provider: this.providerName,
      algorithm: ENCRYPTION_ALGORITHM,
      keyId: this.replayKeyId,
      keyVersion: context.keyVersion || this.replayKeyVersion,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      ciphertext: ciphertext.toString('base64'),
    };
  }

  async decrypt(
    envelope: EncryptedPayloadEnvelope,
    context: CryptoOperationContext,
  ): Promise<Buffer> {
    this.assertReplayKeyRef(context.keyRef);

    if (envelope.provider !== this.providerName || envelope.keyId !== this.replayKeyId) {
      throw new Error('Replay payload envelope key metadata does not match configured env crypto provider');
    }

    const decipher = crypto.createDecipheriv(
      ENCRYPTION_ALGORITHM,
      this.replayEncryptionKey,
      Buffer.from(envelope.iv, 'base64'),
    );

    if (context.aad) {
      decipher.setAAD(context.aad);
    }

    decipher.setAuthTag(Buffer.from(envelope.authTag, 'base64'));

    return Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, 'base64')),
      decipher.final(),
    ]);
  }

  private assertManifestKeyRef(keyRef: string): void {
    if (keyRef !== this.manifestKeyId) {
      throw new Error(`Unknown manifest signing key reference: ${keyRef}`);
    }
  }

  private assertReplayKeyRef(keyRef: string): void {
    if (keyRef !== this.replayKeyId) {
      throw new Error(`Unknown replay payload key reference: ${keyRef}`);
    }
  }
}
