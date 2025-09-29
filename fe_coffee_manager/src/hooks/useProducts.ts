import { usePaginatedApi } from './useApi';
import { productService, ProductFilters, ProductListResponse } from '../services';
import { Product } from '../types';

export function useProducts() {
  const api = usePaginatedApi<Product>();

  const getProducts = async (filters?: ProductFilters) => {
    return await api.execute(() => productService.getProducts(filters));
  };

  const createProduct = async (productData: any) => {
    return await productService.createProduct(productData);
  };

  const updateProduct = async (id: string, productData: any) => {
    return await productService.updateProduct(id, productData);
  };

  const deleteProduct = async (id: string) => {
    return await productService.deleteProduct(id);
  };

  return {
    products: api.data,
    loading: api.loading,
    error: api.error,
    pagination: api.pagination,
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    reset: api.reset,
  };
}
