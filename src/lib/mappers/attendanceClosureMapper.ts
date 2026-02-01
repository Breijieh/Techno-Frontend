// Attendance Day Closure Data Mapper
// Maps between backend AttendanceDayClosureDetailsResponse and frontend AttendanceDayClosure types

import type { AttendanceDayClosure } from '@/types';
import type { AttendanceDayClosureResponse } from '@/lib/api/attendance';

/**
 * Map backend AttendanceDayClosureDetailsResponse to frontend AttendanceDayClosure type
 */
export function mapAttendanceClosureResponseToAttendanceDayClosure(
  response: AttendanceDayClosureResponse
): AttendanceDayClosure {
  return {
    closureId: response.closureId,
    attendanceDate: new Date(response.attendanceDate),
    isClosed: response.isClosed ?? false, // Convert boolean or null to boolean
    closedBy: response.closedBy ?? undefined,
    closedDate: response.closedDate ? new Date(response.closedDate) : undefined,
    reopenedBy: response.reopenedBy ?? undefined,
    reopenedDate: response.reopenedDate ? new Date(response.reopenedDate) : undefined,
    notes: response.notes ?? undefined,
  };
}

/**
 * Map a list of backend AttendanceDayClosureDetailsResponse to a list of frontend AttendanceDayClosure
 */
export function mapAttendanceClosureResponseListToAttendanceDayClosureList(
  responses: AttendanceDayClosureResponse[]
): AttendanceDayClosure[] {
  return responses.map(mapAttendanceClosureResponseToAttendanceDayClosure);
}

