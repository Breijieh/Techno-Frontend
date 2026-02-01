// Allowance API Service

import { apiClient } from './client';
import type { PageResponse } from './types';
import {
  mapAllowanceResponseToAllowanceRequest,
  mapAllowanceResponseListToAllowanceRequestList,
} from '@/lib/mappers/allowanceMapper';
import type { AllowanceRequest, MonthlyAllowance } from '@/types';

/**
 * Backend DTO matching AllowanceController.AllowanceResponse
 */
export interface AllowanceDetailsResponse {
  transactionNo: number;
  employeeNo: number;
  employeeName?: string;
  typeCode: number;
  typeName?: string;
  transactionDate: string;
  amount: number | string;
  notes?: string;
  transStatus: string; // N, A, R
  isManualEntry?: string;
  approvedDate?: string;
  approvedBy?: number;
  rejectionReason?: string;
  nextApproval?: number | null;
  nextAppLevel?: number | null;
}

export interface SubmitAllowanceRequest {
  employeeNo: number;
  typeCode: number; // Backend uses typeCode (Long), not string
  transactionDate: string; // ISO date string
  amount: number;
  notes?: string;
}

export interface ApproveAllowanceRequest {
  approverNo: number;
}

export interface RejectAllowanceRequest {
  approverNo: number;
  rejectionReason: string;
}

export interface AllowanceQueryParams {
  employeeNo?: number;
  status?: string; // N, A, R
  startDate?: string; // filters by transactionDate
  endDate?: string; // filters by transactionDate
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export const allowancesApi = {
  /**
   * Submit new allowance request
   */
  async submitAllowanceRequest(request: SubmitAllowanceRequest): Promise<AllowanceRequest> {
    const response = await apiClient.post<AllowanceDetailsResponse>(
      '/allowances',
      request
    );
    return mapAllowanceResponseToAllowanceRequest(response);
  },

  /**
   * Approve allowance request
   */
  async approveAllowance(
    requestId: number,
    request: ApproveAllowanceRequest
  ): Promise<AllowanceRequest> {
    const response = await apiClient.post<AllowanceDetailsResponse>(
      `/allowances/${requestId}/approve`,
      request
    );
    return mapAllowanceResponseToAllowanceRequest(response);
  },

  /**
   * Reject allowance request
   */
  async rejectAllowance(requestId: number, request: RejectAllowanceRequest): Promise<AllowanceRequest> {
    const response = await apiClient.post<AllowanceDetailsResponse>(
      `/allowances/${requestId}/reject`,
      request
    );
    return mapAllowanceResponseToAllowanceRequest(response);
  },

  /**
   * Get allowance request by ID
   */
  async getAllowanceById(requestId: number): Promise<AllowanceRequest> {
    const response = await apiClient.get<AllowanceDetailsResponse>(
      `/allowances/${requestId}`
    );
    return mapAllowanceResponseToAllowanceRequest(response);
  },

  /**
   * Get all allowance requests with optional filters.
   * This endpoint is for HR/Admin/PM to view all allowance requests.
   */
  async getAllAllowances(
    params: AllowanceQueryParams
  ): Promise<PageResponse<AllowanceDetailsResponse>> {
    const queryParams = new URLSearchParams();
    if (params.employeeNo) queryParams.append('employeeNo', params.employeeNo.toString());
    if (params.status) queryParams.append('transStatus', params.status);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);

    const response = await apiClient.get<PageResponse<AllowanceDetailsResponse>>(
      `/allowances/list?${queryParams.toString()}`
    );
    return response;
  },

  /**
   * Get employee's allowance requests
   */
  async getEmployeeAllowances(employeeNo: number): Promise<AllowanceRequest[]> {
    const response = await apiClient.get<AllowanceDetailsResponse[]>(
      `/allowances/employee/${employeeNo}`
    );
    return mapAllowanceResponseListToAllowanceRequestList(response);
  },

  /**
   * Get pending allowance requests for approval
   */
  async getPendingAllowances(approverNo: number): Promise<AllowanceRequest[]> {
    const response = await apiClient.get<AllowanceDetailsResponse[]>(
      `/allowances/pending?approverId=${approverNo}`
    );
    return mapAllowanceResponseListToAllowanceRequestList(response);
  },

  /**
   * Get monthly allowances for employee
   */
  async getMonthlyAllowances(employeeNo: number, month: string): Promise<MonthlyAllowance[]> {
    const response = await apiClient.get<MonthlyAllowance[]>(
      `/allowances/monthly/${employeeNo}?month=${month}`
    );
    return response;
  },

  /**
   * Delete a pending allowance
   */
  async deleteAllowance(transactionNo: number, requestorNo: number): Promise<void> {
    await apiClient.delete(`/allowances/${transactionNo}?requestorNo=${requestorNo}`);
  },
};

