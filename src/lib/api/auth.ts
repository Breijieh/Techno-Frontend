// Authentication API Service

import { apiClient } from './client';
import type {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RegisterRequest,
  UserInfoResponse,
} from './types';

export const authApi = {
  /**
   * Login user
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', request);
    return response;
  },

  /**
   * Register new user (admin only)
   */
  async register(request: RegisterRequest): Promise<UserInfoResponse> {
    const response = await apiClient.post<UserInfoResponse>('/auth/register', request);
    return response;
  },

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<UserInfoResponse> {
    const response = await apiClient.get<UserInfoResponse>('/auth/me');
    return response;
  },

  /**
   * Refresh access token
   */
  async refreshToken(request: RefreshTokenRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/refresh', request);
    return response;
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
    apiClient.clearTokens();
  },
};

