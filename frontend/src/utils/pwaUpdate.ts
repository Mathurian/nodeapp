type PwaUpdater = () => Promise<void>

let pwaUpdater: PwaUpdater | null = null

export const setPwaUpdater = (updater: PwaUpdater): void => {
  pwaUpdater = updater
}

export const applyPwaUpdate = async (): Promise<void> => {
  if (!pwaUpdater) {
    throw new Error('PWA update is not ready yet')
  }

  await pwaUpdater()
}
