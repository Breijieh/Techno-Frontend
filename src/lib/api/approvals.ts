// Unified Approvals API Service

import { apiClient } from './client';
import type { PageResponse } from './types';
import type { TransferRequest, ProjectPaymentRequest } from '@/types';
import type { LeaveDetailsResponse } from './leaves';
import type { LoanDetailsResponse } from './loans';
import type { AllowanceDetailsResponse } from './allowances';
import type { ManualAttendanceRequestResponse } from './attendance';

export interface UnifiedApprovalRequest {
  requestId: number;
  requestType: 'LEAVE' | 'LOAN' | 'ALLOWANCE' | 'TRANSFER' | 'PAYMENT' | 'PAYROLL' | 'MANUAL_ATTENDANCE';
  requestedBy: number;
  requestedByName?: string;
  requestDate: string;
  amount?: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  currentLevel: number;
  currentLevelName?: string;
  nextApproval?: number;
  nextLevel?: number;
  approvedBy?: number;
  approvedByName?: string;
  approvalDate?: string;
  notes?: string;
  details?: LeaveDetailsResponse | LoanDetailsResponse | AllowanceDetailsResponse | TransferRequest | ProjectPaymentRequest | ManualAttendanceRequestResponse | Record<string, unknown>; // Type-specific details
}

// Raw API response types for mapping
interface RawLeaveResponse {
  leaveId?: number;
  requestId?: number;
  employeeNo?: number;
  employeeId?: number;
  employeeName?: string;
  requestDate?: string;
  createdDate?: string;
  transStatus?: string;
  nextAppLevel?: number;
  nextAppLevelName?: string;
  nextApproval?: number;
  priority?: string;
  approvedBy?: number;
  approvedByName?: string;
  approvedDate?: string;
  leaveReason?: string;
  rejectionReason?: string;
}

interface RawLoanResponse {
  loanId: number;
  employeeNo?: number;
  employeeId?: number;
  employeeName?: string;
  requestDate?: string;
  createdDate?: string;
  loanAmount?: number;
  transStatus?: string;
  nextAppLevel?: number;
  nextAppLevelName?: string;
  nextApproval?: number;
  priority?: string;
  approvedBy?: number;
  approvedByName?: string;
  approvedDate?: string;
  loanReason?: string;
  rejectionReason?: string;
}

interface RawAllowanceResponse {
  transactionId?: number;
  requestId?: number;
  employeeNo?: number;
  employeeId?: number;
  employeeName?: string;
  requestDate?: string;
  createdDate?: string;
  transactionDate?: string;
  transactionAmount?: number;
  allowanceAmount?: number;
  status?: string;
  transStatus?: string;
  nextLevel?: number;
  nextAppLevel?: number;
  nextAppLevelName?: string;
  nextApproval?: number;
  priority?: string;
  approvedBy?: number;
  approvedByName?: string;
  approvedDate?: string;
  notes?: string;
  rejectionReason?: string;
}

interface RawTransferResponse {
  transferNo?: number;
  requestId?: number;
  employeeNo?: number;
  employeeId?: number;
  requestedByName?: string;
  employeeName?: string;
  requestDate?: string;
  transferDate?: string;
  transStatus?: string;
  nextAppLevel?: number;
  nextAppLevelName?: string;
  nextApproval?: number;
  priority?: string;
  approvedBy?: number;
  approvedByName?: string;
  approvedDate?: string;
  transferReason?: string;
  remarks?: string;
  rejectionReason?: string;
}

interface RawPaymentResponse {
  requestNo?: number;
  requestId?: number;
  requestedBy?: number;
  requesterName?: string;
  requestDate?: string;
  paymentAmount?: number;
  requestAmount?: number;
  requestPriority?: string;
  transStatus?: string;
  requestStatus?: string;
  nextAppLevel?: number;
  nextAppLevelName?: string;
  nextApproval?: number;
  approvedBy?: number;
  approverName?: string;
  approvedDate?: string;
  paymentPurpose?: string;
  rejectionReason?: string;
}

export interface ApprovalActionRequest {
  approved: boolean;
  notes?: string;
  rejectionReason?: string;
}

export const approvalsApi = {
  /**
   * Get all pending approvals for current user
   * Aggregates from all request types
   */
  async getAllPendingApprovals(approverNo: number): Promise<UnifiedApprovalRequest[]> {
    try {
      const [leaves, loans, allowances, transfers, payments, manualAttendance] = await Promise.all([
        this.getPendingLeaves().catch(() => []),
        this.getPendingLoans().catch(() => []),
        this.getPendingAllowances(approverNo).catch(() => []),
        this.getPendingTransfers().catch(() => []),
        this.getPendingPayments().catch(() => []),
        this.getPendingManualAttendance().catch(() => []),
      ]);

      const unified: UnifiedApprovalRequest[] = [];

      // Map leaves
      leaves.forEach((leave: RawLeaveResponse) => {
        unified.push({
          requestId: leave.leaveId || leave.requestId || 0,
          requestType: 'LEAVE',
          requestedBy: leave.employeeNo || leave.employeeId || 0,
          requestedByName: leave.employeeName || leave.employeeName || leave.employeeName,
          requestDate: leave.requestDate || leave.createdDate || '',
          status: leave.transStatus === 'A' ? 'APPROVED' : leave.transStatus === 'R' ? 'REJECTED' : 'PENDING',
          currentLevel: leave.nextAppLevel || 1,
          currentLevelName: leave.nextAppLevelName,
          nextApproval: leave.nextApproval,
          nextLevel: leave.nextAppLevel,
          priority: (leave.priority === 'H' ? 'HIGH' : leave.priority === 'L' ? 'LOW' : 'MEDIUM') as 'HIGH' | 'MEDIUM' | 'LOW',
          details: leave as unknown as Record<string, unknown>,
        });
      });

      // Map loans
      loans.forEach((loan: RawLoanResponse) => {
        unified.push({
          requestId: loan.loanId,
          requestType: 'LOAN',
          requestedBy: loan.employeeNo || loan.employeeId || 0,
          requestedByName: loan.employeeName || loan.employeeName || loan.employeeName,
          requestDate: loan.requestDate || loan.createdDate || '',
          amount: loan.loanAmount,
          status: loan.transStatus === 'A' ? 'APPROVED' : loan.transStatus === 'R' ? 'REJECTED' : 'PENDING',
          currentLevel: loan.nextAppLevel || 1,
          currentLevelName: loan.nextAppLevelName,
          nextApproval: loan.nextApproval,
          nextLevel: loan.nextAppLevel,
          priority: (loan.priority === 'H' ? 'HIGH' : loan.priority === 'L' ? 'LOW' : 'MEDIUM') as 'HIGH' | 'MEDIUM' | 'LOW',
          details: loan as unknown as Record<string, unknown>,
        });
      });

      // Map allowances
      allowances.forEach((allowance: RawAllowanceResponse) => {
        unified.push({
          requestId: allowance.transactionId || allowance.requestId || 0,
          requestType: 'ALLOWANCE',
          requestedBy: allowance.employeeNo || allowance.employeeId || 0,
          requestedByName: allowance.employeeName || allowance.employeeName || allowance.employeeName,
          requestDate: allowance.requestDate || allowance.createdDate || allowance.transactionDate || '',
          amount: allowance.transactionAmount || allowance.allowanceAmount,
          status: (allowance.status === 'A' || allowance.transStatus === 'A') ? 'APPROVED' : (allowance.status === 'R' || allowance.transStatus === 'R') ? 'REJECTED' : 'PENDING',
          currentLevel: allowance.nextLevel || allowance.nextAppLevel || 1,
          currentLevelName: allowance.nextAppLevelName,
          nextApproval: allowance.nextApproval,
          nextLevel: allowance.nextLevel || allowance.nextAppLevel,
          priority: (allowance.priority === 'H' ? 'HIGH' : allowance.priority === 'L' ? 'LOW' : 'MEDIUM') as 'HIGH' | 'MEDIUM' | 'LOW',
          details: allowance as unknown as Record<string, unknown>,
        });
      });

      // Map transfers
      transfers.forEach((transfer: RawTransferResponse) => {
        unified.push({
          requestId: transfer.transferNo || transfer.requestId || 0,
          requestType: 'TRANSFER',
          requestedBy: transfer.employeeNo || transfer.employeeId || 0,
          requestedByName: transfer.requestedByName || transfer.employeeName || transfer.employeeName,
          requestDate: transfer.requestDate || transfer.transferDate || '',
          status: transfer.transStatus === 'APPROVED' || transfer.transStatus === 'A' ? 'APPROVED' : transfer.transStatus === 'REJECTED' || transfer.transStatus === 'R' ? 'REJECTED' : 'PENDING',
          currentLevel: transfer.nextAppLevel || 1,
          currentLevelName: transfer.nextAppLevelName,
          nextApproval: transfer.nextApproval,
          nextLevel: transfer.nextAppLevel,
          priority: (transfer.priority === 'H' ? 'HIGH' : transfer.priority === 'L' ? 'LOW' : 'MEDIUM') as 'HIGH' | 'MEDIUM' | 'LOW',
          details: transfer as unknown as Record<string, unknown>,
        });
      });

      // Map payments
      payments.forEach((payment: RawPaymentResponse) => {
        unified.push({
          requestId: payment.requestNo || payment.requestId || 0,
          requestType: 'PAYMENT',
          requestedBy: payment.requestedBy || 0,
          requestedByName: payment.requesterName || '',
          requestDate: payment.requestDate || '',
          amount: payment.paymentAmount || payment.requestAmount || 0,
          priority: (payment.requestPriority || 'MEDIUM') as 'HIGH' | 'MEDIUM' | 'LOW',
          status: payment.transStatus === 'A' || payment.requestStatus === 'COMPLETED' ? 'APPROVED' : payment.transStatus === 'R' || payment.requestStatus === 'REJECTED' ? 'REJECTED' : 'PENDING',
          currentLevel: payment.nextAppLevel || 1,
          currentLevelName: payment.nextAppLevelName,
          nextApproval: payment.nextApproval,
          nextLevel: payment.nextAppLevel || 1,
          details: payment as unknown as Record<string, unknown>,
        });
      });

      // Map manual attendance requests
      manualAttendance.forEach((manual: ManualAttendanceRequestResponse) => {
        unified.push({
          requestId: manual.requestId,
          requestType: 'MANUAL_ATTENDANCE',
          requestedBy: manual.employeeNo,
          requestedByName: manual.employeeName,
          requestDate: manual.requestDate,
          status: manual.transStatus === 'A' ? 'APPROVED' : manual.transStatus === 'R' ? 'REJECTED' : 'PENDING',
          currentLevel: manual.nextAppLevel || 1,
          currentLevelName: manual.nextApproverName || undefined,
          nextApproval: manual.nextApproval || undefined,
          nextLevel: manual.nextAppLevel || undefined,
          priority: 'MEDIUM' as 'HIGH' | 'MEDIUM' | 'LOW',
          details: manual as unknown as Record<string, unknown>,
        });
      });

      return unified.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      return [];
    }
  },

  /**
   * Get pending leave requests
   */
  async getPendingLeaves(): Promise<RawLeaveResponse[]> {
    const response = await apiClient.get<RawLeaveResponse[]>(`/leaves/pending-approvals`);
    return response || [];
  },

  /**
   * Get pending loan requests
   */
  async getPendingLoans(): Promise<RawLoanResponse[]> {
    const response = await apiClient.get<RawLoanResponse[]>(`/loans/pending-approvals`);
    return response || [];
  },

  /**
   * Get pending allowance requests
   */
  async getPendingAllowances(_approverNo: number): Promise<RawAllowanceResponse[]> {
    const response = await apiClient.get<RawAllowanceResponse[]>(`/allowances/pending?approverId=${_approverNo}`);
    return response || [];
  },

  /**
   * Get pending transfer requests
   */
  async getPendingTransfers(): Promise<RawTransferResponse[]> {
    const response = await apiClient.get<RawTransferResponse[]>(`/transfers/pending`);
    return response || [];
  },

  /**
   * Get pending payment requests
   */
  async getPendingPayments(): Promise<RawPaymentResponse[]> {
    const response = await apiClient.get<RawPaymentResponse[]>(`/payment-requests/pending`);
    return response || [];
  },

  /**
   * Get pending manual attendance requests
   */
  async getPendingManualAttendance(): Promise<ManualAttendanceRequestResponse[]> {
    const response = await apiClient.get<PageResponse<ManualAttendanceRequestResponse>>(`/manual-attendance/list?transStatus=N&size=1000`);
    return response?.content || [];
  },

  /**
   * Approve a request
   */
  async approveRequest(
    requestType: UnifiedApprovalRequest['requestType'],
    requestId: number,
    approverNo: number,
    notes?: string
  ): Promise<void> {
    const body: { approverNo: number; notes?: string } = { approverNo, ...(notes && { notes }) };
    switch (requestType) {
      case 'LEAVE':
        await apiClient.post(`/leaves/${requestId}/approve`, body);
        break;
      case 'LOAN':
        await apiClient.post(`/loans/${requestId}/approve`, body);
        break;
      case 'ALLOWANCE':
        await apiClient.post(`/allowances/${requestId}/approve`, body);
        break;
      case 'TRANSFER':
        await apiClient.post(`/transfers/${requestId}/approve`, body);
        break;
      case 'PAYMENT':
        await apiClient.post(`/payment-requests/${requestId}/approve`);
        break;
      case 'MANUAL_ATTENDANCE':
        await apiClient.post(`/manual-attendance/${requestId}/approve`, body);
        break;
      default:
        throw new Error(`Unknown request type: ${requestType}`);
    }
  },

  /**
   * Reject a request
   */
  async rejectRequest(
    requestType: UnifiedApprovalRequest['requestType'],
    requestId: number,
    approverNo: number,
    rejectionReason: string
  ): Promise<void> {
    const body: { approverNo: number; rejectionReason: string } = { approverNo, rejectionReason };
    switch (requestType) {
      case 'LEAVE':
        await apiClient.post(`/leaves/${requestId}/reject`, body);
        break;
      case 'LOAN':
        await apiClient.post(`/loans/${requestId}/reject`, body);
        break;
      case 'ALLOWANCE':
        await apiClient.post(`/allowances/${requestId}/reject`, body);
        break;
      case 'TRANSFER':
        await apiClient.post(`/transfers/${requestId}/reject`, body);
        break;
      case 'PAYMENT':
        await apiClient.post(`/payment-requests/${requestId}/reject`, { rejectionReason });
        break;
      case 'MANUAL_ATTENDANCE':
        await apiClient.post(`/manual-attendance/${requestId}/reject`, body);
        break;
      default:
        throw new Error(`Unknown request type: ${requestType}`);
    }
  },

  /**
   * Get all approval history (all statuses) for all request types
   * Aggregates from all modules
   */
  async getAllApprovalHistory(): Promise<UnifiedApprovalRequest[]> {
    try {
      // Fetch all requests (all statuses) from each module
      // Using large page size to get all records, or we can paginate if needed
      const [leavesResponse, loansResponse, allowancesResponse, transfersResponse, paymentsResponse, manualAttendanceResponse] = await Promise.all([
        apiClient.get<PageResponse<RawLeaveResponse>>(`/leaves/list?size=1000`).catch(() => null),
        apiClient.get<PageResponse<RawLoanResponse>>(`/loans/list?size=1000`).catch(() => null),
        apiClient.get<PageResponse<RawAllowanceResponse>>(`/allowances/list?size=1000`).catch(() => null),
        apiClient.get<RawTransferResponse[]>(`/transfers/pending`).catch(() => null),
        apiClient.get<RawPaymentResponse[]>(`/payment-requests/pending`).catch(() => null),
        apiClient.get<PageResponse<ManualAttendanceRequestResponse>>(`/manual-attendance/list?size=1000`).catch(() => null),
      ]);

      const leaves = leavesResponse?.content || [];
      const loans = loansResponse?.content || [];
      const allowances = allowancesResponse?.content || [];
      const transfers = transfersResponse || [];
      const payments = paymentsResponse || [];
      const manualAttendance = manualAttendanceResponse?.content || [];

      const unified: UnifiedApprovalRequest[] = [];

      // Map leaves
      leaves.forEach((leave: RawLeaveResponse) => {
        unified.push({
          requestId: leave.leaveId || leave.requestId || 0,
          requestType: 'LEAVE',
          requestedBy: leave.employeeNo || leave.employeeId || 0,
          requestedByName: leave.employeeName || leave.employeeName || leave.employeeName,
          requestDate: leave.requestDate || leave.createdDate || '',
          status: leave.transStatus === 'A' ? 'APPROVED' : leave.transStatus === 'R' ? 'REJECTED' : 'PENDING',
          currentLevel: leave.nextAppLevel || 1,
          currentLevelName: leave.nextAppLevelName,
          nextApproval: leave.nextApproval,
          nextLevel: leave.nextAppLevel,
          priority: (leave.priority === 'H' ? 'HIGH' : leave.priority === 'L' ? 'LOW' : 'MEDIUM') as 'HIGH' | 'MEDIUM' | 'LOW',
          approvedBy: leave.approvedBy,
          approvedByName: leave.approvedByName,
          approvalDate: leave.approvedDate,
          notes: leave.leaveReason || leave.rejectionReason,
          details: leave as unknown as Record<string, unknown>,
        });
      });

      // Map loans
      loans.forEach((loan: RawLoanResponse) => {
        unified.push({
          requestId: loan.loanId,
          requestType: 'LOAN',
          requestedBy: loan.employeeNo || loan.employeeId || 0,
          requestedByName: loan.employeeName || loan.employeeName || loan.employeeName,
          requestDate: loan.requestDate || loan.createdDate || '',
          amount: loan.loanAmount,
          status: loan.transStatus === 'A' ? 'APPROVED' : loan.transStatus === 'R' ? 'REJECTED' : 'PENDING',
          currentLevel: loan.nextAppLevel || 1,
          currentLevelName: loan.nextAppLevelName,
          nextApproval: loan.nextApproval,
          nextLevel: loan.nextAppLevel,
          priority: (loan.priority === 'H' ? 'HIGH' : loan.priority === 'L' ? 'LOW' : 'MEDIUM') as 'HIGH' | 'MEDIUM' | 'LOW',
          approvedBy: loan.approvedBy,
          approvedByName: loan.approvedByName,
          approvalDate: loan.approvedDate,
          notes: loan.loanReason || loan.rejectionReason,
          details: loan as unknown as Record<string, unknown>,
        });
      });

      // Map allowances
      allowances.forEach((allowance: RawAllowanceResponse) => {
        unified.push({
          requestId: allowance.transactionId || allowance.requestId || 0,
          requestType: 'ALLOWANCE',
          requestedBy: allowance.employeeNo || allowance.employeeId || 0,
          requestedByName: allowance.employeeName || allowance.employeeName || allowance.employeeName,
          requestDate: allowance.transactionDate || allowance.requestDate || allowance.createdDate || '',
          amount: allowance.transactionAmount || allowance.allowanceAmount,
          status: (allowance.transStatus === 'A' || allowance.status === 'A') ? 'APPROVED' : (allowance.transStatus === 'R' || allowance.status === 'R') ? 'REJECTED' : 'PENDING',
          currentLevel: allowance.nextAppLevel || allowance.nextLevel || 1,
          currentLevelName: allowance.nextAppLevelName,
          nextApproval: allowance.nextApproval,
          nextLevel: allowance.nextAppLevel || allowance.nextLevel,
          priority: (allowance.priority === 'H' ? 'HIGH' : allowance.priority === 'L' ? 'LOW' : 'MEDIUM') as 'HIGH' | 'MEDIUM' | 'LOW',
          approvedBy: allowance.approvedBy,
          approvedByName: allowance.approvedByName,
          approvalDate: allowance.approvedDate,
          notes: allowance.notes || allowance.rejectionReason,
          details: allowance as unknown as Record<string, unknown>,
        });
      });

      // Map transfers
      transfers.forEach((transfer: RawTransferResponse) => {
        unified.push({
          requestId: transfer.transferNo || transfer.requestId || 0,
          requestType: 'TRANSFER',
          requestedBy: transfer.employeeNo || transfer.employeeId || 0,
          requestedByName: transfer.requestedByName || transfer.employeeName || transfer.employeeName,
          requestDate: transfer.requestDate || transfer.transferDate || '',
          status: (transfer.transStatus === 'A' || transfer.transStatus === 'APPROVED') ? 'APPROVED' : (transfer.transStatus === 'R' || transfer.transStatus === 'REJECTED') ? 'REJECTED' : 'PENDING',
          currentLevel: transfer.nextAppLevel || 1,
          currentLevelName: transfer.nextAppLevelName,
          nextApproval: transfer.nextApproval,
          nextLevel: transfer.nextAppLevel,
          priority: (transfer.priority === 'H' ? 'HIGH' : transfer.priority === 'L' ? 'LOW' : 'MEDIUM') as 'HIGH' | 'MEDIUM' | 'LOW',
          approvedBy: transfer.approvedBy,
          approvedByName: transfer.approvedByName,
          approvalDate: transfer.approvedDate,
          notes: transfer.transferReason || transfer.remarks || transfer.rejectionReason,
          details: transfer as unknown as Record<string, unknown>,
        });
      });

      // Map payments
      payments.forEach((payment: RawPaymentResponse) => {
        unified.push({
          requestId: payment.requestNo || payment.requestId || 0,
          requestType: 'PAYMENT',
          requestedBy: payment.requestedBy || 0,
          requestedByName: payment.requesterName,
          requestDate: payment.requestDate || '',
          amount: payment.paymentAmount || payment.requestAmount,
          priority: (payment.requestPriority === 'H' || payment.requestPriority === 'HIGH' ? 'HIGH' : payment.requestPriority === 'L' || payment.requestPriority === 'LOW' ? 'LOW' : 'MEDIUM') as 'HIGH' | 'MEDIUM' | 'LOW',
          status: payment.transStatus === 'A' || payment.requestStatus === 'COMPLETED' ? 'APPROVED' : payment.transStatus === 'R' || payment.requestStatus === 'REJECTED' ? 'REJECTED' : 'PENDING',
          currentLevel: payment.nextAppLevel || 1,
          currentLevelName: payment.nextAppLevelName,
          nextApproval: payment.nextApproval,
          nextLevel: payment.nextAppLevel,
          approvedBy: payment.approvedBy,
          approvedByName: payment.approverName,
          approvalDate: payment.approvedDate,
          notes: payment.paymentPurpose || payment.rejectionReason,
          details: payment as unknown as Record<string, unknown>,
        });
      });

      // Map manual attendance requests
      manualAttendance.forEach((manual: ManualAttendanceRequestResponse) => {
        unified.push({
          requestId: manual.requestId,
          requestType: 'MANUAL_ATTENDANCE',
          requestedBy: manual.employeeNo,
          requestedByName: manual.employeeName,
          requestDate: manual.requestDate,
          status: manual.transStatus === 'A' ? 'APPROVED' : manual.transStatus === 'R' ? 'REJECTED' : 'PENDING',
          currentLevel: manual.nextAppLevel || 1,
          currentLevelName: manual.nextApproverName || undefined,
          nextApproval: manual.nextApproval || undefined,
          nextLevel: manual.nextAppLevel || undefined,
          priority: 'MEDIUM' as 'HIGH' | 'MEDIUM' | 'LOW', // Manual attendance typically has medium priority
          approvedBy: manual.approvedBy || undefined,
          approvedByName: manual.approvedByName || undefined,
          approvalDate: manual.approvedDate || undefined,
          notes: manual.reason || manual.rejectionReason || undefined,
          details: manual as unknown as Record<string, unknown>,
        });
      });

      return unified.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
    } catch (error) {
      console.error('Error fetching approval history:', error);
      return [];
    }
  },
};
