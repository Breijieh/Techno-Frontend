// Warehouse API Service

import { apiClient } from './client';
import type { PageResponse } from './types';
import type {
  // StoreItemCategory,
  // StoreItem,
  // ProjectStore,
  // ItemPO,
  // StoreItemReceivable,
  // StoreItemPayable,
  // StoreItemTransfer,
  // StoreItemBalance,
} from '@/types';

export interface CategoryRequest {
  categoryName: string;
  categoryDescription?: string;
  isActive?: boolean;
}

export interface CategoryResponse {
  categoryCode: number;
  categoryName: string;
  categoryDescription?: string;
  isActive?: boolean;
  itemCount?: number;
  createdDate?: string;
  createdBy?: number;
  modifiedDate?: string;
  modifiedBy?: number;
}

export interface CategorySummary {
  categoryCode: number;
  categoryName: string;
  isActive?: boolean;
  itemCount?: number;
}

export interface ItemRequest {
  categoryCode: number;
  itemName: string;
  unitOfMeasure: string;
  itemDescription?: string;
  reorderLevel?: number;
  isActive?: boolean;
  initialQuantity?: number;
  storeCode?: number;
}

export interface ItemResponse {
  itemCode: number;
  categoryCode: number;
  categoryName?: string;
  itemName: string;
  unitOfMeasure?: string;
  itemDescription?: string;
  reorderLevel?: number;
  isActive?: boolean;
  totalQuantity?: number;
  needsReorder?: boolean;
  createdDate?: string;
  createdBy?: number;
  modifiedDate?: string;
  modifiedBy?: number;
}

export interface StoreRequest {
  projectCode: number;
  storeName: string;
  storeLocation?: string;
  isActive?: boolean;
  storeManagerId?: number;
}

export interface StoreResponse {
  storeCode: number;
  projectCode: number;
  projectName?: string;
  storeName: string;
  storeLocation?: string;
  isActive?: boolean;
  itemCount?: number;
  storeManagerId?: number;
  storeManagerName?: string;
  createdDate?: string;
  createdBy?: number;
  modifiedDate?: string;
  modifiedBy?: number;
}

export interface StoreSummary {
  storeCode: number;
  projectCode: number;
  projectName: string;
  storeName: string;
  storeLocation?: string;
  isActive?: boolean;
  itemCount?: number;
  storeManagerId?: number;
  storeManagerName?: string;
}

// Duplicate BalanceResponse removed


// Purchase Order Interfaces
export interface PurchaseOrderRequest {
  storeCode: number;
  poDate: string; // ISO date string
  expectedDeliveryDate?: string; // ISO date string
  supplierName: string;
  orderLines: PurchaseOrderLineRequest[];
  approvalNotes?: string;
}

export interface PurchaseOrderLineRequest {
  itemCode: number;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface PurchaseOrderResponse {
  poId: number;
  poNumber: string;
  storeCode: number;
  storeName?: string;
  projectCode?: number;
  projectName?: string;
  poDate: string;
  expectedDeliveryDate?: string;
  supplierName: string;
  totalAmount: number;
  poStatus: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  approvalNotes?: string;
  orderLines: PurchaseOrderLineResponse[];
  requestedBy?: number;
  requestedByName?: string;
  createdDate?: string;
  createdBy?: number;
  modifiedDate?: string;
  modifiedBy?: number;
}

export interface PurchaseOrderLineResponse {
  lineId: number;
  itemCode: number;
  itemName?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  notes?: string;
}

export interface PurchaseOrderApprovalRequest {
  notes?: string;
}

export interface PurchaseOrderRejectionRequest {
  notes: string;
}

// Goods Receipt Interfaces
export interface GoodsReceiptRequest {
  storeCode: number;
  receiptDate: string; // ISO date string
  receiptType: 'MANUAL' | 'PO';
  purchaseOrderId?: number;
  notes?: string;
  receiptLines: GoodsReceiptLineRequest[];
}

export interface GoodsReceiptLineRequest {
  itemCode: number;
  quantity: number;
  notes?: string;
}

export interface GoodsReceiptResponse {
  receiptId: number;
  receiptNumber: string;
  storeCode: number;
  storeName?: string;
  projectCode?: number;
  projectName?: string;
  receiptDate: string;
  receiptType: string;
  purchaseOrderId?: number;
  purchaseOrderNumber?: string;
  notes?: string;
  receiptLines: GoodsReceiptLineResponse[];
  receivedBy?: number;
  receivedByName?: string;
  createdDate?: string;
  createdBy?: number;
}

export interface GoodsReceiptLineResponse {
  lineId: number;
  itemCode: number;
  itemName?: string;
  quantity: number;
  unitPrice?: number; // Unit price from PurchaseOrder (if receipt is linked to PO)
  lineTotal?: number; // Calculated total: quantity * unitPrice (if available)
  notes?: string;
}

// Goods Issue Interfaces
export interface GoodsIssueRequest {
  storeCode: number;
  projectCode: number;
  issueDate: string; // ISO date string
  issuedTo?: string;
  purpose?: string;
  notes?: string;
  issueLines: GoodsIssueLineRequest[];
}

export interface GoodsIssueLineRequest {
  itemCode: number;
  quantity: number;
  notes?: string;
}

export interface GoodsIssueResponse {
  issueId: number;
  issueNumber: string;
  storeCode: number;
  storeName?: string;
  projectCode: number;
  projectName?: string;
  issueDate: string;
  issuedTo?: string;
  purpose?: string;
  notes?: string;
  issueLines: GoodsIssueLineResponse[];
  issuedBy?: number;
  issuedByName?: string;
  createdDate?: string;
  createdBy?: number;
}

export interface GoodsIssueLineResponse {
  lineId: number;
  itemCode: number;
  itemName?: string;
  quantity: number;
  notes?: string;
}

// Store Transfer Interfaces
export interface StoreTransferRequest {
  fromStoreCode: number;
  toStoreCode: number;
  transferDate: string; // ISO date string
  notes?: string;
  transferLines: StoreTransferLineRequest[];
}

export interface StoreTransferLineRequest {
  itemCode: number;
  quantity: number;
  notes?: string;
}

export interface StoreTransferResponse {
  transferId: number;
  transferNumber: string;
  fromStoreCode: number;
  fromStoreName?: string;
  fromStoreArName?: string;
  fromStoreEnName?: string;
  fromProjectCode?: number;
  fromProjectName?: string;
  fromProjectArName?: string;
  fromProjectEnName?: string;
  toStoreCode: number;
  toStoreName?: string;
  toStoreArName?: string;
  toStoreEnName?: string;
  toProjectCode?: number;
  toProjectName?: string;
  toProjectArName?: string;
  toProjectEnName?: string;
  transferDate: string;
  transferStatus: 'PENDING' | 'RECEIVED';
  notes?: string;
  transferLines: StoreTransferLineResponse[];
  transferredBy?: number;
  transferredByName?: string;
  createdDate?: string;
  createdBy?: number;
}

export interface StoreTransferLineResponse {
  lineId: number;
  itemCode: number;
  itemName?: string;
  quantity: number;
  notes?: string;
}

// Balance Response Interface
export interface BalanceResponse {
  balanceId: number;
  storeCode: number;
  storeName?: string;
  itemCode: number;
  itemName?: string;
  unitOfMeasure?: string;
  quantityOnHand: number;
  quantityReserved?: number;
  availableQuantity?: number;
  lastTransactionDate?: string;
  isBelowReorderLevel?: boolean;
  reorderLevel?: number;
}

export const warehouseApi = {
  // Categories
  async getAllCategories(): Promise<CategorySummary[]> {
    const response = await apiClient.get<CategorySummary[]>('/warehouse/categories');
    return response;
  },

  async getCategoryById(id: number): Promise<CategoryResponse> {
    const response = await apiClient.get<CategoryResponse>(`/warehouse/categories/${id}`);
    return response;
  },

  async createCategory(request: CategoryRequest): Promise<CategoryResponse> {
    const response = await apiClient.post<CategoryResponse>('/warehouse/categories', request);
    return response;
  },

  async updateCategory(id: number, request: CategoryRequest): Promise<CategoryResponse> {
    const response = await apiClient.put<CategoryResponse>(
      `/warehouse/categories/${id}`,
      request
    );
    return response;
  },

  async deleteCategory(categoryId: number, force: boolean = false): Promise<void> {
    const url = `/warehouse/categories/${categoryId}${force ? '?force=true' : ''}`;
    console.log(`[warehouseApi] deleteCategory(url=${url})`);
    await apiClient.delete<void>(url);
  },

  // Items
  async getAllItems(params?: { page?: number; size?: number }): Promise<ItemResponse[]> {
    const queryParams = new URLSearchParams();
    if (params?.page !== undefined) queryParams.append('page', params.page.toString());
    // Request a large page size to get all items (default size is 10)
    const size = params?.size || 1000;
    queryParams.append('size', size.toString());
    const query = queryParams.toString();
    // Backend returns Page<ItemSummary> but we can map it to ItemResponse since they're compatible
    const response = await apiClient.get<PageResponse<ItemResponse>>(
      `/warehouse/items?${query}`
    );
    // Extract content from paginated response
    return response.content || [];
  },

  async getItemById(id: number): Promise<ItemResponse> {
    const response = await apiClient.get<ItemResponse>(`/warehouse/items/${id}`);
    return response;
  },

  async createItem(request: ItemRequest): Promise<ItemResponse> {
    const response = await apiClient.post<ItemResponse>('/warehouse/items', request);
    return response;
  },

  async updateItem(id: number, request: ItemRequest): Promise<ItemResponse> {
    const response = await apiClient.put<ItemResponse>(`/warehouse/items/${id}`, request);
    return response;
  },

  async deleteItem(itemCode: number): Promise<void> {
    const url = `/warehouse/items/${itemCode}`;
    console.log(`[warehouseApi] deleteItem(url=${url})`);
    await apiClient.delete<void>(url);
  },

  // Stores
  async getAllStores(projectCode?: number): Promise<StoreSummary[]> {
    const query = projectCode ? `?projectCode=${projectCode}` : '';
    const response = await apiClient.get<StoreSummary[]>(`/warehouse/stores${query}`);
    return response;
  },

  async getStoreById(id: number): Promise<StoreResponse> {
    const response = await apiClient.get<StoreResponse>(`/warehouse/stores/${id}`);
    return response;
  },

  async createStore(request: StoreRequest): Promise<StoreResponse> {
    const response = await apiClient.post<StoreResponse>('/warehouse/stores', request);
    return response;
  },

  async updateStore(id: number, request: StoreRequest): Promise<StoreResponse> {
    const response = await apiClient.put<StoreResponse>(`/warehouse/stores/${id}`, request);
    return response;
  },

  async deleteStore(storeCode: number): Promise<void> {
    const url = `/warehouse/stores/${storeCode}`;
    console.log(`[warehouseApi] deleteStore(url=${url})`);
    await apiClient.delete<void>(url);
  },

  // Purchase Orders
  async getAllPurchaseOrders(
    projectCode?: number,
    storeCode?: number,
    status?: string
  ): Promise<PurchaseOrderResponse[]> {
    const queryParams = new URLSearchParams();
    if (projectCode) queryParams.append('projectCode', projectCode.toString());
    if (storeCode) queryParams.append('storeCode', storeCode.toString());
    if (status) queryParams.append('status', status);
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await apiClient.get<PurchaseOrderResponse[]>(
      `/warehouse/purchase-orders${query}`
    );
    return response;
  },

  async getPurchaseOrderById(id: number): Promise<PurchaseOrderResponse> {
    const response = await apiClient.get<PurchaseOrderResponse>(
      `/warehouse/purchase-orders/${id}`
    );
    return response;
  },

  async createPurchaseOrder(request: PurchaseOrderRequest): Promise<PurchaseOrderResponse> {
    const response = await apiClient.post<PurchaseOrderResponse>(
      '/warehouse/purchase-orders',
      request
    );
    return response;
  },

  async updatePurchaseOrder(id: number, request: PurchaseOrderRequest): Promise<PurchaseOrderResponse> {
    const response = await apiClient.put<PurchaseOrderResponse>(
      `/warehouse/purchase-orders/${id}`,
      request
    );
    return response;
  },

  async deletePurchaseOrder(id: number): Promise<void> {
    await apiClient.delete<void>(`/warehouse/purchase-orders/${id}`);
  },

  async approvePurchaseOrder(id: number, request: PurchaseOrderApprovalRequest): Promise<PurchaseOrderResponse> {
    const response = await apiClient.post<PurchaseOrderResponse>(
      `/warehouse/purchase-orders/${id}/approve`,
      request
    );
    return response;
  },

  async rejectPurchaseOrder(id: number, request: PurchaseOrderRejectionRequest): Promise<PurchaseOrderResponse> {
    const response = await apiClient.post<PurchaseOrderResponse>(
      `/warehouse/purchase-orders/${id}/reject`,
      request
    );
    return response;
  },

  async submitPurchaseOrderForApproval(id: number): Promise<PurchaseOrderResponse> {
    const response = await apiClient.post<PurchaseOrderResponse>(
      `/warehouse/purchase-orders/${id}/submit`
    );
    return response;
  },

  // Goods Receipts (Receiving)
  async getAllGoodsReceipts(
    projectCode?: number,
    storeCode?: number
  ): Promise<GoodsReceiptResponse[]> {
    const queryParams = new URLSearchParams();
    if (projectCode) queryParams.append('projectCode', projectCode.toString());
    if (storeCode) queryParams.append('storeCode', storeCode.toString());
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await apiClient.get<GoodsReceiptResponse[]>(
      `/warehouse/receiving${query}`
    );
    return response;
  },

  async getGoodsReceiptById(id: number): Promise<GoodsReceiptResponse> {
    const response = await apiClient.get<GoodsReceiptResponse>(
      `/warehouse/receiving/${id}`
    );
    return response;
  },

  async createGoodsReceipt(request: GoodsReceiptRequest): Promise<GoodsReceiptResponse> {
    const response = await apiClient.post<GoodsReceiptResponse>(
      '/warehouse/receiving',
      request
    );
    return response;
  },

  async updateGoodsReceipt(id: number, request: GoodsReceiptRequest): Promise<GoodsReceiptResponse> {
    const response = await apiClient.put<GoodsReceiptResponse>(
      `/warehouse/receiving/${id}`,
      request
    );
    return response;
  },

  async deleteGoodsReceipt(id: number): Promise<void> {
    await apiClient.delete<void>(`/warehouse/receiving/${id}`);
  },

  // Goods Issues (Issuing)
  async getAllGoodsIssues(
    projectCode?: number,
    storeCode?: number
  ): Promise<GoodsIssueResponse[]> {
    const queryParams = new URLSearchParams();
    if (projectCode) queryParams.append('projectCode', projectCode.toString());
    if (storeCode) queryParams.append('storeCode', storeCode.toString());
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await apiClient.get<GoodsIssueResponse[]>(
      `/warehouse/issuing${query}`
    );
    return response;
  },

  async getGoodsIssueById(id: number): Promise<GoodsIssueResponse> {
    const response = await apiClient.get<GoodsIssueResponse>(
      `/warehouse/issuing/${id}`
    );
    return response;
  },

  async createGoodsIssue(request: GoodsIssueRequest): Promise<GoodsIssueResponse> {
    const response = await apiClient.post<GoodsIssueResponse>(
      '/warehouse/issuing',
      request
    );
    return response;
  },

  async updateGoodsIssue(id: number, request: GoodsIssueRequest): Promise<GoodsIssueResponse> {
    const response = await apiClient.put<GoodsIssueResponse>(
      `/warehouse/issuing/${id}`,
      request
    );
    return response;
  },

  async deleteGoodsIssue(id: number): Promise<void> {
    await apiClient.delete<void>(`/warehouse/issuing/${id}`);
  },

  // Store Transfers
  async getAllStoreTransfers(
    fromStoreCode?: number,
    toStoreCode?: number,
    status?: string
  ): Promise<StoreTransferResponse[]> {
    const queryParams = new URLSearchParams();
    if (fromStoreCode) queryParams.append('fromStoreCode', fromStoreCode.toString());
    if (toStoreCode) queryParams.append('toStoreCode', toStoreCode.toString());
    if (status) queryParams.append('status', status);
    const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const response = await apiClient.get<StoreTransferResponse[]>(
      `/warehouse/transfers${query}`
    );
    return response;
  },

  async getStoreTransferById(id: number): Promise<StoreTransferResponse> {
    const response = await apiClient.get<StoreTransferResponse>(
      `/warehouse/transfers/${id}`
    );
    return response;
  },

  async createStoreTransfer(request: StoreTransferRequest): Promise<StoreTransferResponse> {
    const response = await apiClient.post<StoreTransferResponse>(
      '/warehouse/transfers',
      request
    );
    return response;
  },

  async updateStoreTransfer(id: number, request: StoreTransferRequest): Promise<StoreTransferResponse> {
    const response = await apiClient.put<StoreTransferResponse>(
      `/warehouse/transfers/${id}`,
      request
    );
    return response;
  },

  async deleteStoreTransfer(id: number): Promise<void> {
    await apiClient.delete<void>(`/warehouse/transfers/${id}`);
  },

  async completeStoreTransfer(id: number): Promise<StoreTransferResponse> {
    const response = await apiClient.post<StoreTransferResponse>(
      `/warehouse/transfers/${id}/complete`
    );
    return response;
  },

  // Store Balances
  async getAllBalances(storeCode?: number): Promise<BalanceResponse[]> {
    const query = storeCode ? `?storeCode=${storeCode}` : '';
    const response = await apiClient.get<BalanceResponse[]>(
      `/warehouse/balances${query}`
    );
    return response;
  },

  async getBalancesByStore(storeCode: number): Promise<BalanceResponse[]> {
    const response = await apiClient.get<BalanceResponse[]>(
      `/warehouse/balances/store/${storeCode}`
    );
    return response;
  },

  async getItemsBelowReorderLevel(): Promise<BalanceResponse[]> {
    const response = await apiClient.get<BalanceResponse[]>(
      '/warehouse/balances/below-reorder'
    );
    return response;
  },

  // Balance (legacy - keep for backward compatibility)
  async getBalance(
    projectCode: number,
    storeCode: number,
    itemCode?: number
  ): Promise<BalanceResponse[]> {
    const queryParams = new URLSearchParams();
    queryParams.append('projectCode', projectCode.toString());
    queryParams.append('storeCode', storeCode.toString());
    if (itemCode) queryParams.append('itemCode', itemCode.toString());

    const response = await apiClient.get<BalanceResponse[]>(
      `/warehouse/balance?${queryParams.toString()}`
    );
    return response;
  },
};
