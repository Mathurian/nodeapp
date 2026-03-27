import { EnvManagedCryptoProvider } from './EnvManagedCryptoProvider';
import { LocalManagedCryptoProviderConfig } from '../../types/security.types';
import { readRequiredFile } from '../../config/managedCrypto.config';

export class LocalManagedCryptoProvider extends EnvManagedCryptoProvider {
  constructor(config: LocalManagedCryptoProviderConfig) {
    super({
      manifestKeyId: config.manifestKeyId,
      manifestPrivateKeyPem: readRequiredFile(config.manifestPrivateKeyPath),
      manifestPublicKeyPem: readRequiredFile(config.manifestPublicKeyPath),
      replayKeyId: config.replayKeyId,
      replayKeyVersion: config.replayKeyVersion,
      replayEncryptionKey: readRequiredFile(config.replayEncryptionKeyPath),
    }, 'local');
  }
}
