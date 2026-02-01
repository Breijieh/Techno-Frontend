// Users API Service

import { apiClient } from './client';
import type {
  UserInfoResponse,
  RegisterRequest,
} from './types';

export interface UserUpdateRequest {
  username?: string;
  userType?: 'ADMIN' | 'GENERAL_MANAGER' | 'HR_MANAGER' | 'FINANCE_MANAGER' | 'PROJECT_MANAGER' | 'REGIONAL_PROJECT_MANAGER' | 'PROJECT_SECRETARY' | 'PROJECT_ADVISOR' | 'WAREHOUSE_MANAGER' | 'EMPLOYEE' | 'USER';
  employeeNo?: number;
  isActive?: boolean;
  password?: string;
  assignedProjectId?: number;
  assignedProjectIds?: number[];
}

export interface ResetPasswordRequest {
  newPassword?: string;
  generatePassword?: boolean;
}

export interface UserListResponse {
  content: UserInfoResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface UserListParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export const usersApi = {
  /**
   * Get all users with pagination
   */
  async getAllUsers(params?: UserListParams): Promise<UserListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortDirection) queryParams.append('sortDirection', params.sortDirection);

    const query = queryParams.toString();
    const response = await apiClient.get<UserListResponse>(
      `/users${query ? `?${query}` : ''}`
    );
    return response;
  },

  /**
   * Get user by ID
   */
  async getUserById(id: number): Promise<UserInfoResponse> {
    const response = await apiClient.get<UserInfoResponse>(`/users/${id}`);
    return response;
  },

  /**
   * Create new user (reuse authApi.register)
   */
  async createUser(request: RegisterRequest): Promise<UserInfoResponse> {
    // Reuse authApi.register for creating users
    const { authApi } = await import('./auth');
    return authApi.register(request);
  },

  /**
   * Update user
   */
  async updateUser(id: number, request: UserUpdateRequest): Promise<UserInfoResponse> {
    const response = await apiClient.put<UserInfoResponse>(
      `/users/${id}`,
      request
    );
    return response;
  },

  /**
   * Delete user
   */
  async deleteUser(id: number): Promise<void> {
    await apiClient.delete<void>(`/users/${id}`);
  },

  /**
   * Reset user password
   */
  async resetPassword(id: number, request: ResetPasswordRequest): Promise<string | null> {
    const response = await apiClient.post<string>(
      `/users/${id}/reset-password`,
      request
    );
    return response; // Returns generated password if generatePassword was true, otherwise null
  },

  /**
   * Activate user
   */
  async activateUser(id: number): Promise<UserInfoResponse> {
    const response = await apiClient.put<UserInfoResponse>(
      `/users/${id}/activate`
    );
    return response;
  },

  /**
   * Deactivate user (lock account)
   */
  async deactivateUser(id: number): Promise<UserInfoResponse> {
    const response = await apiClient.put<UserInfoResponse>(
      `/users/${id}/deactivate`
    );
    return response;
  },
};

