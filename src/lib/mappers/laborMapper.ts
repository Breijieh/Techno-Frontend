// Labor Data Mappers - Convert between frontend and backend models

import type { TempLaborRequest, TempWorkerAssignment, Employee } from '@/types';
import type {
  LaborRequestResponse,
  LaborRequestDto,
  LaborRequestDetailDto,
  LaborAssignmentResponse,
  LaborAssignmentDto,
  LaborRequestDetailResponse,
} from '@/lib/api/labor';

/**
 * Map backend LaborRequestResponse to frontend TempLaborRequest
 * Creates one TempLaborRequest per detail line (specialization)
 */
export function mapLaborRequestResponseToTempLaborRequest(
  response: LaborRequestResponse,
  detail?: LaborRequestDetailResponse
): TempLaborRequest {
  // If detail is provided, use it; otherwise use first detail or default
  const detailLine = detail || (response.details && response.details.length > 0
    ? response.details[0]
    : null);

  // Map status from backend to frontend
  const frontendStatus = mapStatusBackendToFrontend(
    response.requestStatus,
    response.approvedBy,
    response.approvalDate
  );

  return {
    requestId: response.requestNo,
    requestDate: new Date(response.requestDate),
    specialization: detailLine?.jobTitleEn || 'غير معروف',
    numberOfWorkers: detailLine?.quantity || 0,
    fromDate: new Date(response.startDate),
    toDate: new Date(response.endDate),
    dailyWage: detailLine?.dailyRate ? Number(detailLine.dailyRate) : 0,
    status: frontendStatus,
    // Additional backend fields
    projectCode: response.projectCode,
    projectName: response.projectName,
    requestedByName: response.requestedByName,
    approvedByName: response.approvedByName,
    approvalDate: response.approvalDate ? new Date(response.approvalDate) : undefined,
    notes: response.notes,
    detailSequenceNo: detailLine?.sequenceNo,
    // Workflow fields
    transStatus: response.transStatus as 'P' | 'A' | 'R',
    nextApproval: response.nextApproval,
    nextApproverName: response.nextApproverName,
    nextAppLevel: response.nextAppLevel,
  };
}

/**
 * Map frontend TempLaborRequest to backend LaborRequestDto
 */
export function mapTempLaborRequestToLaborRequestDto(
  request: Partial<TempLaborRequest>,
  projectCode: number
): LaborRequestDto {
  const details: LaborRequestDetailDto[] = [
    {
      sequenceNo: 1,
      jobTitleAr: request.specialization || '',
      jobTitleEn: request.specialization || '',
      quantity: request.numberOfWorkers || 0,
      dailyRate: request.dailyWage || 0,
      notes: undefined,
    },
  ];

  return {
    projectCode,
    startDate: request.fromDate
      ? new Date(request.fromDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    endDate: request.toDate
      ? new Date(request.toDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    notes: request.notes || undefined,
    details,
  };
}

/**
 * Map backend status to frontend status
 */
export function mapStatusBackendToFrontend(
  backendStatus: string,
  approvedBy?: number,
  approvalDate?: string
): 'NEW' | 'APPROVED' | 'REJECTED' {
  if (backendStatus === 'CANCELLED') {
    return 'REJECTED';
  }

  // If has approvedBy, it's approved
  if (approvedBy && approvalDate) {
    return 'APPROVED';
  }

  // OPEN, PARTIAL, CLOSED without approval → NEW
  // But PARTIAL and CLOSED typically mean approved and in progress/completed
  if (backendStatus === 'PARTIAL' || backendStatus === 'CLOSED') {
    return 'APPROVED';
  }

  // OPEN without approval → NEW
  return 'NEW';
}

/**
 * Map frontend status to backend status
 */
export function mapStatusFrontendToBackend(
  frontendStatus: 'NEW' | 'APPROVED' | 'REJECTED'
): string {
  switch (frontendStatus) {
    case 'REJECTED':
      return 'CANCELLED';
    case 'APPROVED':
      return 'OPEN'; // Will be set with approvedBy
    case 'NEW':
    default:
      return 'OPEN';
  }
}

/**
 * Map array of backend responses to frontend requests
 * CRITICAL: Flattens requests - one row per detail line (specialization)
 * If a request has 3 detail lines, it will create 3 TempLaborRequest objects
 */
export function mapLaborRequestResponsesToTempLaborRequests(
  responses: LaborRequestResponse[]
): TempLaborRequest[] {
  const result: TempLaborRequest[] = [];

  for (const response of responses) {
    if (response.details && response.details.length > 0) {
      // Create one TempLaborRequest per detail line
      for (const detail of response.details) {
        result.push(mapLaborRequestResponseToTempLaborRequest(response, detail));
      }
    } else {
      // If no details, create one row with default values
      result.push(mapLaborRequestResponseToTempLaborRequest(response));
    }
  }

  return result;
}

/**
 * Map backend LaborAssignmentResponse to frontend TempWorkerAssignment
 */
export function mapLaborAssignmentResponseToTempWorkerAssignment(
  response: LaborAssignmentResponse,
  employee?: Employee
): TempWorkerAssignment {
  // Determine status - use assignmentStatus if available, otherwise infer from isActive and dates
  let backendStatus = response.assignmentStatus || 'ACTIVE';
  if (!backendStatus) {
    // If assignmentStatus not provided, infer from isActive and dates
    if (response.isActive) {
      backendStatus = 'ACTIVE';
    } else {
      const endDate = new Date(response.endDate);
      const now = new Date();
      backendStatus = endDate < now ? 'COMPLETED' : 'CANCELLED';
    }
  }

  // Map status from backend to frontend
  const frontendStatus = mapStatusBackendToFrontendAssignment(backendStatus);

  // Use employee data if available, otherwise use response data
  const workerName = response.employeeName || employee?.fullName || 'غير معروف';

  // Specialization: prioritize jobTitleEn from backend (request detail or department), then employee department, then fallback
  let specialization = 'عامل عام';
  if (response.jobTitleEn && response.jobTitleEn.trim() !== '') {
    specialization = response.jobTitleEn;
  } else if (employee?.positionTitle && employee.positionTitle.trim() !== '') {
    specialization = employee.positionTitle;
  }

  const nationality = employee?.nationality || 'غير متاح';

  const result: TempWorkerAssignment & { projectName?: string; notes?: string } = {
    workerId: response.assignmentNo, // Use assignmentNo as workerId for now
    workerName,
    specialization,
    nationality,
    startDate: new Date(response.startDate),
    endDate: new Date(response.endDate),
    dailyWage: response.dailyRate ? Number(response.dailyRate) : 0,
    status: frontendStatus,
  };

  // Include additional backend fields that aren't in TempWorkerAssignment type
  if (response.projectName) result.projectName = response.projectName;
  if (response.notes) result.notes = response.notes;

  return result;
}

/**
 * Map frontend TempWorkerAssignment to backend LaborAssignmentDto
 */
export function mapTempWorkerAssignmentToLaborAssignmentDto(
  assignment: Partial<TempWorkerAssignment> & { notes?: string },
  employeeNo: number,
  projectCode: number,
  requestNo?: number
): LaborAssignmentDto {
  return {
    employeeNo,
    projectCode,
    requestNo,
    startDate: assignment.startDate
      ? new Date(assignment.startDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    endDate: assignment.endDate
      ? new Date(assignment.endDate).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    dailyRate: assignment.dailyWage || 0,
    notes: assignment.notes || undefined,
  };
}

/**
 * Map backend assignment status to frontend status
 */
export function mapStatusBackendToFrontendAssignment(
  backendStatus: string
): 'ACTIVE' | 'COMPLETED' | 'TERMINATED' {
  switch (backendStatus) {
    case 'ACTIVE':
      return 'ACTIVE';
    case 'COMPLETED':
      return 'COMPLETED';
    case 'CANCELLED':
      return 'TERMINATED';
    default:
      return 'ACTIVE';
  }
}

/**
 * Map frontend assignment status to backend status
 */
export function mapStatusFrontendToBackendAssignment(
  frontendStatus: 'ACTIVE' | 'COMPLETED' | 'TERMINATED'
): string {
  switch (frontendStatus) {
    case 'ACTIVE':
      return 'ACTIVE';
    case 'COMPLETED':
      return 'COMPLETED';
    case 'TERMINATED':
      return 'CANCELLED';
    default:
      return 'ACTIVE';
  }
}

/**
 * Map array of backend assignment responses to frontend assignments
 */
export function mapLaborAssignmentResponsesToTempWorkerAssignments(
  responses: LaborAssignmentResponse[],
  employees?: Employee[]
): TempWorkerAssignment[] {
  return responses.map(response => {
    // Find matching employee if employees array is provided
    const employee = employees?.find(emp => emp.employeeId === response.employeeNo);
    return mapLaborAssignmentResponseToTempWorkerAssignment(response, employee);
  });
}

