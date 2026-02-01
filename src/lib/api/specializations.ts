// Specializations (التخصصات) API Service

import { apiClient } from './client';

export interface SpecializationResponse {
  id: number;
  code: string;
  nameAr: string;
  nameEn: string;
  displayOrder?: number;
  isActive?: string;
  createdDate?: string;
  modifiedDate?: string;
}

export interface SpecializationRequest {
  code: string;
  nameAr: string;
  nameEn: string;
  displayOrder?: number;
  isActive?: string;
}

export const specializationsApi = {
  async getAll(activeOnly = true): Promise<SpecializationResponse[]> {
    const response = await apiClient.get<SpecializationResponse[]>(
      `/specializations?activeOnly=${activeOnly}`
    );
    return Array.isArray(response) ? response : [];
  },

  async getById(id: number): Promise<SpecializationResponse> {
    return apiClient.get<SpecializationResponse>(`/specializations/${id}`);
  },

  async getByCode(code: string): Promise<SpecializationResponse> {
    return apiClient.get<SpecializationResponse>(`/specializations/code/${encodeURIComponent(code)}`);
  },

  async create(request: SpecializationRequest): Promise<SpecializationResponse> {
    return apiClient.post<SpecializationResponse>('/specializations', request);
  },

  async update(id: number, request: SpecializationRequest): Promise<SpecializationResponse> {
    return apiClient.put<SpecializationResponse>(`/specializations/${id}`, request);
  },

  async delete(id: number): Promise<void> {
    await apiClient.delete(`/specializations/${id}`);
  },
};
