import { apiClient } from '../config/api';

const baseUrl = '/api/order-service/analytics/metrics';

export interface HourlyOrderCount {
  hour: number;
  orderCount: number;
}

export interface BranchDailyStatsResponse {
  branchId: number;
  date: string;
  totalOrders: number;
  totalRevenue: number;
  hourlyOrderCounts: HourlyOrderCount[];
}

export interface DailyRevenue {
  date: string;
  dayOfWeek: string;
  revenue: number;
  orderCount: number;
}

export interface BranchWeeklyRevenueResponse {
  branchId: number;
  weekStartDate: string;
  weekEndDate: string;
  totalRevenue: number;
  totalOrders: number;
  dailyRevenues: DailyRevenue[];
}

export interface TopSellingProduct {
  productId: number;
  productName: string;
  categoryName: string | null;
  totalQuantitySold: number;
  totalRevenue: number;
  orderCount: number;
  avgOrderValue: number;
  rank: number;
}

export interface TopSellingProductsResponse {
  branchId: number | null;
  startDate: string | null;
  endDate: string | null;
  totalProducts: number;
  topProducts: TopSellingProduct[];
}

export const analyticsService = {
  /**
   * Lấy thống kê đơn hàng và doanh thu theo ngày của chi nhánh
   */
  getBranchDailyStats: async (branchId: number, date: string): Promise<BranchDailyStatsResponse> => {
    try {
      const response = await apiClient.get<any>(
        `${baseUrl}/daily-stats?branchId=${branchId}&date=${date}`
      );
      // Handle ApiResponse wrapper from gateway
      if (response.code && response.result) {
        return response.result;
      }
      // If response is already the result object
      if (response.branchId !== undefined) {
        return response;
      }
      throw new Error(`API Error: ${response.code || 'Unknown'}`);
    } catch (error) {
      console.error('Error fetching daily stats:', error);
      throw error;
    }
  },

  /**
   * Lấy doanh thu theo tuần hiện tại của chi nhánh
   */
  getBranchWeeklyRevenue: async (branchId: number): Promise<BranchWeeklyRevenueResponse> => {
    try {
      const response = await apiClient.get<any>(
        `${baseUrl}/weekly-revenue?branchId=${branchId}`
      );
      // Handle ApiResponse wrapper from gateway
      if (response.code && response.result) {
        return response.result;
      }
      // If response is already the result object
      if (response.branchId !== undefined) {
        return response;
      }
      throw new Error(`API Error: ${response.code || 'Unknown'}`);
    } catch (error) {
      console.error('Error fetching weekly revenue:', error);
      throw error;
    }
  },

  /**
   * Lấy danh sách top selling products
   */
  getTopSellingProducts: async (
    branchId?: number,
    startDate?: string,
    endDate?: string,
    limit?: number,
    sortBy?: 'quantity' | 'revenue'
  ): Promise<TopSellingProductsResponse> => {
    try {
      const params = new URLSearchParams();
      if (branchId) params.append('branchId', branchId.toString());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (limit) params.append('limit', limit.toString());
      if (sortBy) params.append('sortBy', sortBy);

      const queryString = params.toString();
      const url = `${baseUrl}/top-selling-products${queryString ? `?${queryString}` : ''}`;

      const response = await apiClient.get<any>(url);
      
      // Handle ApiResponse wrapper from gateway
      if (response.code && response.result) {
        return response.result;
      }
      // If response is already the result object
      if (response.topProducts !== undefined) {
        return response;
      }
      throw new Error(`API Error: ${response.code || 'Unknown'}`);
    } catch (error) {
      console.error('Error fetching top selling products:', error);
      throw error;
    }
  },
};

export default analyticsService;

