import { apiClient } from '../config/api';
import { API_ENDPOINTS } from '../config/constants';
import { CatalogSize, CatalogProduct, CatalogCategory, ProductPageResponse, ProductSearchParams } from '../types';

export interface ApiEnvelope<T> { code?: number; message?: string; result: T }

export interface CreateSizeRequest {
  name: string;
  description: string;
}

export interface CreateCategoryRequest {
  name: string;
  description: string;
}

export const catalogService = {
  async uploadProductImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const resp = await apiClient.post<ApiEnvelope<string>>('/api/catalogs/files/upload', formData as any);
    if (resp?.result) return resp.result;
    throw new Error((resp as any)?.message || 'Upload image failed');
  },
  async createProduct(payload: {
    name: string;
    categoryId: number;
    sku?: string;
    description?: string;
    active?: boolean;
    imageUrl?: string;
    productSizes: { sizeId: number; price: number }[];
  }): Promise<CatalogProduct> {
    const resp = await apiClient.post<ApiEnvelope<CatalogProduct>>(API_ENDPOINTS.CATALOGS.PRODUCTS, payload);
    if (resp?.result) return resp.result;
    throw new Error((resp as any)?.message || 'Create product failed');
  },
  async updateProduct(productId: number, payload: {
    name?: string;
    categoryId?: number;
    sku?: string;
    description?: string;
    active?: boolean;
    imageUrl?: string;
    productSizes?: { sizeId: number; price: number }[];
  }): Promise<CatalogProduct> {
    const resp = await apiClient.put<ApiEnvelope<CatalogProduct>>(`${API_ENDPOINTS.CATALOGS.PRODUCTS}/${productId}`, payload);
    if (resp?.result) return resp.result;
    throw new Error((resp as any)?.message || 'Update product failed');
  },
  async deleteProduct(productId: number): Promise<void> {
    try {
      const resp = await apiClient.delete<ApiEnvelope<void>>(`${API_ENDPOINTS.CATALOGS.PRODUCTS}/${productId}`);
      if (resp?.code !== 1000) {
        throw new Error(resp?.message || 'Failed to delete product');
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      if (error.message) {
        throw new Error(error.message);
      }
      throw new Error('Không thể kết nối đến server');
    }
  },
  async getSizes(): Promise<CatalogSize[]> {
    try {
      const resp = await apiClient.get<ApiEnvelope<CatalogSize[]>>(API_ENDPOINTS.CATALOGS.SIZES);
      return Array.isArray(resp?.result) ? resp.result : [];
    } catch (error: any) {
      // Handle API error response
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      // Handle network or other errors
      if (error.message) {
        throw new Error(error.message);
      }
      throw new Error('Không thể kết nối đến server');
    }
  },
  async createSize(request: CreateSizeRequest): Promise<CatalogSize> {
    try {
      const resp = await apiClient.post<ApiEnvelope<CatalogSize>>(API_ENDPOINTS.CATALOGS.SIZES, request);
      if (resp?.code === 1000 && resp.result) {
        return resp.result;
      }
      throw new Error(resp?.message || 'Failed to create size');
    } catch (error: any) {
      // Handle API error response
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      // Handle network or other errors
      if (error.message) {
        throw new Error(error.message);
      }
      throw new Error('Không thể kết nối đến server');
    }
  },
  async updateSize(sizeId: number, request: CreateSizeRequest): Promise<CatalogSize> {
    try {
      const resp = await apiClient.put<ApiEnvelope<CatalogSize>>(`${API_ENDPOINTS.CATALOGS.SIZES}/${sizeId}`, request);
      if (resp?.code === 1000 && resp.result) {
        return resp.result;
      }
      throw new Error(resp?.message || 'Failed to update size');
    } catch (error: any) {
      // Handle API error response
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      // Handle network or other errors
      if (error.message) {
        throw new Error(error.message);
      }
      throw new Error('Không thể kết nối đến server');
    }
  },
  async deleteSize(sizeId: number): Promise<void> {
    try {
      const resp = await apiClient.delete<ApiEnvelope<void>>(`${API_ENDPOINTS.CATALOGS.SIZES}/${sizeId}`);
      if (resp?.code === 1000) {
        return;
      }
      throw new Error(resp?.message || 'Failed to delete size');
    } catch (error: any) {
      // Handle API error response
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      // Handle network or other errors
      if (error.message) {
        throw new Error(error.message);
      }
      throw new Error('Không thể kết nối đến server');
    }
  },
  async getProducts(): Promise<CatalogProduct[]> {
    const resp = await apiClient.get<ApiEnvelope<CatalogProduct | CatalogProduct[]>>(API_ENDPOINTS.CATALOGS.PRODUCTS);
    const r = (resp && (resp as any).result) as any;
    if (Array.isArray(r)) return r as CatalogProduct[];
    if (r && typeof r === 'object') return [r as CatalogProduct];
    return [];
  },
  async getCategories(): Promise<CatalogCategory[]> {
    try {
      const resp = await apiClient.get<ApiEnvelope<CatalogCategory[]>>(API_ENDPOINTS.CATALOGS.CATEGORIES);
      return Array.isArray(resp?.result) ? resp.result : [];
    } catch (error: any) {
      // Handle API error response
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      // Handle network or other errors
      if (error.message) {
        throw new Error(error.message);
      }
      throw new Error('Không thể kết nối đến server');
    }
  },
  async createCategory(request: CreateCategoryRequest): Promise<CatalogCategory> {
    try {
      const resp = await apiClient.post<ApiEnvelope<CatalogCategory>>(API_ENDPOINTS.CATALOGS.CATEGORIES, request);
      if (resp?.code === 1000 && resp.result) {
        return resp.result;
      }
      throw new Error(resp?.message || 'Failed to create category');
    } catch (error: any) {
      // Handle API error response
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      // Handle network or other errors
      if (error.message) {
        throw new Error(error.message);
      }
      throw new Error('Không thể kết nối đến server');
    }
  },
  async updateCategory(categoryId: number, request: CreateCategoryRequest): Promise<CatalogCategory> {
    try {
      const resp = await apiClient.put<ApiEnvelope<CatalogCategory>>(`${API_ENDPOINTS.CATALOGS.CATEGORIES}/${categoryId}`, request);
      if (resp?.code === 1000 && resp.result) {
        return resp.result;
      }
      throw new Error(resp?.message || 'Failed to update category');
    } catch (error: any) {
      // Handle API error response
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      // Handle network or other errors
      if (error.message) {
        throw new Error(error.message);
      }
      throw new Error('Không thể kết nối đến server');
    }
  },
  async deleteCategory(categoryId: number): Promise<void> {
    try {
      const resp = await apiClient.delete<ApiEnvelope<any>>(`${API_ENDPOINTS.CATALOGS.CATEGORIES}/${categoryId}`);
      if (resp?.code === 1000) {
        return;
      }
      throw new Error(resp?.message || 'Failed to delete category');
    } catch (error: any) {
      // Handle API error response
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      // Handle network or other errors
      if (error.message) {
        throw new Error(error.message);
      }
      throw new Error('Không thể kết nối đến server');
    }
  },
  async searchProducts(params: ProductSearchParams = {}): Promise<ProductPageResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.categoryId !== undefined) queryParams.append('categoryId', params.categoryId.toString());
    if (params.active !== undefined) queryParams.append('active', params.active.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);
    
    const url = `${API_ENDPOINTS.CATALOGS.PRODUCTS}/search${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const resp = await apiClient.get<ApiEnvelope<ProductPageResponse>>(url);
    return resp?.result || {
      content: [],
      page: 0,
      size: 10,
      totalElements: 0,
      totalPages: 0,
      first: true,
      last: true,
      hasNext: false,
      hasPrevious: false
    };
  }
};

export default catalogService;


