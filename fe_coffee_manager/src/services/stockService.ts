import { apiClient } from '../config/api';

const baseUrl = '/api/catalogs';

interface ApiResponse<T> {
  code: number;
  message?: string;
  result: T;
}

export interface StockSearchParams {
  search?: string;
  branchId?: number;
  ingredientId?: number;
  unitCode?: string;
  lowStock?: boolean;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface StockResponse {
  stockId: number;
  ingredientId: number;
  ingredientName: string;
  ingredientSku?: string;
  branchId: number;
  branchName?: string;
  quantity: number;
  reservedQuantity?: number;
  availableQuantity?: number;
  unitCode: string;
  unitName: string;
  threshold: number;
  lastUpdated: string;
  isLowStock: boolean;
  isOutOfStock?: boolean;
  avgCost: number;
}

export interface StockPageResponse {
  content: StockResponse[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
  totalStockValue: number; // Total stock value for all matching stocks (not just current page)
  pageable?: {
    pageNumber: number;
    pageSize: number;
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  sort?: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
}

export type StockAdjustmentStatus = 'PENDING' | 'COMMITTED' | 'CANCELLED' | 'AUTO_COMMITTED';

export interface StockAdjustment {
  adjustmentId: number;
  branchId: number;
  ingredientId: number;
  ingredientName?: string;
  adjustmentType: 'ADJUST_IN' | 'ADJUST_OUT';
  status: StockAdjustmentStatus;
  quantity: number;
  systemQuantity: number;
  actualQuantity: number;
  variance: number;
  adjustmentDate: string;
  notes?: string;
  adjustedBy?: string;
  userId?: number;
  entryCount?: number;
  lastEntryAt?: string;
  reason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface DailyStockAdjustmentItem {
  ingredientId: number;
  actualUsedQuantity: number;
  notes?: string;
}

export interface DailyStockReconciliationPayload {
  branchId: number;
  adjustmentDate: string;
  userId?: number;
  adjustedBy?: string;
  commitImmediately?: boolean;
  items: DailyStockAdjustmentItem[];
}

export interface DailyStockReconciliationResult {
  ingredientId: number;
  ingredientName?: string;
  systemQuantity: number;
  actualQuantity: number;
  variance: number;
  adjustmentType?: string | null;
  status?: string | null;
  adjustmentId?: number | null;
  notes?: string;
  entryCount?: number;
  lastEntryAt?: string;
  entryId?: number | null;
  entryQuantity?: number | null;
  entryTime?: string | null;
}

export interface DailyStockReconciliationResponse {
  branchId: number;
  adjustmentDate: string;
  processedItems: number;
  committedItems: number;
  totalVariance: number;
  results: DailyStockReconciliationResult[];
}

export interface ManagerStockAdjustPayload {
  branchId: number;
  ingredientId: number;
  physicalQuantity: number;
  notes?: string;
  reason?: string;
  adjustmentDate?: string;
  adjustedBy?: string;
  userId?: number;
  forceAdjust?: boolean;
}

export interface StockAdjustmentQuery {
  branchId: number;
  adjustmentDate?: string;
  status?: StockAdjustmentStatus;
  page?: number;
  size?: number;
}

export interface DailyUsageItem {
  ingredientId: number;
  ingredientName: string;
  unitCode: string;
  unitName: string;
  systemQuantity: number;
  hasAdjustment: boolean;
  actualQuantity?: number;
  variance?: number;
  adjustmentStatus?: string;
}

export interface DailyUsageSummaryResponse {
  branchId: number;
  date: string;
  items: DailyUsageItem[];
}

export const stockService = {
  // Tìm kiếm kho với phân trang
  searchStocks: async (params: StockSearchParams): Promise<StockPageResponse> => {
    const queryParams = new URLSearchParams();

    if (params.search) queryParams.append('search', params.search);
    if (params.branchId) queryParams.append('branchId', params.branchId.toString());
    if (params.ingredientId) queryParams.append('ingredientId', params.ingredientId.toString());
    if (params.unitCode) queryParams.append('unitCode', params.unitCode);
    if (params.lowStock !== undefined) queryParams.append('lowStock', params.lowStock.toString());
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);

    const response = await apiClient.get(`${baseUrl}/stocks/search?${queryParams.toString()}`) as StockPageResponse;
    return response;
  },

  adjustStockQuantity: async (payload: ManagerStockAdjustPayload): Promise<StockAdjustment> => {
    const response = await apiClient.post<ApiResponse<StockAdjustment>>(
      `${baseUrl}/stocks/manager-adjustment`,
      payload
    );
    return response.result;
  },

  // Lấy danh sách hàng tồn kho thấp
  getLowStockItems: async (branchId: number): Promise<StockResponse[]> => {
    const response = await apiClient.get(`${baseUrl}/stocks/low-stock?branchId=${branchId}`) as StockResponse[];
    return response;
  },

  // Lấy danh sách hàng tồn kho thấp hoặc hết hàng
  getLowOrOutOfStockItems: async (branchId: number): Promise<StockResponse[]> => {
    const response = await apiClient.get(`${baseUrl}/stocks/low-or-out-of-stock?branchId=${branchId}`) as any;
    // Handle ApiResponse wrapper
    if (response.code && response.result) {
      return response.result;
    }
    return Array.isArray(response) ? response : [];
  },

  // Lấy thông tin chi tiết một kho
  getStockById: async (stockId: number): Promise<StockResponse> => {
    const response = await apiClient.get(`${baseUrl}/stocks/${stockId}`) as StockResponse;
    return response;
  },

  // Lấy kho theo chi nhánh
  getStocksByBranch: async (
    branchId: number,
    page: number = 0,
    size: number = 10,
    search?: string
  ): Promise<StockPageResponse> => {
    const queryParams = new URLSearchParams();
    queryParams.append('page', page.toString());
    queryParams.append('size', size.toString());
    if (search) queryParams.append('search', search);

    const response = await apiClient.get(`${baseUrl}/stocks/branch/${branchId}?${queryParams.toString()}`) as StockPageResponse;
    return response;
  },

  // Lấy holdId từ orderId
  getHoldIdByOrderId: async (orderId: string): Promise<string> => {
    const response = await apiClient.get(`${baseUrl}/stocks/hold-id/${orderId}`) as any;
    return response.result?.holdId;
  },

  // Commit reservation khi order chuyển sang ready
  commitReservation: async (orderId: string): Promise<any> => {
    // Lấy holdId từ orderId trước
    const holdIdResponse = await apiClient.get(`${baseUrl}/stocks/hold-id/${orderId}`) as any;
    const holdId = holdIdResponse.result?.holdId;
    if (!holdId) {
      throw new Error('No active reservation found for this order');
    }
    
    const response = await apiClient.post(`${baseUrl}/stocks/commit`, {
      holdId: holdId,
      orderId: parseInt(orderId)
    });
    return response;
  },
  // Release reservation khi order bị cancelled
  releaseReservation: async (orderId: string): Promise<any> => {
    // Lấy holdId từ orderId trước
    const holdIdResponse = await apiClient.get(`${baseUrl}/stocks/hold-id/${orderId}`) as any;
    const holdId = holdIdResponse.result?.holdId;
    if (!holdId) {
      throw new Error('No active reservation found for this order');
    }
    
    const response = await apiClient.post(`${baseUrl}/stocks/release`, {
      holdId: holdId
    });
    return response;
  },

  reconcileDailyUsage: async (payload: DailyStockReconciliationPayload): Promise<DailyStockReconciliationResponse> => {
    const response = await apiClient.post<ApiResponse<DailyStockReconciliationResponse>>(
      `${baseUrl}/stocks/daily-reconciliation`,
      payload
    );
    return response.result;
  },

  getStockAdjustments: async (params: StockAdjustmentQuery): Promise<PaginatedResponse<StockAdjustment>> => {
    const query = new URLSearchParams();
    query.append('branchId', params.branchId.toString());
    if (params.adjustmentDate) query.append('adjustmentDate', params.adjustmentDate);
    if (params.status) query.append('status', params.status);
    if (params.page !== undefined) query.append('page', params.page.toString());
    if (params.size !== undefined) query.append('size', params.size.toString());

    const response = await apiClient.get<ApiResponse<PaginatedResponse<StockAdjustment>>>(
      `${baseUrl}/stocks/adjustments?${query.toString()}`
    );
    return response.result;
  },

  commitStockAdjustment: async (adjustmentId: number) => {
    return apiClient.post<ApiResponse<{ status: string }>>(
      `${baseUrl}/stocks/adjustments/${adjustmentId}/commit`
    );
  },

  // Lấy danh sách nguyên liệu đã được dùng trong ngày với system quantity
  getDailyUsageSummary: async (branchId: number, date: string): Promise<DailyUsageSummaryResponse> => {
    const response = await apiClient.get<ApiResponse<DailyUsageSummaryResponse>>(
      `${baseUrl}/stocks/daily-usage-summary?branchId=${branchId}&date=${date}`
    );
    return response.result;
  },

  // Cập nhật adjustment
  updateStockAdjustment: async (adjustmentId: number, actualQuantity: number, notes?: string): Promise<StockAdjustment> => {
    const response = await apiClient.put<ApiResponse<StockAdjustment>>(
      `${baseUrl}/stocks/adjustments/${adjustmentId}`,
      {
        actualQuantity,
        notes
      }
    );
    return response.result;
  },

  // Xóa adjustment
  deleteStockAdjustment: async (adjustmentId: number): Promise<void> => {
    await apiClient.delete<ApiResponse<{ adjustmentId: number; message: string }>>(
      `${baseUrl}/stocks/adjustments/${adjustmentId}`
    );
  }
};
