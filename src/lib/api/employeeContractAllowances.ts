// Employee Contract Allowances API Service

import { apiClient } from './client';
import type { EmployeeContractAllowance } from '@/types';

export interface EmployeeContractAllowanceRequest {
  employeeNo: number;
  transTypeCode: number;
  salaryPercentage: number; // 0-100
  isActive: boolean;
}

export interface EmployeeContractAllowanceResponse {
  recordId: number;
  employeeNo: number;
  employeeName?: string;
  transTypeCode: number;
  transactionName?: string;
  salaryPercentage: number; // BigDecimal from backend, converted to number
  isActive: boolean;
  createdDate: string; // LocalDateTime from backend (ISO string)
}

export const employeeContractAllowancesApi = {
  /**
   * Get all active employee contract allowances
   */
  async getAllAllowances(): Promise<EmployeeContractAllowanceResponse[]> {
    const response = await apiClient.get<EmployeeContractAllowanceResponse[]>(
      '/employee-contract-allowances'
    );
    return response;
  },

  /**
   * Get employee contract allowance by ID
   */
  async getAllowanceById(id: number): Promise<EmployeeContractAllowanceResponse> {
    const response = await apiClient.get<EmployeeContractAllowanceResponse>(
      `/employee-contract-allowances/${id}`
    );
    return response;
  },

  /**
   * Get allowances for a specific employee
   */
  async getAllowancesByEmployee(employeeNo: number): Promise<EmployeeContractAllowanceResponse[]> {
    const response = await apiClient.get<EmployeeContractAllowanceResponse[]>(
      `/employee-contract-allowances/employee/${employeeNo}`
    );
    return response;
  },

  /**
   * Create a new employee contract allowance
   */
  async createAllowance(request: EmployeeContractAllowanceRequest): Promise<EmployeeContractAllowanceResponse> {
    const response = await apiClient.post<EmployeeContractAllowanceResponse>(
      '/employee-contract-allowances',
      request
    );
    return response;
  },

  /**
   * Update an existing employee contract allowance
   */
  async updateAllowance(
    id: number,
    request: EmployeeContractAllowanceRequest
  ): Promise<EmployeeContractAllowanceResponse> {
    const response = await apiClient.put<EmployeeContractAllowanceResponse>(
      `/employee-contract-allowances/${id}`,
      request
    );
    return response;
  },

  /**
   * Delete (soft delete) an employee contract allowance
   */
  async deleteAllowance(id: number): Promise<void> {
    await apiClient.delete(`/employee-contract-allowances/${id}`);
  },
};

/**
 * Map backend EmployeeContractAllowanceResponse to frontend EmployeeContractAllowance format
 */
export function mapBackendToFrontend(response: EmployeeContractAllowanceResponse): EmployeeContractAllowance {
  return {
    recordId: response.recordId,
    employeeId: response.employeeNo, // Map employeeNo to employeeId
    transactionCode: response.transTypeCode, // Map transTypeCode to transactionCode
    transactionName: response.transactionName || '', // Use transaction name from backend if available
    percentage: typeof response.salaryPercentage === 'number'
      ? response.salaryPercentage
      : parseFloat(String(response.salaryPercentage)), // Convert input to number safely
    isActive: response.isActive,
    createdDate: new Date(response.createdDate), // Convert ISO string to Date object
  };
}

