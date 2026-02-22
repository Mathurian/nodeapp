/**
 * Wrapper for CommandPaletteOnboarding that provides auth context
 */

import { useAuth } from '../contexts/AuthContext'
import CommandPaletteOnboarding from './CommandPaletteOnboarding'

interface CommandPaletteOnboardingWrapperProps {
  onComplete?: (options?: { openCommandPalette?: boolean }) => void
}

const CommandPaletteOnboardingWrapper: React.FC<CommandPaletteOnboardingWrapperProps> = ({
  onComplete
}) => {
  const { isAuthenticated, user } = useAuth()

  return (
    <CommandPaletteOnboarding
      onComplete={onComplete}
      isAuthenticated={isAuthenticated}
      user={user}
    />
  )
}

export default CommandPaletteOnboardingWrapper
