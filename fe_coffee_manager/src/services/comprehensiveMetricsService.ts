import { apiClient } from '../config/api';

const baseUrl = '/api/ai/metrics';

export interface DailyRevenue {
  report_date: string;
  total_revenue: number;
  branch_count: number;
  avg_revenue_per_branch: number;
}

export interface BranchCount {
  total_branches: number;
  branches_with_data: number;
}

export interface MonthlyRevenueOrder {
  year: number;
  month: number;
  total_revenue: number;
  total_orders: number;
  avg_revenue_per_day: number;
  avg_orders_per_day: number;
  branch_count: number;
}

export interface YearlyRevenueOrders {
  year: number;
  total_revenue: number;
  total_orders: number;
  monthly_data: MonthlyRevenueOrder[];
}

export interface TopBranchPerformance {
  branch_id: number;
  total_revenue: number;
  order_count: number;
  avg_order_value: number;
  rank: number;
}

export interface MonthlyTopBranches {
  year: number;
  month: number;
  top_branches: TopBranchPerformance[];
  total_branches: number;
}

export interface ComprehensiveMetricsResponse {
  daily_revenue: DailyRevenue;
  branch_count: BranchCount;
  yearly_revenue_orders: YearlyRevenueOrders;
  monthly_top_branches: MonthlyTopBranches;
}

export const comprehensiveMetricsService = {
  /**
   * Lấy comprehensive metrics từ AI service
   */
  getComprehensiveMetrics: async (
    targetDate?: string,
    year?: number,
    month?: number,
    topBranchesLimit?: number
  ): Promise<ComprehensiveMetricsResponse> => {
    try {
      const params = new URLSearchParams();
      if (targetDate) params.append('target_date', targetDate);
      if (year) params.append('year', year.toString());
      if (month) params.append('month', month.toString());
      if (topBranchesLimit) params.append('top_branches_limit', topBranchesLimit.toString());

      const queryString = params.toString();
      const url = `${baseUrl}/comprehensive${queryString ? `?${queryString}` : ''}`;

      const response = await apiClient.get<any>(url);
      
      // Handle ApiResponse wrapper from gateway
      if (response.code && response.result) {
        return response.result;
      }
      // If response is already the result object
      if (response.daily_revenue !== undefined) {
        return response;
      }
      throw new Error(`API Error: ${response.code || 'Unknown'}`);
    } catch (error) {
      console.error('Error fetching comprehensive metrics:', error);
      throw error;
    }
  },
};

export default comprehensiveMetricsService;

