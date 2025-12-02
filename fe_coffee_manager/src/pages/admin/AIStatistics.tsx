import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Brain,
  BarChart3,
  Calendar,
  RefreshCw,
  Download,
  Filter,
  Building2,
  Star,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Loader2,
  Package,
  Users,
  CreditCard,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
  Line,
  Area,
  AreaChart,
} from 'recharts';

// Import service for single branch data
import { aiStatisticsService } from '../../services';
import { AIAnalysisResponse, AllBranchesMonthlyStats, AllBranchesYearlyStats, BranchMonthlyStats, BranchYearlyStats } from '../../services/aiStatisticsService';
import { exportAllBranchesToPDF } from '../../services/pdfExportService';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../config/api';
import {
  AdminMonthlyStatsView,
  MonthlyStatsView,
  AdminYearlyStatsView,
  YearlyStatsView,
  DayTabSkeleton,
  MonthTabSkeleton,
  YearTabSkeleton,
  SingleBranchDaySkeleton,
  SingleBranchMonthSkeleton,
  SingleBranchYearSkeleton,
} from './statistics';

// Types for API response
interface AllBranchesAIAnalysisResponse {
  success: boolean;
  date: string;
  analysis: string;
  summary?: {
    total_branches?: number;
    active_branches?: number;
    total_revenue?: number;
    total_order_count?: number;
    avg_order_value?: number;
    total_customer_count?: number;
    total_new_customers?: number;
    total_repeat_customers?: number;
    overall_customer_retention_rate?: number;
    total_unique_products_sold?: number;
    overall_product_diversity_score?: number;
    overall_avg_review_score?: number;
    total_reviews?: number;
    total_positive_reviews?: number;
    total_negative_reviews?: number;
    average_revenue_per_branch?: number;
    total_orders?: number;
    average_orders_per_branch?: number;
    total_revenue_range?: number;
  };
  recommendations?: string[];
  raw_data?: {
    date?: string;
    all_branches_revenue_metrics?: any;
    all_branches_customer_metrics?: any;
    all_branches_product_metrics?: any;
    all_branches_review_metrics?: any;
    all_branches_stats?: any;
    all_branches_revenue?: any;
  };
  message?: string;
}

interface BranchData {
  id: number;
  name: string;
  revenue: number;
  orders: number;
  avgOrderValue: number;
  rating: number;
  customerRetention: number;
  newCustomers: number;
  repeatCustomers: number;
  lowStock: number;
  outOfStock: number;
  profitMargin: number;
  status: 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  topProduct: string;
  completedOrders: number;
  cancelledOrders: number;
}



type TabType = 'day' | 'month' | 'year';

export default function MultiBranchDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('day');
  const [viewMode, setViewMode] = useState<'single' | 'all'>('all');
  const [selectedBranch, setSelectedBranch] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [loadingSingleBranch, setLoadingSingleBranch] = useState(false);
  const [loadingMonthly, setLoadingMonthly] = useState<boolean>(false);
  const [loadingYearly, setLoadingYearly] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [aiData, setAiData] = useState<AllBranchesAIAnalysisResponse | null>(null);
  const [branchesData, setBranchesData] = useState<BranchData[]>([]);
  const [singleBranchAiData, setSingleBranchAiData] = useState<AIAnalysisResponse | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<AllBranchesMonthlyStats | null>(null);
  const [yearlyStats, setYearlyStats] = useState<AllBranchesYearlyStats | null>(null);
  const [singleBranchMonthlyStats, setSingleBranchMonthlyStats] = useState<BranchMonthlyStats | null>(null);
  const [singleBranchYearlyStats, setSingleBranchYearlyStats] = useState<BranchYearlyStats | null>(null);
  const [expandedAnalysisSections, setExpandedAnalysisSections] = useState<Record<string, boolean>>({
    overview: true,
    branchEvaluation: false,
    comparison: false,
    branchRecommendations: false,
    conclusion: false,
  });

  // Fetch AI data for all branches (for day tab)
  useEffect(() => {
    if (activeTab === 'day' && selectedDate) {
      fetchAllBranchesData();
    }
  }, [selectedDate, activeTab]);

  // Fetch monthly stats when month changes
  useEffect(() => {
    if (activeTab === 'month' && selectedMonth) {
      if (viewMode === 'all') {
        fetchMonthlyStats();
      } else if (viewMode === 'single' && selectedBranch) {
        fetchSingleBranchMonthlyStats();
      }
    }
  }, [selectedMonth, activeTab, viewMode, selectedBranch]);

  // Fetch yearly stats when year changes
  useEffect(() => {
    if (activeTab === 'year' && selectedYear) {
      if (viewMode === 'all') {
        fetchYearlyStats();
      } else if (viewMode === 'single' && selectedBranch) {
        fetchSingleBranchYearlyStats();
      }
    }
  }, [selectedYear, activeTab, viewMode, selectedBranch]);

  // Fetch single branch AI data when in single branch view (non-blocking, in background)
  useEffect(() => {
    if (viewMode === 'single' && selectedBranch && selectedDate) {
      fetchSingleBranchData();
    } else {
      setSingleBranchAiData(null);
    }
  }, [viewMode, selectedBranch, selectedDate]);

  const fetchSingleBranchData = async () => {
    if (!selectedBranch || !selectedDate) return;
    
    try {
      setLoadingSingleBranch(true);
      setError(null);
      
      // Gọi trực tiếp API AI - API này đã có logic check cache bên trong (save_to_db=true)
      // Bỏ qua bước check cache riêng để tránh phải chờ timeout khi endpoint không tồn tại
      const response = await aiStatisticsService.getAIAnalysis({
        branch_id: selectedBranch,
        date: selectedDate,
        tool_type: 'tool1',
      });
      
      setSingleBranchAiData(response);
    } catch (err: any) {
      console.error('Error fetching single branch data:', err);
      const errorMessage = err?.response?.data?.detail || err?.message || 'Không thể tải dữ liệu chi nhánh';
      setError(errorMessage);
      setSingleBranchAiData(null);
    } finally {
      setLoadingSingleBranch(false);
    }
  };

  const fetchMonthlyStats = async () => {
    try {
      setLoadingMonthly(true);
      setError(null);
      const [year, month] = selectedMonth.split('-').map(Number);
      const stats = await aiStatisticsService.getAllBranchesMonthlyStats(year, month);
      setMonthlyStats(stats);
    } catch (err: any) {
      console.error('Error fetching monthly stats:', err);
      const errorMessage = err?.response?.data?.detail || err?.message || 'Không thể tải dữ liệu thống kê tháng';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoadingMonthly(false);
    }
  };

  const fetchYearlyStats = async () => {
    try {
      setLoadingYearly(true);
      setError(null);
      const stats = await aiStatisticsService.getAllBranchesYearlyStats(selectedYear);
      setYearlyStats(stats);
    } catch (err: any) {
      console.error('Error fetching yearly stats:', err);
      const errorMessage = err?.response?.data?.detail || err?.message || 'Không thể tải dữ liệu thống kê năm';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoadingYearly(false);
    }
  };

  const fetchSingleBranchMonthlyStats = async () => {
    if (!selectedBranch) return;
    try {
      setLoadingMonthly(true);
      setError(null);
      const [year, month] = selectedMonth.split('-').map(Number);
      const stats = await aiStatisticsService.getBranchMonthlyStats(selectedBranch, year, month);
      setSingleBranchMonthlyStats(stats);
    } catch (err: any) {
      console.error('Error fetching single branch monthly stats:', err);
      const errorMessage = err?.response?.data?.detail || err?.message || 'Không thể tải dữ liệu thống kê tháng';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoadingMonthly(false);
    }
  };

  const fetchSingleBranchYearlyStats = async () => {
    if (!selectedBranch) return;
    try {
      setLoadingYearly(true);
      setError(null);
      const stats = await aiStatisticsService.getBranchYearlyStats(selectedBranch, selectedYear);
      setSingleBranchYearlyStats(stats);
    } catch (err: any) {
      console.error('Error fetching single branch yearly stats:', err);
      const errorMessage = err?.response?.data?.detail || err?.message || 'Không thể tải dữ liệu thống kê năm';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoadingYearly(false);
    }
  };

  const handleExportPDF = async () => {
    if (!aiData || branchesData.length === 0) {
      toast.error('Không có dữ liệu để xuất PDF');
      return;
    }

    try {
      await exportAllBranchesToPDF({
        reportDate: selectedDate,
        aiData: aiData,
        branchesData: branchesData,
      });
      toast.success('Đang mở cửa sổ in PDF...');
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      toast.error(error?.message || 'Không thể xuất PDF. Vui lòng thử lại.');
    }
  };

  const fetchAllBranchesData = async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // Gọi API qua API Gateway với force_refresh parameter
      // Nếu forceRefresh=false, API sẽ tự động check database trước
      const params = new URLSearchParams({
        date: selectedDate,
        save_to_db: 'true',
        force_refresh: forceRefresh.toString(),
      });
      
      const endpoint = `/api/ai/agent/analyze-all?${params.toString()}`;
      
      try {
        const data: AllBranchesAIAnalysisResponse = await apiClient.get<AllBranchesAIAnalysisResponse>(endpoint);
        
        // Handle API response format (may have result wrapper)
        const responseData = (data as any).result || data;
        
        if (responseData.success) {
          setAiData(responseData);
          // Transform API data to branchesData format
          const transformedBranches = transformAPIDataToBranches(responseData);
          setBranchesData(transformedBranches);
        } else {
          throw new Error(responseData.message || 'Failed to fetch data');
        }
      } catch (apiError: any) {
        // Nếu 404, có thể là chưa có report, thử gọi với force_refresh=true
        if (apiError?.status === 404 && !forceRefresh) {
          console.log('No existing report found, generating new one...');
          return await fetchAllBranchesData(true);
        }
        throw apiError;
      }
    } catch (err: any) {
      console.error('Error fetching all branches data:', err);
      const errorMessage = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Không thể tải dữ liệu. Vui lòng thử lại.';
      setError(errorMessage);
      setBranchesData([]);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Transform API response to branchesData format
  const transformAPIDataToBranches = (data: AllBranchesAIAnalysisResponse): BranchData[] => {
    const rawData = data.raw_data;
    if (!rawData) return [];

    const branchSummaries = rawData.all_branches_stats?.branchSummaries || [];
    const branchCustomerStats = rawData.all_branches_customer_metrics?.branchCustomerStats || [];
    const branchReviewStats = rawData.all_branches_review_metrics?.branchReviewStats || [];
    const branchProductStats = rawData.all_branches_product_metrics?.branchProductStats || [];

    return branchSummaries.map((summary: any) => {
      const branchId = summary.branchId;
      const branchName = summary.branchName || `Chi nhánh ${branchId}`;
      
      const revenue = summary.revenue || 0;
      const orders = summary.orderCount || 0;
      const completedOrders = summary.completedOrders || 0;
      const cancelledOrders = summary.cancelledOrders || 0;
      const avgOrderValue = orders > 0 ? revenue / orders : 0;

      // Get customer stats
      const customerStats = branchCustomerStats.find((c: any) => c.branchId === branchId);
      const newCustomers = customerStats?.newCustomers || 0;
      const repeatCustomers = customerStats?.repeatCustomers || 0;
      const customerRetention = customerStats?.customerRetentionRate || 0;

      // Get review stats
      const reviewStats = branchReviewStats.find((r: any) => r.branchId === branchId);
      const rating = reviewStats?.avgReviewScore || 0;

      // Get product stats
      const productStats = branchProductStats.find((p: any) => p.branchId === branchId);
      const topProduct = productStats?.topSellingProductName || 'N/A';

      // Determine status
      let status: 'good' | 'warning' | 'critical' = 'good';
      if (revenue === 0 && orders === 0) {
        status = 'critical';
      } else if (revenue < 100000 || customerRetention === 0) {
        status = 'warning';
      }

      // Calculate profit margin (simplified - 30% of revenue)
      const profitMargin = revenue * 0.3;

      return {
        id: branchId,
        name: branchName,
        revenue,
        orders,
        avgOrderValue,
        rating,
        customerRetention: Math.round(customerRetention * 100) / 100,
        newCustomers,
        repeatCustomers,
        lowStock: 0, // Not available in current API
        outOfStock: 0, // Not available in current API
        profitMargin,
        status,
        trend: revenue > 0 ? 'up' : 'down',
        topProduct,
        completedOrders,
        cancelledOrders,
      };
    });
  };

  // Top performers - Sắp xếp tất cả chi nhánh theo doanh thu
  const topPerformers = [...branchesData]
    .sort((a, b) => b.revenue - a.revenue);

  // Need attention
  const needAttention = branchesData.filter(
    b => b.status === 'critical' || b.status === 'warning'
  );

  // Comparison chart data
  const maxRevenue = Math.max(...branchesData.map(b => b.revenue), 1);
  const maxOrders = Math.max(...branchesData.map(b => b.orders), 1);
  
  const comparisonData = branchesData.map(b => ({
    name: b.name.replace('Chi nhánh ', '').replace('Main Branch', 'Main'),
    revenue: b.revenue / 1000,
    orders: b.orders,
    rating: b.rating,
  }));

  // Performance radar data
  const radarData = branchesData.map(b => ({
    branch: b.name.replace('Chi nhánh ', '').replace('Main Branch', 'Main'),
    doanhthu: maxRevenue > 0 ? (b.revenue / maxRevenue) * 100 : 0,
    donhang: maxOrders > 0 ? (b.orders / maxOrders) * 100 : 0,
    danhgia: (b.rating / 5) * 100,
    giuchankh: b.customerRetention,
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Brain className="h-8 w-8 text-amber-600" />
            Dashboard Tổng Quan AI
          </h1>
          <p className="text-gray-600">Giám sát và phân tích tất cả chi nhánh</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => fetchAllBranchesData(false)}
            disabled={loading}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Đang tải...' : 'Làm mới'}
          </button>
          <button 
            onClick={handleExportPDF}
            disabled={loading || !aiData}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            Xuất báo cáo
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('day')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'day'
                ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Ngày
          </button>
          <button
            onClick={() => setActiveTab('month')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'month'
                ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Tháng
          </button>
          <button
            onClick={() => setActiveTab('year')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'year'
                ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Năm
          </button>
        </div>
      </div>

      {/* Filters - Only show in Day tab */}
      {activeTab === 'day' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chế độ xem
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === 'all'
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Building2 className="h-4 w-4 inline mr-2" />
                  Tất cả chi nhánh
                </button>
                <button
                  onClick={() => {
                    if (branchesData.length > 0) {
                      const currentBranchExists = branchesData.some(b => b.id === selectedBranch);
                      if (!currentBranchExists) {
                        setSelectedBranch(branchesData[0].id);
                      }
                    }
                    setViewMode('single');
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === 'single'
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Chi nhánh đơn lẻ
                </button>
              </div>
            </div>

            {viewMode === 'single' && (
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Filter className="h-4 w-4 inline mr-1" />
                  Chọn chi nhánh
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  {branchesData.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Ngày
              </label>
              <input
                type="date"
                value={selectedDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                disabled={loading}
              />
            </div>
          </div>
        </div>
      )}

      {/* Filters for Month tab */}
      {activeTab === 'month' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chế độ xem
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === 'all'
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Building2 className="h-4 w-4 inline mr-2" />
                  Tất cả chi nhánh
                </button>
                <button
                  onClick={() => {
                    if (branchesData.length > 0) {
                      const currentBranchExists = branchesData.some(b => b.id === selectedBranch);
                      if (!currentBranchExists) {
                        setSelectedBranch(branchesData[0].id);
                      }
                    }
                    setViewMode('single');
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === 'single'
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Chi nhánh đơn lẻ
                </button>
              </div>
            </div>

            {viewMode === 'single' && (
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Filter className="h-4 w-4 inline mr-1" />
                  Chọn chi nhánh
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  {branchesData.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Tháng
              </label>
              <input
                type="month"
                value={selectedMonth}
                max={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                disabled={loadingMonthly}
              />
            </div>
          </div>
        </div>
      )}

      {/* Filters for Year tab */}
      {activeTab === 'year' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chế độ xem
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === 'all'
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Building2 className="h-4 w-4 inline mr-2" />
                  Tất cả chi nhánh
                </button>
                <button
                  onClick={() => {
                    if (branchesData.length > 0) {
                      const currentBranchExists = branchesData.some(b => b.id === selectedBranch);
                      if (!currentBranchExists) {
                        setSelectedBranch(branchesData[0].id);
                      }
                    }
                    setViewMode('single');
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewMode === 'single'
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Chi nhánh đơn lẻ
                </button>
              </div>
            </div>

            {viewMode === 'single' && (
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Filter className="h-4 w-4 inline mr-1" />
                  Chọn chi nhánh
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  {branchesData.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                Năm
              </label>
              <input
                type="number"
                value={selectedYear}
                min="2020"
                max={new Date().getFullYear()}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                disabled={loadingYearly}
              />
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Loading State - Skeleton for Day tab */}
      {(loading || (!aiData && selectedDate && activeTab === 'day')) && activeTab === 'day' && viewMode === 'all' && (
        <DayTabSkeleton />
      )}
      {/* Loading State - Skeleton for Month tab */}
      {(loadingMonthly || (!monthlyStats && selectedMonth && activeTab === 'month' && viewMode === 'all')) && activeTab === 'month' && viewMode === 'all' && (
        <MonthTabSkeleton />
      )}
      {/* Loading State - Skeleton for Year tab */}
      {(loadingYearly || (!yearlyStats && selectedYear && activeTab === 'year' && viewMode === 'all')) && activeTab === 'year' && viewMode === 'all' && (
        <YearTabSkeleton />
      )}

      {/* Day Tab Content - All Branches View */}
      {activeTab === 'day' && viewMode === 'all' && !loading ? (
        <>
          {/* Empty State */}
          {branchesData.length === 0 && !error && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center">
              <Building2 className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 text-lg mb-2">Chưa có dữ liệu</p>
              <p className="text-gray-500 text-sm">Vui lòng chọn ngày khác hoặc thử lại sau</p>
            </div>
          )}

          {/* System Overview Cards */}
          {branchesData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SystemMetricCard
              title="Tổng doanh thu hệ thống"
              value={`${((aiData?.raw_data?.all_branches_revenue_metrics?.totalRevenue || aiData?.raw_data?.all_branches_stats?.totalRevenue || 0) / 1000000).toFixed(1)}tr`}
              subtitle={`${aiData?.raw_data?.all_branches_revenue_metrics?.totalOrderCount || aiData?.raw_data?.all_branches_stats?.totalOrders || 0} đơn hàng`}
              icon={DollarSign}
              color="text-green-600"
              bgColor="bg-green-50"
              trend="up"
              trendValue={`${((aiData?.raw_data?.all_branches_revenue_metrics?.avgOrderValue || 0) / 1000).toFixed(0)}k/đơn`}
            />
            <SystemMetricCard
              title="Đánh giá trung bình"
              value={`${(aiData?.raw_data?.all_branches_review_metrics?.overallAvgReviewScore || 0).toFixed(1)} ⭐`}
              subtitle={`${aiData?.raw_data?.all_branches_review_metrics?.totalReviews || 0} đánh giá`}
              icon={Star}
              color="text-amber-600"
              bgColor="bg-amber-50"
              trend="stable"
              trendValue={`${aiData?.raw_data?.all_branches_review_metrics?.totalPositiveReviews || 0} tích cực`}
            />
            <SystemMetricCard
              title="Chi nhánh cần chú ý"
              value={`${((aiData?.raw_data?.all_branches_stats?.totalBranches || 0) - (aiData?.raw_data?.all_branches_stats?.activeBranches || 0))}/${aiData?.raw_data?.all_branches_stats?.totalBranches || 0}`}
              subtitle={`${(aiData?.raw_data?.all_branches_stats?.totalBranches || 0) - (aiData?.raw_data?.all_branches_stats?.activeBranches || 0)} không hoạt động`}
              icon={AlertTriangle}
              color="text-red-600"
              bgColor="bg-red-50"
              trend="down"
              trendValue={`${aiData?.raw_data?.all_branches_stats?.activeBranches || 0} hoạt động`}
            />
            <SystemMetricCard
              title="Chi nhánh hoạt động"
              value={`${aiData?.raw_data?.all_branches_stats?.activeBranches || 0}/${aiData?.raw_data?.all_branches_stats?.totalBranches || 0}`}
              subtitle={`${((aiData?.raw_data?.all_branches_stats?.activeBranches || 0) / (aiData?.raw_data?.all_branches_stats?.totalBranches || 1) * 100).toFixed(0)}% tỷ lệ`}
              icon={TrendingUp}
              color="text-blue-600"
              bgColor="bg-blue-50"
              trend="up"
              trendValue={`${((aiData?.raw_data?.all_branches_stats?.averageRevenuePerBranch || 0) / 1000).toFixed(0)}k/chi nhánh`}
            />
          </div>
          )}

          {/* Top Performers & Need Attention */}
          {branchesData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performers */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-green-50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Top Performers</h3>
              </div>
              <div className="space-y-3">
                {topPerformers.map((branch, index) => (
                  <div
                    key={branch.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-600 font-bold rounded-full">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">{branch.name}</p>
                          <p className="text-sm text-gray-500">{branch.topProduct}</p>
                        </div>
                      </div>
                      <ArrowUpRight className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500">Doanh thu</p>
                        <p className="font-semibold text-sm">{(branch.revenue / 1000).toFixed(0)}k</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500">Đơn hàng</p>
                        <p className="font-semibold text-sm">{branch.orders}</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500">Rating</p>
                        <p className="font-semibold text-sm">{branch.rating}⭐</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Need Attention */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-red-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Cần hỗ trợ ngay</h3>
              </div>
              <div className="space-y-3">
                {needAttention.map((branch) => (
                  <div
                    key={branch.id}
                    className={`p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer ${
                      branch.status === 'critical'
                        ? 'border-red-300 bg-red-50'
                        : 'border-yellow-300 bg-yellow-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <AlertTriangle
                          className={`h-5 w-5 ${
                            branch.status === 'critical' ? 'text-red-600' : 'text-yellow-600'
                          }`}
                        />
                        <div>
                          <p className="font-semibold text-gray-800">{branch.name}</p>
                          <div className="flex gap-2 mt-1">
                            {branch.customerRetention === 0 && (
                              <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                                0% khách quay lại
                              </span>
                            )}
                            {branch.outOfStock > 0 && (
                              <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                                {branch.outOfStock} hết hàng
                              </span>
                            )}
                            {branch.lowStock > 0 && (
                              <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                                {branch.lowStock} sắp hết
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ArrowDownRight
                        className={`h-5 w-5 ${
                          branch.status === 'critical' ? 'text-red-600' : 'text-yellow-600'
                        }`}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <div className="text-center p-2 bg-white rounded">
                        <p className="text-xs text-gray-500">Doanh thu</p>
                        <p className="font-semibold text-sm">{(branch.revenue / 1000).toFixed(0)}k</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded">
                        <p className="text-xs text-gray-500">Đơn</p>
                        <p className="font-semibold text-sm">{branch.orders}</p>
                      </div>
                      <div className="text-center p-2 bg-white rounded">
                        <p className="text-xs text-gray-500">Lợi nhuận</p>
                        <p className="font-semibold text-sm">{(branch.profitMargin / 1000).toFixed(0)}k</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}

          {/* Comparison Charts */}
          {branchesData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Comparison */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">So sánh doanh thu</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#f59e0b" name="Doanh thu (k)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Performance Radar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Phân tích hiệu suất</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData.slice(0, 3)}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="branch" tick={{ fill: '#666', fontSize: 12 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#666' }} />
                  <Radar
                    name="Doanh thu"
                    dataKey="doanhthu"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.3}
                  />
                  <Radar
                    name="Đánh giá"
                    dataKey="danhgia"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.3}
                  />
                  <Radar
                    name="Giữ chân KH"
                    dataKey="giuchankh"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                  />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          )}

          {/* AI System Insights */}
          {aiData?.analysis && (() => {
            const analysisSections = parseAIAnalysisIntoSections(aiData.analysis);
            const sectionTitles = {
              overview: '1. Tổng quan tất cả chi nhánh',
              branchEvaluation: '2. Đánh giá từng chi nhánh',
              comparison: '3. So sánh và phân tích',
              branchRecommendations: '4. Khuyến nghị cho từng chi nhánh',
              conclusion: '5. Kết luận',
            };
            const sectionIcons = {
              overview: Building2,
              branchEvaluation: Star,
              comparison: BarChart3,
              branchRecommendations: CheckCircle,
              conclusion: Brain,
            };
            
            return (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl shadow-sm border border-amber-200 p-6">
                <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-amber-100 rounded-lg">
                  <Brain className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800">
                    Phân tích AI tổng hợp hệ thống
                  </h3>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {Object.entries(analysisSections).map(([key, content]) => {
                    const sectionKey = key as keyof typeof analysisSections;
                    const Icon = sectionIcons[sectionKey];
                    const isExpanded = expandedAnalysisSections[sectionKey];
                    
                    return (
                      <div key={key} className="bg-white rounded-lg border border-amber-200 overflow-hidden">
                        <button
                          onClick={() => {
                            setExpandedAnalysisSections(prev => ({
                              ...prev,
                              [sectionKey]: !prev[sectionKey],
                            }));
                          }}
                          className="w-full flex items-center justify-between p-4 hover:bg-amber-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="h-5 w-5 text-amber-600" />
                            <h4 className="text-base font-semibold text-gray-800">
                              {sectionTitles[sectionKey]}
                            </h4>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                        {isExpanded && (
                          <div className="p-4 pt-0 border-t border-amber-100 space-y-4">
                            {/* Biểu đồ cho từng phần */}
                            {key === 'overview' && branchesData.length > 0 && (
                              <div className="mb-4">
                                <h5 className="text-sm font-semibold text-gray-700 mb-3">Biểu đồ tổng quan</h5>
                                <ResponsiveContainer width="100%" height={250}>
                                  <BarChart data={[
                                    {
                                      name: 'Tổng doanh thu',
                                      value: (aiData?.raw_data?.all_branches_revenue_metrics?.totalRevenue || aiData?.raw_data?.all_branches_stats?.totalRevenue || 0) / 1000000,
                                    },
                                    {
                                      name: 'Tổng đơn hàng',
                                      value: (aiData?.raw_data?.all_branches_revenue_metrics?.totalOrderCount || aiData?.raw_data?.all_branches_stats?.totalOrders || 0) / 1000,
                                    },
                                    {
                                      name: 'Chi nhánh hoạt động',
                                      value: aiData?.raw_data?.all_branches_stats?.activeBranches || 0,
                                    },
                                    {
                                      name: 'Đánh giá TB',
                                      value: (aiData?.raw_data?.all_branches_review_metrics?.overallAvgReviewScore || 0) * 20,
                                    },
                                  ]}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                            
                            {key === 'branchEvaluation' && branchesData.length > 0 && (
                              <div className="mb-4">
                                <h5 className="text-sm font-semibold text-gray-700 mb-3">Biểu đồ đánh giá từng chi nhánh</h5>
                                <ResponsiveContainer width="100%" height={300}>
                                  <BarChart data={branchesData.map(b => ({
                                    name: b.name.replace('Chi nhánh ', '').replace('Main Branch', 'Main'),
                                    rating: b.rating,
                                    retention: b.customerRetention,
                                  }))}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar yAxisId="left" dataKey="rating" fill="#f59e0b" name="Đánh giá (⭐)" radius={[8, 8, 0, 0]} />
                                    <Bar yAxisId="right" dataKey="retention" fill="#10b981" name="Giữ chân KH (%)" radius={[8, 8, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                            
                            {key === 'comparison' && comparisonData.length > 0 && (
                              <div className="mb-4">
                                <h5 className="text-sm font-semibold text-gray-700 mb-3">Biểu đồ so sánh chi nhánh</h5>
                                <ResponsiveContainer width="100%" height={300}>
                                  <BarChart data={comparisonData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar yAxisId="left" dataKey="revenue" fill="#f59e0b" name="Doanh thu (k)" radius={[8, 8, 0, 0]} />
                                    <Bar yAxisId="right" dataKey="orders" fill="#3b82f6" name="Đơn hàng" radius={[8, 8, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                            
                            {key === 'branchRecommendations' && branchesData.length > 0 && (
                              <div className="mb-4">
                                <h5 className="text-sm font-semibold text-gray-700 mb-3">Phân bố trạng thái chi nhánh</h5>
                                <ResponsiveContainer width="100%" height={250}>
                                  <PieChart>
                                    <Pie
                                      data={[
                                        { name: 'Tốt', value: branchesData.filter(b => b.status === 'good').length, color: '#10b981' },
                                        { name: 'Cảnh báo', value: branchesData.filter(b => b.status === 'warning').length, color: '#f59e0b' },
                                        { name: 'Nghiêm trọng', value: branchesData.filter(b => b.status === 'critical').length, color: '#ef4444' },
                                      ]}
                                      cx="50%"
                                      cy="50%"
                                      labelLine={false}
                                      label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                      outerRadius={80}
                                      fill="#8884d8"
                                      dataKey="value"
                                    >
                                      {[
                                        { name: 'Tốt', value: branchesData.filter(b => b.status === 'good').length, color: '#10b981' },
                                        { name: 'Cảnh báo', value: branchesData.filter(b => b.status === 'warning').length, color: '#f59e0b' },
                                        { name: 'Nghiêm trọng', value: branchesData.filter(b => b.status === 'critical').length, color: '#ef4444' },
                                      ].map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                      ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                            
                            {key === 'conclusion' && branchesData.length > 0 && (
                              <div className="mb-4">
                                <h5 className="text-sm font-semibold text-gray-700 mb-3">Tổng kết hiệu suất</h5>
                                <ResponsiveContainer width="100%" height={250}>
                                  <AreaChart data={branchesData.map((b, idx) => ({
                                    name: b.name.replace('Chi nhánh ', '').replace('Main Branch', 'Main'),
                                    revenue: b.revenue / 1000,
                                    orders: b.orders,
                                    index: idx + 1,
                                  }))}>
                                    <defs>
                                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#f59e0b" fillOpacity={1} fill="url(#colorRevenue)" name="Doanh thu (k)" />
                                    <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} name="Đơn hàng" />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                            
                            {/* Nội dung text */}
                            {key === 'branchRecommendations' && aiData.recommendations && aiData.recommendations.length > 0 ? (
                              <div>
                                <h5 className="text-sm font-semibold text-gray-700 mb-3">Danh sách khuyến nghị</h5>
                      <ul className="space-y-2">
                        {aiData.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                                      <span className="text-gray-700">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                            ) : content ? (
                              <div 
                                className="text-gray-700 prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ 
                                  __html: formatAIAnalysis(content) 
                                }}
                              />
                            ) : (
                              <p className="text-gray-500 text-sm">Chưa có nội dung</p>
                  )}
                </div>
                        )}
              </div>
                    );
                  })}
            </div>
              </div>
            );
          })()}

          {/* Detailed Branch Table */}
          {branchesData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Chi tiết tất cả chi nhánh</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Chi nhánh</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Doanh thu</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Đơn hàng</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Giá trị TB</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Rating</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-700">Giữ chân KH</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Trạng thái</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {branchesData.map((branch) => (
                    <tr
                      key={branch.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-800">{branch.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">
                        {(branch.revenue / 1000).toFixed(0)}k
                      </td>
                      <td className="py-3 px-4 text-right">{branch.orders}</td>
                      <td className="py-3 px-4 text-right">
                        {(branch.avgOrderValue / 1000).toFixed(0)}k
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1">
                          {branch.rating}
                          <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-semibold ${
                            branch.customerRetention === 0
                              ? 'text-red-600'
                              : branch.customerRetention < 25
                              ? 'text-yellow-600'
                              : 'text-green-600'
                          }`}
                        >
                          {branch.customerRetention}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                            branch.status === 'good'
                              ? 'bg-green-100 text-green-700'
                              : branch.status === 'warning'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {branch.status === 'good' && <CheckCircle className="h-3 w-3" />}
                          {branch.status === 'warning' && <AlertTriangle className="h-3 w-3" />}
                          {branch.status === 'critical' && <AlertTriangle className="h-3 w-3" />}
                          {branch.status === 'good' ? 'Tốt' : branch.status === 'warning' ? 'Cảnh báo' : 'Nghiêm trọng'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedBranch(branch.id);
                            setViewMode('single');
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors text-sm font-medium"
                        >
                          <Eye className="h-4 w-4" />
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </>
      ) : null}

      {/* Day Tab Content - Single Branch View */}
      {activeTab === 'day' && viewMode === 'single' ? (
        // Single Branch View - Chỉ hiển thị khi có dữ liệu từ API riêng
        branchesData.length > 0 && branchesData.find(b => b.id === selectedBranch) ? (
          <>
            {/* Loading State - Skeleton for Single Branch Day */}
            {(loadingSingleBranch || (!singleBranchAiData && selectedBranch && selectedDate)) && (
              <SingleBranchDaySkeleton />
            )}
            {!loadingSingleBranch && !singleBranchAiData && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center">
                <Building2 className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600 text-lg mb-2">Không thể tải dữ liệu cho chi nhánh này</p>
                <p className="text-gray-500 text-sm">Vui lòng thử lại sau hoặc chọn chi nhánh khác</p>
              </div>
            )}
            {singleBranchAiData && !loadingSingleBranch && (
            <SingleBranchView 
              branch={branchesData.find(b => b.id === selectedBranch)!} 
              singleBranchAiData={singleBranchAiData}
              loadingSingleBranch={loadingSingleBranch}
                selectedDate={selectedDate}
            />
            )}
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center">
            <Building2 className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg mb-2">Chưa có dữ liệu cho chi nhánh này</p>
            <p className="text-gray-500 text-sm">Vui lòng chọn chi nhánh khác hoặc thử lại sau</p>
          </div>
        )
      ) : null}

      {/* Month Tab Content - All Branches */}
      {activeTab === 'month' && viewMode === 'all' && !loadingMonthly && monthlyStats && (
        <AdminMonthlyStatsView stats={monthlyStats} />
      )}
      {activeTab === 'month' && viewMode === 'all' && !loadingMonthly && !monthlyStats && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center">
          <Building2 className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg mb-2">Chưa có dữ liệu thống kê cho tháng này</p>
          <p className="text-gray-500 text-sm">Vui lòng chọn tháng khác hoặc thử lại sau</p>
        </div>
      )}

      {/* Month Tab Content - Single Branch */}
      {/* Loading State - Skeleton for Single Branch Month */}
      {activeTab === 'month' && viewMode === 'single' && (loadingMonthly || (!singleBranchMonthlyStats && selectedBranch && selectedMonth)) && (
        <SingleBranchMonthSkeleton />
      )}
      {activeTab === 'month' && viewMode === 'single' && !loadingMonthly && singleBranchMonthlyStats && (
        <MonthlyStatsView 
          stats={singleBranchMonthlyStats} 
          branchName={branchesData.find(b => b.id === selectedBranch)?.name || `Chi nhánh ${selectedBranch}`} 
        />
      )}
      {activeTab === 'month' && viewMode === 'single' && !loadingMonthly && !singleBranchMonthlyStats && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center">
          <Building2 className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg mb-2">Chưa có dữ liệu thống kê cho chi nhánh này</p>
          <p className="text-gray-500 text-sm">Vui lòng chọn chi nhánh khác hoặc thử lại sau</p>
        </div>
      )}

      {/* Year Tab Content - All Branches */}
      {activeTab === 'year' && viewMode === 'all' && !loadingYearly && yearlyStats && (
        <AdminYearlyStatsView stats={yearlyStats} />
      )}
      {activeTab === 'year' && viewMode === 'all' && !loadingYearly && !yearlyStats && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center">
          <Building2 className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg mb-2">Chưa có dữ liệu thống kê cho năm này</p>
          <p className="text-gray-500 text-sm">Vui lòng chọn năm khác hoặc thử lại sau</p>
        </div>
      )}

      {/* Year Tab Content - Single Branch */}
      {/* Loading State - Skeleton for Single Branch Year */}
      {activeTab === 'year' && viewMode === 'single' && (loadingYearly || (!singleBranchYearlyStats && selectedBranch && selectedYear)) && (
        <SingleBranchYearSkeleton />
      )}
      {activeTab === 'year' && viewMode === 'single' && !loadingYearly && singleBranchYearlyStats && (
        <YearlyStatsView 
          stats={singleBranchYearlyStats} 
          branchName={branchesData.find(b => b.id === selectedBranch)?.name || `Chi nhánh ${selectedBranch}`} 
        />
      )}
      {activeTab === 'year' && viewMode === 'single' && !loadingYearly && !singleBranchYearlyStats && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 flex flex-col items-center justify-center">
          <Building2 className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600 text-lg mb-2">Chưa có dữ liệu thống kê cho chi nhánh này</p>
          <p className="text-gray-500 text-sm">Vui lòng chọn chi nhánh khác hoặc thử lại sau</p>
        </div>
      )}
    </div>
  );
}


// System Metric Card Component
interface SystemMetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  trend: 'up' | 'down' | 'stable';
  trendValue: string;
}

function SystemMetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  bgColor,
  trend,
  trendValue,
}: SystemMetricCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{subtitle}</p>
        <div className="flex items-center gap-1">
          {trend === 'up' && <TrendingUp className="h-4 w-4 text-green-600" />}
          {trend === 'down' && <TrendingDown className="h-4 w-4 text-red-600" />}
          {trend === 'stable' && <Activity className="h-4 w-4 text-gray-400" />}
          <span
            className={`text-sm font-medium ${
              trend === 'up'
                ? 'text-green-600'
                : trend === 'down'
                ? 'text-red-600'
                : 'text-gray-400'
            }`}
          >
            {trendValue}
          </span>
        </div>
      </div>
    </div>
  );
}

// Format currency helper
const formatCurrency = (value: number) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}tr`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}k`;
  }
  return value.toFixed(0);
};

// Single Branch View Component
function SingleBranchView({ branch, singleBranchAiData, loadingSingleBranch, selectedDate }: { branch: BranchData; singleBranchAiData?: AIAnalysisResponse | null; loadingSingleBranch?: boolean; selectedDate: string }) {
  const [expandedSections, setExpandedSections] = useState({
    products: true,
    inventory: true,
    feedback: true,
    customers: false,
    materials: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Chỉ sử dụng dữ liệu từ API riêng, không dùng fallback từ API tổng hợp
  const rawData = singleBranchAiData?.raw_data as any;

  // Prepare data for display - chỉ sử dụng dữ liệu từ API riêng
  const displayData = {
    // Products: Chỉ dùng dữ liệu từ API riêng
    topProducts: (rawData?.product_metrics?.topProducts || [])
          .slice(0, 10)
          .map((product: any) => ({
            name: product.productName || 'N/A',
            quantity: product.quantitySold ? Number(product.quantitySold) : 0,
            revenue: product.revenue ? Number(product.revenue) : 0,
            trend: 0,
      })),
    productsByCategory: rawData?.product_metrics?.productsByCategory || {},
    lowStockItems: [
      ...(rawData?.inventory_metrics?.lowStockItems || []).map((item: any) => ({
        name: item.ingredientName || 'N/A',
        current: item.currentQuantity ? Number(item.currentQuantity) : 0,
        unit: item.unitName || item.unitCode || '',
        threshold: item.threshold ? Number(item.threshold) : 0,
        urgency: item.currentQuantity && item.threshold && Number(item.currentQuantity) < Number(item.threshold) * 0.5 ? 'high' as const : 'medium' as const,
      })),
      ...(rawData?.inventory_metrics?.outOfStockItems || []).map((item: any) => ({
        name: item.ingredientName || 'N/A',
        current: item.currentQuantity ? Number(item.currentQuantity) : 0,
        unit: item.unitName || item.unitCode || '',
        threshold: item.threshold ? Number(item.threshold) : 0,
        urgency: 'high' as const,
      })),
    ],
    topIngredientsByValue: (rawData?.inventory_metrics?.topIngredientsByValue || []).map((item: any) => ({
      name: item.ingredientName || 'N/A',
      quantity: item.quantity ? Number(item.quantity) : 0,
      unit: item.unitCode || '',
      stockValue: item.stockValue ? Number(item.stockValue) : 0,
    })),
    topCostIngredients: (rawData?.material_cost_metrics?.topCostIngredients || []).map((item: any) => ({
      name: item.ingredientName || 'N/A',
      totalCost: item.totalCost ? Number(item.totalCost) : 0,
      percentage: item.percentage ? Number(item.percentage) : 0,
    })),
    recentReviews: (rawData?.review_metrics?.recentReviews || [])
      .map((review: any) => ({
        rating: review.rating || 0,
        comment: review.comment || review.content || '',
        date: review.createdAt || review.date || '',
        customerId: review.customerId,
      })),
    // Review distribution: Chỉ dùng dữ liệu từ API riêng
    reviewDistribution: rawData?.review_metrics?.reviewDistribution || {},
    // Top customers: Chỉ dùng dữ liệu từ API riêng
    topCustomers: (rawData?.customer_metrics?.topCustomers || [])
      .map((item: any) => ({
        name: item.customerName || 'Khách vãng lai',
        orderCount: item.orderCount || 0,
        totalSpent: item.totalSpent ? Number(item.totalSpent) : 0,
      })),
    // Revenue by payment method: Chỉ dùng dữ liệu từ API riêng
    revenueByPaymentMethod: rawData?.revenue_metrics?.revenueByPaymentMethod || {},
    summary: {
      total_reviews: rawData?.review_metrics?.totalReviews 
        || singleBranchAiData?.summary?.total_reviews 
        || 0,
      positive_reviews: rawData?.review_metrics?.positiveReviews 
        || singleBranchAiData?.summary?.positive_reviews 
        || 0,
      negative_reviews: rawData?.review_metrics?.negativeReviews 
        || singleBranchAiData?.summary?.negative_reviews 
        || 0,
    },
  };

  return (
    <div className="space-y-4">
      {/* Branch Info Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">{branch.name}</h2>
            <p className="text-sm text-gray-600">Phân tích chi tiết ngày {selectedDate ? new Date(selectedDate).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN')}</p>
          </div>
          <div className={`px-3 py-1.5 rounded-lg text-sm ${
            branch.status === 'good' ? 'bg-green-100 text-green-700' :
            branch.status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            <span className="font-semibold">
              {branch.status === 'good' ? '✓ Hoạt động tốt' :
               branch.status === 'warning' ? '⚠ Cần chú ý' :
               '⚠ Cần hỗ trợ gấp'}
            </span>
          </div>
        </div>
        {loadingSingleBranch && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2 text-xs text-blue-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Đang tải dữ liệu chi tiết từ API riêng...</span>
            </div>
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Doanh thu"
          value={formatCurrency(branch.revenue)}
          change={0}
          icon={DollarSign}
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <MetricCard
          title="Đơn hàng"
          value={branch.orders.toString()}
          change={0}
          icon={ShoppingCart}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <MetricCard
          title="Trung bình/đơn"
          value={formatCurrency(branch.avgOrderValue)}
          change={0}
          icon={Activity}
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
        <MetricCard
          title="Đánh giá"
          value={`${branch.rating.toFixed(1)}/5`}
          change={0}
          icon={Star}
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
      </div>

      {/* Main Content - Collapsible Sections */}
      <div className="space-y-4">
        {/* 1. SẢN PHẨM BÁN CHẠY */}
        <CollapsibleSection
          title="Sản phẩm bán chạy"
          icon={BarChart3}
          expanded={expandedSections.products}
          onToggle={() => toggleSection('products')}
        >
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="space-y-2">
                {displayData.topProducts.length > 0 ? (
                  displayData.topProducts.map((product: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-100"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.quantity} sản phẩm • {formatCurrency(product.revenue)}</p>
                      </div>
                      <div className="text-right">
                        {product.trend !== 0 && (
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium ${
                              product.trend > 0 ? 'text-green-600' : 'text-red-600'
                            }`}
                          >
                            {product.trend > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {Math.abs(product.trend)}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400 text-sm py-4">Chưa có dữ liệu sản phẩm</div>
                )}
              </div>
            </div>
            
            {/* Products by Category */}
            {Object.keys(displayData.productsByCategory).length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Sản phẩm theo danh mục</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(displayData.productsByCategory).map(([category, count]: [string, any]) => (
                    <div key={category} className="p-2 bg-gray-50 rounded border border-gray-200">
                      <p className="text-xs text-gray-600">{category}</p>
                      <p className="text-lg font-bold text-gray-900">{count}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* 2. TỒN KHO */}
        <CollapsibleSection
          title="Cảnh báo tồn kho"
          icon={Package}
          expanded={expandedSections.inventory}
          onToggle={() => toggleSection('inventory')}
          badge={displayData.lowStockItems.length}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayData.lowStockItems.length > 0 ? (
              displayData.lowStockItems.map((item, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-l-4 ${
                  item.urgency === 'high'
                    ? 'bg-red-50 border-red-500'
                    : 'bg-yellow-50 border-yellow-500'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="font-semibold text-sm text-gray-900">{item.name}</p>
                  <Package
                    className={`h-4 w-4 ${
                      item.urgency === 'high' ? 'text-red-600' : 'text-yellow-600'
                    }`}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-600">
                    Còn lại: <span className="font-bold text-gray-900">{item.current} {item.unit}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Ngưỡng an toàn: {item.threshold} {item.unit}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div
                      className={`h-1.5 rounded-full ${
                        item.urgency === 'high' ? 'bg-red-600' : 'bg-yellow-600'
                      }`}
                      style={{ width: `${Math.min((item.current / item.threshold) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              ))
            ) : (
              <div className="text-center text-gray-400 text-sm py-4 col-span-full">Không có cảnh báo tồn kho</div>
            )}
          </div>
        </CollapsibleSection>

        {/* 3. PHẢN HỒI KHÁCH HÀNG */}
        <CollapsibleSection
          title="Phản hồi khách hàng"
          icon={Star}
          expanded={expandedSections.feedback}
          onToggle={() => toggleSection('feedback')}
        >
          <div className="space-y-4">
            {/* Review Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Tổng đánh giá</p>
                  <p className="text-xl font-bold text-gray-900">{displayData.summary.total_reviews || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Tích cực</p>
                  <p className="text-xl font-bold text-green-600">{displayData.summary.positive_reviews || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Tiêu cực</p>
                  <p className="text-xl font-bold text-red-600">{displayData.summary.negative_reviews || 0}</p>
                </div>
              </div>
              {/* Review Distribution */}
              {Object.keys(displayData.reviewDistribution).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-600 mb-2">Phân bố đánh giá</p>
                  <div className="flex gap-2">
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <div key={rating} className="flex-1 text-center">
                        <div className="flex justify-center gap-0.5 mb-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${
                                i < rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs font-bold text-gray-700">
                          {displayData.reviewDistribution[rating.toString()] || 0}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Recent Reviews */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700">Đánh giá gần đây</h4>
              {displayData.recentReviews.length > 0 ? (
                displayData.recentReviews.map((review: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">
                        {review.date ? new Date(review.date).toLocaleDateString('vi-VN') : ''}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{review.comment}</p>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-400 text-sm py-4">Chưa có phản hồi khách hàng</div>
              )}
            </div>
          </div>
        </CollapsibleSection>

        {/* 4. KHÁCH HÀNG */}
        <CollapsibleSection
          title="Khách hàng hàng đầu"
          icon={Users}
          expanded={expandedSections.customers}
          onToggle={() => toggleSection('customers')}
        >
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="space-y-2">
              {displayData.topCustomers.length > 0 ? (
                displayData.topCustomers.map((customer: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-gray-100"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{customer.name}</p>
                      <p className="text-xs text-gray-500">{customer.orderCount} đơn • {formatCurrency(customer.totalSpent)}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-400 text-sm py-4">Chưa có dữ liệu khách hàng</div>
              )}
            </div>
          </div>
        </CollapsibleSection>

        {/* 5. NGUYÊN LIỆU & CHI PHÍ */}
        <CollapsibleSection
          title="Nguyên liệu & Chi phí"
          icon={Package}
          expanded={expandedSections.materials}
          onToggle={() => toggleSection('materials')}
        >
          <div className="space-y-4">
            {/* Top Ingredients by Value */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Nguyên liệu có giá trị cao nhất</h4>
              {displayData.topIngredientsByValue.length > 0 ? (
                <div className="space-y-2">
                  {displayData.topIngredientsByValue.slice(0, 5).map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded border border-gray-200"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">{item.quantity} {item.unit}</p>
                      </div>
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(item.stockValue)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 text-sm py-4">Chưa có dữ liệu nguyên liệu</div>
              )}
            </div>

            {/* Top Cost Ingredients */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Nguyên liệu có chi phí cao nhất</h4>
              {displayData.topCostIngredients.length > 0 ? (
                <div className="space-y-2">
                  {displayData.topCostIngredients.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded border border-gray-200"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.name}</p>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div
                            className="h-1.5 rounded-full bg-amber-600"
                            style={{ width: `${Math.min(item.percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(item.totalCost)}</p>
                        <p className="text-xs text-gray-500">{item.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 text-sm py-4">Chưa có dữ liệu chi phí nguyên liệu</div>
              )}
            </div>

            {/* Revenue by Payment Method */}
            {Object.keys(displayData.revenueByPaymentMethod).length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Doanh thu theo phương thức thanh toán
                </h4>
                <div className="space-y-2">
                  {Object.entries(displayData.revenueByPaymentMethod).map(([method, amount]: [string, any]) => {
                    const totalRevenue = branch.revenue || 1;
                    const percentage = ((Number(amount) / totalRevenue) * 100).toFixed(1);
                    return (
                      <div key={method} className="flex items-center justify-between p-2 rounded border border-gray-200">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {method === 'CASH' ? 'Tiền mặt' : method === 'CARD' ? 'Thẻ' : method === 'MOMO' ? 'MoMo' : method}
                          </p>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div
                              className="h-1.5 rounded-full bg-green-600"
                              style={{ width: `${Math.min(Number(percentage), 100)}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-sm font-bold text-gray-900">{formatCurrency(Number(amount))}</p>
                          <p className="text-xs text-gray-500">{percentage}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

function MetricCard({ title, value, icon: Icon, color, bgColor }: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  icon: React.ElementType;
  expanded: boolean;
  onToggle: () => void;
  badge?: number;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  icon: Icon,
  expanded,
  onToggle,
  badge,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-amber-600" />
          <h2 className="text-base font-bold text-gray-800">{title}</h2>
          {badge !== undefined && badge > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
              {badge}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>
      {expanded && <div className="p-4 pt-0 border-t border-gray-100">{children}</div>}
    </div>
  );
}

// Parse AI Analysis into 5 sections
function parseAIAnalysisIntoSections(analysis: string): {
  overview: string;
  branchEvaluation: string;
  comparison: string;
  branchRecommendations: string;
  conclusion: string;
} {
  if (!analysis) {
    return {
      overview: '',
      branchEvaluation: '',
      comparison: '',
      branchRecommendations: '',
      conclusion: '',
    };
  }

  const sections = {
    overview: '',
    branchEvaluation: '',
    comparison: '',
    branchRecommendations: '',
    conclusion: '',
  };

  const lines = analysis.split('\n');
  let currentSection: keyof typeof sections | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Detect section headers - 1. Tổng quan tất cả chi nhánh
    if (trimmed.match(/^1\.|^##\s*1\.|^###\s*1\.|tổng quan.*chi nhánh|tổng quan.*tất cả|overview.*branch/i)) {
      if (currentSection) {
        sections[currentSection] = currentContent.join('\n').trim();
      }
      currentSection = 'overview';
      currentContent = [];
      continue;
    }
    
    // 2. Đánh giá từng chi nhánh
    if (trimmed.match(/^2\.|^##\s*2\.|^###\s*2\.|đánh giá.*chi nhánh|đánh giá.*từng|evaluation.*branch/i)) {
      if (currentSection) {
        sections[currentSection] = currentContent.join('\n').trim();
      }
      currentSection = 'branchEvaluation';
      currentContent = [];
      continue;
    }
    
    // 3. So sánh và phân tích
    if (trimmed.match(/^3\.|^##\s*3\.|^###\s*3\.|so sánh|phân tích.*so sánh|comparison|analyze/i)) {
      if (currentSection) {
        sections[currentSection] = currentContent.join('\n').trim();
      }
      currentSection = 'comparison';
      currentContent = [];
      continue;
    }
    
    // 4. Khuyến nghị cho từng chi nhánh
    if (trimmed.match(/^4\.|^##\s*4\.|^###\s*4\.|khuyến nghị.*chi nhánh|khuyến nghị.*từng|recommendation.*branch/i)) {
      if (currentSection) {
        sections[currentSection] = currentContent.join('\n').trim();
      }
      currentSection = 'branchRecommendations';
      currentContent = [];
      continue;
    }
    
    // 5. Kết luận
    if (trimmed.match(/^5\.|^##\s*5\.|^###\s*5\.|kết luận|conclusion|tổng kết/i)) {
      if (currentSection) {
        sections[currentSection] = currentContent.join('\n').trim();
      }
      currentSection = 'conclusion';
      currentContent = [];
      continue;
    }
    
    // Stop at next major section
    if (trimmed.match(/^[1-5]\.|^##\s*[1-5]\./)) {
      if (currentSection) {
        sections[currentSection] = currentContent.join('\n').trim();
      }
      currentSection = null;
      currentContent = [];
      continue;
    }
    
    // Add content to current section
    if (currentSection) {
      currentContent.push(line);
    } else if (!sections.overview) {
      // If no section detected yet, add to overview
      currentContent.push(line);
    }
  }
  
  // Save last section
  if (currentSection) {
    sections[currentSection] = currentContent.join('\n').trim();
  } else if (currentContent.length > 0 && !sections.overview) {
    sections.overview = currentContent.join('\n').trim();
  }
  
  return sections;
}

// Format AI Analysis text to HTML
function formatAIAnalysis(analysis: string): string {
  if (!analysis) return '';
  
  // Convert markdown-style headers to HTML
  let formatted = analysis
    .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold mt-4 mb-2">$1</h2>')
    .replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold mt-3 mb-2">$1</h3>')
    .replace(/^#### (.*$)/gim, '<h4 class="text-sm font-semibold mt-2 mb-1">$1</h4>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^\- (.*$)/gim, '<li class="ml-4">$1</li>')
    .replace(/^(\d+)\. (.*$)/gim, '<li class="ml-4">$2</li>')
    .replace(/\n\n/g, '</p><p class="leading-relaxed mb-2">')
    .replace(/\n/g, '<br />');
  
  // Wrap in paragraph tags
  formatted = `<p class="leading-relaxed mb-2">${formatted}</p>`;
  
  // Wrap lists
  formatted = formatted.replace(/(<li.*?<\/li>)/g, '<ul class="list-disc ml-6 mb-2">$1</ul>');
  
  return formatted;
}