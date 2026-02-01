// Project Data Mapper
// Maps between frontend Project type and backend ProjectRequest/ProjectResponse

import type { Project } from '@/types';
import type { ProjectResponse } from '@/lib/api/projects';

/**
 * Backend ProjectRequest interface matching the Java DTO
 */
export interface BackendProjectRequest {
  projectName: string;
  projectAddress?: string;
  startDate: string; // YYYY-MM-DD format
  endDate: string; // YYYY-MM-DD format
  totalProjectAmount: number;
  projectProfitMargin?: number;
  projectLatitude?: number;
  projectLongitude?: number;
  gpsRadiusMeters?: number;
  requireGpsCheck?: string; // 'Y' or 'N'
  noOfPayments?: number;
  firstDownPaymentDate?: string; // YYYY-MM-DD format
  projectMgr?: number; // Note: backend uses projectMgr, not projectManagerId
  technoSuffix?: string;
  projectStatus?: string; // 'ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED'
  scheduleId?: number; // Time schedule ID to assign to this project
}

/**
 * Map frontend Project type to backend ProjectRequest
 * Backend expects different field names and formats
 */
export function mapProjectToProjectRequest(project: Partial<Project>): BackendProjectRequest {
  // Format dates to YYYY-MM-DD strings (LocalDate format)
  const formatDate = (date: Date | string | null | undefined): string | undefined => {
    if (!date) return undefined;
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return undefined;
    return d.toISOString().split('T')[0];
  };

  // Convert projectProfitMargin to number (BigDecimal)
  const profitMargin = project.projectProfitMargin !== undefined && project.projectProfitMargin !== null
    ? Number(project.projectProfitMargin)
    : undefined;

  // Convert totalProjectAmount to number
  const totalAmount = project.totalProjectAmount !== undefined && project.totalProjectAmount !== null
    ? Number(project.totalProjectAmount)
    : 0;

  // Determine GPS check requirement - if GPS coordinates are provided, require check
  // Backend validation: if any GPS field is provided, all must be provided
  // Frontend validation should catch partial GPS data before submission
  const hasLatitude = project.projectLatitude !== undefined && project.projectLatitude !== null;
  const hasLongitude = project.projectLongitude !== undefined && project.projectLongitude !== null;
  const hasRadius = project.attendanceRadius !== undefined && project.attendanceRadius !== null;

  // Convert GPS values to numbers (backend will validate consistency)
  const finalLatitude = hasLatitude ? Number(project.projectLatitude) : undefined;
  const finalLongitude = hasLongitude ? Number(project.projectLongitude) : undefined;
  const finalRadius = hasRadius ? Number(project.attendanceRadius) : undefined;

  // Set requireGpsCheck to 'Y' if all GPS fields are provided
  const requireGpsCheck = (finalLatitude && finalLongitude && finalRadius) ? 'Y' : undefined;

  return {
    // Backend expects projectName (Arabic name)
    projectName: project.projectName || '',
    projectAddress: project.projectAddress || '',
    startDate: formatDate(project.startDate) || '',
    endDate: formatDate(project.endDate) || '',
    totalProjectAmount: totalAmount,
    projectProfitMargin: profitMargin,
    projectLatitude: finalLatitude,
    projectLongitude: finalLongitude,
    // Backend uses gpsRadiusMeters, not attendanceRadius
    gpsRadiusMeters: finalRadius,
    requireGpsCheck,
    // Backend uses noOfPayments, not numberOfPayments
    noOfPayments: project.numberOfPayments !== undefined && project.numberOfPayments !== null
      ? Number(project.numberOfPayments)
      : undefined,
    firstDownPaymentDate: formatDate(project.firstDownPaymentDate),
    // Backend uses projectMgr, not projectManagerId
    projectMgr: project.projectManagerId && project.projectManagerId !== 0
      ? Number(project.projectManagerId)
      : undefined,
    // technoSuffix removed - not needed
    // Backend uses projectStatus, not status
    projectStatus: project.status || 'ACTIVE',
    // Include scheduleId if provided
    scheduleId: (project as any).scheduleId && (project as any).scheduleId !== 0
      ? Number((project as any).scheduleId)
      : undefined,
  };
}

/**
 * Map backend ProjectResponse to frontend Project type
 */
export function mapProjectResponseToProject(response: ProjectResponse): Project {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = response as any;
  return {
    projectCode: response.projectCode || 0,
    projectName: response.projectName || '',
    projectAddress: response.projectAddress || '',
    startDate: response.startDate ? new Date(response.startDate) : new Date(),
    endDate: response.endDate ? new Date(response.endDate) : new Date(),
    totalProjectAmount: response.totalProjectAmount ? Number(response.totalProjectAmount) : 0,
    projectProfitMargin: response.projectProfitMargin ? Number(response.projectProfitMargin) : undefined,
    projectGoogleMap: response.projectGoogleMap,
    projectLongitude: response.projectLongitude ? Number(response.projectLongitude) : undefined,
    projectLatitude: response.projectLatitude ? Number(response.projectLatitude) : undefined,
    attendanceRadius: r.gpsRadiusMeters || r.attendanceRadius,
    numberOfPayments: r.noOfPayments || r.numberOfPayments,
    firstDownPaymentDate: response.firstDownPaymentDate ? new Date(response.firstDownPaymentDate) : undefined,
    projectManagerId: r.projectMgr || r.projectManagerId || 0,
    technoSuffix: r.technoSuffix,
    status: (r.projectStatus || r.status || 'ACTIVE') as 'ACTIVE' | 'COMPLETED' | 'ON_HOLD',
    scheduleId: response.scheduleId || r.scheduleId,
  };
}
