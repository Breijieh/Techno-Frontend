// Leave API Service

import { apiClient } from './client';
import type { PageResponse } from './types';
import type { LeaveRequest, LeaveBalance } from '@/types';

export interface SubmitLeaveRequest {
  employeeNo: number;
  leaveFromDate: string;
  leaveToDate: string;
  leaveReason?: string;
}

export interface ApproveLeaveRequest {
  approverNo: number;
  notes?: string;
}

export interface RejectLeaveRequest {
  approverNo: number;
  rejectionReason: string;
}

export interface CancelLeaveRequest {
  employeeNo: number;
  reason?: string;
}

/**
 * LeaveDetailsResponse from backend - matches LeaveController.LeaveDetailsResponse
 */
export interface LeaveDetailsResponse {
  leaveId: number;
  employeeNo: number;
  employeeName?: string;
  leaveFromDate: string;
  leaveToDate: string;
  leaveDays: number | string;
  leaveReason?: string | null;
  requestDate: string;
  transStatus: string;
  statusDescription?: string;
  nextApproval?: number | null;
  nextApproverName?: string | null;
  nextAppLevel?: number | null;
  nextAppLevelName?: string | null;
  approvedBy?: number | null;
  approvedByName?: string | null;
  approvedDate?: string | null;
  rejectionReason?: string | null;
}

/**
 * LeaveBalanceDetailsResponse from backend - matches LeaveController.LeaveBalanceDetailsResponse
 */
export interface LeaveBalanceDetailsResponse {
  employeeNo: number;
  employeeName?: string;
  annualLeaveBalance: number | string;
  sickLeaveBalance: number | string;
  emergencyLeaveBalance: number | string;
  lastUpdated?: string | null;
}

export interface LeaveBalanceQueryParams {
  employeeNo?: number;
  departmentCode?: number;
  employmentStatus?: string; // ACTIVE, INACTIVE, etc.
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export const leavesApi = {
  /**
   * Submit new leave request
   */
  async submitLeaveRequest(request: SubmitLeaveRequest): Promise<LeaveRequest> {
    const response = await apiClient.post<LeaveRequest>('/leaves/submit', request);
    return response;
  },

  /**
   * Approve leave request
   */
  async approveLeave(leaveId: number, request: ApproveLeaveRequest): Promise<LeaveRequest> {
    const response = await apiClient.post<LeaveRequest>(
      `/leaves/${leaveId}/approve`,
      request
    );
    return response;
  },

  /**
   * Reject leave request
   */
  async rejectLeave(leaveId: number, request: RejectLeaveRequest): Promise<LeaveRequest> {
    const response = await apiClient.post<LeaveRequest>(
      `/leaves/${leaveId}/reject`,
      request
    );
    return response;
  },

  /**
   * Cancel leave request
   */
  async cancelLeave(leaveId: number, request: CancelLeaveRequest): Promise<void> {
    await apiClient.post<void>(`/leaves/${leaveId}/cancel`, request);
  },

  /**
   * Get leave request by ID
   */
  async getLeaveById(leaveId: number): Promise<LeaveRequest> {
    const response = await apiClient.get<LeaveRequest>(`/leaves/${leaveId}`);
    return response;
  },

  /**
   * Get employee's leave requests
   */
  async getEmployeeLeaves(employeeNo: number): Promise<LeaveRequest[]> {
    const response = await apiClient.get<LeaveRequest[]>(
      `/leaves/employee/${employeeNo}`
    );
    return response;
  },

  /**
   * Get pending leave requests for approval
   */
  async getPendingLeaves(approverNo: number): Promise<LeaveRequest[]> {
    const response = await apiClient.get<LeaveRequest[]>(
      `/leaves/pending?approverNo=${approverNo}`
    );
    return response;
  },

  /**
   * Get leave balance for employee
   */
  async getLeaveBalance(employeeNo: number): Promise<LeaveBalance> {
    const response = await apiClient.get<LeaveBalance>(
      `/leaves/balance/${employeeNo}`
    );
    return response;
  },

  /**
   * Get all leave requests with optional filters and pagination
   */
  async getAllLeaves(params?: {
    page?: number;
    size?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    status?: string; // N, A, or R
    employeeNo?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<PageResponse<LeaveDetailsResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('transStatus', params.status);
    if (params?.employeeNo) queryParams.append('employeeNo', params.employeeNo.toString());
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortDirection) queryParams.append('sortDirection', params.sortDirection);

    const response = await apiClient.get<PageResponse<LeaveDetailsResponse>>(
      `/leaves/list?${queryParams.toString()}`
    );
    return response;
  },

  /**
   * Get all employees' leave balances with optional filters.
   * This endpoint is for HR/Admin/PM/Employee to view all leave balances.
   */
  async getAllLeaveBalances(
    params: LeaveBalanceQueryParams
  ): Promise<PageResponse<LeaveBalanceDetailsResponse>> {
    const queryParams = new URLSearchParams();
    if (params.employeeNo) queryParams.append('employeeNo', params.employeeNo.toString());
    if (params.departmentCode) queryParams.append('departmentCode', params.departmentCode.toString());
    if (params.employmentStatus) queryParams.append('employmentStatus', params.employmentStatus);
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);

    const response = await apiClient.get<PageResponse<LeaveBalanceDetailsResponse>>(
      `/leaves/balance/list?${queryParams.toString()}`
    );
    return response;
  },

  /**
   * Reset all employee leave balances to 30 days
   */
  async initializeBalances(): Promise<void> {
    await apiClient.post<void>('/leaves/init-balances', {});
  },
};

