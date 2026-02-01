// Department API Service

import { apiClient } from './client';
import { employeesApi } from './employees';

export interface DepartmentResponse {
  deptCode: number;
  deptName?: string;
  parentDeptCode?: number;
  parentDepartment?: DepartmentResponse;
  deptMgrCode?: number;
  managerName?: string;
  isActive?: string;
  createdDate?: string;
  createdBy?: number;
  modifiedDate?: string;
  modifiedBy?: number;
  children?: DepartmentResponse[];
}

export interface DepartmentRequest {
  deptName: string;
  parentDeptCode?: number;
  deptMgrCode?: number;
}

export const departmentsApi = {
  /**
   * Get all departments
   */
  async getAllDepartments(): Promise<DepartmentResponse[]> {
    const response = await apiClient.get<DepartmentResponse[]>('/departments');
    return response;
  },

  /**
   * Get department by ID
   */
  async getDepartmentById(id: number): Promise<DepartmentResponse> {
    const response = await apiClient.get<DepartmentResponse>(`/departments/${id}`);
    return response;
  },

  /**
   * Get department hierarchy (tree structure)
   */
  async getDepartmentHierarchy(): Promise<DepartmentResponse[]> {
    const response = await apiClient.get<DepartmentResponse[]>('/departments/hierarchy');
    return response;
  },

  /**
   * Create new department
   */
  async createDepartment(request: DepartmentRequest): Promise<DepartmentResponse> {
    const response = await apiClient.post<DepartmentResponse>('/departments', request);
    return response;
  },

  /**
   * Update department
   */
  async updateDepartment(id: number, request: DepartmentRequest): Promise<DepartmentResponse> {
    const response = await apiClient.put<DepartmentResponse>(`/departments/${id}`, request);
    return response;
  },

  /**
   * Delete department (soft delete)
   */
  async deleteDepartment(id: number): Promise<void> {
    await apiClient.delete(`/departments/${id}`);
  },
};

/**
 * Get employee count for a department
 * @param deptCode Department code
 * @returns Employee count
 */
export async function getDepartmentEmployeeCount(deptCode: number): Promise<number> {
  try {
    const response = await employeesApi.getEmployeesByDepartment(deptCode, { page: 0, size: 1 });
    return response.totalElements || 0;
  } catch (error) {
    console.error(`Error fetching employee count for department ${deptCode}:`, error);
    return 0;
  }
}

/**
 * Get employee counts for multiple departments in parallel
 * @param deptCodes Array of department codes
 * @returns Map of department code to employee count
 */
export async function getDepartmentEmployeeCounts(deptCodes: number[]): Promise<Map<number, number>> {
  const counts = new Map<number, number>();

  try {
    const promises = deptCodes.map(async (deptCode) => {
      const count = await getDepartmentEmployeeCount(deptCode);
      return { deptCode, count };
    });

    const results = await Promise.all(promises);
    results.forEach(({ deptCode, count }) => {
      counts.set(deptCode, count);
    });
  } catch (error) {
    console.error('Error fetching employee counts:', error);
  }

  return counts;
}

export default departmentsApi;

