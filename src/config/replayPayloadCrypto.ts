import { getManagedCryptoProvider } from '../security/managedCryptoProvider';
import { ManagedCryptoProvider } from '../types/security.types';

let replayPayloadCryptoProviderPromise: Promise<ManagedCryptoProvider> | null = null;

export const getReplayPayloadCryptoProvider = async (): Promise<ManagedCryptoProvider> => {
  if (!replayPayloadCryptoProviderPromise) {
    replayPayloadCryptoProviderPromise = getManagedCryptoProvider();
  }

  return replayPayloadCryptoProviderPromise;
};
