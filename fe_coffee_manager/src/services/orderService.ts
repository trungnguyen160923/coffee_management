import { apiClient } from '../config/api';
import { Order, OrderItem } from '../types';
import { API_ENDPOINTS } from '../config/constants';

// Order API interfaces
export interface CreateOrderRequest {
  customerId?: string;
  items: Omit<OrderItem, 'productName'>[];
  type: 'dine-in' | 'takeaway' | 'online';
  branchId: string;
  notes?: string;
}

export interface UpdateOrderRequest {
  status?: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  items?: OrderItem[];
  notes?: string;
}

export interface OrderFilters {
  status?: string;
  type?: string;
  branchId?: string;
  staffId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface OrderListResponse {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  ordersByStatus: Record<string, number>;
  ordersByType: Record<string, number>;
  dailyRevenue: Array<{ date: string; revenue: number }>;
}

export interface OrderService {
  // Order CRUD
  getOrders: (filters?: OrderFilters) => Promise<OrderListResponse>;
  getOrder: (id: string) => Promise<Order>;
  createOrder: (order: CreateOrderRequest) => Promise<Order>;
  updateOrder: (id: string, order: UpdateOrderRequest) => Promise<Order>;
  deleteOrder: (id: string) => Promise<void>;
  getOrdersByBranch: (branchId: number | string) => Promise<any[]>;

  // Order management
  updateOrderStatus: (id: string, status: Order['status']) => Promise<Order>;
  getOrderStats: (filters?: { branchId?: string; dateFrom?: string; dateTo?: string }) => Promise<OrderStats>;

  // Order items
  addOrderItem: (orderId: string, item: Omit<OrderItem, 'productName'>) => Promise<Order>;
  updateOrderItem: (orderId: string, itemId: string, item: Partial<OrderItem>) => Promise<Order>;
  removeOrderItem: (orderId: string, itemId: string) => Promise<Order>;
}

// Order Service Implementation
export const orderService: OrderService = {
  async getOrders(filters: OrderFilters = {}): Promise<OrderListResponse> {
    const params = new URLSearchParams();

    if (filters.status) params.append('status', filters.status);
    if (filters.type) params.append('type', filters.type);
    if (filters.branchId) params.append('branchId', filters.branchId);
    if (filters.staffId) params.append('staffId', filters.staffId);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const endpoint = `${API_ENDPOINTS.ORDERS.BASE}${queryString ? `?${queryString}` : ''}`;

    const response = await apiClient.get<any>(endpoint);
    
    // Backend returns ApiResponse<OrderListResponse>, so we need to unwrap it
    if (response && typeof response === 'object') {
      // If response has 'result' property, unwrap it
      if ('result' in response && response.result) {
        return response.result as OrderListResponse;
      }
      // If response already has 'orders' property, it's already OrderListResponse
      if ('orders' in response) {
        return response as OrderListResponse;
      }
    }
    
    // Fallback: return empty response
    return {
      orders: [],
      total: 0,
      page: filters.page || 0,
      limit: filters.limit || 50,
      totalPages: 0
    };
  },

  async getOrder(id: string): Promise<Order> {
    return await apiClient.get<Order>(`${API_ENDPOINTS.ORDERS.BASE}/${id}`);
  },

  async createOrder(order: CreateOrderRequest): Promise<Order> {
    return await apiClient.post<Order>(API_ENDPOINTS.ORDERS.BASE, order);
  },

  async updateOrder(id: string, order: UpdateOrderRequest): Promise<Order> {
    return await apiClient.put<Order>(`${API_ENDPOINTS.ORDERS.BASE}/${id}`, order);
  },

  async deleteOrder(id: string): Promise<void> {
    await apiClient.delete(`${API_ENDPOINTS.ORDERS.BASE}/${id}`);
  },

  async updateOrderStatus(id: string, status: Order['status']): Promise<Order> {
    const endpoint = `${API_ENDPOINTS.ORDERS.STATUS(id)}?status=${encodeURIComponent(status)}`;
    const resp = await apiClient.put<any>(endpoint);
    // Support both wrapped and unwrapped responses
    if (resp && typeof resp === 'object' && 'result' in resp) {
      return resp.result as Order;
    }
    return resp as Order;
  },

  async getOrdersByBranch(branchId: number | string): Promise<any[]> {
    const endpoint = `${API_ENDPOINTS.ORDERS.BASE}/branch/${branchId}`;
    const resp = await apiClient.get<{ code: number; result: any[] }>(endpoint);
    // Gateway-wrapped response
    // When using apiClient.get with generic T, most services return the unwrapped body already.
    // But to be safe, support both shapes.
    const maybeWrapped: any = resp as any;
    if (maybeWrapped && typeof maybeWrapped.code === 'number' && 'result' in maybeWrapped) {
      return maybeWrapped.result || [];
    }
    return (resp as unknown as any[]) || [];
  },

  async getOrderStats(filters: { branchId?: string; dateFrom?: string; dateTo?: string } = {}): Promise<OrderStats> {
    const params = new URLSearchParams();

    if (filters.branchId) params.append('branchId', filters.branchId);
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);

    const queryString = params.toString();
    const endpoint = `${API_ENDPOINTS.ORDERS.STATS}${queryString ? `?${queryString}` : ''}`;

    return await apiClient.get<OrderStats>(endpoint);
  },

  async addOrderItem(orderId: string, item: Omit<OrderItem, 'productName'>): Promise<Order> {
    return await apiClient.post<Order>(API_ENDPOINTS.ORDERS.ITEMS(orderId), item);
  },

  async updateOrderItem(orderId: string, itemId: string, item: Partial<OrderItem>): Promise<Order> {
    return await apiClient.put<Order>(`${API_ENDPOINTS.ORDERS.ITEMS(orderId)}/${itemId}`, item);
  },

  async removeOrderItem(orderId: string, itemId: string): Promise<Order> {
    return await apiClient.delete<Order>(`${API_ENDPOINTS.ORDERS.ITEMS(orderId)}/${itemId}`);
  },
};

export default orderService;
