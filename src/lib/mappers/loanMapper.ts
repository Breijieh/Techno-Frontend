// Loan Data Mapper
// Maps between backend LoanDetailsResponse/InstallmentDetailsResponse and frontend LoanRequest/LoanInstallment types

import type { LoanRequest, LoanInstallment, RequestStatus } from '@/types';
import type { LoanDetailsResponse, InstallmentDetailsResponse } from '@/lib/api/loans';

/**
 * Map backend status (N/A/R) to frontend status (NEW/INPROCESS/APPROVED/REJECTED)
 */
function mapStatus(transStatus: string | null | undefined, nextApproval?: number | null): RequestStatus {
  if (!transStatus) return 'NEW';

  switch (transStatus) {
    case 'N':
      // If there's a next approver, it's in process; otherwise it's new
      return nextApproval != null ? 'INPROCESS' : 'NEW';
    case 'A':
      return 'APPROVED';
    case 'R':
      return 'REJECTED';
    default:
      return 'NEW';
  }
}

/**
 * Map backend LoanDetailsResponse to frontend LoanRequest type
 */
export function mapLoanDetailsResponseToLoanRequest(response: LoanDetailsResponse): LoanRequest {
  return {
    loanId: response.loanId,
    employeeId: response.employeeNo,
    loanAmount: Number(response.loanAmount),
    numberOfInstallments: response.noOfInstallments,
    firstPaymentDate: new Date(response.firstInstallmentDate),
    remainingBalance: Number(response.remainingBalance),
    status: mapStatus(response.transStatus, response.nextApproval),
    requestDate: new Date(response.requestDate),
    approvedDate: response.approvedDate ? new Date(response.approvedDate) : undefined,
    nextApproval: response.nextApproval || undefined,
    nextApproverName: response.nextApproverName || undefined,
    nextLevel: response.nextAppLevel || undefined,
    nextLevelName: response.nextAppLevelName || undefined,
  };
}

/**
 * Map a list of backend LoanDetailsResponse to a list of frontend LoanRequest
 */
export function mapLoanDetailsResponseListToLoanRequestList(
  responses: LoanDetailsResponse[]
): LoanRequest[] {
  return responses.map(mapLoanDetailsResponseToLoanRequest);
}

/**
 * Map backend InstallmentDetailsResponse to frontend LoanInstallment type
 */
export function mapInstallmentDetailsResponseToLoanInstallment(
  response: InstallmentDetailsResponse
): LoanInstallment {
  // Map payment status: PAID/UNPAID/POSTPONED → PAID/PENDING
  let status: 'PAID' | 'PENDING' = 'PENDING';
  if (response.paymentStatus === 'PAID') {
    status = 'PAID';
  }

  return {
    loanId: response.loanId,
    installmentNo: response.installmentNo,
    dueDate: new Date(response.dueDate),
    installmentAmount: Number(response.installmentAmount),
    paidDate: response.paidDate ? new Date(response.paidDate) : undefined,
    status,
  };
}

/**
 * Map a list of backend InstallmentDetailsResponse to a list of frontend LoanInstallment
 */
export function mapInstallmentDetailsResponseListToLoanInstallmentList(
  responses: InstallmentDetailsResponse[]
): LoanInstallment[] {
  return responses.map(mapInstallmentDetailsResponseToLoanInstallment);
}

