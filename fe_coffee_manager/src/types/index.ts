export interface User {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'manager' | 'staff';
    branchId?: string;
    avatar?: string;
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