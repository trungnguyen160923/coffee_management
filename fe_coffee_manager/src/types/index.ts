export interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'manager' | 'staff';
    branchId?: string; // Keep for backward compatibility
    branch?: Branch;   // New field from backend
    avatar?: string;
    // Additional fields from backend API
    user_id?: number;
    fullname?: string;
    phoneNumber?: string;
    dob?: string | null;
    avatarUrl?: string | null;
    bio?: string | null;
    identityCard?: string;
    hireDate?: string;
    position?: string | null;
    salary?: number | null;
    adminLevel?: number | null;
    notes?: string | null;
  }
  
  export interface Branch {
    branchId: number;
    name: string;
    address: string;
    phone: string;
    managerUserId: number;
    openHours: string;
    endHours: string;
    createAt: string;
    updateAt: string;
  }

  export interface ManagerProfile {
    userId: number;
    branchId: number;
    hireDate: string;
    identityCard: string;
    createAt: string;
    updateAt: string;
    branch: Branch | null;
  }

  export interface ManagerListResponse {
    code: number;
    result: ManagerProfile[];
  }

export interface RoleDto {
  roleId: number;
  name: 'ADMIN' | 'MANAGER' | 'STAFF' | 'CUSTOMER';
}

export interface UserResponseDto {
  user_id: number;
  email: string;
  fullname: string;
  phoneNumber: string;
  dob: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: RoleDto;
  identityCard: string | null;
  branch: Branch | null;
  hireDate: string | null;
  position: string | null;
  salary: number | null;
  adminLevel: number | null;
  notes: string | null;
  active?: boolean;
}

export interface UsersListResponseDto<T> {
  code: number;
  result: T[];
}
  
  export interface Product {
    id: string;
    name: string;
    category: string;
    basePrice: number;
    description: string;
    image: string;
    status: 'active' | 'inactive';
  }
  
  export interface Recipe {
    id: string;
    productId: string;
    size: 'S' | 'M' | 'L';
    ingredients: Ingredient[];
    instructions: string;
    prepTime: number;
  }
  
  export interface Ingredient {
    name: string;
    quantity: number;
    unit: string;
  }

// Catalog service shapes
export interface CatalogSize {
  sizeId: number;
  name: string;
  description?: string | null;
  createAt: string;
  updateAt: string;
}

export interface CatalogCategory {
  categoryId: number;
  name: string;
  description?: string | null;
  createAt: string;
  updateAt: string;
}

export interface CatalogProductDetail {
  pdId: number;
  size: CatalogSize;
  price: number;
  createAt: string;
  updateAt: string;
}

export interface CatalogProduct {
  productId: number;
  name: string;
  imageUrl?: string | null;
  category?: CatalogCategory | null;
  sku?: string | null;
  description?: string | null;
  active: boolean;
  createAt: string;
  updateAt: string;
  productDetails: CatalogProductDetail[];
}

export interface ProductPageResponse {
  content: CatalogProduct[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ProductSearchParams {
  page?: number;
  size?: number;
  search?: string;
  categoryId?: number;
  active?: boolean;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}

// Supplier types
export interface CatalogSupplier {
  supplierId: number;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  note?: string | null;
  createAt: string;
  updateAt: string;
}

export interface SupplierPageResponse {
  content: CatalogSupplier[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface SupplierSearchParams {
  page?: number;
  size?: number;
  search?: string;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}

export interface CreateSupplierRequest {
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

// Ingredient types
export interface CatalogIngredient {
  ingredientId: number;
  name: string;
  unit?: CatalogUnit | null;
  unitPrice: number;
  supplier?: CatalogSupplier | null;
  createAt: string;
  updateAt: string;
}

export interface IngredientPageResponse {
  content: CatalogIngredient[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface IngredientSearchParams {
  page?: number;
  size?: number;
  search?: string;
  supplierId?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}

export interface CreateIngredientRequest {
  name: string;
  unit?: string | null;
  unitPrice: number;
  supplierId: number;
}

export interface UpdateIngredientRequest {
  name?: string;
  unit?: string | null;
  unitPrice?: number;
  supplierId?: number;
}

// Unit types
export interface CatalogUnit {
  code: string;
  name: string;
  dimension: string;
  factorToBase: number;
  baseUnitCode?: string | null;
  createAt: string;
  updateAt: string;
}

// Recipe types (catalog service)
export interface CatalogRecipeItem {
  id?: number;
  ingredient: CatalogIngredient;
  qty: number;
  unit: CatalogUnit;
  note?: string | null;
  createAt: string;
  updateAt: string;
}

export interface CatalogRecipe {
  recipeId: number;
  name: string;
  productDetail: CatalogProductDetail;
  category?: CatalogCategory | null;
  version: number;
  description?: string | null;
  yield?: number | null;
  instructions: string;
  status: string;
  items: CatalogRecipeItem[];
  createAt: string;
  updateAt: string;
}

export interface RecipePageResponse {
  content: CatalogRecipe[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface RecipeSearchParams {
  keyword?: string;
  status?: string;
  pdId?: number;
  productId?: number;
  categoryId?: number;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface CreateRecipeItemRequest {
  ingredientId: number;
  qty: number;
  unitCode: string;
  note?: string | null;
}

export interface CreateRecipeRequest {
  pdId: number;
  name: string;
  version: number;
  description?: string | null;
  yield?: number | null;
  instructions: string;
  status?: string;
  items: CreateRecipeItemRequest[];
}

export interface UpdateRecipeItemRequest {
  id?: number; // if present => update, else create
  ingredientId: number;
  qty: number;
  unitCode: string;
  note?: string | null;
}

export interface UpdateRecipeRequest {
  pdId?: number;
  name?: string;
  version?: number;
  description?: string | null;
  yield?: number | null;
  instructions?: string;
  status?: string;
  items?: UpdateRecipeItemRequest[];
}

export interface CreateUnitRequest {
  code: string;
  name: string;
  dimension: string;
  factorToBase: number;
  baseUnitCode?: string | null;
}

export interface UpdateUnitRequest {
  name?: string;
  dimension?: string;
  factorToBase?: number;
  baseUnitCode?: string | null;
}
  
  export interface Order {
    id: string;
    customerId?: string;
    items: OrderItem[];
    total: number;
    status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
    type: 'dine-in' | 'takeaway' | 'online';
    branchId: string;
    staffId: string;
    createdAt: string;
  }
  
  export interface OrderItem {
    productId: string;
    productName: string;
    size: 'S' | 'M' | 'L';
    quantity: number;
    price: number;
    notes?: string;
  }
  
  export interface Reservation {
    id: string;
    customerName: string;
    customerPhone: string;
    tableNumber: number;
    guestCount: number;
    date: string;
    time: string;
    status: 'confirmed' | 'seated' | 'completed' | 'cancelled';
    branchId: string;
  }
  
  export interface InventoryItem {
    id: string;
    name: string;
    category: string;
    currentStock: number;
    minStock: number;
    unit: string;
    lastUpdated: string;
    branchId: string;
  }