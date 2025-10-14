import { apiClient } from '../config/api';

const baseUrl = '/api/catalogs';


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
  unitCode: string;
  unitName: string;
  threshold: number;
  lastUpdated: string;
  isLowStock: boolean;
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
  pageable: {
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
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
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

  // Lấy danh sách hàng tồn kho thấp
  getLowStockItems: async (branchId: number): Promise<StockResponse[]> => {
    const response = await apiClient.get(`${baseUrl}/stocks/low-stock?branchId=${branchId}`) as StockResponse[];
    return response;
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
  }
};
