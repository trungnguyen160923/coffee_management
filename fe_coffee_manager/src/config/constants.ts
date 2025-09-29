// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth-service/auth/token',
    LOGOUT: '/api/auth-service/auth/logout',
    REGISTER: '/api/auth-service/users/registration',
    REFRESH: '/api/auth-service/auth/refresh',
    ME: '/api/auth-service/users/me',
    CHANGE_PASSWORD: '/api/auth-service/auth/change-password',
  },
  PRODUCTS: {
    BASE: '/api/products',
    IMAGE: (id: string) => `/api/products/${id}/image`,
    RECIPES: (id: string) => `/api/products/${id}/recipes`,
  },
  ORDERS: {
    BASE: '/api/orders',
    STATS: '/api/orders/stats',
    STATUS: (id: string) => `/api/orders/${id}/status`,
    ITEMS: (id: string) => `/api/orders/${id}/items`,
  },
  BRANCHES: {
    BASE: '/api/branches',
    STATS: '/api/branches/stats',
    REVENUE: (id: string) => `/api/branches/${id}/revenue`,
    STAFF: (id: string) => `/api/branches/${id}/staff`,
    MANAGER: (id: string) => `/api/branches/${id}/manager`,
  },
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
} as const;

// Order Status
export const ORDER_STATUS = {
  PENDING: 'pending',
  PREPARING: 'preparing',
  READY: 'ready',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

// Order Types
export const ORDER_TYPES = {
  DINE_IN: 'dine-in',
  TAKEAWAY: 'takeaway',
  ONLINE: 'online',
} as const;

// Product Status
export const PRODUCT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

// Branch Status
export const BRANCH_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

// Date Formats
export const DATE_FORMATS = {
  API: 'YYYY-MM-DD',
  DISPLAY: 'DD/MM/YYYY',
  DATETIME: 'DD/MM/YYYY HH:mm',
} as const;

// Default Images
export const DEFAULT_IMAGES = {
  USER_AVATAR: '/images/default_user.png',
  PRODUCT: '/images/default_product.png',
  LOGO: '/images/logo.png',
} as const;