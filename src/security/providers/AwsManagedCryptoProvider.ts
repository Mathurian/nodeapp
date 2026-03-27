import {
  CryptoOperationContext,
  DetachedSignatureEnvelope,
  EncryptedPayloadEnvelope,
  ManagedCryptoProvider,
} from '../../types/security.types';

export class AwsManagedCryptoProvider implements ManagedCryptoProvider {
  readonly providerName = 'aws' as const;

  isProductionGrade(): boolean {
    return true;
  }

  async sign(_payload: Buffer, _context: CryptoOperationContext): Promise<DetachedSignatureEnvelope> {
    throw new Error(
      'AWS managed crypto provider is not implemented yet. Configure provider-agnostic abstractions first, then bind production to AWS KMS.',
    );
  }

  async verify(
    _payload: Buffer,
    _signature: DetachedSignatureEnvelope,
    _context: CryptoOperationContext,
  ): Promise<boolean> {
    throw new Error(
      'AWS managed crypto provider is not implemented yet. Configure provider-agnostic abstractions first, then bind production to AWS KMS.',
    );
  }

  async encrypt(
    _plaintext: Buffer,
    _context: CryptoOperationContext,
  ): Promise<EncryptedPayloadEnvelope> {
    throw new Error(
      'AWS managed crypto provider is not implemented yet. Configure provider-agnostic abstractions first, then bind production to AWS KMS.',
    );
  }

  async decrypt(
    _envelope: EncryptedPayloadEnvelope,
    _context: CryptoOperationContext,
  ): Promise<Buffer> {
    throw new Error(
      'AWS managed crypto provider is not implemented yet. Configure provider-agnostic abstractions first, then bind production to AWS KMS.',
    );
  }
}
