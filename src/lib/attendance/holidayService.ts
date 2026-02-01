/**
 * Holiday Service
 * Handles holiday calendar checks and holiday work detection
 */

export type HolidayType = 'Fitr' | 'Adha' | 'National' | 'Foundation';

export interface Holiday {
  serNo: number;
  holidayType: HolidayType;
  gregYear: number;
  hijriYear: number;
  fromDate: Date;
  toDate: Date;
}

/**
 * Check if a date is a holiday
 */
export function isHoliday(date: Date, holidays: Holiday[]): boolean {
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  return holidays.some((holiday) => {
    const fromDate = new Date(holiday.fromDate);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(holiday.toDate);
    toDate.setHours(23, 59, 59, 999);
    
    return dateOnly >= fromDate && dateOnly <= toDate;
  });
}

/**
 * Get holiday type for a date
 */
export function getHolidayType(date: Date, holidays: Holiday[]): HolidayType | null {
  const holiday = holidays.find((h) => {
    const fromDate = new Date(h.fromDate);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(h.toDate);
    toDate.setHours(23, 59, 59, 999);
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    return dateOnly >= fromDate && dateOnly <= toDate;
  });

  return holiday ? holiday.holidayType : null;
}

/**
 * Check if work on a holiday (holiday work = overtime)
 */
export function isHolidayWork(date: Date, holidays: Holiday[]): boolean {
  return isHoliday(date, holidays);
}

/**
 * Get all holidays for a year
 */
export function getHolidaysForYear(year: number, holidays: Holiday[]): Holiday[] {
  return holidays.filter((h) => h.gregYear === year);
}

/**
 * Get upcoming holidays within a date range
 */
export function getUpcomingHolidays(
  fromDate: Date,
  toDate: Date,
  holidays: Holiday[]
): Holiday[] {
  return holidays.filter((holiday) => {
    const holidayFrom = new Date(holiday.fromDate);
    const holidayTo = new Date(holiday.toDate);
    
    return (
      (holidayFrom >= fromDate && holidayFrom <= toDate) ||
      (holidayTo >= fromDate && holidayTo <= toDate) ||
      (holidayFrom <= fromDate && holidayTo >= toDate)
    );
  });
}

