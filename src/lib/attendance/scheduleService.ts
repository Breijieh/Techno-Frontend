/**
 * TimeSchedule Service
 * Handles employee schedule retrieval based on department and project
 */

export interface TimeSchedule {
  deptCode?: number;
  projectCode?: number;
  requiredHours: number;
  entryTime: string; // Format: "HH:MM"
  exitTime: string; // Format: "HH:MM"
}

/**
 * Get employee schedule
 * Priority: Project schedule > Department schedule > Default
 */
export function getEmployeeSchedule(
  employeeId: number,
  projectCode: number | undefined,
  departmentCode: number | undefined,
  schedules: TimeSchedule[]
): TimeSchedule {
  // Priority 1: Project-specific schedule
  if (projectCode) {
    const projectSchedule = schedules.find(
      (s) => s.projectCode === projectCode
    );
    if (projectSchedule) {
      return projectSchedule;
    }
  }

  // Priority 2: Department schedule (without project)
  if (departmentCode) {
    const deptSchedule = schedules.find(
      (s) => s.deptCode === departmentCode && !s.projectCode
    );
    if (deptSchedule) {
      return deptSchedule;
    }
  }

  // Default schedule: 8 hours, 09:00-17:00
  return {
    requiredHours: 8,
    entryTime: '09:00',
    exitTime: '17:00',
  };
}

/**
 * Get scheduled entry time
 */
export function getEntryTime(schedule: TimeSchedule): string {
  return schedule.entryTime;
}

/**
 * Get scheduled exit time
 */
export function getExitTime(schedule: TimeSchedule): string {
  return schedule.exitTime;
}

/**
 * Get required daily hours
 */
export function getRequiredHours(schedule: TimeSchedule): number {
  return schedule.requiredHours;
}

