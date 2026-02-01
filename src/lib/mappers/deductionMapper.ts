// Deduction Data Mapper
// Maps between backend DeductionDetailsResponse and frontend DeductionRequest/MonthlyDeduction types

import type { MonthlyDeduction, RequestStatus } from '@/types';
import type { DeductionDetailsResponse } from '@/lib/api/deductions';

// DeductionRequest type (similar to AllowanceRequest)
export interface DeductionRequest {
  requestId: number;
  employeeId: number;
  deductionType: string;
  deductionAmount: number;
  reason: string;
  status: RequestStatus;
  requestDate: Date;
  nextApproval?: number;
  nextLevel?: number;
}

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
 * Map backend DeductionDetailsResponse to frontend DeductionRequest type
 */
export function mapDeductionResponseToDeductionRequest(response: DeductionDetailsResponse): DeductionRequest & { employeeName?: string } {
  return {
    requestId: response.transactionNo,
    employeeId: response.employeeNo,
    employeeName: response.employeeName, // Include for display
    deductionType: response.typeName || `نوع ${response.typeCode}`, // Use typeName if available, fallback to typeCode
    deductionAmount: Number(response.amount),
    reason: response.notes || '',
    status: mapStatus(response.transStatus, response.nextApproval),
    requestDate: new Date(response.transactionDate),
    nextApproval: response.nextApproval || undefined,
    nextLevel: response.nextAppLevel || undefined,
  };
}

/**
 * Map a list of backend DeductionDetailsResponse to a list of frontend DeductionRequest
 */
export function mapDeductionResponseListToDeductionRequestList(
  responses: DeductionDetailsResponse[]
): DeductionRequest[] {
  return responses.map(mapDeductionResponseToDeductionRequest);
}

/**
 * Map backend DeductionDetailsResponse to frontend MonthlyDeduction type
 * Used for the monthly deductions page
 */
export function mapDeductionResponseToMonthlyDeduction(response: DeductionDetailsResponse): MonthlyDeduction {
  // Extract month from transactionDate (YYYY-MM-DD format)
  const transactionDate = new Date(response.transactionDate);
  const monthYear = `${transactionDate.getFullYear()}-${String(transactionDate.getMonth() + 1).padStart(2, '0')}`;

  return {
    transactionId: response.transactionNo,
    employeeId: response.employeeNo,
    monthYear: monthYear,
    deductionType: response.typeCode,
    deductionAmount: Number(response.amount),
    status: mapStatus(response.transStatus, response.nextApproval) === 'APPROVED' ? 'A' : 
            mapStatus(response.transStatus, response.nextApproval) === 'REJECTED' ? 'R' : 'N',
    notes: response.notes,
  };
}

/**
 * Map a list of backend DeductionDetailsResponse to a list of frontend MonthlyDeduction
 */
export function mapDeductionResponseListToMonthlyDeductionList(
  responses: DeductionDetailsResponse[]
): MonthlyDeduction[] {
  return responses.map(mapDeductionResponseToMonthlyDeduction);
}

