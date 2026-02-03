// Attendance API Service

import { apiClient } from './client';
import type { PageResponse } from './types';
import { getTodayLocalDate } from '@/lib/utils/dateFormatter';

export interface CheckInRequest {
  projectCode: number;
  latitude: number;
  longitude: number;
  notes?: string;
}

export interface CheckInResponse {
  transactionId: number;
  employeeNo: number;
  attendanceDate: string;
  entryTime: string;
  projectCode: number;
  locationLat: number;
  locationLong: number;
  message: string;
}

export interface CheckOutRequest {
  latitude: number;
  longitude: number;
  notes?: string;
}

export interface CheckOutResponse {
  transactionId: number;
  employeeNo: number;
  attendanceDate: string;
  entryTime: string;
  exitTime: string;
  workingHours: string;
  overtimeCalc?: string;
  delayedCalc?: string;
  earlyOutCalc?: string;
  message: string;
}

export interface AttendanceResponse {
  transactionId: number;
  employeeNo: number;
  employeeName?: string;
  attendanceDate: string;
  dayOfWeek?: number;
  dayName?: string;
  projectCode?: number;
  projectNameAr?: string;
  projectNameEn?: string;
  entryTime: string | null;
  entryLatitude?: number;
  entryLongitude?: number;
  entryDistanceMeters?: number;
  exitTime: string | null;
  exitLatitude?: number;
  exitLongitude?: number;
  exitDistanceMeters?: number;
  scheduledHours?: number;
  workingHours?: number;
  overtimeCalc?: number;
  delayedCalc?: number;
  earlyOutCalc?: number;
  shortageHours?: number;
  absenceFlag: 'Y' | 'N';
  absenceReason?: string;
  isAutoCheckout?: 'Y' | 'N';
  isHolidayWork?: 'Y' | 'N';
  isWeekendWork?: 'Y' | 'N';
  isManualEntry?: 'Y' | 'N';
  notes?: string;
  createdDate?: string;
  createdBy?: string;
  modifiedDate?: string;
  modifiedBy?: string;
}

export interface DailyOverviewDto {
  date: string;
  dayName: string;
  isWorkDay: boolean;
  isHoliday: boolean;
  isWeekend: boolean;
  holidayName: string | null;
  attendance: AttendanceResponse | null;
  projectName: string | null;
  projectCode: number | null;
  statusAr?: string;
  statusColor?: string;
}

export interface ManualAttendanceRequest {
  employeeNo: number;
  attendanceDate: string;
  entryTime: string;
  exitTime?: string;
  projectCode?: number;
  reason: string;
  notes?: string;
}

export interface AttendanceQueryParams {
  employeeNo?: number;
  projectCode?: number;
  startDate?: string;
  endDate?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface AttendanceListResponse {
  content: AttendanceResponse[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export const attendanceApi = {
  /**
   * Employee check-in with GPS
   */
  async checkIn(request: CheckInRequest): Promise<CheckInResponse> {
    const response = await apiClient.post<CheckInResponse>(
      '/attendance/check-in',
      request
    );
    return response;
  },

  /**
   * Employee check-out with GPS
   */
  async checkOut(request: CheckOutRequest): Promise<CheckOutResponse> {
    const response = await apiClient.post<CheckOutResponse>(
      '/attendance/check-out',
      request
    );
    return response;
  },

  /**
   * Get attendance record by ID
   */
  async getAttendanceById(id: number): Promise<AttendanceResponse> {
    const response = await apiClient.get<AttendanceResponse>(`/attendance/${id}`);
    return response;
  },

  /**
   * Get current authenticated user's attendance history
   */
  async getMyAttendance(params?: {
    startDate?: string;
    endDate?: string;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  }): Promise<{ content: AttendanceResponse[]; totalElements: number }> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortDirection) queryParams.append('sortDirection', params.sortDirection);

    const response = await apiClient.get<PageResponse<AttendanceResponse>>(
      `/attendance/my-attendance?${queryParams.toString()}`
    );
    // Extract content and totalElements from the page response
    return {
      content: response.content || [],
      totalElements: response.totalElements || 0,
    };
  },

  /**
   * Get employee's attendance history (for managers/admins)
   */
  async getEmployeeAttendance(
    employeeNo: number,
    params?: {
      fromDate?: string;
      toDate?: string;
      page?: number;
      size?: number;
    }
  ): Promise<{ content: AttendanceResponse[]; totalElements: number }> {
    const queryParams = new URLSearchParams();
    if (params?.fromDate) queryParams.append('startDate', params.fromDate);
    if (params?.toDate) queryParams.append('endDate', params.toDate);
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());

    const response = await apiClient.get<PageResponse<AttendanceResponse>>(
      `/attendance/employee/${employeeNo}?${queryParams.toString()}`
    );
    // Extract content and totalElements from the page response
    return {
      content: response.content || [],
      totalElements: response.totalElements || 0,
    };
  },

  /**
   * Get attendance for date range
   */
  async getAttendanceByDateRange(
    params: AttendanceQueryParams
  ): Promise<{ content: AttendanceResponse[]; totalElements: number }> {
    const queryParams = new URLSearchParams();
    if (params.employeeNo) queryParams.append('employeeNo', params.employeeNo.toString());
    if (params.projectCode) queryParams.append('projectCode', params.projectCode.toString());
    if (params.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params.toDate) queryParams.append('toDate', params.toDate);
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);

    const response = await apiClient.get<{ content: AttendanceResponse[]; totalElements: number }>(
      `/attendance?${queryParams.toString()}`
    );
    return response;
  },

  /**
   * Submit manual attendance request (for HR/Admin)
   */
  async submitManualAttendance(request: ManualAttendanceRequest): Promise<AttendanceResponse> {
    const response = await apiClient.post<AttendanceResponse>(
      '/attendance/manual',
      request
    );
    return response;
  },

  /**
   * Get today's attendance status for employee
   */
  async getTodayAttendance(employeeNo: number): Promise<AttendanceResponse | null> {
    // Use local date instead of UTC to avoid timezone issues
    const today = getTodayLocalDate();
    const response = await apiClient.get<AttendanceResponse | null>(
      `/attendance/today?employeeNo=${employeeNo}&date=${today}`
    );
    return response;
  },

  /**
   * Get all attendance records with optional filters
   * Used for the attendance tracking page
   */
  async getAllAttendance(params?: AttendanceQueryParams): Promise<AttendanceListResponse> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.employeeNo) queryParams.append('employeeNo', params.employeeNo.toString());
    if (params?.projectCode) queryParams.append('projectCode', params.projectCode.toString());
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortDirection) queryParams.append('sortDirection', params.sortDirection);

    const response = await apiClient.get<AttendanceListResponse>(
      `/attendance/list?${queryParams.toString()}`
    );
    return response;
  },

  /**
   * Get employee timesheet for a specific month
   * Returns day-by-day attendance calendar with status
   */
  async getEmployeeTimesheet(employeeNo: number, month: string): Promise<EmployeeTimesheet> {
    const response = await apiClient.get<EmployeeTimesheet>(
      `/attendance/timesheet?employeeNo=${employeeNo}&month=${month}`
    );
    return response;
  },

  /**
   * Get employee daily overview for dashboard
   */
  async getDailyOverview(employeeNo?: number): Promise<DailyOverviewDto> {
    const queryParams = new URLSearchParams();
    if (employeeNo) queryParams.append('employeeNo', employeeNo.toString());

    const response = await apiClient.get<DailyOverviewDto>(
      `/attendance/daily-overview?${queryParams.toString()}`
    );
    return response;
  },
};

/**
 * EmployeeTimesheet response from backend - matches TimesheetResponse DTO
 */
export interface EmployeeTimesheet {
  employeeNo: number;
  employeeName: string;
  month: string; // YYYY-MM format
  totalDays: number;
  present: number;
  absent: number;
  onLeave: number;
  late: number;
  weekends: number;
  totalOvertimeHours: number;
  totalLateHours: number;
  days: TimesheetDay[];
}

export interface TimesheetDay {
  date: string; // ISO date string
  day: number; // Day of month (1-31)
  status: string; // Present, Absent, Leave, Weekend, Late
  color: string; // Hex color for UI
  textColor: string; // Hex color for text
  entryTime?: string | null; // Optional: entry time if present
  exitTime?: string | null; // Optional: exit time if present
  workingHours?: number | null; // Optional: hours worked
  overtimeHours?: number | null; // Optional: overtime hours
  isLate?: boolean | null; // Optional: was late arrival
}

/**
 * ManualAttendanceRequestResponse from backend - matches ManualAttendanceRequestController.ManualAttendanceRequestDetailsResponse
 */
export interface ManualAttendanceRequestResponse {
  requestId: number;
  employeeNo: number;
  employeeName?: string;
  attendanceDate: string;
  entryTime: string; // HH:mm format
  exitTime: string; // HH:mm format
  reason: string;
  transStatus: string; // N, A, R
  statusDescription?: string;
  requestDate: string;
  requestedBy: number;
  nextApproval?: number | null;
  nextApproverName?: string | null;
  nextAppLevel?: number | null;
  approvedBy?: number | null;
  approvedByName?: string | null;
  approvedDate?: string | null;
  rejectionReason?: string | null;
}

export interface SubmitManualAttendanceRequestParams {
  employeeNo: number;
  attendanceDate: string; // ISO date string
  entryTime: string; // HH:mm format
  exitTime: string; // HH:mm format
  reason: string;
}

export interface ManualAttendanceQueryParams {
  employeeNo?: number;
  transStatus?: string; // N, A, or R
  startDate?: string; // filters by attendanceDate
  endDate?: string; // filters by attendanceDate
  entryTimeFrom?: string; // HH:mm - filter entry time from
  entryTimeTo?: string; // HH:mm - filter entry time to
  exitTimeFrom?: string; // HH:mm - filter exit time from
  exitTimeTo?: string; // HH:mm - filter exit time to
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface ApproveManualAttendanceRequestParams {
  approverNo: number;
}

export interface RejectManualAttendanceRequestParams {
  approverNo: number;
  rejectionReason: string;
}

export const manualAttendanceRequestApi = {
  /**
   * Submit new manual attendance request
   */
  async submitManualAttendanceRequest(
    request: SubmitManualAttendanceRequestParams
  ): Promise<ManualAttendanceRequestResponse> {
    const response = await apiClient.post<ManualAttendanceRequestResponse>(
      '/manual-attendance/submit',
      request
    );
    return response;
  },

  /**
   * Get all manual attendance requests with optional filters and pagination
   */
  async getAllManualAttendanceRequests(
    params?: ManualAttendanceQueryParams
  ): Promise<PageResponse<ManualAttendanceRequestResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.transStatus) queryParams.append('transStatus', params.transStatus);
    if (params?.employeeNo) queryParams.append('employeeNo', params.employeeNo.toString());
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.entryTimeFrom) queryParams.append('entryTimeFrom', params.entryTimeFrom);
    if (params?.entryTimeTo) queryParams.append('entryTimeTo', params.entryTimeTo);
    if (params?.exitTimeFrom) queryParams.append('exitTimeFrom', params.exitTimeFrom);
    if (params?.exitTimeTo) queryParams.append('exitTimeTo', params.exitTimeTo);
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortDirection) queryParams.append('sortDirection', params.sortDirection);

    // apiClient.get already unwraps ApiResponse, so we get PageResponse directly
    const response = await apiClient.get<PageResponse<ManualAttendanceRequestResponse>>(
      `/manual-attendance/list?${queryParams.toString()}`
    );
    return response;
  },

  /**
   * Get manual attendance request by ID
   */
  async getManualAttendanceRequestById(requestId: number): Promise<ManualAttendanceRequestResponse> {
    const response = await apiClient.get<ManualAttendanceRequestResponse>(
      `/manual-attendance/${requestId}`
    );
    return response;
  },

  /**
   * Approve manual attendance request
   */
  async approveManualAttendanceRequest(
    requestId: number,
    request: ApproveManualAttendanceRequestParams
  ): Promise<ManualAttendanceRequestResponse> {
    const response = await apiClient.post<ManualAttendanceRequestResponse>(
      `/manual-attendance/${requestId}/approve`,
      request
    );
    return response;
  },

  /**
   * Reject manual attendance request
   */
  async rejectManualAttendanceRequest(
    requestId: number,
    request: RejectManualAttendanceRequestParams
  ): Promise<ManualAttendanceRequestResponse> {
    const response = await apiClient.post<ManualAttendanceRequestResponse>(
      `/manual-attendance/${requestId}/reject`,
      request
    );
    return response;
  },
};

// ==================== Attendance Day Closure ====================

/**
 * AttendanceDayClosureResponse from backend - matches AttendanceDayClosureController.AttendanceDayClosureDetailsResponse
 */
export interface AttendanceDayClosureResponse {
  closureId: number;
  attendanceDate: string; // ISO date string
  isClosed: boolean;
  closedBy?: number | null;
  closedByName?: string | null;
  closedDate?: string | null; // ISO datetime string
  reopenedBy?: number | null;
  reopenedByName?: string | null;
  reopenedDate?: string | null; // ISO datetime string
  notes?: string | null;
}

export interface AttendanceClosureQueryParams {
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  isClosed?: string; // Y or N
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface CloseAttendanceDayRequestParams {
  attendanceDate: string; // ISO date string
  closedBy?: number;
  notes?: string;
}

export interface ReopenAttendanceDayRequestParams {
  attendanceDate: string; // ISO date string
  reopenedBy?: number;
  notes?: string;
}

export const attendanceClosureApi = {
  /**
   * Get all attendance day closures with optional filters and pagination
   */
  async getAllAttendanceClosures(
    params?: AttendanceClosureQueryParams
  ): Promise<PageResponse<AttendanceDayClosureResponse>> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.isClosed) queryParams.append('isClosed', params.isClosed);
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortDirection) queryParams.append('sortDirection', params.sortDirection);

    // apiClient.get already unwraps ApiResponse, so we get PageResponse directly
    const response = await apiClient.get<PageResponse<AttendanceDayClosureResponse>>(
      `/attendance-closure/list?${queryParams.toString()}`
    );
    return response;
  },

  /**
   * Get attendance closure for a specific date
   */
  async getAttendanceClosureByDate(date: string): Promise<AttendanceDayClosureResponse | null> {
    const response = await apiClient.get<AttendanceDayClosureResponse | null>(
      `/attendance-closure/${date}`
    );
    return response;
  },

  /**
   * Close attendance for a specific date
   */
  async closeAttendanceDay(
    request: CloseAttendanceDayRequestParams
  ): Promise<AttendanceDayClosureResponse> {
    const response = await apiClient.post<AttendanceDayClosureResponse>(
      '/attendance-closure/close',
      request
    );
    return response;
  },

  /**
   * Reopen attendance for a specific date
   */
  async reopenAttendanceDay(
    request: ReopenAttendanceDayRequestParams
  ): Promise<AttendanceDayClosureResponse> {
    const response = await apiClient.post<AttendanceDayClosureResponse>(
      '/attendance-closure/reopen',
      request
    );
    return response;
  },
};


