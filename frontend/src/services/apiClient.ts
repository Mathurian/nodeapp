/**
 * Type-Safe API Client
 * Standardized API client with proper TypeScript types
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import type { ApiResponse, ApiErrorResponse } from '../../../shared/types/api';

class ApiClient {
  private client: AxiosInstance;
  private publicClient: AxiosInstance;

  constructor() {
    const baseURL = import.meta.env.VITE_API_URL || '/api';
    const timeout = 10000;

    // Authenticated API client
    this.client = axios.create({
      baseURL,
      timeout,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Public API client (no auth required)
    this.publicClient = axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    this.setupInterceptors();
  }

  /**
   * Setup request/response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor - add CSRF token
    this.client.interceptors.request.use(
      (config) => {
        if (config.method && ['post', 'put', 'delete', 'patch'].includes(config.method.toLowerCase())) {
          const csrfToken = document.cookie
            .split('; ')
            .find(row => row.startsWith('_csrf='))
            ?.split('=')[1];

          if (csrfToken && config.headers) {
            config.headers['X-CSRF-Token'] = csrfToken;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 - redirect to login
        if (error.response?.status === 401) {
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }

        // Handle 403 CSRF errors - retry with new token
        if (error.response?.status === 403 &&
            error.response?.data?.error?.includes('CSRF') &&
            !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await this.client.get('/csrf-token');
            const csrfToken = document.cookie
              .split('; ')
              .find(row => row.startsWith('_csrf='))
              ?.split('=')[1];

            if (csrfToken && originalRequest.headers) {
              originalRequest.headers['X-CSRF-Token'] = csrfToken;
            }

            return this.client(originalRequest);
          } catch (retryError) {
            return Promise.reject(retryError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Generic request method
   */
  private async request<T>(
    endpoint: string,
    options: AxiosRequestConfig = {},
    usePublic = false
  ): Promise<ApiResponse<T>> {
    const client = usePublic ? this.publicClient : this.client;

    try {
      const response: AxiosResponse<ApiResponse<T>> = await client.request({
        url: endpoint,
        ...options,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorResponse = error.response?.data as ApiErrorResponse | undefined;
        throw new Error(errorResponse?.message || error.message || 'Request failed');
      }
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, unknown>, usePublic = false): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', params }, usePublic);
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data?: unknown, usePublic = false): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'POST', data }, usePublic);
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, data?: unknown, usePublic = false): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PUT', data }, usePublic);
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, data?: unknown, usePublic = false): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'PATCH', data }, usePublic);
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, usePublic = false): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' }, usePublic);
  }
}

export const apiClient = new ApiClient();

