// Salary Structure API Service

import { apiClient } from './client';
import type { AllowancePercentage } from '@/types';

/**
 * Backend DTO for salary breakdown response
 */
export interface SalaryBreakdownResponse {
  serNo: number;
  employeeCategory: 'S' | 'F'; // 'S' = Saudi, 'F' = Foreign
  transTypeCode: number;
  transTypeName?: string;  // Backend returns 'transTypeName' (unified field)
  salaryPercentage: number; // BigDecimal from backend (0.0-1.0, e.g., 0.8340 = 83.4%)
  isDeleted: 'Y' | 'N';
}

/**
 * Backend DTO for salary breakdown request
 */
export interface SalaryBreakdownRequest {
  employeeCategory: 'S' | 'F';
  transTypeCode: number;
  salaryPercentage: number; // BigDecimal (0.0-1.0)
}

/**
 * Salary Structure API service
 */
export const salaryStructureApi = {
  /**
   * Get all active salary breakdown percentages
   */
  async getAllBreakdowns(): Promise<SalaryBreakdownResponse[]> {
    const response = await apiClient.get<SalaryBreakdownResponse[]>('/salary-structure');
    return response;
  },

  /**
   * Get salary breakdown for Saudi employees
   */
  async getSaudiBreakdown(): Promise<SalaryBreakdownResponse[]> {
    const response = await apiClient.get<SalaryBreakdownResponse[]>('/salary-structure/saudi');
    return response;
  },

  /**
   * Get salary breakdown for Foreign employees
   */
  async getForeignBreakdown(): Promise<SalaryBreakdownResponse[]> {
    const response = await apiClient.get<SalaryBreakdownResponse[]>('/salary-structure/foreign');
    return response;
  },

  /**
   * Create or update salary breakdown percentage
   * Backend handles both create and update automatically
   */
  async createBreakdown(request: SalaryBreakdownRequest): Promise<SalaryBreakdownResponse> {
    const response = await apiClient.post<SalaryBreakdownResponse>('/salary-structure', request);
    return response;
  },

  /**
   * Delete (soft delete) salary breakdown
   */
  async deleteBreakdown(serNo: number): Promise<void> {
    await apiClient.delete(`/salary-structure/${serNo}`);
  },
};

/**
 * Merge backend breakdowns (separate S/F rows) into frontend format (combined rows)
 * Groups by transaction type and combines Saudi and Foreign percentages
 */
export function mergeBreakdownsToFrontend(breakdowns: SalaryBreakdownResponse[]): AllowancePercentage[] {
  // Group by transTypeCode
  const grouped = breakdowns.reduce((acc, breakdown) => {
    const code = breakdown.transTypeCode;
    if (!acc[code]) {
      acc[code] = {
        saudi: null,
        foreign: null,
        transactionName: breakdown.transTypeName || `Transaction ${code}`,
        transactionCode: code,
      };
    }

    if (breakdown.employeeCategory === 'S') {
      acc[code].saudi = breakdown;
    } else if (breakdown.employeeCategory === 'F') {
      acc[code].foreign = breakdown;
    }

    return acc;
  }, {} as Record<number, { saudi: SalaryBreakdownResponse | null; foreign: SalaryBreakdownResponse | null; transactionName: string; transactionCode: number }>);

  // Convert grouped data to frontend format
  return Object.values(grouped).map((group) => {
    const saudiPercentage = group.saudi
      ? parseFloat((group.saudi.salaryPercentage * 100).toFixed(2))
      : 0;
    const foreignPercentage = group.foreign
      ? parseFloat((group.foreign.salaryPercentage * 100).toFixed(2))
      : 0;

    // Use transactionCode as recordId since backend has separate serNo for S/F
    // Or use the first serNo if available
    const recordId = group.saudi?.serNo || group.foreign?.serNo || group.transactionCode;

    // Consider active if at least one row exists and is not deleted
    const isActive = (group.saudi?.isDeleted === 'N') || (group.foreign?.isDeleted === 'N');

    return {
      recordId,
      transactionCode: group.transactionCode,
      transactionName: group.transactionName,
      saudiPercentage,
      nonSaudiPercentage: foreignPercentage,
      isActive,
      // Store both serNo values for deletion
      saudiSerNo: group.saudi?.serNo,
      foreignSerNo: group.foreign?.serNo,
    } as AllowancePercentage & { saudiSerNo?: number; foreignSerNo?: number };
  });
}

/**
 * Split frontend data (combined row) into two backend requests (S and F)
 */
export function splitFrontendToBackendRequests(
  frontendData: Partial<AllowancePercentage>
): SalaryBreakdownRequest[] {
  const requests: SalaryBreakdownRequest[] = [];

  if (frontendData.transactionCode === undefined) {
    throw new Error('رمز المعاملة مطلوب');
  }

  // Saudi request
  if (frontendData.saudiPercentage !== undefined) {
    const percentage = frontendData.saudiPercentage / 100; // Convert 0-100 to 0-1.0
    requests.push({
      employeeCategory: 'S',
      transTypeCode: frontendData.transactionCode,
      salaryPercentage: parseFloat(percentage.toFixed(4)), // Round to 4 decimal places to match backend precision
    });
  }

  // Foreign request
  if (frontendData.nonSaudiPercentage !== undefined) {
    const percentage = frontendData.nonSaudiPercentage / 100; // Convert 0-100 to 0-1.0
    requests.push({
      employeeCategory: 'F',
      transTypeCode: frontendData.transactionCode,
      salaryPercentage: parseFloat(percentage.toFixed(4)), // Round to 4 decimal places to match backend precision
    });
  }

  return requests;
}

/**
 * Map backend response to frontend format (for single breakdown)
 */
export function mapBackendToFrontend(breakdown: SalaryBreakdownResponse): AllowancePercentage {
  return {
    recordId: breakdown.serNo,
    transactionCode: breakdown.transTypeCode,
    transactionName: breakdown.transTypeName || `Transaction ${breakdown.transTypeCode}`,
    saudiPercentage: breakdown.employeeCategory === 'S'
      ? parseFloat((breakdown.salaryPercentage * 100).toFixed(2))
      : 0,
    nonSaudiPercentage: breakdown.employeeCategory === 'F'
      ? parseFloat((breakdown.salaryPercentage * 100).toFixed(2))
      : 0,
    isActive: breakdown.isDeleted === 'N',
  };
}

