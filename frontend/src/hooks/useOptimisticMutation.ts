/**
 * useOptimisticMutation Hook
 *
 * Provides optimistic update capabilities for mutations with automatic rollback on failure.
 * Integrates with React Query for cache management.
 *
 * @example
 * const mutation = useOptimisticMutation({
 *   mutationFn: (data) => api.updateScore(data),
 *   queryKey: ['scores', categoryId],
 *   updateFn: (old, newScore) => [...old, newScore],
 *   onSuccess: () => toast.success('Score saved'),
 *   onError: () => toast.error('Failed to save score'),
 * });
 */

import { useCallback, useState } from 'react'
import { useQueryClient, useMutation, QueryKey } from 'react-query'

/**
 * Marker interface for optimistic items
 */
export interface OptimisticItem {
  _optimistic?: boolean
  _optimisticId?: string
}

/**
 * Configuration options for useOptimisticMutation
 */
export interface UseOptimisticMutationOptions<TData, TVariables, TContext = unknown> {
  /** The async function that performs the mutation */
  mutationFn: (variables: TVariables) => Promise<TData>

  /** Called before the mutation executes - use for optimistic updates */
  onMutate?: (variables: TVariables) => TContext | Promise<TContext>

  /** Called when the mutation succeeds */
  onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) => void

  /** Called when the mutation fails - use for rollback notifications */
  onError?: (error: Error, variables: TVariables, context: TContext | undefined) => void

  /** Called after mutation completes (success or error) */
  onSettled?: (
    data: TData | undefined,
    error: Error | null,
    variables: TVariables,
    context: TContext | undefined
  ) => void

  /** Query key(s) to update optimistically */
  queryKey: QueryKey

  /** Function to optimistically update cached data */
  updateFn: (oldData: unknown, variables: TVariables) => unknown

  /** Whether to invalidate queries after mutation settles (default: true) */
  invalidateOnSettled?: boolean

  /** Additional query keys to invalidate on success */
  invalidateKeys?: QueryKey[]
}

/**
 * Return type for useOptimisticMutation
 */
export interface UseOptimisticMutationResult<TData, TVariables> {
  /** Execute the mutation */
  mutate: (variables: TVariables) => void

  /** Execute the mutation and return a promise */
  mutateAsync: (variables: TVariables) => Promise<TData>

  /** The mutation result data */
  data: TData | undefined

  /** Whether the mutation is currently executing */
  isLoading: boolean

  /** Whether the mutation failed */
  isError: boolean

  /** Whether the mutation succeeded */
  isSuccess: boolean

  /** Whether the mutation is idle */
  isIdle: boolean

  /** The error if mutation failed */
  error: Error | null

  /** Reset the mutation state */
  reset: () => void

  /** Set of optimistic IDs currently pending confirmation */
  pendingOptimisticIds: Set<string>
}

/**
 * Generate a unique ID for optimistic updates
 */
export function generateOptimisticId(): string {
  return `optimistic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Custom hook for mutations with optimistic updates
 *
 * This hook wraps React Query's useMutation with built-in support for:
 * - Optimistic cache updates before the server responds
 * - Automatic rollback on error
 * - Query invalidation after mutation settles
 * - Tracking of pending optimistic updates
 */
export function useOptimisticMutation<TData, TVariables, TContext = unknown>(
  options: UseOptimisticMutationOptions<TData, TVariables, TContext>
): UseOptimisticMutationResult<TData, TVariables> {
  const queryClient = useQueryClient()
  const [pendingOptimisticIds, setPendingOptimisticIds] = useState<Set<string>>(new Set())

  const {
    mutationFn,
    onMutate,
    onSuccess,
    onError,
    onSettled,
    queryKey,
    updateFn,
    invalidateOnSettled = true,
    invalidateKeys = [],
  } = options

  const mutation = useMutation<TData, Error, TVariables, TContext & { previousData?: unknown; optimisticId?: string }>(
    mutationFn,
    {
      onMutate: async (variables) => {
        // Cancel any outgoing refetches to prevent overwriting optimistic update
        await queryClient.cancelQueries(queryKey)

        // Snapshot the previous value for potential rollback
        const previousData = queryClient.getQueryData(queryKey)

        // Generate optimistic ID for tracking
        const optimisticId = generateOptimisticId()
        setPendingOptimisticIds((prev) => new Set(prev).add(optimisticId))

        // Optimistically update the cache
        queryClient.setQueryData(queryKey, (old: unknown) => updateFn(old, variables))

        // Call user's onMutate if provided
        const userContext = onMutate ? await onMutate(variables) : undefined

        // Return context for use in onError/onSuccess
        return { ...userContext, previousData, optimisticId } as TContext & {
          previousData?: unknown
          optimisticId?: string
        }
      },

      onError: (error, variables, context) => {
        // Rollback to previous data on error
        if (context?.previousData !== undefined) {
          queryClient.setQueryData(queryKey, context.previousData)
        }

        // Remove from pending set
        if (context?.optimisticId) {
          setPendingOptimisticIds((prev) => {
            const next = new Set(prev)
            next.delete(context.optimisticId!)
            return next
          })
        }

        // Call user's onError if provided
        onError?.(error, variables, context)
      },

      onSuccess: (data, variables, context) => {
        // Remove from pending set
        if (context?.optimisticId) {
          setPendingOptimisticIds((prev) => {
            const next = new Set(prev)
            next.delete(context.optimisticId!)
            return next
          })
        }

        // Call user's onSuccess if provided
        onSuccess?.(data, variables, context)
      },

      onSettled: (data, error, variables, context) => {
        // Invalidate queries to refetch fresh data
        if (invalidateOnSettled) {
          queryClient.invalidateQueries(queryKey)

          // Invalidate additional keys if provided
          invalidateKeys.forEach((key) => {
            queryClient.invalidateQueries(key)
          })
        }

        // Call user's onSettled if provided
        onSettled?.(data, error, variables, context)
      },
    }
  )

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    data: mutation.data,
    isLoading: mutation.isLoading,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    isIdle: mutation.isIdle,
    error: mutation.error,
    reset: mutation.reset,
    pendingOptimisticIds,
  }
}

/**
 * Helper hook for optimistic list updates
 *
 * Provides common update functions for list operations
 */
export function useOptimisticListHelpers<T extends { id: string }>() {
  const addItem = useCallback((list: T[] | undefined, newItem: T): T[] => {
    if (!list) return [newItem]
    return [...list, newItem]
  }, [])

  const updateItem = useCallback((list: T[] | undefined, updatedItem: Partial<T> & { id: string }): T[] => {
    if (!list) return []
    return list.map((item) => (item.id === updatedItem.id ? { ...item, ...updatedItem } : item))
  }, [])

  const removeItem = useCallback((list: T[] | undefined, itemId: string): T[] => {
    if (!list) return []
    return list.filter((item) => item.id !== itemId)
  }, [])

  const markAsDeleting = useCallback((list: T[] | undefined, itemId: string): (T & OptimisticItem)[] => {
    if (!list) return []
    return list.map((item) =>
      item.id === itemId ? { ...item, _optimistic: true, _deleting: true } : item
    ) as (T & OptimisticItem)[]
  }, [])

  return { addItem, updateItem, removeItem, markAsDeleting }
}

export default useOptimisticMutation
