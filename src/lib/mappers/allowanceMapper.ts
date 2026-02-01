// Allowance Data Mapper
// Maps between backend AllowanceDetailsResponse and frontend AllowanceRequest types

import type { AllowanceRequest, RequestStatus } from '@/types';
import type { AllowanceDetailsResponse } from '@/lib/api/allowances';

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
 * Map backend AllowanceDetailsResponse to frontend AllowanceRequest type
 */
export function mapAllowanceResponseToAllowanceRequest(response: AllowanceDetailsResponse): AllowanceRequest & { employeeName?: string } {
  return {
    requestId: response.transactionNo,
    employeeId: response.employeeNo,
    employeeName: response.employeeName, // Include for display
    allowanceType: response.typeName || `نوع ${response.typeCode}`, // Use typeName if available, fallback to typeCode
    allowanceAmount: Number(response.amount),
    reason: response.notes || '',
    status: mapStatus(response.transStatus, response.nextApproval),
    requestDate: new Date(response.transactionDate),
    nextApproval: response.nextApproval || undefined,
    nextLevel: response.nextAppLevel || undefined,
  };
}

/**
 * Map a list of backend AllowanceDetailsResponse to a list of frontend AllowanceRequest
 */
export function mapAllowanceResponseListToAllowanceRequestList(
  responses: AllowanceDetailsResponse[]
): AllowanceRequest[] {
  return responses.map(mapAllowanceResponseToAllowanceRequest);
}

