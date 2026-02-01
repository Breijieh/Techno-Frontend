// Installment Data Mapper
// Maps between backend InstallmentScheduleResponse and frontend LoanInstallmentRecord types

import type { LoanInstallmentRecord } from '@/types';
import type { InstallmentScheduleResponse } from '@/lib/api/loans';

/**
 * Map backend payment status (PAID/UNPAID/POSTPONED) to frontend status (PAID/PENDING/POSTPONED)
 */
function mapStatus(paymentStatus: string | null | undefined): 'PAID' | 'PENDING' | 'POSTPONED' {
  if (!paymentStatus) return 'PENDING';
  
  switch (paymentStatus.toUpperCase()) {
    case 'PAID':
      return 'PAID';
    case 'POSTPONED':
      return 'POSTPONED';
    case 'UNPAID':
    default:
      return 'PENDING';
  }
}

/**
 * Map backend InstallmentScheduleResponse to frontend LoanInstallmentRecord type
 */
export function mapInstallmentResponseToLoanInstallmentRecord(
  response: InstallmentScheduleResponse
): LoanInstallmentRecord {
  return {
    installmentId: response.installmentId,
    loanRequestId: response.loanId,
    employeeId: response.employeeNo,
    installmentNumber: response.installmentNo,
    dueDate: new Date(response.dueDate),
    amount: Number(response.installmentAmount),
    paidDate: response.paidDate ? new Date(response.paidDate) : undefined,
    status: mapStatus(response.paymentStatus),
    postponedTo: response.postponedTo ? new Date(response.postponedTo) : undefined,
  };
}

/**
 * Map a list of backend InstallmentScheduleResponse to a list of frontend LoanInstallmentRecord
 */
export function mapInstallmentResponseListToLoanInstallmentRecordList(
  responses: InstallmentScheduleResponse[]
): LoanInstallmentRecord[] {
  return responses.map(mapInstallmentResponseToLoanInstallmentRecord);
}

