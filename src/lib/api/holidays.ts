// Holidays API Service

import { apiClient } from './client';
import type { Holiday, HolidayType } from '@/types';

export interface HolidayResponse {
  holidayId: number;
  holidayDate: string; // LocalDate from backend (YYYY-MM-DD)
  holidayName?: string;
  holidayYear: number;
  isRecurring?: string; // 'Y' or 'N'
  isActive?: string; // 'Y' or 'N'
  isPaid?: string; // 'Y' or 'N'
  dayOfWeek?: number;
  dayName?: string;
  createdDate?: string;
  createdBy?: string;
  modifiedDate?: string;
  modifiedBy?: string;
}

export interface HolidayRequest {
  holidayDate: string; // LocalDate format (YYYY-MM-DD)
  holidayName: string;
  holidayYear: number;
  isRecurring?: string; // 'Y' or 'N'
  isActive?: string; // 'Y' or 'N'
  isPaid?: string; // 'Y' or 'N'
}

/**
 * Map holiday name to HolidayType enum
 */
export function mapHolidayNameToType(name: string): HolidayType {
  const nameLower = name.toLowerCase();
  if (nameLower.includes('fitr') || nameLower.includes('عيد الفطر')) {
    return 'Fitr';
  }
  if (nameLower.includes('adha') || nameLower.includes('عيد الأضحى')) {
    return 'Adha';
  }
  if (nameLower.includes('foundation') || nameLower.includes('يوم التأسيس')) {
    return 'Foundation';
  }
  if (nameLower.includes('national') || nameLower.includes('وطني')) {
    return 'National';
  }
  // Default to Custom for other holidays
  return 'Custom';
}

/**
 * Map HolidayType to Arabic and English names
 */
export function mapHolidayTypeToNames(type: HolidayType): { en: string; ar: string } {
  const mappings: Record<HolidayType, { en: string; ar: string }> = {
    Fitr: { en: 'Eid Al-Fitr', ar: 'عيد الفطر' },
    Adha: { en: 'Eid Al-Adha', ar: 'عيد الأضحى' },
    National: { en: 'National Holiday', ar: 'عيد وطني' },
    Foundation: { en: 'Foundation Day', ar: 'يوم التأسيس' },
    Custom: { en: 'Custom Holiday', ar: 'إجازة مخصصة' },
  };
  return mappings[type] || { en: 'National Holiday', ar: 'عيد وطني' };
}

/**
 * Group consecutive holidays with same name into date ranges
 */
export function groupConsecutiveHolidays(holidays: HolidayResponse[]): Holiday[] {
  if (!holidays || holidays.length === 0) return [];

  // Sort by date
  const sorted = [...holidays].sort((a, b) =>
    new Date(a.holidayDate).getTime() - new Date(b.holidayDate).getTime()
  );

  const grouped: Holiday[] = [];
  let currentGroup: HolidayResponse[] = [];
  let serialNo = 1;

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const prev = currentGroup[currentGroup.length - 1];

    // Check if this holiday can be grouped with previous
    if (
      prev &&
      prev.holidayName === current.holidayName &&
      prev.holidayYear === current.holidayYear
    ) {
      const prevDate = new Date(prev.holidayDate);
      const currentDate = new Date(current.holidayDate);
      const daysDiff = Math.floor(
        (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // If consecutive (within 1 day), add to current group
      if (daysDiff === 1) {
        currentGroup.push(current);
        continue;
      }
    }

    // Start a new group
    if (currentGroup.length > 0) {
      // Save previous group
      const first = currentGroup[0];
      const last = currentGroup[currentGroup.length - 1];
      const fromDate = new Date(first.holidayDate);
      const toDate = new Date(last.holidayDate);
      const numberOfDays = currentGroup.length;

      grouped.push({
        serialNo: serialNo++,
        holidayType: mapHolidayNameToType(first.holidayName || ''),
        gregYear: first.holidayYear,
        hijriYear: first.holidayYear - 579, // Approximate conversion
        fromDate,
        toDate,
        numberOfDays,
        holidayName: first.holidayName,
        isPaid: first.isPaid === 'Y',
        isActive: first.isActive === 'Y',
        holidayIds: currentGroup.map(h => h.holidayId), // Store IDs for deletion
      });
    }

    // Start new group
    currentGroup = [current];
  }

  // Don't forget the last group
  if (currentGroup.length > 0) {
    const first = currentGroup[0];
    const last = currentGroup[currentGroup.length - 1];
    const fromDate = new Date(first.holidayDate);
    const toDate = new Date(last.holidayDate);
    const numberOfDays = currentGroup.length;

    grouped.push({
      serialNo: serialNo++,
      holidayType: mapHolidayNameToType(first.holidayName || ''),
      gregYear: first.holidayYear,
      hijriYear: first.holidayYear - 579,
      fromDate,
      toDate,
      numberOfDays,
      holidayName: first.holidayName,
      isPaid: first.isPaid === 'Y',
      isRecurring: first.isRecurring === 'Y',
      isActive: first.isActive === 'Y',
      holidayIds: currentGroup.map(h => h.holidayId), // Store IDs for deletion
    });
  }

  return grouped;
}

/**
 * Generate all dates between fromDate and toDate (inclusive)
 */
export function generateDateRange(fromDate: Date, toDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(fromDate);
  const end = new Date(toDate);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Format date to YYYY-MM-DD string
 */
export function formatDateForBackend(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const holidaysApi = {
  /**
   * Get all holidays for a specific year
   */
  async getAllHolidays(year?: number): Promise<HolidayResponse[]> {
    const targetYear = year || new Date().getFullYear();
    // Use date range endpoint to get all holidays for the year
    const startDate = formatDateForBackend(new Date(targetYear, 0, 1));
    const endDate = formatDateForBackend(new Date(targetYear, 11, 31));
    const response = await apiClient.get<HolidayResponse[]>(
      `/holidays/range?startDate=${startDate}&endDate=${endDate}`
    );
    return response;
  },

  /**
   * Get holidays by date range
   */
  async getHolidaysByRange(startDate: Date, endDate: Date): Promise<HolidayResponse[]> {
    const start = formatDateForBackend(startDate);
    const end = formatDateForBackend(endDate);
    const response = await apiClient.get<HolidayResponse[]>(
      `/holidays/range?startDate=${start}&endDate=${end}`
    );
    return response;
  },

  /**
   * Get holiday by ID
   */
  async getHolidayById(id: number): Promise<HolidayResponse> {
    const response = await apiClient.get<HolidayResponse>(`/holidays/${id}`);
    return response;
  },

  /**
   * Create holiday (handles date ranges by creating multiple entries)
   */
  async createHoliday(holiday: Partial<Holiday>): Promise<HolidayResponse[]> {
    if (!holiday.fromDate || !holiday.toDate || !holiday.holidayType || !holiday.gregYear) {
      throw new Error('الحقول المطلوبة مفقودة');
    }

    const names = holiday.holidayType === 'Custom'
      ? { en: holiday.holidayName || '', ar: holiday.holidayName || '' }
      : mapHolidayTypeToNames(holiday.holidayType);
    const dateRange = generateDateRange(holiday.fromDate, holiday.toDate);
    const isRecurring = holiday.holidayType === 'National' || holiday.holidayType === 'Foundation' ? 'Y' : 'N';

    // Create multiple holiday entries (one per day in range)
    const promises = dateRange.map(date =>
      apiClient.post<HolidayResponse>('/holidays', {
        holidayDate: formatDateForBackend(date),
        holidayName: names.ar, // Prefer Arabic name for backend
        holidayYear: holiday.gregYear,
        isRecurring: holiday.isRecurring !== undefined ? (holiday.isRecurring ? 'Y' : 'N') : isRecurring,
        isActive: 'Y',
        isPaid: holiday.isPaid !== false ? 'Y' : 'N',
      })
    );

    const responses = await Promise.all(promises);
    return responses;
  },

  /**
   * Update holiday
   * Note: For date ranges, this updates the first holiday. Consider deleting and recreating for range changes.
   */
  async updateHoliday(id: number, request: HolidayRequest): Promise<HolidayResponse> {
    const response = await apiClient.put<HolidayResponse>(`/holidays/${id}`, request);
    return response;
  },

  /**
   * Delete holiday
   */
  async deleteHoliday(id: number): Promise<void> {
    await apiClient.delete(`/holidays/${id}`);
  },
};

export default holidaysApi;

