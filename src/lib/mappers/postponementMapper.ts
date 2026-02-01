// Postponement Data Mapper
// Maps between backend PostponementDetailsResponse and frontend PostponementRequest types

import type { RequestStatus } from '@/types';
import type { PostponementDetailsResponse } from '@/lib/api/loans';

export interface PostponementRequest {
  requestId: number;
  employeeId: number;
  employeeName?: string;
  loanId: number;
  originalMonth: string; // YYYY-MM format
  newMonth: string; // YYYY-MM format
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
 * Map backend PostponementDetailsResponse to frontend PostponementRequest type
 */
export function mapPostponementResponseToPostponementRequest(
  response: PostponementDetailsResponse
): PostponementRequest {
  return {
    requestId: response.requestId,
    employeeId: response.employeeNo,
    employeeName: response.employeeName, // Include for display
    loanId: response.loanId,
    originalMonth: response.originalMonth || (response.currentDueDate ? formatMonthString(response.currentDueDate) : ''),
    newMonth: response.newMonth || (response.newDueDate ? formatMonthString(response.newDueDate) : ''),
    reason: response.postponementReason || '',
    status: mapStatus(response.transStatus, response.nextApproval),
    requestDate: new Date(response.requestDate),
    nextApproval: response.nextApproval || undefined,
    nextLevel: response.nextAppLevel || undefined,
  };
}

/**
 * Format LocalDate to YYYY-MM string
 */
function formatMonthString(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Map a list of backend PostponementDetailsResponse to a list of frontend PostponementRequest
 */
export function mapPostponementResponseListToPostponementRequestList(
  responses: PostponementDetailsResponse[]
): PostponementRequest[] {
  return responses.map(mapPostponementResponseToPostponementRequest);
}

