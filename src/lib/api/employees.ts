// Employee API Service

import { apiClient } from './client';

import type { EmployeeStatus } from '@/types';

export interface EmployeeRequest {
  employeeName: string;
  nationalId: string;
  nationality: string;
  employeeCategory: 'S' | 'F';
  passportNo?: string;
  passportExpiryDate?: string;
  residencyNo?: string;
  residencyExpiryDate?: string;
  dateOfBirth?: string;
  hireDate: string;
  terminationDate?: string;
  employmentStatus?: string;
  terminationReason?: string;
  socialInsuranceNo?: string;
  empContractType: string;
  specializationCode?: string;
  primaryDeptCode?: number;
  primaryProjectCode?: number;
  monthlySalary: number;
  leaveBalanceDays?: number;
  email?: string;
  mobile?: string;
  username?: string;
  password?: string;
  managerId?: number;
}

export interface EmployeeResponse {
  employeeNo: number;
  employeeName: string;
  nationalId: string;
  nationality: string;
  employeeCategory: string;
  passportNo?: string;
  passportExpiryDate?: string;
  residencyNo?: string;
  residencyExpiryDate?: string;
  dateOfBirth?: string;
  hireDate: string;
  terminationDate?: string;
  employmentStatus: string;
  terminationReason?: string;
  socialInsuranceNo?: string;
  empContractType: string;
  specializationCode?: string;
  specializationNameAr?: string;
  specializationNameEn?: string;
  primaryDeptCode?: number;
  primaryDeptArName?: string;
  primaryDeptEnName?: string;
  primaryProjectCode?: number;
  primaryProjectArName?: string;
  primaryProjectEnName?: string;
  monthlySalary: number;
  leaveBalanceDays?: number;
  email?: string;
  mobile?: string;
  yearsOfService?: number;
  monthsOfService?: number;
  daysUntilPassportExpiry?: number;
  daysUntilResidencyExpiry?: number;
  passportExpiringSoon?: boolean;
  residencyExpiringSoon?: boolean;
  createdDate?: string;
  createdBy?: string;
  modifiedDate?: string;
  modifiedBy?: string;
  managerId?: number;
  managerName?: string;
  profilePictureUrl?: string; // Added for avatar support
}

export interface EmployeeListResponse {
  content: EmployeeResponse[];
  employees: EmployeeResponse[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface EmployeeSearchRequest {
  employeeNo?: number;
  employeeName?: string;
  departmentCode?: number;
  projectCode?: number;
  contractType?: string;
  status?: EmployeeStatus;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface DocumentExpiryResponse {
  employeeNo: number;
  employeeName?: string;
  nationalId?: string;
  employeeCategory?: string;

  // Passport information
  passportNo?: string;
  passportExpiryDate?: string;
  daysUntilPassportExpiry?: number;
  passportExpired?: boolean;
  passportExpiringSoon?: boolean;

  // Residency information
  residencyNo?: string;
  residencyExpiryDate?: string;
  daysUntilResidencyExpiry?: number;
  residencyExpired?: boolean;
  residencyExpiringSoon?: boolean;

  // Contact information
  email?: string;
  mobile?: string;

  // Department/Project
  primaryDeptCode?: number;
  primaryDeptEnName?: string;
  primaryProjectCode?: number;
  primaryProjectEnName?: string;

  // Computed alert levels (if backend includes them)
  passportAlertLevel?: string;
  residencyAlertLevel?: string;
}

export const employeesApi = {
  /**
   * Get all employees with pagination
   */
  async getAllEmployees(params?: {
    page?: number;
    size?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    status?: string;
  }): Promise<EmployeeListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortDirection) queryParams.append('sortDirection', params.sortDirection);
    if (params?.status) queryParams.append('status', params.status);

    const query = queryParams.toString();
    const response = await apiClient.get<EmployeeListResponse>(
      `/employees${query ? `?${query}` : ''}`
    );
    console.log('[getAllEmployees] Response:', response);
    return response;
  },

  /**
   * Search employees
   */
  async searchEmployees(request: EmployeeSearchRequest): Promise<EmployeeListResponse> {
    const response = await apiClient.post<EmployeeListResponse>(
      '/employees/search',
      request
    );
    return response;
  },

  /**
   * Get current authenticated user's employee record
   */
  async getMyEmployee(): Promise<EmployeeResponse> {
    const response = await apiClient.get<EmployeeResponse>('/employees/me');
    return response;
  },

  /**
   * Get employee by ID
   */
  async getEmployeeById(id: number): Promise<EmployeeResponse> {
    const response = await apiClient.get<EmployeeResponse>(`/employees/${id}`);
    return response;
  },

  /**
   * Create new employee
   */
  async createEmployee(request: EmployeeRequest | FormData): Promise<EmployeeResponse> {
    const response = await apiClient.post<EmployeeResponse>('/employees', request);
    return response;
  },

  /**
   * Update employee
   */
  async updateEmployee(id: number, request: EmployeeRequest | FormData): Promise<EmployeeResponse> {
    const response = await apiClient.put<EmployeeResponse>(`/employees/${id}`, request);
    return response;
  },

  /**
   * Delete employee (soft delete)
   */
  async deleteEmployee(id: number): Promise<void> {
    await apiClient.delete<void>(`/employees/${id}`);
  },

  /**
   * Get employees by department
   */
  async getEmployeesByDepartment(
    deptCode: number,
    params?: { page?: number; size?: number }
  ): Promise<EmployeeListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());

    const query = queryParams.toString();
    const response = await apiClient.get<EmployeeListResponse>(
      `/employees/by-department/${deptCode}${query ? `?${query}` : ''}`
    );
    return response;
  },

  /**
   * Get employees by project
   */
  async getEmployeesByProject(
    projectCode: number,
    params?: { page?: number; size?: number }
  ): Promise<EmployeeListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());

    const query = queryParams.toString();
    const response = await apiClient.get<EmployeeListResponse>(
      `/employees/by-project/${projectCode}${query ? `?${query}` : ''}`
    );
    return response;
  },

  /**
   * Get employees with expiring documents
   */
  async getExpiringDocuments(daysThreshold?: number, employeeNo?: number): Promise<DocumentExpiryResponse[]> {
    const queryParams = new URLSearchParams();
    if (daysThreshold !== undefined) queryParams.append('daysThreshold', daysThreshold.toString());
    if (employeeNo !== undefined) queryParams.append('employeeNo', employeeNo.toString());

    const query = queryParams.toString();
    const response = await apiClient.get<DocumentExpiryResponse[]>(
      `/employees/expiring-docs${query ? `?${query}` : ''}`
    );
    return response;
  },

  /**
   * Send reminder notification for expiring document
   */
  async sendDocumentReminder(employeeNo: number, documentType: 'PASSPORT' | 'RESIDENCY'): Promise<void> {
    await apiClient.post<void>(
      `/employees/${employeeNo}/documents/remind?documentType=${documentType}`
    );
  },
};

