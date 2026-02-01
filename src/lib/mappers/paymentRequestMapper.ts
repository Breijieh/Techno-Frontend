// Payment Request Data Mapper
// Maps between backend PaymentRequestResponse and frontend ProjectPaymentRequest

import type { ProjectPaymentRequest } from '@/types';

/**
 * Backend PaymentRequestResponse interface matching the Java DTO
 */
export interface BackendPaymentRequestResponse {
  requestNo: number;
  projectCode: number;
  projectName?: string;
  supplierCode: number;
  supplierName: string;
  requestDate: string; // LocalDate format: YYYY-MM-DD
  paymentAmount: number | string; // BigDecimal from backend
  paymentPurpose: string;
  transStatus: 'P' | 'A' | 'R';
  nextApproval?: number;
  nextApproverName?: string;
  nextAppLevel?: number;
  approvedBy?: number;
  approverName?: string;
  approvedDate?: string; // LocalDateTime format: ISO string
  rejectionReason?: string;
  requestedBy: number;
  requesterName?: string;
  attachmentPath?: string;
  isProcessed: 'Y' | 'N';
  isDeleted: 'Y' | 'N';
  // Calculated fields
  isPending?: boolean;
  isApproved?: boolean;
  isRejected?: boolean;
  isProcessedFlag?: boolean;
  // Audit fields
  createdDate?: string; // LocalDateTime format: ISO string
  createdBy?: number;
  modifiedDate?: string; // LocalDateTime format: ISO string
  modifiedBy?: number;
}

/**
 * Map backend PaymentRequestResponse to frontend ProjectPaymentRequest
 */
export function mapPaymentRequestResponseToProjectPaymentRequest(
  response: BackendPaymentRequestResponse
): ProjectPaymentRequest {
  // Helper to convert date strings to Date objects
  const parseDate = (dateStr: string | undefined): Date | undefined => {
    if (!dateStr) return undefined;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? undefined : date;
  };

  // Convert paymentAmount (BigDecimal) to number
  const paymentAmount = typeof response.paymentAmount === 'string'
    ? parseFloat(response.paymentAmount)
    : response.paymentAmount;

  return {
    requestNo: response.requestNo,
    projectCode: response.projectCode,
    projectName: response.projectName,
    supplierCode: response.supplierCode,
    supplierName: response.supplierName,
    requestDate: parseDate(response.requestDate) || new Date(),
    paymentAmount: paymentAmount || 0,
    paymentPurpose: response.paymentPurpose || '',
    transStatus: response.transStatus || 'P',
    nextApproval: response.nextApproval,
    nextApproverName: response.nextApproverName,
    nextAppLevel: response.nextAppLevel,
    approvedBy: response.approvedBy,
    approverName: response.approverName,
    approvedDate: parseDate(response.approvedDate),
    rejectionReason: response.rejectionReason,
    requestedBy: response.requestedBy,
    requesterName: response.requesterName,
    attachmentPath: response.attachmentPath,
    isProcessed: response.isProcessed || 'N',
    isDeleted: response.isDeleted || 'N',
    // Calculated fields
    isPending: response.isPending,
    isApproved: response.isApproved,
    isRejected: response.isRejected,
    isProcessedFlag: response.isProcessedFlag,
    // Audit fields
    createdDate: parseDate(response.createdDate),
    createdBy: response.createdBy,
    modifiedDate: parseDate(response.modifiedDate),
    modifiedBy: response.modifiedBy,
  };
}

/**
 * Map array of backend PaymentRequestResponse to frontend ProjectPaymentRequest[]
 */
export function mapPaymentRequestResponseArray(
  responses: BackendPaymentRequestResponse[]
): ProjectPaymentRequest[] {
  return responses.map(mapPaymentRequestResponseToProjectPaymentRequest);
}

/**
 * Get status display text from transStatus
 */
export function getTransStatusDisplay(transStatus: 'P' | 'A' | 'R' | string): string {
  switch (transStatus) {
    case 'P':
      return 'قيد الموافقة';
    case 'A':
      return 'موافق عليه';
    case 'R':
      return 'مرفوض';
    default:
      return 'غير معروف';
  }
}

/**
 * Get status color for UI display
 */
export function getTransStatusColor(transStatus: 'P' | 'A' | 'R' | string): {
  bg: string;
  text: string;
} {
  switch (transStatus) {
    case 'P':
      return { bg: '#FEF3C7', text: '#92400E' }; // Yellow
    case 'A':
      return { bg: '#D1FAE5', text: '#065F46' }; // Green
    case 'R':
      return { bg: '#FEE2E2', text: '#991B1B' }; // Red
    default:
      return { bg: '#F3F4F6', text: '#6B7280' }; // Gray
  }
}

/**
 * Get approval level display text
 */
export function getApprovalLevelDisplay(level?: number): string {
  if (!level) return 'غير متاح';
  switch (level) {
    case 1:
      return 'مدير المشروع';
    case 2:
      return 'المدير الإقليمي';
    case 3:
      return 'مدير المالية';
    default:
      return `المستوى ${level}`;
  }
}
