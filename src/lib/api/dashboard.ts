import { apiClient } from './client';
import type {
  DashboardStatsResponse,
  EmployeeDistributionResponse,
  AttendanceOverviewResponse,
  ProjectStatusResponse,
} from './types';

/**
 * Dashboard API service
 * Provides methods to fetch dashboard statistics and chart data
 */
export const dashboardApi = {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStatsResponse> {
    return apiClient.get<DashboardStatsResponse>('/dashboard/stats');
  },

  /**
   * Get employee distribution (Saudi vs Non-Saudi)
   */
  async getEmployeeDistribution(): Promise<EmployeeDistributionResponse> {
    return apiClient.get<EmployeeDistributionResponse>('/dashboard/employee-distribution');
  },

  /**
   * Get attendance overview for chart
   */
  async getAttendanceOverview(): Promise<AttendanceOverviewResponse> {
    return apiClient.get<AttendanceOverviewResponse>('/dashboard/attendance-overview');
  },

  /**
   * Get project status for chart
   */
  async getProjectStatus(): Promise<ProjectStatusResponse> {
    return apiClient.get<ProjectStatusResponse>('/dashboard/project-status');
  },
};

export default dashboardApi;

