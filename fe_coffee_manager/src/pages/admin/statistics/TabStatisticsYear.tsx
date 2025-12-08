import React from 'react';
import {
  DollarSign,
  Activity,
  TrendingUp,
  Package,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import {
  AllBranchesYearlyStats,
  BranchYearlyStats,
} from '../../services/aiStatisticsService';

// System Metric Card Component (for admin all branches view)
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
          {trend === 'down' && <Activity className="h-4 w-4 text-red-600" />}
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

// Admin Yearly Stats View Component (for all branches)
interface AdminYearlyStatsViewProps {
  stats: AllBranchesYearlyStats;
}

export function AdminYearlyStatsView({ stats }: AdminYearlyStatsViewProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}tr`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toFixed(0);
  };

  const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

  // Prepare chart data
  const chartData = stats.monthly_data.map(month => ({
    month: monthNames[month.month - 1],
    revenue: month.total_revenue,
    orders: month.total_orders,
    profit: month.total_profit || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SystemMetricCard
          title="Total Yearly Revenue"
          value={formatCurrency(stats.total_revenue)}
          subtitle={`${stats.total_orders} orders`}
          icon={DollarSign}
          color="text-green-600"
          bgColor="bg-green-50"
          trend="up"
          trendValue={formatCurrency(stats.avg_revenue_per_month)}
        />
        <SystemMetricCard
          title="Profit"
          value={formatCurrency(stats.total_profit || 0)}
          subtitle={`Margin: ${(stats.profit_margin || 0).toFixed(1)}%`}
          icon={TrendingUp}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
          trend="up"
          trendValue={formatCurrency(stats.avg_profit_per_month || 0)}
        />
        <SystemMetricCard
          title="Material Costs"
          value={formatCurrency(stats.total_material_cost || 0)}
          subtitle={`Avg ${stats.avg_branch_count} branches`}
          icon={Package}
          color="text-red-600"
          bgColor="bg-red-50"
          trend="stable"
          trendValue={formatCurrency((stats.total_material_cost || 0) / stats.months_with_data)}
        />
        <SystemMetricCard
          title="Avg Revenue/Month"
          value={formatCurrency(stats.avg_revenue_per_month)}
          subtitle={`${stats.months_with_data} months with data`}
          icon={Activity}
          color="text-blue-600"
          bgColor="bg-blue-50"
          trend="up"
          trendValue={`${stats.avg_orders_per_month.toFixed(1)} orders/month`}
        />
      </div>

      {/* Revenue Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Revenue by Month {stats.year} - All Branches
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRevenueYearAdmin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#666" tick={{ fontSize: 12 }} />
              <YAxis stroke="#666" tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: any) => `${formatCurrency(value)} VNĐ`}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#f59e0b"
                fillOpacity={1}
                fill="url(#colorRevenueYearAdmin)"
                name="Revenue"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Profit Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Profit Summary {stats.year} - All Branches</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <p className="text-sm text-gray-600 mb-1">Total Profit</p>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(stats.total_profit || 0)} VNĐ</p>
            <p className="text-xs text-gray-500 mt-1">Margin: {(stats.profit_margin || 0).toFixed(1)}%</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-gray-600 mb-1">Average/Month</p>
            <p className="text-xl font-bold text-blue-700">{formatCurrency(stats.avg_profit_per_month || 0)} VNĐ</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <p className="text-sm text-gray-600 mb-1">Total Material Costs</p>
            <p className="text-xl font-bold text-red-700">{formatCurrency(stats.total_material_cost || 0)} VNĐ</p>
          </div>
        </div>
      </div>

      {/* Monthly Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Monthly Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Month</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Revenue</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Profit</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Orders</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Branches</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Avg/Day</th>
              </tr>
            </thead>
            <tbody>
              {stats.monthly_data.map((month, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-900">{monthNames[month.month - 1]}</td>
                  <td className="py-3 px-4 text-right font-semibold text-gray-900">
                    {formatCurrency(month.total_revenue)} VNĐ
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-green-700">
                    {formatCurrency(month.total_profit || 0)} VNĐ
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700">{month.total_orders}</td>
                  <td className="py-3 px-4 text-right text-gray-600">{month.branch_count}</td>
                  <td className="py-3 px-4 text-right text-gray-600">
                    {formatCurrency(month.avg_revenue_per_day)} / {month.avg_orders_per_day.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Yearly Stats View Component (for single branch - reuse from manager)
interface YearlyStatsViewProps {
  stats: BranchYearlyStats;
  branchName: string;
}

export function YearlyStatsView({ stats, branchName }: YearlyStatsViewProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}tr`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toFixed(0);
  };

  const monthNames = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

  // Prepare chart data
  const chartData = stats.monthly_data.map(month => ({
    month: monthNames[month.month - 1],
    revenue: month.total_revenue,
    orders: month.total_orders,
  }));

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SystemMetricCard
          title="Total Yearly Revenue"
          value={formatCurrency(stats.total_revenue)}
          subtitle={`${stats.total_orders} orders`}
          icon={DollarSign}
          color="text-green-600"
          bgColor="bg-green-50"
          trend="up"
          trendValue={formatCurrency(stats.avg_revenue_per_month)}
        />
        <SystemMetricCard
          title="Profit"
          value={formatCurrency(stats.total_profit || 0)}
          subtitle={`Margin: ${(stats.profit_margin || 0).toFixed(1)}%`}
          icon={TrendingUp}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
          trend="up"
          trendValue={formatCurrency(stats.avg_profit_per_month || 0)}
        />
        <SystemMetricCard
          title="Material Costs"
          value={formatCurrency(stats.total_material_cost || 0)}
          subtitle={`${stats.months_with_data} months with data`}
          icon={Package}
          color="text-red-600"
          bgColor="bg-red-50"
          trend="stable"
          trendValue={formatCurrency((stats.total_material_cost || 0) / stats.months_with_data)}
        />
        <SystemMetricCard
          title="Avg Revenue/Month"
          value={formatCurrency(stats.avg_revenue_per_month)}
          subtitle={`Avg ${stats.avg_orders_per_month.toFixed(1)} orders/month`}
          icon={Activity}
          color="text-blue-600"
          bgColor="bg-blue-50"
          trend="up"
          trendValue={formatCurrency(stats.avg_order_value)}
        />
      </div>

      {/* Revenue Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            {branchName} - Revenue by Month {stats.year}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRevenueYearBranch" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#666" tick={{ fontSize: 12 }} />
              <YAxis stroke="#666" tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: any) => `${formatCurrency(value)} VNĐ`}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#f59e0b"
                fillOpacity={1}
                fill="url(#colorRevenueYearBranch)"
                name="Revenue"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Profit Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Profit Summary {stats.year} - {branchName}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <p className="text-sm text-gray-600 mb-1">Total Profit</p>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(stats.total_profit || 0)} VNĐ</p>
            <p className="text-xs text-gray-500 mt-1">Margin: {(stats.profit_margin || 0).toFixed(1)}%</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-gray-600 mb-1">Average/Month</p>
            <p className="text-xl font-bold text-blue-700">{formatCurrency(stats.avg_profit_per_month || 0)} VNĐ</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <p className="text-sm text-gray-600 mb-1">Total Material Costs</p>
            <p className="text-xl font-bold text-red-700">{formatCurrency(stats.total_material_cost || 0)} VNĐ</p>
          </div>
        </div>
      </div>

      {/* Monthly Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Monthly Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Month</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Revenue</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Orders</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Avg/Day</th>
              </tr>
            </thead>
            <tbody>
              {stats.monthly_data.map((month, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-900">{monthNames[month.month - 1]}</td>
                  <td className="py-3 px-4 text-right font-semibold text-gray-900">
                    {formatCurrency(month.total_revenue)} VNĐ
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700">{month.total_orders}</td>
                  <td className="py-3 px-4 text-right text-gray-600">
                    {formatCurrency(month.avg_revenue_per_day)} / {month.avg_orders_per_day.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

