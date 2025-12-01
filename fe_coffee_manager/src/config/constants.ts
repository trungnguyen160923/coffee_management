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
  CATALOGS: {
    SIZES: '/api/catalogs/sizes',
    PRODUCTS: '/api/catalogs/products',
    CATEGORIES: '/api/catalogs/categories',
    SUPPLIERS: '/api/catalogs/suppliers',
    INGREDIENTS: '/api/catalogs/ingredients',
    UNITS: '/api/catalogs/units',
    RECIPES: '/api/catalogs/recipes',
    PURCHASE_ORDERS_BULK: '/api/catalogs/purchase-orders/bulk',
  },
  ORDERS: {
    BASE: '/api/order-service/api/orders',
    STATS: '/api/order-service/api/orders/stats',
    STATUS: (id: string) => `/api/order-service/api/orders/${id}/status`,
    ITEMS: (id: string) => `/api/order-service/api/orders/${id}/items`,
  },
  POS: {
    ORDERS: '/api/order-service/api/pos/orders',
    ORDERS_BY_STAFF: (staffId: number | string) => `/api/order-service/api/pos/orders/staff/${staffId}`,
    ORDERS_BY_BRANCH: (branchId: number | string) => `/api/order-service/api/pos/orders/branch/${branchId}`,
    ORDER_BY_ID: (id: string) => `/api/order-service/api/pos/orders/${id}`,
    ORDER_STATUS: (id: string) => `/api/order-service/api/pos/orders/${id}/status`,
    PRODUCTS: '/api/order-service/api/pos/products',
    PRODUCT_BY_ID: (id: string) => `/api/order-service/api/pos/products/${id}`,
    TABLES_BY_BRANCH: (branchId: number | string) => `/api/order-service/api/pos/tables/branch/${branchId}`,
    TABLES_BY_BRANCH_STATUS: (branchId: number | string, status: string) => `/api/order-service/api/pos/tables/branch/${branchId}/status/${status}`,
  },
  RESERVATIONS: {
    BASE: '/api/order-service/api/reservations',
    BY_BRANCH: (id: number | string) => `/api/order-service/api/reservations/branch/${id}`,
    STATUS: (id: number | string) => `/api/order-service/api/reservations/${id}/status`,
  },
  TABLES: {
    BASE: '/api/order-service/api/staff/tables',
    BY_BRANCH: (id: number | string) => `/api/order-service/api/staff/tables/branch/${id}`,
    AVAILABLE: (id: number | string) => `/api/order-service/api/staff/tables/branch/${id}/available`,
    ASSIGN: '/api/order-service/api/staff/tables/assign',
    BY_RESERVATION: (id: number | string) => `/api/order-service/api/staff/tables/reservation/${id}`,
    STATUS: '/api/order-service/api/staff/tables/status',
    STATUS_SUMMARY: (id: number | string) => `/api/order-service/api/staff/tables/branch/${id}/status`,
  },
  BRANCHES: {
    BASE: '/api/order-service/api/branches',
    STATS: '/api/order-service/api/branches/stats',
    REVENUE: (id: string) => `/api/order-service/api/branches/${id}/revenue`,
    STAFF: (id: string) => `/api/order-service/api/branches/${id}/staff`,
    ASSIGN_MANAGER: (id: number | string) => `/api/order-service/api/branches/${id}/assign-manager`,
    UNASSIGN_MANAGER_INTERNAL: (id: number | string) => `/api/order-service/api/branches/internal/${id}/unassign-manager`,
    UNASSIGNED: '/api/order-service/api/branches/unassigned',
  },
  DISCOUNTS: {
    BASE: '/api/order-service/api/discounts',
    ACTIVE: '/api/order-service/api/discounts/active',
    APPLY: '/api/order-service/api/discounts/apply',
    USE: (code: string) => `/api/order-service/api/discounts/${code}/use`,
    VALIDATE: '/api/order-service/api/discounts/validate',
    AVAILABLE: '/api/order-service/api/discounts/available',
  },
  AI_STATISTICS: {
    BASE: '/api/ai',
    ANALYTICS: '/api/ai',
    AGENT: '/api/ai/agent',
    // AI Service endpoints (port 8005)
    AI_ANALYSIS: '/api/ai/agent/analyze',
    METRICS: {
      BRANCH_MONTHLY: (branchId: number, year?: number, month?: number) => {
        const params = new URLSearchParams();
        params.append('branch_id', branchId.toString());
        if (year) params.append('year', year.toString());
        if (month) params.append('month', month.toString());
        return `/api/ai/metrics/branch/monthly?${params.toString()}`;
      },
      BRANCH_YEARLY: (branchId: number, year?: number) => {
        const params = new URLSearchParams();
        params.append('branch_id', branchId.toString());
        if (year) params.append('year', year.toString());
        return `/api/ai/metrics/branch/yearly?${params.toString()}`;
      },
      ALL_BRANCHES_MONTHLY: (year?: number, month?: number) => {
        const params = new URLSearchParams();
        if (year) params.append('year', year.toString());
        if (month) params.append('month', month.toString());
        return `/api/ai/metrics/all-branches/monthly${params.toString() ? `?${params.toString()}` : ''}`;
      },
      ALL_BRANCHES_YEARLY: (year?: number) => {
        const params = new URLSearchParams();
        if (year) params.append('year', year.toString());
        return `/api/ai/metrics/all-branches/yearly${params.toString() ? `?${params.toString()}` : ''}`;
      },
    },
    REPORTS: {
      BASE: '/api/ai/reports',
      BY_ID: (id: number) => `/api/ai/reports/${id}`,
      BY_BRANCH: (branchId: number, page?: number, pageSize?: number) => {
        const params = new URLSearchParams();
        if (page) params.append('page', page.toString());
        if (pageSize) params.append('page_size', pageSize.toString());
        return `/api/ai/reports/branch/${branchId}${params.toString() ? `?${params.toString()}` : ''}`;
      },
      BY_BRANCH_AND_DATE: (branchId: number, date: string) => `/api/ai/reports/branch/${branchId}/date/${date}`,
      UNSENT: '/api/ai/reports/unsent/list',
    },
    DISTRIBUTION: {
      SEND: (reportId: number) => `/api/ai/distribution/send/${reportId}`,
      SEND_UNSENT: '/api/ai/distribution/send-unsent',
      STATUS: '/api/ai/distribution/status',
    },
    SCHEDULER: {
      STATUS: '/api/ai/scheduler/status',
      START: '/api/ai/scheduler/start',
      STOP: '/api/ai/scheduler/stop',
      TRIGGER_DAILY: '/api/ai/scheduler/trigger/daily-reports',
      TRIGGER_SEND_UNSENT: '/api/ai/scheduler/trigger/send-unsent',
    },
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

// Table Status
export const TABLE_STATUS = {
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  RESERVED: 'RESERVED',
  MAINTENANCE: 'MAINTENANCE',
} as const;

// Discount Status
export const DISCOUNT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  EXPIRED: 'expired',
} as const;

// Discount Types
export const DISCOUNT_TYPES = {
  PERCENTAGE: 'percentage',
  FIXED_AMOUNT: 'fixed_amount',
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