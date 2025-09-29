import { apiClient } from '../config/api';
import { Product, Recipe } from '../types';
import { API_ENDPOINTS } from '../config/constants';

// Product API interfaces
export interface CreateProductRequest {
  name: string;
  category: string;
  basePrice: number;
  description: string;
  image?: string;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  status?: 'active' | 'inactive';
}

export interface ProductFilters {
  category?: string;
  status?: 'active' | 'inactive';
  search?: string;
  page?: number;
  limit?: number;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductService {
  // Product CRUD
  getProducts: (filters?: ProductFilters) => Promise<ProductListResponse>;
  getProduct: (id: string) => Promise<Product>;
  createProduct: (product: CreateProductRequest) => Promise<Product>;
  updateProduct: (id: string, product: UpdateProductRequest) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  
  // Product images
  uploadProductImage: (productId: string, file: File) => Promise<string>;
  
  // Recipes
  getRecipes: (productId: string) => Promise<Recipe[]>;
  createRecipe: (productId: string, recipe: Omit<Recipe, 'id' | 'productId'>) => Promise<Recipe>;
  updateRecipe: (recipeId: string, recipe: Partial<Recipe>) => Promise<Recipe>;
  deleteRecipe: (recipeId: string) => Promise<void>;
}

// Product Service Implementation
export const productService: ProductService = {
  async getProducts(filters: ProductFilters = {}): Promise<ProductListResponse> {
    const params = new URLSearchParams();
    
    if (filters.category) params.append('category', filters.category);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const endpoint = `${API_ENDPOINTS.PRODUCTS.BASE}${queryString ? `?${queryString}` : ''}`;
    
    return await apiClient.get<ProductListResponse>(endpoint);
  },

  async getProduct(id: string): Promise<Product> {
    return await apiClient.get<Product>(`${API_ENDPOINTS.PRODUCTS.BASE}/${id}`);
  },

  async createProduct(product: CreateProductRequest): Promise<Product> {
    return await apiClient.post<Product>(API_ENDPOINTS.PRODUCTS.BASE, product);
  },

  async updateProduct(id: string, product: UpdateProductRequest): Promise<Product> {
    return await apiClient.put<Product>(`${API_ENDPOINTS.PRODUCTS.BASE}/${id}`, product);
  },

  async deleteProduct(id: string): Promise<void> {
    await apiClient.delete(`${API_ENDPOINTS.PRODUCTS.BASE}/${id}`);
  },

  async uploadProductImage(productId: string, file: File): Promise<string> {
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await apiClient.post<{ imageUrl: string }>(API_ENDPOINTS.PRODUCTS.IMAGE(productId), formData);
    
    return response.imageUrl;
  },

  async getRecipes(productId: string): Promise<Recipe[]> {
    return await apiClient.get<Recipe[]>(API_ENDPOINTS.PRODUCTS.RECIPES(productId));
  },

  async createRecipe(productId: string, recipe: Omit<Recipe, 'id' | 'productId'>): Promise<Recipe> {
    return await apiClient.post<Recipe>(API_ENDPOINTS.PRODUCTS.RECIPES(productId), recipe);
  },

  async updateRecipe(recipeId: string, recipe: Partial<Recipe>): Promise<Recipe> {
    return await apiClient.put<Recipe>(`/api/recipes/${recipeId}`, recipe);
  },

  async deleteRecipe(recipeId: string): Promise<void> {
    await apiClient.delete(`/api/recipes/${recipeId}`);
  },
};

export default productService;
