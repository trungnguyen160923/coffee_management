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
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import aiStatisticsService, {
  AIAnalysisResponse,
  ReportResponse,
} from '../../services/aiStatisticsService';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';


export default function AIStatistics() {
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResponse | null>(null);
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock branches for selection
  const branches = [
    { id: 1, name: 'Chi nhánh Quận 1' },
    { id: 2, name: 'Chi nhánh Quận 3' },
    { id: 3, name: 'Chi nhánh Quận 7' },
    { id: 4, name: 'Chi nhánh Thủ Đức' },
    { id: 5, name: 'Chi nhánh Bình Thạnh' },
  ];

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to get existing report first
      let existingReport: ReportResponse | null = null;
      try {
        existingReport = await aiStatisticsService.getReportByBranchAndDate(
          selectedBranch,
          selectedDate
        );
        setReport(existingReport);
        // Use report data for analysis
        if (existingReport) {
          setAiAnalysis({
            success: true,
            branch_id: existingReport.branch_id,
            date: existingReport.report_date.split('T')[0],
            analysis: existingReport.analysis,
            summary: existingReport.summary,
            recommendations: existingReport.recommendations,
            raw_data: existingReport.raw_data,
          });
        }
      } catch (reportError) {
        // Report doesn't exist, generate new one
        console.log('No existing report, generating new analysis...');
      }
      
      // If no existing report, generate new analysis
      if (!existingReport) {
        const analysis = await aiStatisticsService.getAIAnalysis({
          branch_id: selectedBranch,
          date: selectedDate,
          tool_type: 'tool1',
        });
        setAiAnalysis(analysis);
      }
    } catch (error: any) {
      console.error('Error loading statistics:', error);
      setError(error.message || 'Không thể tải dữ liệu thống kê');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, [selectedBranch, selectedDate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!aiAnalysis) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  // Extract data from AI analysis
  const summary = aiAnalysis.summary || {};
  const rawData = aiAnalysis.raw_data || {};
  const revenueMetrics = rawData.revenue_metrics || {};
  const customerMetrics = rawData.customer_metrics || {};
  const productMetrics = rawData.product_metrics || {};
  const reviewMetrics = rawData.review_metrics || {};
  const inventoryMetrics = rawData.inventory_metrics || {};

  // Prepare chart data from raw data
  const revenueByHour = revenueMetrics.revenueByHour || [];
  const revenueChartData = revenueByHour.map((item: any) => ({
    date: `Giờ ${item.hour}`,
    revenue: (item.revenue || 0) / 1000000, // Convert to millions
    orders: item.orderCount || 0,
    predicted: null as number | null, // Not available in current API response
  }));

  const topProducts = productMetrics.topProducts || [];
  const productSalesData = topProducts.slice(0, 5).map((p: any) => ({
    name: p.productName || 'Unknown',
    value: p.quantitySold || 0,
    revenue: (p.revenue || 0) / 1000000,
  }));

  const recentReviews = reviewMetrics.recentReviews || [];
  const feedbackSentiment = {
    positive: reviewMetrics.positiveReviews || 0,
    negative: reviewMetrics.negativeReviews || 0,
    neutral: (reviewMetrics.totalReviews || 0) - (reviewMetrics.positiveReviews || 0) - (reviewMetrics.negativeReviews || 0),
  };

  const avgRating = reviewMetrics.avgReviewScore || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Brain className="h-8 w-8 text-amber-600" />
            Thống kê AI
          </h1>
          <p className="text-gray-600">Phân tích thông minh và dự đoán hoạt động kinh doanh</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 transition-colors">
            <Download className="h-4 w-4" />
            Xuất báo cáo
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Filter className="h-4 w-4 inline mr-1" />
              Chi nhánh
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Ngày
            </label>
            <input
              type="date"
              value={selectedDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => {
                const selected = e.target.value;
                const today = new Date().toISOString().split('T')[0];
                // Chỉ cho phép chọn ngày không vượt quá hôm nay
                if (selected <= today) {
                  setSelectedDate(selected);
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {inventoryMetrics.lowStockProducts > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-800 mb-1">Cảnh báo tồn kho</h3>
            <p className="text-yellow-700 text-sm">
              Có {inventoryMetrics.lowStockProducts} sản phẩm sắp hết hàng và {inventoryMetrics.outOfStockProducts || 0} sản phẩm đã hết hàng.
            </p>
          </div>
        </div>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Doanh thu"
          value={`${((summary.total_revenue || 0) / 1000000).toFixed(1)} triệu`}
          change={0}
          icon={TrendingUp}
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <MetricCard
          title="Số đơn hàng"
          value={(summary.order_count || 0).toString()}
          change={0}
          icon={BarChart3}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <MetricCard
          title="Giá trị đơn trung bình"
          value={`${((summary.avg_order_value || 0) / 1000).toFixed(0)}k`}
          change={0}
          icon={TrendingUp}
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
        <MetricCard
          title="Đánh giá khách hàng"
          value={`${(summary.avg_review_score || 0).toFixed(1)}/5.0`}
          change={0}
          icon={CheckCircle}
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
      </div>

      {/* AI Analysis Report */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-6 w-6 text-amber-600" />
          <h2 className="text-xl font-bold text-gray-800">Báo cáo phân tích AI</h2>
        </div>
        <div className="prose max-w-none">
          <div className="whitespace-pre-line text-gray-700 leading-relaxed">
            {aiAnalysis.analysis}
          </div>
        </div>
        {aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="font-semibold text-gray-800 mb-3">Khuyến nghị:</h3>
            <ul className="space-y-2">
              {aiAnalysis.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Xu hướng doanh thu (14 ngày)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`${value.toFixed(1)} triệu`, 'Doanh thu']}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: '#f59e0b', r: 4 }}
                name="Doanh thu (triệu)"
              />
              {revenueChartData.some((d: { date: string; revenue: number; orders: number; predicted: number | null }) => d.predicted !== null && d.predicted !== undefined) && (
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#10b981"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: '#10b981', r: 4 }}
                  name="Dự đoán"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Sản phẩm bán chạy</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={productSalesData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" stroke="#666" />
              <YAxis dataKey="name" type="category" stroke="#666" width={100} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [`${value} đơn`, 'Số lượng']}
              />
              <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Feedback Sentiment */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Phân tích cảm xúc phản hồi</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Tích cực', value: feedbackSentiment.positive },
                  { name: 'Tiêu cực', value: feedbackSentiment.negative },
                  { name: 'Trung tính', value: feedbackSentiment.neutral },
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry: any) => `${entry.name}: ${((entry.percent || 0) * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                <Cell fill="#10b981" />
                <Cell fill="#ef4444" />
                <Cell fill="#f59e0b" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Inventory Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Tình trạng tồn kho</h3>
          <div className="space-y-3">
            {inventoryMetrics.lowStockItems && inventoryMetrics.lowStockItems.length > 0 ? (
              inventoryMetrics.lowStockItems.slice(0, 5).map((item: any) => (
                <div
                  key={item.ingredientId}
                  className="p-4 rounded-lg border bg-yellow-50 border-yellow-200"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-800">{item.ingredientName}</p>
                      <p className="text-sm text-gray-600">
                        {item.currentQuantity} {item.unitName}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 text-yellow-600 font-medium">
                        <AlertTriangle className="h-4 w-4" />
                        Thấp
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">Không có sản phẩm nào sắp hết hàng</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Feedback */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Phản hồi khách hàng gần đây</h3>
        <div className="space-y-3">
          {recentReviews.length > 0 ? (
            recentReviews.slice(0, 5).map((review: any) => (
              <div
                key={review.reviewId}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <span
                          key={i}
                          className={`text-lg ${
                            i < (review.rating || 0) ? 'text-amber-400' : 'text-gray-300'
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">
                    {review.createdAt ? new Date(review.createdAt).toLocaleDateString('vi-VN') : ''}
                  </span>
                </div>
                <p className="text-gray-700">{review.comment || 'Không có bình luận'}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">Chưa có phản hồi khách hàng</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

function MetricCard({ title, value, change, icon: Icon, color, bgColor }: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <div className={`p-2 rounded-lg ${bgColor}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      <div className="flex items-center gap-1 text-sm">
        {change > 0 ? (
          <TrendingUp className="h-4 w-4 text-green-600" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-600" />
        )}
        <span className={change > 0 ? 'text-green-600' : 'text-red-600'}>
          {Math.abs(change).toFixed(1)}%
        </span>
        <span className="text-gray-500">so với hôm qua</span>
      </div>
    </div>
  );
}

