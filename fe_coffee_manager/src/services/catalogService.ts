import { apiClient } from '../config/api';
import { API_ENDPOINTS } from '../config/constants';
import { CatalogSize, CatalogProduct, CatalogCategory, ProductPageResponse, ProductSearchParams, CatalogSupplier, SupplierPageResponse, SupplierSearchParams, CreateSupplierRequest, CatalogIngredient, IngredientPageResponse, IngredientSearchParams, CreateIngredientRequest, UpdateIngredientRequest, CatalogUnit, CreateUnitRequest, UpdateUnitRequest, RecipePageResponse, RecipeSearchParams, CatalogRecipe, CreateRecipeRequest, UpdateRecipeRequest } from '../types';

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

  // Non-paginated supplier list (for dropdowns, etc.)
  async getAllSuppliers(): Promise<CatalogSupplier[]> {
    try {
      const resp = await apiClient.get<ApiEnvelope<CatalogSupplier[]>>(API_ENDPOINTS.CATALOGS.SUPPLIERS);
      const r = (resp && (resp as any).result) as any;
      return Array.isArray(r) ? (r as CatalogSupplier[]) : [];
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
  },

  // Supplier management functions
  async getSuppliers(params: SupplierSearchParams = {}): Promise<SupplierPageResponse> {
    const queryParams = new URLSearchParams();

    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);

    const url = `${API_ENDPOINTS.CATALOGS.SUPPLIERS}/search${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const resp = await apiClient.get<ApiEnvelope<SupplierPageResponse>>(url);
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
  },

  async createSupplier(payload: CreateSupplierRequest): Promise<CatalogSupplier> {
    try {
      const resp = await apiClient.post<ApiEnvelope<CatalogSupplier>>(API_ENDPOINTS.CATALOGS.SUPPLIERS, payload);
      if (resp?.code === 1000 && resp.result) {
        return resp.result;
      }
      throw new Error(resp?.message || 'Failed to create supplier');
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

  async updateSupplier(supplierId: number, payload: CreateSupplierRequest): Promise<CatalogSupplier> {
    try {
      const resp = await apiClient.put<ApiEnvelope<CatalogSupplier>>(`${API_ENDPOINTS.CATALOGS.SUPPLIERS}/${supplierId}`, payload);
      if (resp?.code === 1000 && resp.result) {
        return resp.result;
      }
      throw new Error(resp?.message || 'Failed to update supplier');
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

  async deleteSupplier(supplierId: number): Promise<void> {
    try {
      const resp = await apiClient.delete<ApiEnvelope<void>>(`${API_ENDPOINTS.CATALOGS.SUPPLIERS}/${supplierId}`);
      if (resp?.code === 1000) {
        return;
      }
      throw new Error(resp?.message || 'Failed to delete supplier');
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      if (error.message) {
        throw new Error(error.message);
      }
      throw new Error('Không thể kết nối đến server');
    }
  }
  ,

  // Ingredient management
  async searchIngredients(params: IngredientSearchParams = {}): Promise<IngredientPageResponse> {
    const queryParams = new URLSearchParams();
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.supplierId !== undefined) queryParams.append('supplierId', params.supplierId.toString());
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDirection) queryParams.append('sortDirection', params.sortDirection);

    const url = `${API_ENDPOINTS.CATALOGS.INGREDIENTS}/search${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const resp = await apiClient.get<ApiEnvelope<IngredientPageResponse>>(url);
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
  },

  async createIngredient(payload: CreateIngredientRequest): Promise<CatalogIngredient> {
    const resp = await apiClient.post<ApiEnvelope<CatalogIngredient>>(API_ENDPOINTS.CATALOGS.INGREDIENTS, payload);
    if (resp?.result) return resp.result;
    throw new Error((resp as any)?.message || 'Create ingredient failed');
  },

  async updateIngredient(ingredientId: number, payload: UpdateIngredientRequest): Promise<CatalogIngredient> {
    const resp = await apiClient.put<ApiEnvelope<CatalogIngredient>>(`${API_ENDPOINTS.CATALOGS.INGREDIENTS}/${ingredientId}`, payload);
    if (resp?.result) return resp.result;
    throw new Error((resp as any)?.message || 'Update ingredient failed');
  },

  async deleteIngredient(ingredientId: number): Promise<void> {
    try {
      const resp = await apiClient.delete<ApiEnvelope<void>>(`${API_ENDPOINTS.CATALOGS.INGREDIENTS}/${ingredientId}`);
      if (resp?.code === 1000) {
        return;
      }
      throw new Error(resp?.message || 'Failed to delete ingredient');
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

  // Unit management
  async getUnits(): Promise<CatalogUnit[]> {
    try {
      const resp = await apiClient.get<ApiEnvelope<CatalogUnit[]>>(API_ENDPOINTS.CATALOGS.UNITS);
      return Array.isArray(resp?.result) ? resp.result : [];
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

  async createUnit(payload: CreateUnitRequest): Promise<CatalogUnit> {
    try {
      const resp = await apiClient.post<ApiEnvelope<CatalogUnit>>(API_ENDPOINTS.CATALOGS.UNITS, payload);
      if (resp?.code === 1000 && resp.result) {
        return resp.result;
      }
      throw new Error(resp?.message || 'Failed to create unit');
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

  async updateUnit(unitCode: string, payload: UpdateUnitRequest): Promise<CatalogUnit> {
    try {
      const resp = await apiClient.put<ApiEnvelope<CatalogUnit>>(`${API_ENDPOINTS.CATALOGS.UNITS}/${unitCode}`, payload);
      if (resp?.code === 1000 && resp.result) {
        return resp.result;
      }
      throw new Error(resp?.message || 'Failed to update unit');
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

  async deleteUnit(unitCode: string): Promise<void> {
    try {
      const resp = await apiClient.delete<ApiEnvelope<void>>(`${API_ENDPOINTS.CATALOGS.UNITS}/${unitCode}`);
      if (resp?.code === 1000) {
        return;
      }
      throw new Error(resp?.message || 'Failed to delete unit');
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      if (error.message) {
        throw new Error(error.message);
      }
      throw new Error('Không thể kết nối đến server');
    }
  }
  ,

  // Recipe management
  async searchRecipes(params: RecipeSearchParams = {}): Promise<RecipePageResponse> {
    const queryParams = new URLSearchParams();
    if (params.keyword) queryParams.append('keyword', params.keyword);
    if (params.status) queryParams.append('status', params.status);
    if (params.pdId !== undefined) queryParams.append('pdId', String(params.pdId));
    if (params.productId !== undefined) queryParams.append('productId', String(params.productId));
    if (params.categoryId !== undefined) queryParams.append('categoryId', String(params.categoryId));
    if (params.page !== undefined) queryParams.append('page', String(params.page));
    if (params.size !== undefined) queryParams.append('size', String(params.size));
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortDir) queryParams.append('sortDir', params.sortDir);

    const url = `${API_ENDPOINTS.CATALOGS.RECIPES}/search${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const resp = await apiClient.get<ApiEnvelope<RecipePageResponse>>(url);
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
  },

  async createRecipe(payload: CreateRecipeRequest): Promise<CatalogRecipe> {
    const resp = await apiClient.post<ApiEnvelope<CatalogRecipe>>(API_ENDPOINTS.CATALOGS.RECIPES, payload);
    if (resp?.result) return resp.result;
    throw new Error((resp as any)?.message || 'Create recipe failed');
  },

  // Non-paginated recipe list
  async getRecipes(): Promise<CatalogRecipe[]> {
    try {
      const resp = await apiClient.get<ApiEnvelope<CatalogRecipe[] | CatalogRecipe>>(API_ENDPOINTS.CATALOGS.RECIPES);
      const r = (resp && (resp as any).result) as any;
      if (Array.isArray(r)) return r as CatalogRecipe[];
      if (r && typeof r === 'object') return [r as CatalogRecipe];
      return [];
    } catch (error: any) {
      if (error.response?.data?.message) throw new Error(error.response.data.message);
      if (error.message) throw new Error(error.message);
      throw new Error('Không thể kết nối đến server');
    }
  },

  async updateRecipe(recipeId: number, payload: UpdateRecipeRequest): Promise<CatalogRecipe> {
    const resp = await apiClient.put<ApiEnvelope<CatalogRecipe>>(`${API_ENDPOINTS.CATALOGS.RECIPES}/${recipeId}`, payload);
    if (resp?.result) return resp.result;
    throw new Error((resp as any)?.message || 'Update recipe failed');
  },

  async deleteRecipe(recipeId: number): Promise<void> {
    try {
      const resp = await apiClient.delete<ApiEnvelope<void>>(`${API_ENDPOINTS.CATALOGS.RECIPES}/${recipeId}`);
      if (resp?.code === 1000) return;
      throw new Error(resp?.message || 'Failed to delete recipe');
    } catch (error: any) {
      if (error.response?.data?.message) throw new Error(error.response.data.message);
      if (error.message) throw new Error(error.message);
      throw new Error('Không thể kết nối đến server');
    }
  },

  async restoreRecipe(recipeId: number): Promise<void> {
    try {
      const resp = await apiClient.post<ApiEnvelope<void>>(`${API_ENDPOINTS.CATALOGS.RECIPES}/${recipeId}/restore`);
      if (resp?.code === 1000) return;
      throw new Error(resp?.message || 'Failed to restore recipe');
    } catch (error: any) {
      if (error.response?.data?.message) throw new Error(error.response.data.message);
      if (error.message) throw new Error(error.message);
      throw new Error('Không thể kết nối đến server');
    }
  },

  async getNextRecipeVersion(name: string, pdId: number): Promise<number> {
    try {
      const resp = await apiClient.get<ApiEnvelope<number>>(`${API_ENDPOINTS.CATALOGS.RECIPES}/next-version?name=${encodeURIComponent(name)}&pdId=${pdId}`);
      if (resp?.code === 1000 && resp?.result !== undefined) return resp.result;
      throw new Error(resp?.message || 'Failed to get next version');
    } catch (error: any) {
      if (error.response?.data?.message) throw new Error(error.response.data.message);
      if (error.message) throw new Error(error.message);
      throw new Error('Không thể kết nối đến server');
    }
  },
  // Purchase Orders
  async createPurchaseOrdersBulk(payload: { branchId?: number; items: Array<{ ingredientId: number; qty: number; unitCode: string; unitPrice: number; supplierId: number; }> }): Promise<any[]> {
    const resp = await apiClient.post<any>(API_ENDPOINTS.CATALOGS.PURCHASE_ORDERS_BULK, payload as any);
    // unwrap ApiResponse { code, result }
    if ((resp as any)?.result) return (resp as any).result;
    return (Array.isArray(resp) ? resp : []) as any[];
  },
  async getPurchaseOrdersByBranch(branchId: number): Promise<any[]> {
    const resp = await apiClient.get<any>(`/api/catalogs/purchase-orders/branch/${branchId}`);
    // unwrap ApiResponse { code, result }
    if ((resp as any)?.result) return (resp as any).result;
    return (Array.isArray(resp) ? resp : []) as any[];
  },
  async searchPurchaseOrders(params: { page?: number; size?: number; search?: string; status?: string; supplierId?: number; branchId?: number; sortBy?: string; sortDir?: string } = {}): Promise<{ content: any[]; totalPages: number; totalElements: number; page: number; size: number; }> {
    const q = new URLSearchParams();
    if (params.page !== undefined) q.append('page', String(params.page));
    if (params.size !== undefined) q.append('size', String(params.size));
    if (params.search) q.append('search', params.search);
    if (params.status) q.append('status', params.status);
    if (params.supplierId !== undefined) q.append('supplierId', String(params.supplierId));
    if (params.branchId !== undefined) q.append('branchId', String(params.branchId));
    if (params.sortBy) q.append('sortBy', params.sortBy);
    if (params.sortDir) q.append('sortDir', params.sortDir);
    const url = `/api/catalogs/purchase-orders/search${q.toString() ? `?${q.toString()}` : ''}`;
    const resp = await apiClient.get<any>(url);
    return (resp as any)?.result ?? resp ?? { content: [], totalPages: 0, totalElements: 0, page: 0, size: 10 };
  },
  async updatePurchaseOrder(poId: number, payload: { status?: string }): Promise<any> {
    const resp = await apiClient.put<any>(`/api/catalogs/purchase-orders/${poId}`, payload as any);
    return (resp as any)?.result ?? resp;
  },
  async deletePurchaseOrder(poId: number): Promise<void> {
    const resp = await apiClient.delete<any>(`/api/catalogs/purchase-orders/${poId}`);
    return (resp as any)?.result ?? resp;
  },
  async updatePurchaseOrderStatus(poId: number, status: string): Promise<any> {
    const resp = await apiClient.put<any>(`/api/catalogs/purchase-orders/${poId}/status/${status}`);
    return (resp as any)?.result ?? resp;
  },
  
  // Purchase Order Detail management
  async updatePurchaseOrderDetail(detailId: number, payload: { ingredientId?: number; qty?: number; unitCode?: string; unitPrice?: number }): Promise<any> {
    const resp = await apiClient.put<any>(`/api/catalogs/purchase-orders/details/${detailId}`, payload);
    return (resp as any)?.result ?? resp;
  },
  
  async deletePurchaseOrderDetail(detailId: number): Promise<void> {
    const resp = await apiClient.delete<any>(`/api/catalogs/purchase-orders/details/${detailId}`);
    return (resp as any)?.result ?? resp;
  },
  
  // Send PO to supplier
  async sendToSupplier(poId: number, data: { toEmail: string; cc?: string; subject?: string; message?: string }): Promise<any> {
    const resp = await apiClient.post<any>(`/api/catalogs/purchase-orders/${poId}/send-to-supplier`, data);
    return (resp as any)?.result ?? resp;
  },

  // Goods Receipt methods
  async createGoodsReceipt(data: {
    poId: number;
    supplierId: number;
    branchId: number;
    receivedBy: number;
    details: Array<{
      poDetailId: number;
      ingredientId: number;
      unitCodeInput: string;
      qtyInput: number;
      unitPrice: number;
      lotNumber: string;
      mfgDate: string | null;
      expDate: string | null;
      status: string;
      note: string;
    }>;
  }) {
    const resp = await apiClient.post<any>('/api/catalogs/goods-receipts', data);
    return (resp as any)?.result ?? resp;
  },

  async getGoodsReceiptsByPo(poId: number) {
    const resp = await apiClient.get<any>(`/api/catalogs/goods-receipts/po/${poId}`);
    return (resp as any)?.result ?? resp;
  },

  async validateUnitConversion(data: {
    ingredientId: number;
    fromUnitCode: string;
    toUnitCode: string;
    quantity: number;
  }) {
    const resp = await apiClient.post<any>('/api/catalogs/goods-receipts/validate-unit-conversion', data);
    return (resp as any)?.result ?? resp;
  },

  async createUnitConversion(data: {
    ingredientId: number;
    fromUnitCode: string;
    toUnitCode: string;
    factor: number;
    description?: string;
  }) {
    const resp = await apiClient.post<any>('/api/catalogs/goods-receipts/create-unit-conversion', data);
    return (resp as any)?.result ?? resp;
  },

  async updateUnitConversionStatus(conversionId: number, isActive: boolean) {
    const resp = await apiClient.put<any>(`/api/catalogs/goods-receipts/conversions/${conversionId}/status`, { isActive });
    return (resp as any)?.result ?? resp;
  },

  async getAllGlobalConversions(): Promise<any[]> {
    const resp = await apiClient.get<any>('/api/catalogs/goods-receipts/conversions/global');
    return (resp as any)?.result ?? resp;
  },

  async updateUnitConversion(conversionId: number, data: {
    ingredientId: number;
    fromUnitCode: string;
    toUnitCode: string;
    factor: number;
    description?: string;
    scope?: string;
    branchId?: number | null;
  }) {
    const resp = await apiClient.put<any>(`/api/catalogs/goods-receipts/conversions/${conversionId}`, data);
    return (resp as any)?.result ?? resp;
  }
};
export default catalogService;



