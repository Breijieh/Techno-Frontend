// Contract Types API Service

import { apiClient } from './client';

export interface ContractTypeResponse {
  contractTypeCode: string;
  typeName?: string;
  calculateSalary?: string;
  allowSelfService?: string;
  isActive?: string;
  createdDate?: string;
  createdBy?: number;
  modifiedDate?: string;
  modifiedBy?: number;
}

export const contractTypesApi = {
  /**
   * Get all contract types
   */
  async getAllContractTypes(): Promise<ContractTypeResponse[]> {
    const response = await apiClient.get<ContractTypeResponse[]>('/contract-types');
    return response;
  },

  /**
   * Get contract type by code
   */
  async getContractTypeByCode(code: string): Promise<ContractTypeResponse> {
    const response = await apiClient.get<ContractTypeResponse>(`/contract-types/${code}`);
    return response;
  },
};

export default contractTypesApi;

