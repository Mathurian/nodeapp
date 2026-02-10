/**
 * useApi Hook
 * Standardized hook for API calls with loading and error states
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/apiClient';
import type { ApiResponse, isSuccessResponse as isSuccessResponseType } from '../../../shared/types/api';
import { isSuccessResponse, isErrorResponse } from '../../../shared/types/api';

interface UseApiOptions {
  immediate?: boolean;
  onSuccess?: (data: unknown) => void;
  onError?: (error: Error) => void;
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for GET requests
 */
export function useApi<T>(
  endpoint: string,
  params?: Record<string, unknown>,
  options: UseApiOptions = {}
): UseApiResult<T> {
  const { immediate = true, onSuccess, onError } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get<T>(endpoint, params);

      if (isSuccessResponse(response)) {
        setData(response.data);
        onSuccess?.(response.data);
      } else if (isErrorResponse(response)) {
        throw new Error(response.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setLoading(false);
    }
  }, [endpoint, params, onSuccess, onError]);

  useEffect(() => {
    if (immediate) {
      fetchData();
    }
  }, [immediate, fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook for mutations (POST, PUT, DELETE)
 */
export function useMutation<TData = unknown, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
  options: UseApiOptions = {}
) {
  const { onSuccess, onError } = options;
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (variables: TVariables) => {
    try {
      setLoading(true);
      setError(null);

      const response = await mutationFn(variables);

      if (isSuccessResponse(response)) {
        setData(response.data);
        onSuccess?.(response.data);
        return response.data;
      } else if (isErrorResponse(response)) {
        throw new Error(response.error);
      }

      return null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [mutationFn, onSuccess, onError]);

  return { mutate, data, loading, error };
}

