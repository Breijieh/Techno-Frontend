// Time Schedules API Service

import { apiClient } from './client';

export interface TimeScheduleResponse {
  scheduleId: number;
  scheduleName: string;
  departmentCode?: number;
  departmentNameAr?: string;
  departmentNameEn?: string;
  projectCode?: number; // Project code for project-specific schedules
  projectNameAr?: string;
  projectNameEn?: string;
  scheduledStartTime: string; // LocalTime from backend (HH:mm:ss or HH:mm)
  scheduledEndTime: string; // LocalTime from backend (HH:mm:ss or HH:mm)
  requiredHours: number; // BigDecimal from backend
  gracePeriodMinutes?: number;
  isActive?: string; // 'Y' or 'N'
  crossesMidnight?: boolean;
  graceEndTime?: string; // LocalTime from backend
  createdDate?: string;
  createdBy?: string;
  modifiedDate?: string;
  modifiedBy?: string;
}

export interface TimeScheduleRequest {
  scheduleName: string;
  departmentCode?: number | null;
  scheduledStartTime: string; // LocalTime format (HH:mm)
  scheduledEndTime: string; // LocalTime format (HH:mm)
  requiredHours: number; // Will be converted to BigDecimal
  gracePeriodMinutes: number;
  isActive: string; // 'Y' or 'N'
}

/**
 * Convert LocalTime string (HH:mm:ss or HH:mm) to HH:mm format
 */
function formatTimeForFrontend(timeString: string): string {
  if (!timeString) return '';
  // Backend may return HH:mm:ss or HH:mm, we want HH:mm
  return timeString.substring(0, 5);
}

/**
 * Convert HH:mm string to LocalTime format for backend
 */
function formatTimeForBackend(timeString: string): string {
  if (!timeString) return '';
  // Ensure format is HH:mm
  const parts = timeString.split(':');
  if (parts.length === 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return timeString;
}

/**
 * Generate schedule name from department
 */
export function generateScheduleName(
  departmentName?: string
): string {
  if (departmentName) {
    return `${departmentName} - Default Schedule`;
  }
  return 'Default Schedule';
}

export const timeSchedulesApi = {
  /**
   * Get all active time schedules
   */
  async getAllSchedules(): Promise<TimeScheduleResponse[]> {
    const response = await apiClient.get<TimeScheduleResponse[]>('/schedules');
    return response;
  },

  /**
   * Get time schedule by ID
   */
  async getScheduleById(id: number): Promise<TimeScheduleResponse> {
    const response = await apiClient.get<TimeScheduleResponse>(`/schedules/${id}`);
    return response;
  },

  /**
   * Create new time schedule
   */
  async createSchedule(request: TimeScheduleRequest): Promise<TimeScheduleResponse> {
    // Format times for backend
    const formattedRequest: TimeScheduleRequest = {
      ...request,
      scheduledStartTime: formatTimeForBackend(request.scheduledStartTime),
      scheduledEndTime: formatTimeForBackend(request.scheduledEndTime),
      departmentCode: request.departmentCode || null,
    };

    const response = await apiClient.post<TimeScheduleResponse>(
      '/schedules',
      formattedRequest
    );
    return response;
  },

  /**
   * Update existing time schedule
   */
  async updateSchedule(
    id: number,
    request: TimeScheduleRequest
  ): Promise<TimeScheduleResponse> {
    // Format times for backend
    const formattedRequest: TimeScheduleRequest = {
      ...request,
      scheduledStartTime: formatTimeForBackend(request.scheduledStartTime),
      scheduledEndTime: formatTimeForBackend(request.scheduledEndTime),
      departmentCode: request.departmentCode || null,
    };

    const response = await apiClient.put<TimeScheduleResponse>(
      `/schedules/${id}`,
      formattedRequest
    );
    return response;
  },

  /**
   * Delete time schedule
   */
  async deleteSchedule(id: number): Promise<void> {
    await apiClient.delete(`/schedules/${id}`);
  },
};

/**
 * Helper function to convert TimeScheduleResponse to frontend TimeSchedule format
 */
export function mapScheduleResponseToFrontend(
  response: TimeScheduleResponse
): {
  scheduleId: number;
  scheduleName: string;
  departmentCode: number;
  requiredHours: number;
  entryTime: string;
  exitTime: string;
  departmentNameEn?: string;
  gracePeriodMinutes?: number;
  isActive?: string;
} {
  return {
    scheduleId: response.scheduleId,
    scheduleName: response.scheduleName,
    departmentCode: response.departmentCode || 0,
    requiredHours: response.requiredHours,
    entryTime: formatTimeForFrontend(response.scheduledStartTime),
    exitTime: formatTimeForFrontend(response.scheduledEndTime),
    departmentNameEn: response.departmentNameEn,
    gracePeriodMinutes: response.gracePeriodMinutes,
    isActive: response.isActive,
  };
}

