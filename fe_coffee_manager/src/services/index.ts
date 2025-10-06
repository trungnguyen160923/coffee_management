// Export all services from a single entry point
export { default as authService } from './authService';
export { default as productService } from './productService';
export { default as orderService } from './orderService';
export { default as branchService } from './branchService';
export { default as managerService } from './managerService';
export { default as staffService } from './staffService';
export { default as catalogService } from './catalogService';

// Export API client
export { default as apiClient } from '../config/api';

// Export types
export type { LoginRequest, LoginResponse, RegisterRequest } from './authService';
export type { 
  CreateProductRequest, 
  UpdateProductRequest, 
  ProductFilters, 
  ProductListResponse 
} from './productService';
export type { 
  CreateOrderRequest, 
  UpdateOrderRequest, 
  OrderFilters, 
  OrderListResponse, 
  OrderStats 
} from './orderService';
export type { 
  CreateBranchRequest, 
  UpdateBranchRequest, 
  BranchFilters, 
  BranchListResponse, 
  BranchStats 
} from './branchService';
