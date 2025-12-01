// AI Statistics Service - Real API Integration
import { apiClient } from '../config/api';
import { API_ENDPOINTS } from '../config/constants';

// Types matching backend API structure
export interface AIAnalysisRequest {
  branch_id: number;
  date: string;
  query?: string;
  tool_type?: 'tool1' | 'tool3';
}

export interface AIAnalysisResponse {
  success: boolean;
  branch_id: number;
  date: string;
  analysis: string;
  summary?: {
    total_revenue?: number;
    order_count?: number;
    avg_order_value?: number;
    peak_hour?: number;
    customer_count?: number;
    new_customers?: number;
    repeat_customers?: number;
    customer_retention_rate?: number;
    unique_customers?: number;
    unique_products_sold?: number;
    product_diversity_score?: number;
    top_selling_product_id?: number;
    top_selling_product_name?: string;
    avg_review_score?: number;
    total_reviews?: number;
    positive_reviews?: number;
    negative_reviews?: number;
    review_rate?: number;
    low_stock_count?: number;
    out_of_stock_count?: number;
    total_inventory_value?: number;
    total_material_cost?: number;
    profit_margin?: number;
  };
  recommendations?: string[];
  raw_data?: {
    branch_id?: number;
    date?: string;
    revenue_metrics?: any;
    customer_metrics?: any;
    product_metrics?: any;
    review_metrics?: any;
    inventory_metrics?: any;
    material_cost_metrics?: any;
    isolation_forest_anomaly?: any;
    prophet_forecast?: any;
  };
  message?: string;
}

export interface ReportResponse {
  id: number;
  branch_id: number;
  report_date: string;
  tool_type?: string | null;
  analysis: string;
  summary?: any;
  recommendations?: string[];
  raw_data?: any;
  created_at: string;
  updated_at: string;
  is_sent: boolean;
  sent_at?: string | null;
  query?: string | null;
  ai_model?: string | null;
  processing_time_ms?: number | null;
}

export interface ReportListResponse {
  success?: boolean;
  message?: string;
  total: number;
  page: number;
  page_size: number;
  items: ReportResponse[];
}

export interface BranchMonthlyStats {
  branch_id: number;
  year: number;
  month: number;
  total_revenue: number;
  total_orders: number;
  total_material_cost?: number;
  total_profit?: number;
  profit_margin?: number;
  avg_revenue_per_day: number;
  avg_orders_per_day: number;
  avg_profit_per_day?: number;
  days_with_data: number;
  avg_order_value: number;
  customer_count: number;
  top_product_id: number | null;
}

export interface BranchYearlyStats {
  branch_id: number;
  year: number;
  total_revenue: number;
  total_orders: number;
  total_material_cost?: number;
  total_profit?: number;
  profit_margin?: number;
  avg_revenue_per_month: number;
  avg_orders_per_month: number;
  avg_profit_per_month?: number;
  months_with_data: number;
  avg_order_value: number;
  monthly_data: Array<{
    year: number;
    month: number;
    total_revenue: number;
    total_orders: number;
    avg_revenue_per_day: number;
    avg_orders_per_day: number;
    branch_count: number;
  }>;
}

// Service interface
export interface AIStatisticsService {
  getAIAnalysis(request: AIAnalysisRequest): Promise<AIAnalysisResponse>;
  getReportsByBranch(branchId: number, page?: number, pageSize?: number): Promise<ReportListResponse>;
  getReportById(reportId: number): Promise<ReportResponse>;
  getReportByBranchAndDate(branchId: number, date: string): Promise<ReportResponse>;
  getUnsentReports(branchId?: number, limit?: number): Promise<ReportListResponse>;
  sendReport(reportId: number, managerEmails?: string[]): Promise<any>;
  sendUnsentReports(branchId?: number, managerEmails?: string[], limit?: number): Promise<any>;
  getDistributionStatus(): Promise<any>;
  getSchedulerStatus(): Promise<any>;
  triggerDailyReports(targetDate?: string, branchIds?: number[]): Promise<any>;
  getBranchMonthlyStats(branchId: number, year?: number, month?: number): Promise<BranchMonthlyStats>;
  getBranchYearlyStats(branchId: number, year?: number): Promise<BranchYearlyStats>;
  getAllBranchesMonthlyStats(year?: number, month?: number): Promise<AllBranchesMonthlyStats>;
  getAllBranchesYearlyStats(year?: number): Promise<AllBranchesYearlyStats>;
}

export interface AllBranchesMonthlyStats {
  year: number;
  month: number;
  total_revenue: number;
  total_orders: number;
  total_material_cost?: number;
  total_profit?: number;
  profit_margin?: number;
  avg_revenue_per_day: number;
  avg_orders_per_day: number;
  avg_profit_per_day?: number;
  avg_revenue_per_branch: number;
  days_with_data: number;
  avg_order_value: number;
  branch_count: number;
  total_customer_count: number;
}

export interface AllBranchesYearlyStats {
  year: number;
  total_revenue: number;
  total_orders: number;
  total_material_cost?: number;
  total_profit?: number;
  profit_margin?: number;
  avg_revenue_per_month: number;
  avg_orders_per_month: number;
  avg_profit_per_month?: number;
  months_with_data: number;
  avg_order_value: number;
  avg_branch_count: number;
  monthly_data: Array<{
    year: number;
    month: number;
    total_revenue: number;
    total_orders: number;
    total_material_cost?: number;
    total_profit?: number;
    avg_revenue_per_day: number;
    avg_orders_per_day: number;
    branch_count: number;
  }>;
}

// Real service implementation
const aiStatisticsService: AIStatisticsService = {
  /**
   * Get AI analysis for a branch on a specific date
   */
  async getAIAnalysis(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    try {
      const params = new URLSearchParams({
        branch_id: request.branch_id.toString(),
        date: request.date,
        save_to_db: 'true',
      });
      
      if (request.query) {
        params.append('query', request.query);
      }
      
      if (request.tool_type) {
        params.append('tool_type', request.tool_type);
      }

      const response = await apiClient.get<AIAnalysisResponse>(
        `${API_ENDPOINTS.AI_STATISTICS.AI_ANALYSIS}?${params.toString()}`
      );
      
      // Handle API response format (may have result wrapper)
      return (response as any).result || response;
    } catch (error) {
      console.error('Error fetching AI analysis:', error);
      throw error;
    }
  },

  /**
   * Get all reports for a branch
   */
  async getReportsByBranch(
    branchId: number,
    page: number = 1,
    pageSize: number = 10
  ): Promise<ReportListResponse> {
    try {
      const response = await apiClient.get<ReportListResponse>(
        API_ENDPOINTS.AI_STATISTICS.REPORTS.BY_BRANCH(branchId, page, pageSize)
      );
      
      return (response as any).result || response;
    } catch (error) {
      console.error('Error fetching reports by branch:', error);
      throw error;
    }
  },

  /**
   * Get a specific report by ID
   */
  async getReportById(reportId: number): Promise<ReportResponse> {
    try {
      const response = await apiClient.get<ReportResponse>(
        API_ENDPOINTS.AI_STATISTICS.REPORTS.BY_ID(reportId)
      );
      
      return (response as any).result || response;
    } catch (error) {
      console.error('Error fetching report by ID:', error);
      throw error;
    }
  },

  /**
   * Get report for a branch on a specific date
   */
  async getReportByBranchAndDate(branchId: number, date: string): Promise<ReportResponse> {
    try {
      const response = await apiClient.get<ReportResponse>(
        API_ENDPOINTS.AI_STATISTICS.REPORTS.BY_BRANCH_AND_DATE(branchId, date)
      );
      
      return (response as any).result || response;
    } catch (error) {
      console.error('Error fetching report by branch and date:', error);
      throw error;
    }
  },

  /**
   * Get unsent reports
   */
  async getUnsentReports(branchId?: number, limit: number = 100): Promise<ReportListResponse> {
    try {
      const params = new URLSearchParams();
      if (branchId) {
        params.append('branch_id', branchId.toString());
      }
      params.append('limit', limit.toString());

      const response = await apiClient.get<ReportListResponse>(
        `${API_ENDPOINTS.AI_STATISTICS.REPORTS.UNSENT}?${params.toString()}`
      );
      
      return (response as any).result || response;
    } catch (error) {
      console.error('Error fetching unsent reports:', error);
      throw error;
    }
  },

  /**
   * Send a report to manager(s)
   */
  async sendReport(reportId: number, managerEmails?: string[]): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (managerEmails && managerEmails.length > 0) {
        managerEmails.forEach(email => {
          params.append('manager_emails', email);
        });
      }

      const response = await apiClient.post<any>(
        `${API_ENDPOINTS.AI_STATISTICS.DISTRIBUTION.SEND(reportId)}${params.toString() ? `?${params.toString()}` : ''}`
      );
      
      return (response as any).result || response;
    } catch (error) {
      console.error('Error sending report:', error);
      throw error;
    }
  },

  /**
   * Send all unsent reports
   */
  async sendUnsentReports(branchId?: number, managerEmails?: string[], limit: number = 10): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (branchId) {
        params.append('branch_id', branchId.toString());
      }
      if (managerEmails && managerEmails.length > 0) {
        managerEmails.forEach(email => {
          params.append('manager_emails', email);
        });
      }
      params.append('limit', limit.toString());

      const response = await apiClient.post<any>(
        `${API_ENDPOINTS.AI_STATISTICS.DISTRIBUTION.SEND_UNSENT}?${params.toString()}`
      );
      
      return (response as any).result || response;
    } catch (error) {
      console.error('Error sending unsent reports:', error);
      throw error;
    }
  },

  /**
   * Get distribution status
   */
  async getDistributionStatus(): Promise<any> {
    try {
      const response = await apiClient.get<any>(
        API_ENDPOINTS.AI_STATISTICS.DISTRIBUTION.STATUS
      );
      
      return (response as any).result || response;
    } catch (error) {
      console.error('Error fetching distribution status:', error);
      throw error;
    }
  },

  /**
   * Get scheduler status
   */
  async getSchedulerStatus(): Promise<any> {
    try {
      const response = await apiClient.get<any>(
        API_ENDPOINTS.AI_STATISTICS.SCHEDULER.STATUS
      );
      
      return (response as any).result || response;
    } catch (error) {
      console.error('Error fetching scheduler status:', error);
      throw error;
    }
  },

  /**
   * Trigger daily reports generation
   */
  async triggerDailyReports(targetDate?: string, branchIds?: number[]): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (targetDate) {
        params.append('target_date', targetDate);
      }
      if (branchIds && branchIds.length > 0) {
        branchIds.forEach(id => {
          params.append('branch_ids', id.toString());
        });
      }

      const response = await apiClient.post<any>(
        `${API_ENDPOINTS.AI_STATISTICS.SCHEDULER.TRIGGER_DAILY}${params.toString() ? `?${params.toString()}` : ''}`
      );
      
      return (response as any).result || response;
    } catch (error) {
      console.error('Error triggering daily reports:', error);
      throw error;
    }
  },

  /**
   * Get monthly statistics for a specific branch
   */
  async getBranchMonthlyStats(branchId: number, year?: number, month?: number): Promise<BranchMonthlyStats> {
    try {
      const response = await apiClient.get<BranchMonthlyStats>(
        API_ENDPOINTS.AI_STATISTICS.METRICS.BRANCH_MONTHLY(branchId, year, month)
      );
      
      return (response as any).result || response;
    } catch (error) {
      console.error('Error fetching branch monthly stats:', error);
      throw error;
    }
  },

  /**
   * Get yearly statistics for a specific branch
   */
  async getBranchYearlyStats(branchId: number, year?: number): Promise<BranchYearlyStats> {
    try {
      const response = await apiClient.get<BranchYearlyStats>(
        API_ENDPOINTS.AI_STATISTICS.METRICS.BRANCH_YEARLY(branchId, year)
      );
      
      return (response as any).result || response;
    } catch (error) {
      console.error('Error fetching branch yearly stats:', error);
      throw error;
    }
  },

  /**
   * Get monthly statistics aggregated across all branches (for admin)
   */
  async getAllBranchesMonthlyStats(year?: number, month?: number): Promise<AllBranchesMonthlyStats> {
    try {
      const response = await apiClient.get<AllBranchesMonthlyStats>(
        API_ENDPOINTS.AI_STATISTICS.METRICS.ALL_BRANCHES_MONTHLY(year, month)
      );
      
      return (response as any).result || response;
    } catch (error) {
      console.error('Error fetching all branches monthly stats:', error);
      throw error;
    }
  },

  /**
   * Get yearly statistics aggregated across all branches (for admin)
   */
  async getAllBranchesYearlyStats(year?: number): Promise<AllBranchesYearlyStats> {
    try {
      const response = await apiClient.get<AllBranchesYearlyStats>(
        API_ENDPOINTS.AI_STATISTICS.METRICS.ALL_BRANCHES_YEARLY(year)
      );
      
      return (response as any).result || response;
    } catch (error) {
      console.error('Error fetching all branches yearly stats:', error);
      throw error;
    }
  },
};

export default aiStatisticsService;
