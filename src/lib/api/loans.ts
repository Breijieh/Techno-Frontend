// Loan API Service

import { apiClient } from './client';
import type { PageResponse } from './types';
import type { LoanRequest, LoanInstallment } from '@/types';

export interface SubmitLoanRequest {
  employeeNo: number;
  loanAmount: number;
  noOfInstallments: number;
  firstInstallmentDate: string;
}

export interface ApproveLoanRequest {
  approverNo: number;
  notes?: string;
}

export interface RejectLoanRequest {
  approverNo: number;
  rejectionReason: string;
}

export interface PostponeInstallmentRequest {
  employeeNo: number;
  loanId: number;
  installmentNo: number;
  newDueDate: string;
  reason?: string;
}

export interface MassPostponeRequest {
  loanId: number;
  fromMonth: string; // YYYY-MM
  toMonth: string; // YYYY-MM
  reason?: string;
}

/**
 * LoanDetailsResponse from backend - matches LoanController.LoanDetailsResponse
 */
export interface LoanDetailsResponse {
  loanId: number;
  employeeNo: number;
  employeeName?: string;
  loanAmount: number | string;
  noOfInstallments: number;
  firstInstallmentDate: string;
  installmentAmount: number | string;
  remainingBalance: number | string;
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
  isActive?: string;
  rejectionReason?: string | null;
  paidInstallments?: number;
  unpaidInstallments?: number;
}

/**
 * InstallmentDetailsResponse from backend - matches LoanController.InstallmentDetailsResponse
 */
export interface InstallmentDetailsResponse {
  installmentId: number;
  loanId: number;
  installmentNo: number;
  dueDate: string;
  installmentAmount: number | string;
  paidDate?: string | null;
  paidAmount?: number | string | null;
  paymentStatus: string; // PAID, UNPAID, POSTPONED
  salaryMonth?: string | null;
}

/**
 * LoanWithInstallmentsResponse from backend - matches LoanController.LoanWithInstallmentsResponse
 */
export interface LoanWithInstallmentsResponse {
  loan: LoanDetailsResponse;
  installments: InstallmentDetailsResponse[];
}

/**
 * PostponementDetailsResponse from backend - matches LoanController.PostponementDetailsResponse
 */
export interface PostponementDetailsResponse {
  requestId: number;
  loanId: number;
  installmentId: number;
  employeeNo: number;
  employeeName?: string;
  currentDueDate: string;
  newDueDate: string;
  originalMonth: string; // YYYY-MM format
  newMonth: string; // YYYY-MM format
  postponementReason?: string;
  requestDate: string;
  transStatus: string; // N, A, R
  nextApproval?: number | null;
  nextAppLevel?: number | null;
  approvedDate?: string | null;
  approvedBy?: number | null;
  rejectionReason?: string | null;
}

export interface PostponementQueryParams {
  employeeNo?: number;
  status?: string; // N, A, R
  startDate?: string; // filters by requestDate
  endDate?: string; // filters by requestDate
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface SubmitPostponementRequest {
  loanId: number;
  installmentId: number;
  newDueDate: string; // ISO date string
  postponementReason: string;
}

export interface ApprovePostponementRequest {
  approverNo: number;
}

export interface RejectPostponementRequest {
  approverNo: number;
  rejectionReason: string;
}

/**
 * InstallmentScheduleResponse from backend - matches LoanController.InstallmentScheduleResponse
 */
export interface InstallmentScheduleResponse {
  installmentId: number;
  loanId: number;
  installmentNo: number;
  employeeNo: number;
  employeeName?: string;
  dueDate: string;
  installmentAmount: number | string;
  paymentStatus: string; // PAID, UNPAID, POSTPONED
  paidDate?: string | null;
  paidAmount?: number | string | null;
  postponedTo?: string | null; // New due date if POSTPONED
  salaryMonth?: string | null;
}

export interface InstallmentQueryParams {
  employeeNo?: number;
  loanId?: number;
  paymentStatus?: string; // PAID, UNPAID, POSTPONED
  startDate?: string; // filters by dueDate
  endDate?: string; // filters by dueDate
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export const loansApi = {
  /**
   * Submit new loan request
   */
  async submitLoanRequest(request: SubmitLoanRequest): Promise<LoanDetailsResponse> {
    const response = await apiClient.post<LoanDetailsResponse>('/loans/submit', request);
    return response;
  },

  /**
   * Approve loan request
   */
  async approveLoan(loanId: number, request: ApproveLoanRequest): Promise<LoanDetailsResponse> {
    const response = await apiClient.post<LoanDetailsResponse>(
      `/loans/${loanId}/approve`,
      request
    );
    return response;
  },

  /**
   * Reject loan request
   */
  async rejectLoan(loanId: number, request: RejectLoanRequest): Promise<LoanDetailsResponse> {
    const response = await apiClient.post<LoanDetailsResponse>(
      `/loans/${loanId}/reject`,
      request
    );
    return response;
  },

  /**
   * Get loan by ID
   */
  async getLoanById(loanId: number): Promise<LoanDetailsResponse> {
    const response = await apiClient.get<LoanDetailsResponse>(`/loans/${loanId}`);
    return response;
  },

  /**
   * Get current authenticated user's loans
   */
  async getMyLoans(): Promise<LoanDetailsResponse[]> {
    const response = await apiClient.get<LoanDetailsResponse[]>(
      `/loans/my-loans`
    );
    return response;
  },

  /**
   * Get employee's loans (deprecated - use getMyLoans() for current user)
   */
  async getEmployeeLoans(employeeNo: number): Promise<LoanRequest[]> {
    const response = await apiClient.get<LoanRequest[]>(
      `/loans/employee/${employeeNo}`
    );
    return response;
  },

  /**
   * Get pending loan requests for approval
   */
  async getPendingLoans(approverNo: number): Promise<LoanRequest[]> {
    const response = await apiClient.get<LoanRequest[]>(
      `/loans/pending?approverNo=${approverNo}`
    );
    return response;
  },

  /**
   * Get all loan requests with optional filters and pagination
   */
  async getAllLoans(params?: {
    page?: number;
    size?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    status?: string; // N, A, or R
    employeeNo?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<PageResponse<LoanDetailsResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('transStatus', params.status);
    if (params?.employeeNo) queryParams.append('employeeNo', params.employeeNo.toString());
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortDirection) queryParams.append('sortDirection', params.sortDirection);

    const response = await apiClient.get<PageResponse<LoanDetailsResponse>>(
      `/loans/list?${queryParams.toString()}`
    );
    return response;
  },

  /**
   * Get loan installments
   */
  async getLoanInstallments(loanId: number): Promise<LoanWithInstallmentsResponse> {
    const response = await apiClient.get<LoanWithInstallmentsResponse>(
      `/loans/${loanId}/installments`
    );
    return response;
  },

  /**
   * Get employee's installments
   */
  async getEmployeeInstallments(employeeNo: number, month?: string): Promise<LoanInstallment[]> {
    const query = month ? `?month=${month}` : '';
    const response = await apiClient.get<LoanInstallment[]>(
      `/loans/employee/${employeeNo}/installments${query}`
    );
    return response;
  },

  /**
   * Postpone installment
   */
  async postponeInstallment(request: PostponeInstallmentRequest): Promise<LoanInstallment> {
    const response = await apiClient.post<LoanInstallment>(
      '/loans/postpone',
      request
    );
    return response;
  },

  /**
   * Mass postpone installments (admin only)
   */
  async massPostpone(request: MassPostponeRequest): Promise<void> {
    await apiClient.post<void>('/loans/mass-postpone', request);
  },

  /**
   * Get all postponement requests with optional filters.
   * This endpoint is for HR/Admin/PM to view all postponement requests.
   */
  async getAllPostponementRequests(
    params: PostponementQueryParams
  ): Promise<PageResponse<PostponementDetailsResponse>> {
    const queryParams = new URLSearchParams();
    if (params.employeeNo) queryParams.append('employeeNo', params.employeeNo.toString());
    if (params.status) queryParams.append('transStatus', params.status);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);

    const response = await apiClient.get<PageResponse<PostponementDetailsResponse>>(
      `/loans/postponement/list?${queryParams.toString()}`
    );
    return response;
  },

  /**
   * Get unpaid installments for a loan.
   * Used by the postponement form to populate installment dropdown.
   */
  async getUnpaidInstallments(loanId: number): Promise<InstallmentDetailsResponse[]> {
    const response = await apiClient.get<InstallmentDetailsResponse[]>(
      `/loans/${loanId}/installments/unpaid`
    );
    return response;
  },

  /**
   * Submit new postponement request
   */
  async submitPostponementRequest(request: SubmitPostponementRequest): Promise<PostponementDetailsResponse> {
    const response = await apiClient.post<PostponementDetailsResponse>(
      '/loans/postponement/submit',
      request
    );
    return response;
  },

  /**
   * Approve postponement request
   */
  async approvePostponement(
    requestId: number,
    request: ApprovePostponementRequest
  ): Promise<PostponementDetailsResponse> {
    const response = await apiClient.post<PostponementDetailsResponse>(
      `/loans/postponement/${requestId}/approve`,
      request
    );
    return response;
  },

  /**
   * Reject postponement request
   */
  async rejectPostponement(
    requestId: number,
    request: RejectPostponementRequest
  ): Promise<PostponementDetailsResponse> {
    const response = await apiClient.post<PostponementDetailsResponse>(
      `/loans/postponement/${requestId}/reject`,
      request
    );
    return response;
  },

  /**
   * Get all loan installments with optional filters.
   * This endpoint is for HR/Admin/PM/Employee to view all installments.
   */
  async getAllInstallments(
    params: InstallmentQueryParams
  ): Promise<PageResponse<InstallmentScheduleResponse>> {
    const queryParams = new URLSearchParams();
    if (params.employeeNo) queryParams.append('employeeNo', params.employeeNo.toString());
    if (params.loanId) queryParams.append('loanId', params.loanId.toString());
    if (params.paymentStatus) queryParams.append('paymentStatus', params.paymentStatus);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);

    const response = await apiClient.get<PageResponse<InstallmentScheduleResponse>>(
      `/loans/installments/list?${queryParams.toString()}`
    );
    return response;
  },


  /**
   * Download loan contract PDF
   */
  async downloadLoanContract(loanId: number): Promise<Blob> {
    const response = await apiClient.get<Blob>(
      `/loans/${loanId}/contract`,
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

