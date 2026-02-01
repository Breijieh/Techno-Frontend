// Roles API Service

import { apiClient } from './client';

export interface RoleRequest {
  roleName: string;
  description?: string;
  canManageEmployees?: boolean;
  canManageAttendance?: boolean;
  canManageLeave?: boolean;
  canManageLoans?: boolean;
  canManagePayroll?: boolean;
  canManageProjects?: boolean;
  canManageWarehouse?: boolean;
  canViewReports?: boolean;
  canApprove?: boolean;
  canManageSettings?: boolean;
}

export interface RoleResponse {
  roleId: number;
  roleName: string;
  description?: string;
  canManageEmployees: boolean;
  canManageAttendance: boolean;
  canManageLeave: boolean;
  canManageLoans: boolean;
  canManagePayroll: boolean;
  canManageProjects: boolean;
  canManageWarehouse: boolean;
  canViewReports: boolean;
  canApprove: boolean;
  canManageSettings: boolean;
  isActive: 'Y' | 'N';
}

export interface RoleListResponse {
  content: RoleResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface RoleListParams {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export const rolesApi = {
  /**
   * Get all roles with pagination
   */
  async getAllRoles(params?: RoleListParams): Promise<RoleListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortDirection) queryParams.append('sortDirection', params.sortDirection);

    const query = queryParams.toString();
    const response = await apiClient.get<RoleListResponse>(
      `/roles${query ? `?${query}` : ''}`
    );
    return response;
  },

  /**
   * Get role by ID
   */
  async getRoleById(id: number): Promise<RoleResponse> {
    const response = await apiClient.get<RoleResponse>(`/roles/${id}`);
    return response;
  },

  /**
   * Create new role
   */
  async createRole(request: RoleRequest): Promise<RoleResponse> {
    const response = await apiClient.post<RoleResponse>(
      '/roles',
      request
    );
    return response;
  },

  /**
   * Update role
   */
  async updateRole(id: number, request: RoleRequest): Promise<RoleResponse> {
    const response = await apiClient.put<RoleResponse>(
      `/roles/${id}`,
      request
    );
    return response;
  },

  /**
   * Delete role
   */
  async deleteRole(id: number): Promise<void> {
    await apiClient.delete<void>(`/roles/${id}`);
  },
};

