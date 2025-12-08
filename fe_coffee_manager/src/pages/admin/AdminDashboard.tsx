import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Store,
  Users,
  Package,
  DollarSign,
  Coffee,
  ShoppingBag,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { comprehensiveMetricsService, ComprehensiveMetricsResponse } from '../../services/comprehensiveMetricsService';
import { analyticsService, TopSellingProductsResponse } from '../../services/analyticsService';
import { AdminDashboardSkeleton } from '../../components/admin/skeletons';

export function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ComprehensiveMetricsResponse | null>(null);
  const [topProducts, setTopProducts] = useState<TopSellingProductsResponse | null>(null);

  const loadMetrics = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      // Load comprehensive metrics and top selling products in parallel
      const [comprehensiveData, topProductsData] = await Promise.all([
        comprehensiveMetricsService.getComprehensiveMetrics(),
        analyticsService.getTopSellingProducts(undefined, undefined, undefined, 5, 'quantity')
      ]);
      
      setMetrics(comprehensiveData);
      setTopProducts(topProductsData);
    } catch (err: any) {
      console.error('Error loading metrics:', err);
      setError(err.message || 'Failed to load metrics');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadMetrics(false);
  }, []);

  // Format currency
  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000000) {
      return `${(amount / 1000000000).toFixed(2)}B`;
    } else if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toFixed(0);
  };

  // Format number with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString('vi-VN');
  };

  // Get month name
  const getMonthName = (month: number): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1] || '';
  };

  // Prepare product sales pie chart data from top selling products (useMemo must be before early returns)
  const productSales = useMemo(() => {
    if (!topProducts || !topProducts.topProducts || topProducts.topProducts.length === 0) {
      return [
        { name: 'No Data', value: 100, color: '#E5E7EB' }
      ];
    }

    // Calculate total quantity for percentage calculation
    const totalQuantity = topProducts.topProducts.reduce(
      (sum, product) => sum + product.totalQuantitySold,
      0
    );

    // Generate colors for products
    const colors = [
      '#8B4513', // Brown
      '#D2691E', // Chocolate
      '#CD853F', // Peru
      '#F4A460', // Sandy Brown
      '#DEB887', // Burlywood
      '#D2B48C', // Tan
      '#BC8F8F', // Rosy Brown
      '#A0522D', // Sienna
    ];

    // Map top products to chart data with percentages
    const chartData = topProducts.topProducts.map((product, index) => {
      const percentage = totalQuantity > 0
        ? Math.round((product.totalQuantitySold / totalQuantity) * 100)
        : 0;
      
      return {
        name: product.productName || `Product ${product.productId}`,
        value: percentage,
        quantity: product.totalQuantitySold,
        revenue: product.totalRevenue,
        color: colors[index % colors.length]
      };
    });

    return chartData;
  }, [topProducts]);

  if (loading) {
    return <AdminDashboardSkeleton />;
  }

  if (error) {
    return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-2 py-4 sm:px-4 lg:px-4">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="px-8 pt-6 pb-2">
              <h1 className="text-xl font-semibold text-slate-800">System Overview</h1>
              <p className="text-sm text-slate-500">Coffee Shop Management System</p>
            </div>
            <div className="p-8 pt-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">Error: {error}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  // Prepare stats cards data
  const stats = [
    {
      title: 'Daily Revenue',
      value: formatCurrency(metrics.daily_revenue.total_revenue),
      change: `${metrics.daily_revenue.branch_count} branches`,
      icon: DollarSign,
      color: 'bg-green-500'
    },
    {
      title: 'Total Branches',
      value: metrics.branch_count.total_branches.toString(),
      change: `${metrics.branch_count.branches_with_data} with data`,
      icon: Store,
      color: 'bg-blue-500'
    },
    {
      title: 'Yearly Revenue',
      value: formatCurrency(metrics.yearly_revenue_orders.total_revenue),
      change: `${formatNumber(metrics.yearly_revenue_orders.total_orders)} orders`,
      icon: TrendingUp,
      color: 'bg-purple-500'
    },
    {
      title: 'Yearly Orders',
      value: formatNumber(metrics.yearly_revenue_orders.total_orders),
      change: `Avg: ${formatNumber(Math.round(metrics.yearly_revenue_orders.total_orders / 12))}/month`,
      icon: ShoppingBag,
      color: 'bg-amber-500'
    }
  ];

  // Prepare branch revenue chart data (top branches)
  const branchRevenue = metrics.monthly_top_branches.top_branches
    .filter(b => b.total_revenue > 0)
    .slice(0, 5)
    .map(branch => ({
      name: `Branch ${branch.branch_id}`,
      revenue: Math.round(branch.total_revenue / 1000000) // Convert to millions
    }));

  // Prepare monthly trend chart data
  const monthlyTrend = metrics.yearly_revenue_orders.monthly_data.map(month => ({
    month: getMonthName(month.month),
    revenue: Math.round(month.total_revenue / 1000000), // Convert to millions
    orders: month.total_orders
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-2 py-4 sm:px-4 lg:px-4">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-8 pt-6 pb-2">
            <div>
              <h1 className="text-xl font-semibold text-slate-800">System Overview</h1>
              <p className="text-sm text-slate-500">Manage your entire coffee chain system</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-3 text-slate-400 text-sm">
                <Calendar className="h-5 w-5" />
                <span>{new Date().toLocaleDateString('vi-VN')}</span>
              </div>
              <button
                onClick={() => loadMetrics(true)}
                disabled={refreshing || loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 pt-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                      <p className="text-sm text-green-600 mt-1 font-medium">{stat.change}</p>
                    </div>
                    <div className={`p-3 rounded-full ${stat.color}`}>
                      <stat.icon className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Branch Revenue Chart */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Top Branches Revenue (Month {metrics.monthly_top_branches.month}/
                  {metrics.monthly_top_branches.year})
                </h3>
                {branchRevenue.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={branchRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" stroke="#666" />
                      <YAxis stroke="#666" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px'
                        }}
                        labelStyle={{ color: '#374151' }}
                        formatter={(value: number) => `${value}M VND`}
                      />
                      <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-500">
                    No revenue data available
                  </div>
                )}
              </div>

              {/* Product Sales Pie Chart */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Selling Products</h3>
                {productSales.length > 0 && productSales[0].name !== 'No Data' ? (
                  <>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={productSales}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {productSales.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number, name: string, props: any) => [
                            `${value}% (${props.payload.quantity.toFixed(0)} units)`,
                            props.payload.name
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-4 mt-4">
                      {productSales.map((item, index) => (
                        <div key={index} className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: item.color }}
                          ></div>
                          <span className="text-sm text-gray-600">
                            {item.name} ({item.value}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-gray-500">
                    No product sales data available
                  </div>
                )}
              </div>
            </div>

            {/* Monthly Trend */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Xu hướng doanh thu & đơn hàng
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" stroke="#666" />
                  <YAxis yAxisId="left" stroke="#666" />
                  <YAxis yAxisId="right" orientation="right" stroke="#666" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#374151' }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    dot={{ fill: '#f59e0b', strokeWidth: 2, r: 6 }}
                    name="Revenue (million VND)"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="orders"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                    name="Order Count"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Recent Activity */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {[
                    {
                      action: 'Branch District 1 exceeded monthly revenue target',
                      time: '2 hours ago',
                      icon: TrendingUp,
                      color: 'text-green-600'
                    },
                    {
                      action: 'New product added: Cold Brew Coffee',
                      time: '5 hours ago',
                      icon: Coffee,
                      color: 'text-amber-600'
                    },
                    {
                      action: 'New manager added to Thu Duc branch',
                      time: '1 day ago',
                      icon: Users,
                      color: 'text-blue-600'
                    },
                    {
                      action: 'Recipe updated for Cappuccino',
                      time: '2 days ago',
                      icon: Package,
                      color: 'text-purple-600'
                    }
                  ].map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                    >
                      <div className="p-2 rounded-full bg-gray-100">
                        <activity.icon className={`h-4 w-4 ${activity.color}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                        <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Top chi nhánh hiệu suất (Tháng {metrics.monthly_top_branches.month}/
                  {metrics.monthly_top_branches.year})
                </h3>
                <div className="space-y-4">
                  {metrics.monthly_top_branches.top_branches
                    .filter(branch => branch.total_revenue > 0)
                    .slice(0, 10)
                    .map(branch => (
                      <div
                        key={branch.branch_id}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors duration-200"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                              branch.rank === 1
                                ? 'bg-yellow-500'
                                : branch.rank === 2
                                ? 'bg-gray-400'
                                : branch.rank === 3
                                ? 'bg-amber-600'
                                : 'bg-gray-300'
                            }`}
                          >
                            {branch.rank}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">Chi nhánh {branch.branch_id}</p>
                            <p className="text-sm text-gray-500">
                              {formatCurrency(branch.total_revenue)} •{' '}
                              {formatNumber(branch.order_count)} đơn hàng
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-green-600">
                            {formatCurrency(branch.avg_order_value)}/đơn
                          </span>
                        </div>
                      </div>
                    ))}
                  {metrics.monthly_top_branches.top_branches.filter(b => b.total_revenue > 0)
                    .length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      No branch performance data available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}