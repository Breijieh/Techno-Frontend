// Project API Service

import { apiClient } from './client';
import type { PageResponse } from './types';
import type { ProjectDuePayment, ProjectPaymentRequest, TransferRequest, RequestStatus, ProjectPaymentProcess, LaborRequest } from '@/types';
import type { BackendPaymentRequestResponse } from '@/lib/mappers/paymentRequestMapper';
import type { BackendProjectRequest } from '@/lib/mappers/projectMapper';

// Backend TransferResponse interface matching the Java DTO
interface BackendTransferResponse {
  transferNo?: number;
  employeeNo?: number;
  employeeName?: string;
  fromProjectCode?: number;
  fromProjectEnName?: string;
  fromProjectArName?: string;
  toProjectCode?: number;
  toProjectEnName?: string;
  toProjectArName?: string;
  transferDate?: string; // LocalDate format: YYYY-MM-DD
  transferReason?: string;
  remarks?: string;
  transStatus?: string; // P, A, R
  nextApproval?: number;
  nextApprovalName?: string;
  nextAppLevel?: number;
  requestDate?: string;
  requestedBy?: number;
  requestedByName?: string;
  approvedDate?: string;
  approvedBy?: number;
  approvedByName?: string;
  rejectionReason?: string;
  executionStatus?: string;
  executionDate?: string;
  executedBy?: number;
  executedByName?: string;
  createdDate?: string;
  createdBy?: number;
  modifiedDate?: string;
  modifiedBy?: number;
}

export interface ProjectRequest {
  projectName: string;
  projectAddress: string;
  startDate: string;
  endDate: string;
  totalProjectAmount: number;
  projectProfitMargin?: number;
  projectGoogleMap?: string;
  projectLongitude?: number;
  projectLatitude?: number;
  attendanceRadius?: number;
  numberOfPayments?: number;
  firstDownPaymentDate?: string;
  projectManagerId: number;
  technoSuffix?: string;
  scheduleId?: number; // Time schedule ID to assign to this project
}

export interface ProjectResponse {
  projectCode: number;
  projectName: string;
  projectAddress: string;
  startDate: string;
  endDate: string;
  totalProjectAmount: number;
  projectProfitMargin?: number;
  projectGoogleMap?: string;
  projectLongitude?: number;
  projectLatitude?: number;
  attendanceRadius?: number;
  gpsRadiusMeters?: number;
  numberOfPayments?: number;
  noOfPayments?: number;
  firstDownPaymentDate?: string;
  projectManagerId?: number;
  projectMgr?: number;
  projectManagerName?: string;
  technoSuffix?: string;
  status?: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
  projectStatus?: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
  requireGpsCheck?: string;
  hasGpsCoordinates?: boolean;
  scheduleId?: number; // Time schedule ID assigned to this project
}

export interface ProjectSummary {
  projectCode: number;
  projectName: string; // Arabic name from backend
  status: string;
  startDate: string;
  endDate: string;
  totalProjectAmount: number;
  projectManagerName?: string;
  projectMgr?: number; // Manager ID from backend
}

export const projectsApi = {
  /**
   * Get all projects with pagination
   */
  async getAllProjects(params?: {
    page?: number;
    size?: number;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  }): Promise<PageResponse<ProjectSummary>> {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortDirection) queryParams.append('sortDirection', params.sortDirection);

    const query = queryParams.toString();
    const response = await apiClient.get<PageResponse<ProjectSummary>>(
      `/projects${query ? `?${query}` : ''}`
    );
    return response;
  },

  /**
   * Get active projects
   */
  async getActiveProjects(): Promise<ProjectSummary[]> {
    try {
      // Backend returns ApiResponse<List<ProjectSummary>>, but apiClient unwraps it automatically
      const response = await apiClient.get<ProjectSummary[]>('/projects/active');
      console.log('[getActiveProjects] Response:', response);

      // Ensure we return an array
      if (Array.isArray(response)) {
        return response;
      }
      // If response is not an array, it might be wrapped incorrectly
      console.warn('[getActiveProjects] Response is not an array:', response);
      return [];
    } catch (error) {
      console.error('[getActiveProjects] Error:', error);
      return [];
    }
  },

  /**
   * Get ongoing projects
   */
  async getOngoingProjects(): Promise<ProjectSummary[]> {
    const response = await apiClient.get<ProjectSummary[]>('/projects/ongoing');
    return response;
  },

  /**
   * Search projects
   */
  async searchProjects(
    query: string,
    params?: { page?: number; size?: number }
  ): Promise<PageResponse<ProjectSummary>> {
    const queryParams = new URLSearchParams();
    queryParams.append('q', query);
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    if (params?.size !== undefined) queryParams.append('size', params.size.toString());

    const response = await apiClient.get<PageResponse<ProjectSummary>>(
      `/projects/search?${queryParams.toString()}`
    );
    return response;
  },

  /**
   * Get project by ID
   */
  async getProjectById(projectCode: number): Promise<ProjectResponse> {
    const response = await apiClient.get<ProjectResponse>(`/projects/${projectCode}`);
    return response;
  },


  /**
   * Create new project
   */
  async createProject(request: BackendProjectRequest): Promise<ProjectResponse> {
    const response = await apiClient.post<ProjectResponse>('/projects', request);
    return response;
  },

  /**
   * Update project
   */
  async updateProject(projectCode: number, request: Partial<BackendProjectRequest>): Promise<ProjectResponse> {
    const response = await apiClient.put<ProjectResponse>(
      `/projects/${projectCode}`,
      request
    );
    return response;
  },

  /**
   * Get project due payments
   */
  async getProjectDuePayments(projectCode: number): Promise<ProjectDuePayment[]> {
    const response = await apiClient.get<ProjectDuePayment[]>(
      `/projects/${projectCode}/due-payments`
    );
    return response;
  },

  /**
   * Get payment requests for project
   */
  async getPaymentRequests(projectCode?: number): Promise<ProjectPaymentRequest[]> {
    const query = projectCode ? `?projectCode=${projectCode}` : '';
    const response = await apiClient.get<ProjectPaymentRequest[]>(
      `/projects/payment-requests${query}`
    );
    return response;
  },

  /**
   * Create payment request
   * Backend expects: projectCode, supplierCode, requestDate, paymentAmount, paymentPurpose, attachmentPath (optional)
   */
  async createPaymentRequest(request: Partial<ProjectPaymentRequest>): Promise<ProjectPaymentRequest> {
    // Format date to YYYY-MM-DD
    const requestDate = request.requestDate instanceof Date
      ? request.requestDate.toISOString().split('T')[0]
      : request.requestDate
        ? new Date(request.requestDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];

    const backendRequest: {
      projectCode: number;
      supplierCode: number;
      requestDate: string;
      paymentAmount: number;
      paymentPurpose: string;
      attachmentPath?: string;
    } = {
      projectCode: Number(request.projectCode || 0),
      supplierCode: Number(request.supplierCode || 0),
      requestDate,
      paymentAmount: Number(request.paymentAmount || 0),
      paymentPurpose: request.paymentPurpose || '',
      ...(request.attachmentPath && { attachmentPath: request.attachmentPath }),
    };

    console.log('[API] createPaymentRequest request:', backendRequest);

    try {
      const { mapPaymentRequestResponseToProjectPaymentRequest } = await import('@/lib/mappers/paymentRequestMapper');
      const response = await apiClient.post<BackendPaymentRequestResponse>(
        '/payment-requests',
        backendRequest
      );

      console.log('[API] createPaymentRequest response:', response);
      return mapPaymentRequestResponseToProjectPaymentRequest(response);
    } catch (error: unknown) {
      console.error('[API] createPaymentRequest error:', error);
      throw error;
    }
  },

  /**
   * Get transfer requests
   * Note: Backend uses /api/transfers
   * This is an alias for getAllTransferRequests
   */
  async getTransferRequests(employeeNo?: number): Promise<TransferRequest[]> {
    if (employeeNo) {
      const response = await apiClient.get<TransferRequest[]>(
        `/transfers/employee/${employeeNo}`
      );
      return response;
    } else {
      // Get all by combining pending and approved-pending
      const [pending, approvedPending] = await Promise.all([
        apiClient.get<TransferRequest[]>('/transfers/pending').catch(() => []),
        apiClient.get<TransferRequest[]>('/transfers/approved-pending').catch(() => [])
      ]);
      return [...(pending || []), ...(approvedPending || [])];
    }
  },

  /**
   * Approve transfer request
   */
  async approveTransfer(requestId: number): Promise<TransferRequest> {
    const response = await apiClient.post<TransferRequest>(
      `/transfers/${requestId}/approve`
    );
    return response;
  },

  /**
   * Reject transfer request
   */
  async rejectTransfer(requestId: number, reason: string): Promise<TransferRequest> {
    const response = await apiClient.post<TransferRequest>(
      `/transfers/${requestId}/reject`,
      { reason }
    );
    return response;
  },

  /**
   * Delete project (deactivate)
   */
  async deleteProject(projectCode: number): Promise<void> {
    await apiClient.delete(`/projects/${projectCode}`);
  },

  /**
   * Get all payment schedules for a project or all projects
   */
  async getProjectPayments(projectCode: number): Promise<ProjectDuePayment[]> {
    try {
      // apiClient automatically unwraps ApiResponse, so response is already the data array
      const response = await apiClient.get<ProjectDuePayment[]>(
        `/projects/${projectCode}/payments`
      );
      // Ensure we return an array
      if (Array.isArray(response)) {
        return response;
      }
      // If response is not an array, it might be wrapped or have a different structure
      console.warn(`[API] getProjectPayments(${projectCode}) response is not an array:`, response);
      return [];
    } catch (error: unknown) {
      console.error(`[API] getProjectPayments(${projectCode}) error:`, error);
      throw error; // Re-throw to let caller handle
    }
  },

  /**
   * Add a payment schedule to a project
   */
  async addPaymentSchedule(projectCode: number, data: {
    sequenceNo: number;
    dueDate: string; // YYYY-MM-DD format
    dueAmount: number;
    notes?: string;
  }): Promise<ProjectDuePayment> {
    // Backend validation requires projectCode in request body (even though it's in URL)
    const requestBody: {
      projectCode: number;
      sequenceNo: number;
      dueDate: string;
      dueAmount: number;
      notes?: string;
    } = {
      projectCode: Number(projectCode), // Ensure it's a number
      sequenceNo: Number(data.sequenceNo),
      dueDate: data.dueDate, // Already in YYYY-MM-DD format
      dueAmount: Number(data.dueAmount), // Ensure it's a number
      ...(data.notes && { notes: data.notes }), // Only include if provided
    };

    console.log('[API] addPaymentSchedule request:', requestBody);

    const response = await apiClient.post<ProjectDuePayment>(
      `/projects/${projectCode}/payments`,
      requestBody
    );

    console.log('[API] addPaymentSchedule response:', response);
    return response;
  },

  /**
   * Record a payment against a payment schedule
   */
  async recordPayment(paymentId: number, data: {
    paymentAmount: number;
    paymentDate: string;
    notes?: string;
  }): Promise<ProjectDuePayment> {
    const response = await apiClient.post<ProjectDuePayment>(
      `/projects/payments/${paymentId}/record`,
      data
    );
    return response;
  },

  /**
   * Update payment schedule
   */
  async updatePaymentSchedule(paymentId: number, data: {
    dueDate?: string;
    dueAmount?: number;
    notes?: string;
  }): Promise<ProjectDuePayment> {
    const response = await apiClient.put<ProjectDuePayment>(
      `/projects/payments/${paymentId}`,
      data
    );
    return response;
  },

  /**
   * Delete payment schedule
   */
  async deletePaymentSchedule(paymentId: number): Promise<void> {
    await apiClient.delete(
      `/projects/payments/${paymentId}`
    );
  },

  /**
   * Get all due payments (overdue)
   */
  async getOverduePayments(): Promise<ProjectDuePayment[]> {
    const response = await apiClient.get<ProjectDuePayment[]>(
      `/projects/payments/overdue`
    );
    return response;
  },

  /**
   * Get payment requests (all or by project)
   * Note: Backend uses /api/payment-requests, not /api/projects/payment-requests
   */
  async getAllPaymentRequests(projectCode?: number): Promise<ProjectPaymentRequest[]> {
    const { mapPaymentRequestResponseArray } = await import('@/lib/mappers/paymentRequestMapper');

    if (projectCode) {
      const response = await apiClient.get<BackendPaymentRequestResponse[]>(
        `/payment-requests/project/${projectCode}`
      );
      // apiClient already unwraps ApiResponse, so response is the array directly
      return mapPaymentRequestResponseArray(Array.isArray(response) ? response : []);
    } else {
      // Try to get all requests first (for Admin and General Manager)
      // This is more efficient than fetching from multiple endpoints
      try {
        const allRequestsResponse = await apiClient.get<BackendPaymentRequestResponse[]>('/payment-requests/all').catch(() => null);

        if (allRequestsResponse && Array.isArray(allRequestsResponse)) {
          console.log('[getAllPaymentRequests] Fetched all requests via /all endpoint:', allRequestsResponse.length);
          return mapPaymentRequestResponseArray(allRequestsResponse);
        }
      } catch {
        console.log('[getAllPaymentRequests] /all endpoint not available, falling back to combined fetch');
      }

      // Fallback: Get all by fetching from multiple endpoints
      // We need to combine:
      // 1. Approved pending (approved but not processed)
      // 2. Pending (requests pending approval for current user)
      // 3. All requests by fetching from all projects (to catch newly created requests)
      try {
        const [approvedPending, pending] = await Promise.all([
          apiClient.get<BackendPaymentRequestResponse[]>('/payment-requests/approved-pending').catch(() => []),
          apiClient.get<BackendPaymentRequestResponse[]>('/payment-requests/pending').catch(() => [])
        ]);

        // apiClient already unwraps ApiResponse, so these should be arrays directly
        const approvedPendingData = Array.isArray(approvedPending) ? approvedPending : [];
        const pendingData = Array.isArray(pending) ? pending : [];

        // Combine and deduplicate by requestNo
        const allRequestsMap = new Map<number, BackendPaymentRequestResponse>();

        [...approvedPendingData, ...pendingData].forEach((req: BackendPaymentRequestResponse) => {
          if (req?.requestNo) {
            allRequestsMap.set(req.requestNo, req);
          }
        });

        // Also fetch requests from all active projects to ensure we get everything
        // This is important because newly created requests might not appear in /pending
        // if the current user is not the next approver
        try {
          const activeProjects = await this.getActiveProjects();
          if (Array.isArray(activeProjects) && activeProjects.length > 0) {
            const projectRequests = await Promise.all(
              activeProjects.slice(0, 50).map((project: ProjectSummary) => // Limit to 50 projects
                apiClient.get<BackendPaymentRequestResponse[]>(`/payment-requests/project/${project.projectCode}`)
                  .then(res => Array.isArray(res) ? res : [])
                  .catch(() => [])
              )
            );

            projectRequests.flat().forEach((req: BackendPaymentRequestResponse) => {
              if (req?.requestNo) {
                allRequestsMap.set(req.requestNo, req);
              }
            });
          }
        } catch {
          console.warn('[getAllPaymentRequests] Error fetching project requests');
          // Continue with what we have
        }

        const allRequests = Array.from(allRequestsMap.values());
        console.log('[getAllPaymentRequests] Total requests found:', allRequests.length);
        return mapPaymentRequestResponseArray(allRequests);
      } catch {
        console.error('[getAllPaymentRequests] Error');
        return [];
      }
    }
  },

  /**
   * Get payment request by ID
   */
  async getPaymentRequestById(requestId: number): Promise<ProjectPaymentRequest> {
    const { mapPaymentRequestResponseToProjectPaymentRequest } = await import('@/lib/mappers/paymentRequestMapper');
    const response = await apiClient.get<BackendPaymentRequestResponse>(
      `/payment-requests/${requestId}`
    );
    return mapPaymentRequestResponseToProjectPaymentRequest(response);
  },

  /**
   * Update payment request
   */
  async updatePaymentRequest(requestId: number, data: Partial<ProjectPaymentRequest>): Promise<ProjectPaymentRequest> {
    const response = await apiClient.put<ProjectPaymentRequest>(
      `/payment-requests/${requestId}`,
      data
    );
    return response;
  },

  /**
   * Approve payment request
   */
  async approvePaymentRequest(requestId: number): Promise<ProjectPaymentRequest> {
    const { mapPaymentRequestResponseToProjectPaymentRequest } = await import('@/lib/mappers/paymentRequestMapper');
    const response = await apiClient.post<BackendPaymentRequestResponse>(
      `/payment-requests/${requestId}/approve`
    );
    return mapPaymentRequestResponseToProjectPaymentRequest(response);
  },

  /**
   * Reject payment request
   */
  async rejectPaymentRequest(requestId: number, reason: string): Promise<ProjectPaymentRequest> {
    const { mapPaymentRequestResponseToProjectPaymentRequest } = await import('@/lib/mappers/paymentRequestMapper');
    const response = await apiClient.post<BackendPaymentRequestResponse>(
      `/payment-requests/${requestId}/reject`,
      { reason }
    );
    return mapPaymentRequestResponseToProjectPaymentRequest(response);
  },

  /**
   * Process payment request
   */
  async processPayment(requestId: number, processData: {
    paymentDate: string;
    paidAmount: number;
    paymentMethod: string;
    referenceNo?: string;
    bankName?: string;
    processNotes?: string;
  }): Promise<void> {
    await apiClient.post<void>(
      `/payment-requests/${requestId}/process`,
      processData
    );
  },

  /**
   * Get payment process records for a request
   */
  async getPaymentProcessRecords(requestId?: number): Promise<ProjectPaymentProcess[]> {
    // Backend may not have a direct endpoint for this
    // Payment process is stored in ProjectPaymentProcess entity
    // We might need to get from payment request details
    if (requestId) {
      await apiClient.get<ProjectPaymentRequest>(
        `/payment-requests/${requestId}`
      );
      // Map payment request to process record format if needed
      return [];
    }
    return [];
  },

  /**
   * Update payment process record
   * Note: Backend may not support direct updates to payment process records
   * This is a placeholder - payment process is typically created once when processing a payment
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async updatePaymentProcess(_processId: number, _data: unknown): Promise<ProjectPaymentProcess> {
    // Note: Payment process records are typically immutable once created
    // If updates are needed, they should be done through payment request updates
    // For now, this will throw an error indicating the operation is not supported
    throw new Error('لا يمكن تحديث سجلات عملية الدفع مباشرة. يرجى تحديث طلب الدفع بدلاً من ذلك');
  },

  /**
   * Get transfer requests (all or by employee)
   * Note: Backend uses /api/transfers, not /api/projects/transfer-requests
   */
  async getAllTransferRequests(employeeNo?: number): Promise<TransferRequest[]> {
    // Helper function to map backend response to frontend format
    const mapToTransferRequest = (backendResponse: BackendTransferResponse): TransferRequest => {
      // Handle date conversion
      const parseDate = (date: string | Date | undefined): Date => {
        if (!date) return new Date();
        if (date instanceof Date) return date;
        if (typeof date === 'string') {
          const parsed = new Date(date);
          return isNaN(parsed.getTime()) ? new Date() : parsed;
        }
        return new Date();
      };

      // Map backend status codes to frontend status: P -> INPROCESS, A -> APPROVED, R -> REJECTED
      const mapStatus = (backendStatus?: string): RequestStatus => {
        if (!backendStatus) return 'NEW';
        if (backendStatus === 'P') return 'INPROCESS';
        if (backendStatus === 'A') return 'APPROVED';
        if (backendStatus === 'R') return 'REJECTED';
        return 'NEW';
      };

      return {
        requestId: backendResponse.transferNo || 0,
        employeeId: backendResponse.employeeNo || 0,
        employeeName: backendResponse.employeeName || backendResponse.employeeName || undefined,
        fromProjectCode: backendResponse.fromProjectCode || 0,
        fromProjectName: backendResponse.fromProjectEnName || backendResponse.fromProjectArName || undefined,
        toProjectCode: backendResponse.toProjectCode || 0,
        toProjectName: backendResponse.toProjectEnName || backendResponse.toProjectArName || undefined,
        requestDate: parseDate(backendResponse.transferDate || backendResponse.requestDate),
        reason: backendResponse.transferReason || backendResponse.remarks || '',
        status: mapStatus(backendResponse.transStatus),
        transStatus: backendResponse.transStatus as 'P' | 'A' | 'R',
        nextApproval: backendResponse.nextApproval,
        nextApproverName: backendResponse.nextApprovalName,
        nextLevel: backendResponse.nextAppLevel,
        requestedBy: backendResponse.requestedBy,
        requestedByName: backendResponse.requestedByName,
      };
    };

    if (employeeNo) {
      // Get transfers for specific employee
      const response = await apiClient.get<BackendTransferResponse[]>(
        `/transfers/employee/${employeeNo}`
      );
      return (Array.isArray(response) ? response : []).map(mapToTransferRequest);
    } else {
      // Use the simple "get all" endpoint
      try {
        const response = await apiClient.get<BackendTransferResponse[]>('/transfers');

        if (Array.isArray(response)) {
          const mappedRequests = response.map(mapToTransferRequest);
          return mappedRequests;
        }

        return [];
      } catch {
        console.error('[getAllTransferRequests] Error fetching all transfers');

        // Fallback to old method if new endpoint fails
        // Get all by combining pending and approved-pending
        const [pending, approvedPending] = await Promise.all([
          apiClient.get<BackendTransferResponse[]>('/transfers/pending').catch(() => []),
          apiClient.get<BackendTransferResponse[]>('/transfers/approved-pending').catch(() => [])
        ]);

        const allPending = [...(Array.isArray(pending) ? pending : []), ...(Array.isArray(approvedPending) ? approvedPending : [])];
        return allPending.map(mapToTransferRequest);
      }
    }
  },

  /**
   * Create transfer request
   * Note: Backend uses /api/transfers, not /api/projects/transfer-requests
   */
  async createTransferRequest(request: Partial<TransferRequest>): Promise<TransferRequest> {
    // Helper function to map backend TransferResponse to frontend TransferRequest
    const mapToTransferRequest = (backendResponse: BackendTransferResponse): TransferRequest => {
      // Handle date conversion
      const parseDate = (date: string | Date | undefined): Date => {
        if (!date) return new Date();
        if (date instanceof Date) return date;
        if (typeof date === 'string') {
          const parsed = new Date(date);
          return isNaN(parsed.getTime()) ? new Date() : parsed;
        }
        return new Date();
      };

      // Map backend status codes to frontend status: P -> INPROCESS, A -> APPROVED, R -> REJECTED
      const mapStatus = (backendStatus?: string): RequestStatus => {
        if (!backendStatus) return 'NEW';
        if (backendStatus === 'P') return 'INPROCESS';
        if (backendStatus === 'A') return 'APPROVED';
        if (backendStatus === 'R') return 'REJECTED';
        return 'NEW';
      };

      return {
        requestId: backendResponse.transferNo || 0,
        employeeId: backendResponse.employeeNo || 0,
        employeeName: backendResponse.employeeName || backendResponse.employeeName || undefined,
        fromProjectCode: backendResponse.fromProjectCode || 0,
        fromProjectName: backendResponse.fromProjectEnName || backendResponse.fromProjectArName || undefined,
        toProjectCode: backendResponse.toProjectCode || 0,
        toProjectName: backendResponse.toProjectEnName || backendResponse.toProjectArName || undefined,
        requestDate: parseDate(backendResponse.requestDate || backendResponse.transferDate),
        reason: backendResponse.transferReason || backendResponse.remarks || '',
        status: mapStatus(backendResponse.transStatus),
        transStatus: backendResponse.transStatus as 'P' | 'A' | 'R',
        nextApproval: backendResponse.nextApproval,
        nextApproverName: backendResponse.nextApprovalName,
        nextLevel: backendResponse.nextAppLevel,
        requestedBy: backendResponse.requestedBy,
        requestedByName: backendResponse.requestedByName,
      };
    };

    // Map frontend TransferRequest to backend TransferRequestDto format
    const formatDate = (date: Date | string | undefined): string => {
      if (!date) return new Date().toISOString().split('T')[0];
      if (date instanceof Date) return date.toISOString().split('T')[0];
      if (typeof date === 'string') {
        // If it's already in YYYY-MM-DD format, return as is
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
        // Otherwise try to parse it
        const parsed = new Date(date);
        return isNaN(parsed.getTime()) ? new Date().toISOString().split('T')[0] : parsed.toISOString().split('T')[0];
      }
      return new Date().toISOString().split('T')[0];
    };

    // Build request object, excluding undefined fields
    const backendRequest: {
      employeeNo?: number;
      fromProjectCode?: number;
      toProjectCode?: number;
      transferDate: string;
      transferReason: string;
    } = {
      employeeNo: request.employeeId,
      fromProjectCode: request.fromProjectCode,
      toProjectCode: request.toProjectCode,
      transferDate: formatDate(request.requestDate),
      transferReason: request.reason || '',
    };

    console.log('[createTransferRequest] Sending request to /transfers:', backendRequest);

    try {
      // apiClient.post automatically unwraps ApiResponse, so we get TransferResponse directly
      // The endpoint should be /transfers (baseURL already includes /api)
      const response = await apiClient.post<BackendTransferResponse>(
        '/transfers',
        backendRequest
      );

      console.log('[createTransferRequest] Received response:', response);

      return mapToTransferRequest(response);
    } catch (error: unknown) {
      // Log full error details for debugging
      const apiError = error as { message?: string; status?: number; errors?: Record<string, string[]> };
      console.error('[createTransferRequest] Full error object:', error);
      console.error('[createTransferRequest] Error details:', {
        message: apiError.message,
        status: apiError.status,
        errors: apiError.errors,
        endpoint: '/transfers',
        fullUrl: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'}/transfers`,
        request: backendRequest,
      });

      // Provide more helpful error messages
      if (apiError.status === 404) {
        const enhancedError = new Error(
          'نقطة النهاية للنقل غير موجودة. يرجى التأكد من أن الخادم الخلفي يعمل وأن TransferController مسجل بشكل صحيح. ' +
          'قد تحتاج إلى إعادة تشغيل الخادم الخلفي.'
        ) as Error & { status?: number; originalError?: unknown };
        enhancedError.status = 404;
        enhancedError.originalError = error;
        throw enhancedError;
      }

      if (apiError.status === 500) {
        // Check if the error message contains clues about approval workflow
        const errorMessage = (apiError.message || '').toLowerCase();
        if (errorMessage.includes('approval') || errorMessage.includes('workflow') || errorMessage.includes('configured') ||
          errorMessage.includes('chain') || errorMessage.includes('proj_transfer')) {
          const enhancedError = new Error(
            'سير عمل الموافقة غير مُكوّن. يحتاج سلسلة الموافقة لـ "PROJ_TRANSFER" إلى الإعداد في تكوين النظام. ' +
            'يرجى الاتصال بمسؤول النظام لتكوين سير عمل موافقة نقل المشروع في قاعدة البيانات.'
          ) as Error & { status?: number; originalError?: unknown };
          enhancedError.status = 500;
          enhancedError.originalError = error;
          throw enhancedError;
        }

        // Check for other common issues
        if (errorMessage.includes('null') || errorMessage.includes('not found')) {
          const enhancedError = new Error(
            'البيانات المطلوبة مفقودة. يرجى التحقق من: ' +
            '1. وجود الموظف وتعيينه للمشروع المصدر، ' +
            '2. وجود كلا المشروعين في النظام، ' +
            '3. وجود تعيين قسم صالح للموظف.'
          ) as Error & { status?: number; originalError?: unknown };
          enhancedError.status = 500;
          enhancedError.originalError = error;
          throw enhancedError;
        }

        // Generic 500 error with more context
        const enhancedError = new Error(
          'حدث خطأ في الخادم أثناء إنشاء طلب النقل. الأسباب الأكثر احتمالاً: ' +
          '1. تكوين سير عمل الموافقة مفقود لـ "PROJ_TRANSFER" في قاعدة البيانات، ' +
          '2. الموظف غير معين بشكل صحيح للمشروع المصدر، ' +
          '3. تكوين القسم أو المشروع مفقود. ' +
          'يرجى التحقق من سجلات الخادم الخلفي للحصول على تفاصيل الخطأ الدقيقة.'
        ) as Error & { status?: number; originalError?: unknown };
        enhancedError.status = 500;
        enhancedError.originalError = error;
        throw enhancedError;
      }

      throw error;
    }
  },

  /**
   * Get labor assignments
   */
  async getLaborAssignments(projectCode?: number): Promise<LaborRequest[]> {
    if (projectCode) {
      const response = await apiClient.get<LaborRequest[]>(
        `/labor/assignments/project/${projectCode}`
      );
      return response;
    } else {
      // Get all assignments - may need to fetch by employee or use a different approach
      // For now, return empty array if no project specified
      return [];
    }
  },

  /**
   * Create labor assignment
   */
  async createLaborAssignment(data: {
    requestNo: number;
    employeeNo: number;
    projectCode: number;
    startDate: string;
    endDate: string;
    dailyRate: number;
  }): Promise<LaborRequest> {
    const response = await apiClient.post<LaborRequest>(
      '/labor/assignments',
      data
    );
    return response;
  },

  /**
   * Update labor assignment
   */
  async updateLaborAssignment(assignmentId: number, data: Partial<LaborRequest>): Promise<LaborRequest> {
    const response = await apiClient.put<LaborRequest>(
      `/labor/assignments/${assignmentId}`,
      data
    );
    return response;
  },

  /**
   * Delete labor assignment
   */
  async deleteLaborAssignment(assignmentId: number): Promise<void> {
    await apiClient.delete(`/labor/assignments/${assignmentId}`);
  },
};

