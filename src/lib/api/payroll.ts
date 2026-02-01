// Payroll API Service

import { apiClient } from './client';
import type { EmployeeTimesheet } from './attendance';
import type { SalaryHeader, SalaryDetail } from '@/types';

export interface CalculatePayrollRequest {
  employeeNo: number;
  salaryMonth: string; // YYYY-MM
}

export interface BatchCalculateRequest {
  salaryMonth: string; // YYYY-MM
  departmentCode?: number;
  projectCode?: number;
}

export interface BatchCalculationResponse {
  count: number;
  salaryMonth: string;
  salaries: SalaryHeader[];
}

export interface SalaryDetailsResponse {
  header: SalaryHeader;
  details: SalaryDetail[];
}

export interface ApprovePayrollRequest {
  approverNo: number;
  notes?: string;
}

export interface RejectPayrollRequest {
  approverNo: number;
  rejectionReason: string;
}

export const payrollApi = {
  /**
   * Calculate payroll for single employee
   */
  async calculatePayroll(request: CalculatePayrollRequest): Promise<SalaryHeader> {
    const response = await apiClient.post<SalaryHeader>(
      '/payroll/calculate',
      request
    );
    return response;
  },

  /**
   * Calculate payroll for all employees
   */
  async calculatePayrollForAll(request: BatchCalculateRequest): Promise<BatchCalculationResponse> {
    const response = await apiClient.post<BatchCalculationResponse>(
      '/payroll/calculate-all',
      request
    );
    return response;
  },

  /**
   * Get salary details for employee in month
   */
  async getSalaryDetails(employeeNo: number, salaryMonth: string): Promise<SalaryDetailsResponse> {
    const response = await apiClient.get<SalaryDetailsResponse>(
      `/payroll/employee/${employeeNo}/month/${salaryMonth}`
    );
    return response;
  },

  /**
   * Get payroll history for employee
   */
  async getPayrollHistory(employeeNo: number): Promise<SalaryHeader[]> {
    const response = await apiClient.get<SalaryHeader[]>(
      `/payroll/employee/${employeeNo}/history`
    );
    return response;
  },

  /**
   * Get payroll for month (all employees)
   */
  async getPayrollByMonth(salaryMonth: string, params?: { page?: number; size?: number }): Promise<{
    content: SalaryHeader[];
    totalElements: number;
  }> {
    // Backend endpoint is /month/{salaryMonth} (path variable, not query param)
    // The backend returns ApiResponse<List<SalaryHeader>>
    // apiClient.get automatically unwraps ApiResponse, so we get SalaryHeader[] directly
    const salaries = await apiClient.get<SalaryHeader[]>(
      `/payroll/month/${salaryMonth}`
    ) || [];

    // Convert array to paginated format for frontend compatibility
    const startIndex = (params?.page || 0) * (params?.size || 1000);
    const endIndex = startIndex + (params?.size || 1000);
    const paginatedContent = salaries.slice(startIndex, endIndex);

    return {
      content: paginatedContent,
      totalElements: salaries.length,
    };
  },

  /**
   * Approve payroll
   */
  async approvePayroll(salaryId: number, request: ApprovePayrollRequest): Promise<SalaryHeader> {
    const response = await apiClient.post<SalaryHeader>(
      `/payroll/${salaryId}/approve`,
      request
    );
    return response;
  },

  /**
   * Reject payroll
   */
  async rejectPayroll(salaryId: number, request: RejectPayrollRequest): Promise<SalaryHeader> {
    const response = await apiClient.post<SalaryHeader>(
      `/payroll/${salaryId}/reject`,
      request
    );
    return response;
  },

  /**
   * Get timesheet for employee
   */
  async getTimesheet(employeeNo: number, month: string): Promise<EmployeeTimesheet> {
    const response = await apiClient.get<EmployeeTimesheet>(
      `/payroll/timesheet/${employeeNo}?month=${month}`
    );
    return response;
  },
  async downloadPayslip(employeeNo: number, salaryMonth: string): Promise<Blob> {
    // Note: apiClient automatically handles JSON parsing, so for Blob we need a workaround or specific configuration
    // Assuming apiClient supports a way to get raw response or we use fetch directly for this specific call if needed.
    // However, given the current setup, we'll try to use the client with specific config.
    // If the client strongly types return as T, we might need a cast.
    const response = await apiClient.get<Blob>(
      `/payroll/salary-slip/${employeeNo}/${salaryMonth}`,
      {
        responseType: 'blob',
        headers: {
          'Accept': 'application/pdf'
        }
      } as any
    );
    return response;
  },
};

