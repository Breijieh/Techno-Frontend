// Labor API Service

import { apiClient } from './client';


export interface LaborRequestDto {
  projectCode: number;
  startDate: string;
  endDate: string;
  notes?: string;
  details: LaborRequestDetailDto[];
}

export interface LaborRequestDetailDto {
  sequenceNo: number;
  jobTitleAr: string;
  jobTitleEn: string;
  quantity: number;
  dailyRate: number;
  notes?: string;
}

export interface LaborRequestResponse {
  requestNo: number;
  projectCode: number;
  projectName?: string;
  requestDate: string;
  startDate: string;
  endDate: string;
  requestStatus: string;
  notes?: string;
  requestedBy: number;
  requestedByName?: string;
  approvedBy?: number;
  approvedByName?: string;
  approvalDate?: string;
  // Workflow fields
  transStatus?: string; // P, A, R
  nextApproval?: number;
  nextApproverName?: string;
  nextAppLevel?: number;
  approverName?: string;

  details: LaborRequestDetailResponse[];
  totalPositions?: number;
  totalAssigned?: number;
  remainingPositions?: number;
  createdDate?: string;
  createdBy?: number;
  modifiedDate?: string;
  modifiedBy?: number;
}

export interface LaborRequestDetailResponse {
  requestNo: number;
  sequenceNo: number;
  jobTitleAr: string;
  jobTitleEn: string;
  quantity: number;
  dailyRate: number;
  assignedCount: number;
  remainingCount: number;
  notes?: string;
  isFullyAssigned: boolean;
}

export interface LaborRequestUpdateDto {
  startDate?: string;
  endDate?: string;
  notes?: string;
  details?: LaborRequestDetailDto[];
}

export interface LaborRequestApprovalDto {
  notes?: string;
}

export interface LaborRequestRejectionDto {
  reason: string;
}

export interface LaborAssignmentDto {
  employeeNo: number;
  projectCode: number;
  requestNo?: number;
  sequenceNo?: number;
  startDate: string;
  endDate: string;
  dailyRate: number;
  jobTitleAr?: string;
  jobTitleEn?: string;
  notes?: string;
}

export interface LaborAssignmentResponse {
  assignmentNo: number;
  employeeNo: number;
  employeeName?: string;
  projectCode: number;
  projectName?: string;
  requestNo?: number;
  sequenceNo?: number;
  jobTitleEn?: string; // Specialization from linked labor request detail
  jobTitleAr?: string; // Specialization in Arabic
  startDate: string;
  endDate: string;
  dailyRate: number;
  notes?: string;
  totalDays?: number;
  totalCost?: number;
  isActive?: boolean;
  assignmentStatus?: string; // ACTIVE, COMPLETED, CANCELLED
  createdDate?: string;
  createdBy?: number;
  modifiedDate?: string;
  modifiedBy?: number;
}

export const laborApi = {
  /**
   * Get all labor requests
   * Returns all requests regardless of status (OPEN, PARTIAL, CLOSED, CANCELLED)
   */
  async getAllLaborRequests(): Promise<LaborRequestResponse[]> {
    // Use /labor/requests from ahmad/HEAD as it implies full list
    const response = await apiClient.get<LaborRequestResponse[]>(
      '/labor/requests'
    );
    // apiClient.get already unwraps ApiResponse wrapper, so response is LaborRequestResponse[]
    // Ensure we always return an array
    if (Array.isArray(response)) {
      return response;
    }
    console.warn('[Labor API] getAllLaborRequests returned non-array:', response);
    return [];
  },

  /**
   * Get labor request by ID
   */
  async getLaborRequestById(id: number): Promise<LaborRequestResponse> {
    const response = await apiClient.get<LaborRequestResponse>(
      `/labor/requests/${id}`
    );
    return response;
  },

  /**
   * Create a new labor request
   */
  async createLaborRequest(request: LaborRequestDto): Promise<LaborRequestResponse> {
    const response = await apiClient.post<LaborRequestResponse>(
      '/labor/requests',
      request
    );
    return response;
  },

  /**
   * Update labor request
   * Backend expects full LaborRequestDto including projectCode
   */
  async updateLaborRequest(
    id: number,
    data: LaborRequestDto
  ): Promise<LaborRequestResponse> {
    // Try PUT first, if not available, we'll need to add it to backend
    try {
      const response = await apiClient.put<LaborRequestResponse>(
        `/labor/requests/${id}`,
        data
      );
      return response;
    } catch (error: unknown) {
      // If PUT doesn't exist, throw error indicating backend needs implementation
      const apiError = error as { response?: { status?: number } };
      if (apiError?.response?.status === 404 || apiError?.response?.status === 405) {
        throw new Error('نقطة النهاية للتحديث غير متاحة. يحتاج الخادم الخلفي إلى نقطة نهاية PUT /api/labor/requests/{id}');
      }
      throw error;
    }
  },

  /**
   * Approve labor request
   * Note: Backend may not have this endpoint yet - will need implementation
   */
  async approveLaborRequest(id: number, notes?: string): Promise<LaborRequestResponse> {
    try {
      const response = await apiClient.post<LaborRequestResponse>(
        `/labor/requests/${id}/approve`,
        { notes: notes || '' }
      );
      return response;
    } catch (error: unknown) {
      // If endpoint doesn't exist, use workaround: update with approvedBy
      const apiError = error as { response?: { status?: number } };
      if (apiError?.response?.status === 404 || apiError?.response?.status === 405) {
        // Workaround: Get current user and update request
        // For now, throw error indicating backend needs implementation
        throw new Error('نقطة النهاية للموافقة غير متاحة. يحتاج الخادم الخلفي إلى نقطة نهاية POST /api/labor/requests/{id}/approve');
      }
      throw error;
    }
  },

  /**
   * Reject labor request
   * Note: Backend may not have this endpoint yet - will need implementation
   */
  async rejectLaborRequest(id: number, reason: string): Promise<LaborRequestResponse> {
    try {
      const response = await apiClient.post<LaborRequestResponse>(
        `/labor/requests/${id}/reject`,
        { reason }
      );
      return response;
    } catch (error: unknown) {
      // If endpoint doesn't exist, use workaround: update status to CANCELLED
      const apiError = error as { response?: { status?: number } };
      if (apiError?.response?.status === 404 || apiError?.response?.status === 405) {
        // Workaround: Update request status to CANCELLED
        // For now, throw error indicating backend needs implementation
        throw new Error('نقطة النهاية للرفض غير متاحة. يحتاج الخادم الخلفي إلى نقطة نهاية POST /api/labor/requests/{id}/reject');
      }
      throw error;
    }
  },

  /**
   * Get all labor assignments
   */
  async getAllLaborAssignments(): Promise<LaborAssignmentResponse[]> {
    const response = await apiClient.get<LaborAssignmentResponse[]>(
      '/labor/assignments'
    );
    return response;
  },

  /**
   * Get labor assignments by project code
   */
  async getAssignmentsByProject(projectCode: number): Promise<LaborAssignmentResponse[]> {
    const response = await apiClient.get<LaborAssignmentResponse[]>(
      `/labor/assignments/project/${projectCode}`
    );
    return response;
  },

  /**
   * Get labor assignments by employee number
   */
  async getEmployeeAssignments(employeeNo: number): Promise<LaborAssignmentResponse[]> {
    const response = await apiClient.get<LaborAssignmentResponse[]>(
      `/labor/assignments/employee/${employeeNo}`
    );
    return response;
  },

  /**
   * Get labor assignment by ID
   */
  async getLaborAssignmentById(id: number): Promise<LaborAssignmentResponse> {
    const response = await apiClient.get<LaborAssignmentResponse>(
      `/labor/assignments/${id}`
    );
    return response;
  },

  /**
   * Create a new labor assignment
   */
  async createLaborAssignment(assignment: LaborAssignmentDto): Promise<LaborAssignmentResponse> {
    const response = await apiClient.post<LaborAssignmentResponse>(
      '/labor/assignments',
      assignment
    );
    return response;
  },

  /**
   * Update labor assignment
   */
  async updateLaborAssignment(
    id: number,
    data: LaborAssignmentDto
  ): Promise<LaborAssignmentResponse> {
    const response = await apiClient.put<LaborAssignmentResponse>(
      `/labor/assignments/${id}`,
      data
    );
    return response;
  },

  /**
   * Delete labor assignment (soft delete)
   */
  async deleteLaborAssignment(id: number): Promise<void> {
    await apiClient.delete(`/labor/assignments/${id}`);
  },
};
