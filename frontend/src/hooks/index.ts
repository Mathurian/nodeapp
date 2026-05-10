/**
 * Custom hooks barrel export
 */
export { useVirtualKeyboard, useAutoScroll } from './useVirtualKeyboard'
export {
  useKeyboardShortcuts,
  useShortcutStrings,
  parseShortcut,
  matchesShortcut,
  getModifierKeySymbol,
  formatShortcut,
  COMMON_SHORTCUTS
} from './useKeyboardShortcuts'
export { useCommands } from './useCommands'
export { useFileUpload } from './useFileUpload'
export type { UseFileUploadOptions, UseFileUploadReturn } from './useFileUpload'
export { useMobileWorkflowNavigation } from './useMobileWorkflowNavigation'
export {
  useOptimisticMutation,
  useOptimisticListHelpers,
  generateOptimisticId
} from './useOptimisticMutation'
export { useResultsScopeOptions } from './useResultsScopeOptions'
export type {
  UseOptimisticMutationOptions,
  UseOptimisticMutationResult,
  OptimisticItem
} from './useOptimisticMutation'
