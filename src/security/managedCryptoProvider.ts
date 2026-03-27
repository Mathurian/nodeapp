import { getManagedCryptoConfig, assertManagedCryptoProviderAllowed } from '../config/managedCrypto.config';
import { ManagedCryptoProvider } from '../types/security.types';
import { EnvManagedCryptoProvider } from './providers/EnvManagedCryptoProvider';
import { LocalManagedCryptoProvider } from './providers/LocalManagedCryptoProvider';
import { AwsManagedCryptoProvider } from './providers/AwsManagedCryptoProvider';
import { VaultManagedCryptoProvider } from './providers/VaultManagedCryptoProvider';

let providerInstance: ManagedCryptoProvider | null = null;

export const createManagedCryptoProvider = (): ManagedCryptoProvider => {
  const config = getManagedCryptoConfig();
  assertManagedCryptoProviderAllowed(config);

  switch (config.provider) {
    case 'env':
      if (!config.env) {
        throw new Error('Missing env crypto provider configuration');
      }
      return new EnvManagedCryptoProvider(config.env);

    case 'local':
      if (!config.local) {
        throw new Error('Missing local crypto provider configuration');
      }
      return new LocalManagedCryptoProvider(config.local);

    case 'aws':
      return new AwsManagedCryptoProvider();

    case 'vault':
      return new VaultManagedCryptoProvider();
  }
};

export const getManagedCryptoProvider = async (): Promise<ManagedCryptoProvider> => {
  if (!providerInstance) {
    providerInstance = createManagedCryptoProvider();
  }

  return providerInstance;
};

export const resetManagedCryptoProviderForTests = (): void => {
  providerInstance = null;
};
