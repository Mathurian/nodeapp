import {
  CryptoOperationContext,
  DetachedSignatureEnvelope,
  EncryptedPayloadEnvelope,
  ManagedCryptoProvider,
} from '../../types/security.types';

export class VaultManagedCryptoProvider implements ManagedCryptoProvider {
  readonly providerName = 'vault' as const;

  isProductionGrade(): boolean {
    return true;
  }

  async sign(_payload: Buffer, _context: CryptoOperationContext): Promise<DetachedSignatureEnvelope> {
    throw new Error(
      'Vault managed crypto provider is not implemented yet. Configure provider-agnostic abstractions first, then bind production to Vault transit.',
    );
  }

  async verify(
    _payload: Buffer,
    _signature: DetachedSignatureEnvelope,
    _context: CryptoOperationContext,
  ): Promise<boolean> {
    throw new Error(
      'Vault managed crypto provider is not implemented yet. Configure provider-agnostic abstractions first, then bind production to Vault transit.',
    );
  }

  async encrypt(
    _plaintext: Buffer,
    _context: CryptoOperationContext,
  ): Promise<EncryptedPayloadEnvelope> {
    throw new Error(
      'Vault managed crypto provider is not implemented yet. Configure provider-agnostic abstractions first, then bind production to Vault transit.',
    );
  }

  async decrypt(
    _envelope: EncryptedPayloadEnvelope,
    _context: CryptoOperationContext,
  ): Promise<Buffer> {
    throw new Error(
      'Vault managed crypto provider is not implemented yet. Configure provider-agnostic abstractions first, then bind production to Vault transit.',
    );
  }
}
