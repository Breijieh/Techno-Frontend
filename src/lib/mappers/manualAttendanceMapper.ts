// Manual Attendance Request Data Mapper
// Maps between backend ManualAttendanceRequestDetailsResponse and frontend ManualAttendanceRequest types

import type { ManualAttendanceRequest } from '@/types';
import type { ManualAttendanceRequestResponse } from '@/lib/api/attendance';

/**
 * Map backend status (N/A/R) to frontend status (PENDING/APPROVED/REJECTED)
 */
function mapStatus(transStatus: string): ManualAttendanceRequest['requestStatus'] {
  switch (transStatus) {
    case 'N':
      return 'PENDING';
    case 'A':
      return 'APPROVED';
    case 'R':
      return 'REJECTED';
    default:
      return 'PENDING';
  }
}

/**
 * Map backend ManualAttendanceRequestDetailsResponse to frontend ManualAttendanceRequest type
 */
export function mapManualAttendanceResponseToManualAttendanceRequest(
  response: ManualAttendanceRequestResponse
): ManualAttendanceRequest {
  return {
    requestId: response.requestId,
    employeeId: response.employeeNo,
    employeeName: response.employeeName || `موظف ${response.employeeNo}`,
    attendanceDate: new Date(response.attendanceDate),
    entryTime: response.entryTime, // Already in HH:mm format
    exitTime: response.exitTime, // Already in HH:mm format
    reason: response.reason,
    requestStatus: mapStatus(response.transStatus),
    requestedBy: response.requestedBy,
    requestedDate: response.requestDate ? new Date(response.requestDate) : new Date(),
    approvedBy: response.approvedBy != null ? response.approvedBy : undefined,
    approvedDate: response.approvedDate ? new Date(response.approvedDate) : undefined,
    rejectionReason: response.rejectionReason != null ? response.rejectionReason : undefined,
  };
}

/**
 * Map a list of backend ManualAttendanceRequestDetailsResponse to a list of frontend ManualAttendanceRequest
 */
export function mapManualAttendanceResponseListToManualAttendanceRequestList(
  responses: ManualAttendanceRequestResponse[]
): ManualAttendanceRequest[] {
  return responses.map(mapManualAttendanceResponseToManualAttendanceRequest);
}

