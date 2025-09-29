import { usePaginatedApi } from './useApi';
import { orderService, OrderFilters, OrderListResponse } from '../services';
import { Order } from '../types';

export function useOrders() {
  const api = usePaginatedApi<Order>();

  const getOrders = async (filters?: OrderFilters) => {
    return await api.execute(() => orderService.getOrders(filters));
  };

  const createOrder = async (orderData: any) => {
    return await orderService.createOrder(orderData);
  };

  const updateOrder = async (id: string, orderData: any) => {
    return await orderService.updateOrder(id, orderData);
  };

  const updateOrderStatus = async (id: string, status: Order['status']) => {
    return await orderService.updateOrderStatus(id, status);
  };

  const deleteOrder = async (id: string) => {
    return await orderService.deleteOrder(id);
  };

  const getOrderStats = async (filters?: { branchId?: string; dateFrom?: string; dateTo?: string }) => {
    return await orderService.getOrderStats(filters);
  };

  return {
    orders: api.data,
    loading: api.loading,
    error: api.error,
    pagination: api.pagination,
    getOrders,
    createOrder,
    updateOrder,
    updateOrderStatus,
    deleteOrder,
    getOrderStats,
    reset: api.reset,
  };
}
