// System Logs API Service

import { apiClient } from './client';
import type { PageRequest } from './types';
import type { SystemLog } from '@/types';

export interface SystemLogResponse {
  logId: number;
  userId?: number; // Nullable for system events
  actionType: string;
  module: string;
  description: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG';
  timestamp: string; // LocalDateTime from backend (ISO string)
  ipAddress?: string;
}

export interface SystemLogListResponse {
  content: SystemLogResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface SystemLogListParams extends PageRequest {
  level?: 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG' | 'all';
  module?: string;
  actionType?: string;
  fromDate?: string;
  toDate?: string;
}

export const systemLogsApi = {
  /**
   * Get all system logs with pagination and optional filters
   */
  async getAllLogs(params?: SystemLogListParams): Promise<SystemLogListResponse> {
    const queryParams = new URLSearchParams();

    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());
    if (params?.level && params.level !== 'all') queryParams.append('level', params.level);
    if (params?.module) queryParams.append('module', params.module);
    if (params?.actionType) queryParams.append('actionType', params.actionType);
    if (params?.fromDate) queryParams.append('fromDate', params.fromDate);
    if (params?.toDate) queryParams.append('toDate', params.toDate);

    const query = queryParams.toString();
    const response = await apiClient.get<SystemLogListResponse>(
      `/system-logs${query ? `?${query}` : ''}`
    );
    return response;
  },

  /**
   * Get system log by ID
   */
  async getLogById(id: number): Promise<SystemLogResponse> {
    const response = await apiClient.get<SystemLogResponse>(`/system-logs/${id}`);
    return response;
  },
};

/**
 * Map backend SystemLogResponse to frontend SystemLog format
 */
export function mapBackendToFrontend(response: SystemLogResponse): SystemLog {
  return {
    logId: response.logId,
    userId: response.userId != null ? response.userId.toString() : '', // Convert Long to String, empty string if null
    actionType: response.actionType,
    module: response.module,
    description: response.description,
    level: response.level,
    timestamp: new Date(response.timestamp), // Convert ISO string to Date object
    ipAddress: response.ipAddress,
  };
}

