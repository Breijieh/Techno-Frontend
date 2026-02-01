// Reports API Service

import { apiClient } from './client';
import type { PageResponse } from './types';
import type {
  EmployeeTimesheet,
  ExpiringDocument,
  SalaryHeader,
  LoanInstallment,
  ProjectDuePayment,
  TransferTransaction,
} from '@/types';
import type { LeaveDetailsResponse } from './leaves';

export interface ReportRequest {
  fromDate?: string;
  toDate?: string;
  employeeNo?: number;
  departmentCode?: number;
  projectCode?: number;
  month?: string; // YYYY-MM
}

export const reportsApi = {
  /**
   * Get payroll report
   */
  async getPayrollReport(params: ReportRequest): Promise<SalaryHeader[]> {
    const queryParams = new URLSearchParams();
    if (params.month) queryParams.append('month', params.month);
    if (params.departmentCode) queryParams.append('departmentCode', params.departmentCode.toString());
    if (params.projectCode) queryParams.append('projectCode', params.projectCode.toString());

    const response = await apiClient.get<SalaryHeader[]>(
      `/reports/payroll?${queryParams.toString()}`
    );
    return response;
  },

  /**
   * Get attendance timesheet
   */
  async getAttendanceTimesheet(employeeNo: number, month: string): Promise<EmployeeTimesheet> {
    const response = await apiClient.get<EmployeeTimesheet>(
      `/reports/attendance/timesheet?employeeNo=${employeeNo}&month=${month}`
    );
    return response;
  },

  /**
   * Get expiring documents
   */
  async getExpiringDocuments(daysThreshold?: number): Promise<ExpiringDocument[]> {
    const query = daysThreshold ? `?daysThreshold=${daysThreshold}` : '';
    const response = await apiClient.get<ExpiringDocument[]>(
      `/reports/expiring-documents${query}`
    );
    return response;
  },

  /**
   * Get employee leaves report
   */
  async getEmployeeLeavesReport(params: ReportRequest): Promise<LeaveDetailsResponse[]> {
    const queryParams = new URLSearchParams();
    // Map fromDate/toDate to startDate/endDate for the backend endpoint
    if (params.fromDate) queryParams.append('startDate', params.fromDate);
    if (params.toDate) queryParams.append('endDate', params.toDate);
    if (params.employeeNo) queryParams.append('employeeNo', params.employeeNo.toString());
    // Note: departmentCode is not supported by /leaves/list endpoint

    // Use large page size to get all records (or we can implement pagination later)
    queryParams.append('size', '10000');
    queryParams.append('page', '0');

    const response = await apiClient.get<PageResponse<LeaveDetailsResponse>>(
      `/leaves/list?${queryParams.toString()}`
    );
    // Extract content from paginated response
    return response.content || [];
  },

  /**
   * Get loan installments report
   */
  async getLoanInstallmentsReport(month: string): Promise<LoanInstallment[]> {
    const response = await apiClient.get<LoanInstallment[]>(
      `/reports/loans/installments?month=${month}`
    );
    return response;
  },

  /**
   * Get project payments report
   */
  async getProjectPaymentsReport(params: ReportRequest): Promise<ProjectDuePayment[]> {
    const queryParams = new URLSearchParams();
    if (params.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params.toDate) queryParams.append('toDate', params.toDate);
    if (params.projectCode) queryParams.append('projectCode', params.projectCode.toString());

    const response = await apiClient.get<ProjectDuePayment[]>(
      `/reports/projects/payments?${queryParams.toString()}`
    );
    return response;
  },

  /**
   * Get inventory transactions report
   */
  async getInventoryTransactionsReport(params: ReportRequest): Promise<TransferTransaction[]> {
    const queryParams = new URLSearchParams();
    if (params.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params.toDate) queryParams.append('toDate', params.toDate);
    if (params.projectCode) queryParams.append('projectCode', params.projectCode.toString());

    const response = await apiClient.get<TransferTransaction[]>(
      `/reports/inventory/transactions?${queryParams.toString()}`
    );
    return response;
  },

  /**
   * Export monthly payroll summary report (PDF or Excel)
   */
  async exportPayrollMonthlySummary(month: string, format: 'PDF' | 'EXCEL' = 'EXCEL'): Promise<Blob> {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
    const token = typeof window !== 'undefined'
      ? (localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken'))?.replace(/\s+/g, '')
      : null;

    const response = await fetch(`${API_BASE_URL}/reports/payroll/monthly-summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: JSON.stringify({ month, format }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`فشل تصدير التقرير: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.blob();
  },
};

