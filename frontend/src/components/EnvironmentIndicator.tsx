import React from 'react'
import { detectRuntimeEnvironment } from '../utils/runtimeEnvironment'

const EnvironmentIndicator: React.FC = () => {
  const env = detectRuntimeEnvironment()
  if (env !== 'dev') return null

  return (
    <aside
      className="pointer-events-none fixed top-2 right-2 z-[100]"
      aria-label="Environment indicator"
    >
      <div
        className="inline-flex items-center rounded-md border border-amber-300 bg-amber-500 px-2.5 py-1 text-[11px] font-bold tracking-wide text-amber-950 shadow"
        aria-label="Development environment"
        title="Development environment"
      >
        DEV ENVIRONMENT
      </div>
    </aside>
  )
}

export default EnvironmentIndicator
