import type { OfflineOwnerScope } from './offlineWorkflowStore'

let activeOfflineOwner: OfflineOwnerScope | null = null

export const setActiveOfflineOwner = (owner: OfflineOwnerScope | null): void => {
  activeOfflineOwner = owner
}

export const getActiveOfflineOwner = (): OfflineOwnerScope | null => activeOfflineOwner
