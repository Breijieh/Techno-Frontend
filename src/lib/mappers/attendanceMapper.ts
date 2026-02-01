// Attendance Data Mapper
// Maps between frontend AttendanceTransaction type and backend AttendanceResponse

import type { AttendanceTransaction } from '@/types';
import type { AttendanceResponse } from '@/lib/api/attendance';

/**
 * Format time from LocalDateTime string to HH:mm format
 */
function formatTime(timeString: string | null | undefined): string {
  if (!timeString) return '';
  
  try {
    // Handle ISO format: "2025-01-15T09:08:00" -> "09:08"
    const date = new Date(timeString);
    if (isNaN(date.getTime())) {
      // Try parsing as time string directly (HH:mm:ss or HH:mm)
      const timeMatch = timeString.match(/(\d{2}):(\d{2})/);
      if (timeMatch) {
        return `${timeMatch[1]}:${timeMatch[2]}`;
      }
      return '';
    }
    
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '';
  }
}

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

