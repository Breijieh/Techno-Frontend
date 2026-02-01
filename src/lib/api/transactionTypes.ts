// Transaction Types API Service

import { apiClient } from './client';
import type { TransactionType } from '@/types';

export interface TransactionTypeResponse {
  typeCode: number;
  typeName?: string;
  allowanceDeduction: 'A' | 'D'; // A = Allowance, D = Deduction
  isSystemGenerated?: string; // Y or N
  isActive?: string; // Y or N
  createdDate?: string; // LocalDateTime from backend (ISO string)
  createdBy?: string;
}

export interface TransactionTypeRequest {
  typeCode: number;
  typeName: string;
  allowanceDeduction: 'A' | 'D'; // A = Allowance, D = Deduction
  isSystemGenerated: string; // Y or N
  isActive: string; // Y or N
}

export const transactionTypesApi = {
  /**
   * Get all active transaction types
   */
  async getAllTransactionTypes(): Promise<TransactionTypeResponse[]> {
    const response = await apiClient.get<TransactionTypeResponse[]>(
      '/transaction-types'
    );
    return response;
  },

  /**
   * Get all allowance types
   */
  async getAllowanceTypes(): Promise<TransactionTypeResponse[]> {
    const response = await apiClient.get<TransactionTypeResponse[]>(
      '/transaction-types/allowances'
    );
    return response;
  },

  /**
   * Get all deduction types
   */
  async getDeductionTypes(): Promise<TransactionTypeResponse[]> {
    const response = await apiClient.get<TransactionTypeResponse[]>(
      '/transaction-types/deductions'
    );
    return response;
  },

  /**
   * Get transaction type by code
   */
  async getTransactionTypeByCode(code: number): Promise<TransactionTypeResponse> {
    const response = await apiClient.get<TransactionTypeResponse>(
      `/transaction-types/${code}`
    );
    return response;
  },

  /**
   * Create new transaction type
   */
  async createTransactionType(request: TransactionTypeRequest): Promise<TransactionTypeResponse> {
    const response = await apiClient.post<TransactionTypeResponse>(
      '/transaction-types',
      request
    );
    return response;
  },

  /**
   * Update transaction type
   */
  async updateTransactionType(code: number, request: TransactionTypeRequest): Promise<TransactionTypeResponse> {
    const response = await apiClient.put<TransactionTypeResponse>(
      `/transaction-types/${code}`,
      request
    );
    return response;
  },

  /**
   * Delete transaction type (soft delete/deactivate)
   */
  async deleteTransactionType(code: number): Promise<void> {
    await apiClient.delete(`/transaction-types/${code}`);
  },
};

/**
 * Map backend TransactionTypeResponse to frontend TransactionType format
 */
export function mapBackendToFrontend(response: TransactionTypeResponse): TransactionType {
  return {
    transactionCode: response.typeCode,
    transactionNameAr: response.typeName || '',
    transactionNameEn: response.typeName || '',
    transactionType: response.allowanceDeduction === 'A' ? 'ALLOWANCE' : 'DEDUCTION',
    isSystem: response.isSystemGenerated === 'Y',
  };
}

/**
 * Map frontend TransactionType data to backend TransactionTypeRequest format
 */
export function mapFrontendToBackend(
  data: Partial<TransactionType>,
  typeCode: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _isNew?: boolean
): TransactionTypeRequest {
  return {
    typeCode,
    typeName: data.transactionNameAr || data.transactionNameEn || '',
    allowanceDeduction: data.transactionType === 'DEDUCTION' ? 'D' : 'A',
    isSystemGenerated: data.isSystem ? 'Y' : 'N',
    isActive: 'Y', // Always set to active for new/updated records
  };
}



