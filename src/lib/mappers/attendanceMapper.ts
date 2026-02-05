// Attendance Data Mapper
// Maps between frontend AttendanceTransaction type and backend AttendanceResponse

import type { AttendanceTransaction } from '@/types';
import type { AttendanceResponse } from '@/lib/api/attendance';

/**
 * Format time from LocalDateTime string to HH:mm format
 */
import { formatTime } from '@/lib/utils/dateFormatter';

/**
 * Format hours from number (BigDecimal) to HH:mm format
 */
function formatHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || hours === 0) {
    return '00:00';
  }

  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Map backend AttendanceResponse to frontend AttendanceTransaction type
 */
export function mapAttendanceResponseToTransaction(response: AttendanceResponse): AttendanceTransaction {
  return {
    transactionId: response.transactionId,
    employeeId: response.employeeNo,
    employeeName: response.employeeName,
    attendanceDate: new Date(response.attendanceDate),
    entryTime: formatTime(response.entryTime),
    exitTime: formatTime(response.exitTime),
    scheduledHours: formatHours(response.scheduledHours),
    workingHours: formatHours(response.workingHours),
    overtimeCalc: formatHours(response.overtimeCalc),
    delayedCalc: formatHours(response.delayedCalc),
    earlyOutCalc: formatHours(response.earlyOutCalc),
    shortageHours: formatHours(response.shortageHours),
    absenceFlag: response.absenceFlag,
    projectCode: response.projectCode,
    projectName: response.projectNameAr || response.projectNameEn,
    locationLat: response.entryLatitude,
    locationLong: response.entryLongitude,
    notes: response.notes,
    // Flags for special attendance types
    isAutoCheckout: response.isAutoCheckout || 'N',
    isManualEntry: response.isManualEntry || 'N',
    isWeekendWork: response.isWeekendWork || 'N',
    isHolidayWork: response.isHolidayWork || 'N',
  };
}

/**
 * Map AttendanceResponse list to AttendanceTransaction list
 */
export function mapAttendanceResponseListToTransactionList(responses: AttendanceResponse[]): AttendanceTransaction[] {
  return responses.map(mapAttendanceResponseToTransaction);
}

