/**
 * Attendance Business Logic
 * Handles calculations for working hours, overtime, late arrivals, early departures
 */

export interface TimeSchedule {
  entryTime: string; // Format: "HH:MM"
  exitTime: string; // Format: "HH:MM"
  requiredHours: number; // Daily required hours
}

export interface AttendanceCalculation {
  workingHours: string; // Format: "HH:MM"
  overtimeHours: string; // Format: "HH:MM"
  lateMinutes: number;
  earlyMinutes: number;
  isHoliday: boolean;
  isOvertime: boolean;
}

/**
 * Convert time string (HH:MM) to minutes
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes to time string (HH:MM)
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Calculate working hours between entry and exit times
 */
export function calculateWorkingHours(
  entryTime: string,
  exitTime: string
): string {
  const entryMinutes = timeToMinutes(entryTime);
  const exitMinutes = timeToMinutes(exitTime);

  if (exitMinutes < entryMinutes) {
    // Handle overnight shifts (exit time is next day)
    const totalMinutes = 24 * 60 - entryMinutes + exitMinutes;
    return minutesToTime(totalMinutes);
  }

  const totalMinutes = exitMinutes - entryMinutes;
  return minutesToTime(totalMinutes);
}

/**
 * Calculate overtime hours
 * Overtime = working hours - scheduled hours (if positive)
 */
export function calculateOvertime(
  workingHours: string,
  scheduledHours: number
): string {
  const workingMinutes = timeToMinutes(workingHours);
  const scheduledMinutes = scheduledHours * 60;

  if (workingMinutes <= scheduledMinutes) {
    return '00:00';
  }

  const overtimeMinutes = workingMinutes - scheduledMinutes;
  return minutesToTime(overtimeMinutes);
}

/**
 * Calculate late arrival minutes
 * Late = entry time - scheduled entry time (if positive, after grace period)
 */
export function calculateLateArrival(
  entryTime: string,
  scheduledEntryTime: string,
  gracePeriodMinutes: number = 15
): number {
  const entryMinutes = timeToMinutes(entryTime);
  const scheduledMinutes = timeToMinutes(scheduledEntryTime);
  const graceEndMinutes = scheduledMinutes + gracePeriodMinutes;

  if (entryMinutes <= graceEndMinutes) {
    return 0; // Within grace period
  }

  return entryMinutes - scheduledMinutes; // Total late minutes
}

/**
 * Calculate early departure minutes
 * Early = scheduled exit time - exit time (if positive)
 * Note: Backend does NOT use grace period for early departure (only for late arrival)
 */
export function calculateEarlyDeparture(
  exitTime: string,
  scheduledExitTime: string
): number {
  const exitMinutes = timeToMinutes(exitTime);
  const scheduledMinutes = timeToMinutes(scheduledExitTime);

  if (exitMinutes >= scheduledMinutes) {
    return 0; // On time or overtime
  }

  return scheduledMinutes - exitMinutes; // Total early minutes
}

/**
 * Apply grace period to time comparison
 */
export function applyGracePeriod(
  actualTime: string,
  scheduledTime: string,
  gracePeriodMinutes: number,
  isEntry: boolean
): boolean {
  const actualMinutes = timeToMinutes(actualTime);
  const scheduledMinutes = timeToMinutes(scheduledTime);

  if (isEntry) {
    // For entry: actual time should be <= scheduled + grace
    return actualMinutes <= scheduledMinutes + gracePeriodMinutes;
  } else {
    // For exit: actual time should be >= scheduled - grace
    return actualMinutes >= scheduledMinutes - gracePeriodMinutes;
  }
}

/**
 * Calculate overtime amount (1.5x rate)
 * Formula: (Monthly salary ÷ 30 ÷ daily hours) × overtime hours × 1.5
 */
export function calculateOvertimeAmount(
  monthlySalary: number,
  dailyHours: number,
  overtimeHours: string
): number {
  const hourlyRate = monthlySalary / 30 / dailyHours;
  const overtimeMinutes = timeToMinutes(overtimeHours);
  const overtimeDecimalHours = overtimeMinutes / 60;
  return hourlyRate * overtimeDecimalHours * 1.5;
}

/**
 * Calculate deduction amount
 * Formula: (Monthly salary ÷ 30 ÷ daily hours) × hours deducted
 */
export function calculateDeductionAmount(
  monthlySalary: number,
  dailyHours: number,
  deductedMinutes: number
): number {
  const hourlyRate = monthlySalary / 30 / dailyHours;
  const deductedDecimalHours = deductedMinutes / 60;
  return hourlyRate * deductedDecimalHours;
}

/**
 * Check if date is a holiday
 */
export function isHoliday(date: Date, holidays: Array<{ fromDate: Date; toDate: Date }>): boolean {
  return holidays.some(
    (holiday) => date >= holiday.fromDate && date <= holiday.toDate
  );
}

/**
 * Get scheduled hours for employee
 * This would typically fetch from TimeSchedule table
 */
export function getScheduledHours(
  employeeId: number,
  projectCode: number | undefined,
  departmentCode: number | undefined,
  schedules: Array<{
    deptCode?: number;
    projectCode?: number;
    requiredHours: number;
    entryTime: string;
    exitTime: string;
  }>
): TimeSchedule | null {
  // Priority: Project schedule > Department schedule > Default
  if (projectCode) {
    const projectSchedule = schedules.find(
      (s) => s.projectCode === projectCode
    );
    if (projectSchedule) {
      return {
        entryTime: projectSchedule.entryTime,
        exitTime: projectSchedule.exitTime,
        requiredHours: projectSchedule.requiredHours,
      };
    }
  }

  if (departmentCode) {
    const deptSchedule = schedules.find(
      (s) => s.deptCode === departmentCode && !s.projectCode
    );
    if (deptSchedule) {
      return {
        entryTime: deptSchedule.entryTime,
        exitTime: deptSchedule.exitTime,
        requiredHours: deptSchedule.requiredHours,
      };
    }
  }

  // Default schedule (8 hours, 08:00-17:00) - matches backend
  return {
    entryTime: '08:00',
    exitTime: '17:00',
    requiredHours: 8,
  };
}

/**
 * Calculate default checkout time (2 hours after scheduled exit)
 */
export function getDefaultCheckoutTime(scheduledExitTime: string): string {
  const exitMinutes = timeToMinutes(scheduledExitTime);
  const defaultExitMinutes = exitMinutes + 2 * 60; // Add 2 hours
  return minutesToTime(defaultExitMinutes);
}

/**
 * Complete attendance calculation
 */
export function calculateAttendance(
  entryTime: string,
  exitTime: string,
  schedule: TimeSchedule,
  isHolidayWork: boolean = false
): AttendanceCalculation {
  const workingHours = calculateWorkingHours(entryTime, exitTime);
  const overtimeHours = calculateOvertime(workingHours, schedule.requiredHours);
  // Grace period of 15 minutes is only for late arrival, not for early departure
  const lateMinutes = calculateLateArrival(entryTime, schedule.entryTime, 15);
  const earlyMinutes = calculateEarlyDeparture(exitTime, schedule.exitTime);

  // Holiday work is always considered overtime
  const isOvertime = isHolidayWork || overtimeHours !== '00:00';

  return {
    workingHours,
    overtimeHours: isHolidayWork ? workingHours : overtimeHours,
    lateMinutes,
    earlyMinutes,
    isHoliday: isHolidayWork,
    isOvertime,
  };
}

