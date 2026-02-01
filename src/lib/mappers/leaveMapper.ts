// Leave Data Mapper
// Maps between backend LeaveDetailsResponse/EmployeeLeave and frontend LeaveRequest type

import type { LeaveRequest, RequestStatus } from '@/types';
import type { LeaveDetailsResponse } from '@/lib/api/leaves';

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
    case 'C':
      return 'REJECTED'; // Cancelled is treated as rejected in frontend
    default:
      return 'NEW';
  }
}

/**
 * Map backend LeaveDetailsResponse to frontend LeaveRequest type
 */
export function mapLeaveDetailsResponseToLeaveRequest(response: LeaveDetailsResponse): LeaveRequest {
  return {
    requestId: response.leaveId,
    employeeId: response.employeeNo,
    leaveType: 'Annual Leave', // Backend doesn't have leaveType, defaulting to Annual Leave
    fromDate: new Date(response.leaveFromDate),
    toDate: new Date(response.leaveToDate),
    numberOfDays: Number(response.leaveDays),
    reason: response.leaveReason || '',
    status: mapStatus(response.transStatus, response.nextApproval),
    requestDate: new Date(response.requestDate),
    nextApproval: response.nextApproval || undefined,
    nextApproverName: response.nextApproverName || undefined,
    nextLevel: response.nextAppLevel || undefined,
    nextLevelName: response.nextAppLevelName || undefined,
  };
}

/**
 * Map a list of backend LeaveDetailsResponse to a list of frontend LeaveRequest
 */
export function mapLeaveDetailsResponseListToLeaveRequestList(
  responses: LeaveDetailsResponse[]
): LeaveRequest[] {
  return responses.map(mapLeaveDetailsResponseToLeaveRequest);
}

/**
 * Map backend EmployeeLeave entity (from direct API calls) to frontend LeaveRequest type
 * This is used when the API returns EmployeeLeave directly (e.g., from getLeaveById)
 */
export function mapEmployeeLeaveToLeaveRequest(leave: {
  leaveId: number;
  employeeNo: number;
  leaveFromDate: string | Date;
  leaveToDate: string | Date;
  leaveDays: number | string;
  leaveReason?: string | null;
  transStatus: string;
  requestDate: string | Date;
  nextApproval?: number | null;
  nextAppLevel?: number | null;
}): LeaveRequest {
  return {
    requestId: leave.leaveId,
    employeeId: leave.employeeNo,
    leaveType: 'Annual Leave', // Backend doesn't have leaveType
    fromDate: leave.leaveFromDate instanceof Date ? leave.leaveFromDate : new Date(leave.leaveFromDate),
    toDate: leave.leaveToDate instanceof Date ? leave.leaveToDate : new Date(leave.leaveToDate),
    numberOfDays: typeof leave.leaveDays === 'string' ? Number(leave.leaveDays) : Number(leave.leaveDays),
    reason: leave.leaveReason || '',
    status: mapStatus(leave.transStatus, leave.nextApproval),
    requestDate: leave.requestDate instanceof Date ? leave.requestDate : new Date(leave.requestDate),
    nextApproval: leave.nextApproval || undefined,
    nextApproverName: 'nextApproverName' in leave ? (leave as { nextApproverName?: string }).nextApproverName : undefined,
    nextLevel: leave.nextAppLevel || undefined,
    nextLevelName: 'nextAppLevelName' in leave ? (leave as { nextAppLevelName?: string }).nextAppLevelName : undefined,
  };
}

