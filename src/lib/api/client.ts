// API Client - Centralized HTTP client with JWT token management

import { translations } from '@/lib/translations/ar';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string[]>,
    public data?: unknown // Additional data from error response (e.g., overlap information)
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Get stored access token
   */
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    // Remove ALL whitespace - JWT tokens must not contain any whitespace
    return token ? token.replace(/\s+/g, '') : null;
  }

  /**
   * Get stored refresh token
   */
  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
    // Remove ALL whitespace - JWT tokens must not contain any whitespace
    return token ? token.replace(/\s+/g, '') : null;
  }

  /**
   * Store tokens
   */
  setTokens(accessToken: string, refreshToken: string, rememberMe: boolean = false): void {
    if (typeof window === 'undefined') return;

    // Remove ALL whitespace (including internal spaces, newlines, etc.)
    // JWT tokens must not contain any whitespace
    const cleanAccessToken = accessToken ? accessToken.replace(/\s+/g, '') : accessToken;
    const cleanRefreshToken = refreshToken ? refreshToken.replace(/\s+/g, '') : refreshToken;

    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('accessToken', cleanAccessToken);
    storage.setItem('refreshToken', cleanRefreshToken);

    // Also store in the other storage for fallback
    if (rememberMe) {
      sessionStorage.setItem('accessToken', cleanAccessToken);
      sessionStorage.setItem('refreshToken', cleanRefreshToken);
    }

    if (rememberMe) {
      sessionStorage.setItem('accessToken', cleanAccessToken);
      sessionStorage.setItem('refreshToken', cleanRefreshToken);
    }
  }

  /**
   * Clear tokens
   */
  clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        this.clearTokens();
        return null;
      }

      const data = await response.json() as { success?: boolean; data?: { token: string; refreshToken: string } };
      if (data.success && data.data) {
        const { token, refreshToken: newRefreshToken } = data.data;
        // Remove ALL whitespace - JWT tokens must not contain any whitespace
        const cleanToken = token ? token.replace(/\s+/g, '') : token;
        const cleanRefreshToken = newRefreshToken ? newRefreshToken.replace(/\s+/g, '') : newRefreshToken;
        const rememberMe = localStorage.getItem('accessToken') !== null;
        this.setTokens(cleanToken, cleanRefreshToken, rememberMe);
        return cleanToken;
      }

      return null;
    } catch (error: unknown) {
      console.error('Token refresh failed:', error);
      this.clearTokens();
      return null;
    }
  }

  /**
   * Make HTTP request with automatic token injection and refresh
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getToken();

    const headers = new Headers(options.headers);

    // Only set Content-Type to application/json if body is NOT FormData
    // For FormData, let the browser set it with the boundary
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json; charset=UTF-8');
    }

    // Explicitly request UTF-8 encoding
    headers.set('Accept', 'application/json; charset=UTF-8');
    headers.set('Accept-Charset', 'UTF-8');

    if (token) {
      // Remove ALL whitespace - JWT tokens must not contain any whitespace
      const cleanToken = token.replace(/\s+/g, '');
      headers.set('Authorization', `Bearer ${cleanToken}`);
    } else {
      // Log warning if no token for authenticated endpoints
      if (endpoint !== '/auth/login' && endpoint !== '/auth/register' && endpoint !== '/auth/refresh') {
        console.warn(`No token available for request to ${endpoint}`);
      }
    }

    let response: Response;

    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (error) {
      // Network error - backend is likely not running
      console.error(`Network error fetching ${url}:`, error);
      const errorMessage = error instanceof Error
        ? `${translations.errors.failedToConnectBackend} على ${this.baseURL}`
        : translations.errors.failedToConnectBackend;
      throw new ApiError(errorMessage, 0);
    }

    // If 401, try to refresh token and retry once
    if (response.status === 401 && token) {
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        headers.set('Authorization', `Bearer ${newToken}`);
        response = await fetch(url, {
          ...options,
          headers,
        });
      } else {
        // For /auth/me endpoint, don't throw error - let component use fallback
        if (endpoint === '/auth/me') {
          // Throw a specific error that the component can catch and handle
          throw new ApiError(translations.errors.unableToFetchUserInfo, 401);
        }
        // For other endpoints, redirect to login
        console.warn('Token refresh failed, redirecting to login');
        this.clearTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new ApiError(translations.errors.sessionExpired, 401);
      }
    }

    // If still 401 after refresh attempt, handle it
    if (response.status === 401 && endpoint === '/auth/me') {
      throw new ApiError(translations.errors.unableToFetchUserInfo, 401);
    }

    // Check if response has content before trying to parse JSON
    let data: unknown;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        // Ensure UTF-8 decoding
        const text = await response.text();
        data = JSON.parse(text);
      } catch (jsonError: unknown) {
        console.error(`Failed to parse JSON response from ${url}:`, jsonError);
        throw new ApiError(
          `${translations.errors.invalidServerResponse}. الحالة: ${response.status} ${response.statusText}`,
          response.status
        );
      }
    } else {
      // Non-JSON response (e.g., HTML error page)
      const text = await response.text();
      console.error(`Non-JSON response from ${url}:`, text.substring(0, 200));
      throw new ApiError(
        `${translations.errors.nonJsonResponse}. الحالة: ${response.status} ${response.statusText}`,
        response.status
      );
    }

    if (!response.ok) {
      const errorData = data as {
        message?: string;
        errors?: Record<string, string[]>;
        data?: unknown | Record<string, string>; // Can be Map<String, String> from backend validation
      };
      const errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;

      // Extract errors - can be in 'errors' field or 'data' field (for validation errors)
      let errors: Record<string, string[]> = {};
      if (errorData.errors) {
        errors = errorData.errors;
      } else if (errorData.data && typeof errorData.data === 'object' && !Array.isArray(errorData.data)) {
        // Backend validation errors come in 'data' field as Map<String, String>
        // Convert to Record<string, string[]> format
        const dataErrors = errorData.data as Record<string, string>;
        Object.keys(dataErrors).forEach(key => {
          errors[key] = [dataErrors[key]]; // Convert string to string[]
        });
      }

      const actualErrorData = errorData.data || null; // Extract data field from error response
      throw new ApiError(errorMessage, response.status, errors, actualErrorData);
    }

    // Handle ApiResponse wrapper
    const responseData = data as { success?: boolean; data?: unknown };
    if (responseData.success !== undefined) {
      return responseData.data as T;
    }

    return data as T;
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    const isFormData = body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: isFormData ? (body as FormData) : (body ? JSON.stringify(body) : undefined),
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    const isFormData = body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: isFormData ? (body as FormData) : (body ? JSON.stringify(body) : undefined),
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(endpoint: string, body?: unknown, options?: RequestInit): Promise<T> {
    const isFormData = body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: isFormData ? (body as FormData) : (body ? JSON.stringify(body) : undefined),
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export for testing or custom instances
export default ApiClient;

