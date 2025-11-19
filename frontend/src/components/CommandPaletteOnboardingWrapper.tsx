/**
 * Wrapper for CommandPaletteOnboarding that provides auth context
 */

import { useAuth } from '../contexts/AuthContext'
import CommandPaletteOnboarding from './CommandPaletteOnboarding'

interface CommandPaletteOnboardingWrapperProps {
  onComplete: () => void
}

const CommandPaletteOnboardingWrapper: React.FC<CommandPaletteOnboardingWrapperProps> = ({
  onComplete
}) => {
  const { isAuthenticated } = useAuth()

  return (
    <CommandPaletteOnboarding
      onComplete={onComplete}
      isAuthenticated={isAuthenticated}
    />
  )
}

export default CommandPaletteOnboardingWrapper
