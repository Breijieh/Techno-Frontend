// Deduction API Service

import { apiClient } from './client';
import type { PageResponse } from './types';
import {
  mapDeductionResponseToDeductionRequest,
  mapDeductionResponseListToDeductionRequestList,
} from '@/lib/mappers/deductionMapper';

import type { DeductionRequest } from '@/lib/mappers/deductionMapper';

/**
 * Backend DTO matching DeductionController.DeductionResponse
 */
export interface DeductionDetailsResponse {
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

export interface SubmitDeductionRequest {
  employeeNo: number;
  typeCode: number; // Backend uses typeCode (Long), not string
  transactionDate: string; // ISO date string
  amount: number;
  notes?: string;
}

export interface ApproveDeductionRequest {
  approverNo: number;
}

export interface RejectDeductionRequest {
  approverNo: number;
  rejectionReason: string;
}

export interface DeductionQueryParams {
  employeeNo?: number;
  status?: string; // N, A, R
  startDate?: string; // filters by transactionDate
  endDate?: string; // filters by transactionDate
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export const deductionsApi = {
  /**
   * Submit new deduction request
   */
  async submitDeductionRequest(request: SubmitDeductionRequest): Promise<DeductionRequest> {
    const response = await apiClient.post<DeductionDetailsResponse>(
      '/deductions',
      request
    );
    return mapDeductionResponseToDeductionRequest(response);
  },

  /**
   * Approve deduction request
   */
  async approveDeduction(
    requestId: number,
    request: ApproveDeductionRequest
  ): Promise<DeductionRequest> {
    const response = await apiClient.post<DeductionDetailsResponse>(
      `/deductions/${requestId}/approve`,
      request
    );
    return mapDeductionResponseToDeductionRequest(response);
  },

  /**
   * Reject deduction request
   */
  async rejectDeduction(requestId: number, request: RejectDeductionRequest): Promise<DeductionRequest> {
    const response = await apiClient.post<DeductionDetailsResponse>(
      `/deductions/${requestId}/reject`,
      request
    );
    return mapDeductionResponseToDeductionRequest(response);
  },

  /**
   * Get deduction request by ID
   */
  async getDeductionById(requestId: number): Promise<DeductionRequest> {
    const response = await apiClient.get<DeductionDetailsResponse>(
      `/deductions/${requestId}`
    );
    return mapDeductionResponseToDeductionRequest(response);
  },

  /**
   * Get all deduction requests with optional filters.
   * This endpoint is for HR/Admin/PM to view all deduction requests.
   */
  async getAllDeductions(
    params: DeductionQueryParams
  ): Promise<PageResponse<DeductionDetailsResponse>> {
    const queryParams = new URLSearchParams();
    if (params.employeeNo) queryParams.append('employeeNo', params.employeeNo.toString());
    if (params.status) queryParams.append('transStatus', params.status);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);

    const response = await apiClient.get<PageResponse<DeductionDetailsResponse>>(
      `/deductions/list?${queryParams.toString()}`
    );
    return response;
  },

  /**
   * Get employee's deduction requests
   */
  async getEmployeeDeductions(employeeNo: number): Promise<DeductionRequest[]> {
    const response = await apiClient.get<DeductionDetailsResponse[]>(
      `/deductions/employee/${employeeNo}`
    );
    return mapDeductionResponseListToDeductionRequestList(response);
  },

  /**
   * Get pending deduction requests for approval
   */
  async getPendingDeductions(approverNo: number): Promise<DeductionRequest[]> {
    const response = await apiClient.get<DeductionDetailsResponse[]>(
      `/deductions/pending?approverId=${approverNo}`
    );
    return mapDeductionResponseListToDeductionRequestList(response);
  },

  /**
   * Delete a pending deduction
   */
  async deleteDeduction(transactionNo: number, requestorNo: number): Promise<void> {
    await apiClient.delete(`/deductions/${transactionNo}?requestorNo=${requestorNo}`);
  },
};

