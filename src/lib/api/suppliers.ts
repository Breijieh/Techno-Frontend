// Suppliers API Service

import { apiClient } from './client';

export interface SupplierResponse {
  supplierId: number;
  supplierName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean; // Boolean from backend
  createdDate: string; // LocalDateTime from backend (ISO string)
  createdBy?: number;
  modifiedDate?: string;
  modifiedBy?: number;
}

export interface SupplierRequest {
  supplierName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive?: boolean; // Boolean for frontend
}

/**
 * Helper function to convert SupplierResponse to frontend Supplier format
 */
export function mapSupplierResponseToFrontend(
  response: SupplierResponse
): {
  supplierId: number;
  supplierName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  isActive: boolean;
  createdDate: Date;
} {
  return {
    supplierId: response.supplierId,
    supplierName: response.supplierName,
    contactPerson: response.contactPerson,
    email: response.email,
    phone: response.phone,
    address: response.address,
    isActive: response.isActive,
    createdDate: response.createdDate ? new Date(response.createdDate) : new Date(),
  };
}

export const suppliersApi = {
  /**
   * Get all suppliers
   */
  async getAllSuppliers(): Promise<SupplierResponse[]> {
    const response = await apiClient.get<SupplierResponse[]>('/suppliers');
    return response;
  },

  /**
   * Get supplier by ID
   */
  async getSupplierById(id: number): Promise<SupplierResponse> {
    const response = await apiClient.get<SupplierResponse>(`/suppliers/${id}`);
    return response;
  },

  /**
   * Create new supplier
   */
  async createSupplier(request: SupplierRequest): Promise<SupplierResponse> {
    const response = await apiClient.post<SupplierResponse>('/suppliers', request);
    return response;
  },

  /**
   * Update supplier
   */
  async updateSupplier(id: number, request: SupplierRequest): Promise<SupplierResponse> {
    const response = await apiClient.put<SupplierResponse>(`/suppliers/${id}`, request);
    return response;
  },

  /**
   * Delete supplier (soft delete)
   */
  async deleteSupplier(id: number): Promise<void> {
    await apiClient.delete(`/suppliers/${id}`);
  },
};

