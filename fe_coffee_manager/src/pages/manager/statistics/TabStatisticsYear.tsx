import React from 'react';
import {
  DollarSign,
  ShoppingCart,
  Activity,
  TrendingUp,
  Package,
  Users,
  BarChart3,
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
import { BranchYearlyStats } from '../../services/aiStatisticsService';

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string;
  change: number;
  icon: React.ElementType;
  color: 'emerald' | 'blue' | 'purple' | 'amber';
}

function MetricCard({ title, value, change, icon: Icon, color }: MetricCardProps) {
  const colorClasses = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-gray-600">{title}</p>
        <div className={`p-1.5 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-xl font-bold text-gray-900 mb-1">{value}</p>
      {change !== 0 && (
        <div className="flex items-center gap-1">
          {change > 0 ? (
            <TrendingUp className="h-3 w-3 text-green-600" />
          ) : (
            <Activity className="h-3 w-3 text-red-600" />
          )}
          <span className={`text-xs font-medium ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {Math.abs(change).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}

// Yearly Stats View Component
interface YearlyStatsViewProps {
  stats: BranchYearlyStats;
  branchName: string;
}

export default function YearlyStatsView({ stats, branchName }: YearlyStatsViewProps) {
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Total Annual Revenue"
          value={formatCurrency(stats.total_revenue)}
          change={0}
          icon={DollarSign}
          color="emerald"
        />
        <MetricCard
          title="Total Annual Orders"
          value={stats.total_orders.toString()}
          change={0}
          icon={ShoppingCart}
          color="blue"
        />
        <MetricCard
          title="Avg Revenue/Month"
          value={formatCurrency(stats.avg_revenue_per_month)}
          change={0}
          icon={Activity}
          color="purple"
        />
        <MetricCard
          title="Avg Orders/Month"
          value={stats.avg_orders_per_month.toFixed(1)}
          change={0}
          icon={Activity}
          color="amber"
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Profit"
          value={formatCurrency(stats.total_profit || 0)}
          change={0}
          icon={DollarSign}
          color="emerald"
        />
        <MetricCard
          title="Profit Margin"
          value={`${(stats.profit_margin || 0).toFixed(1)}%`}
          change={0}
          icon={TrendingUp}
          color="emerald"
        />
        <MetricCard
          title="Material Costs"
          value={formatCurrency(stats.total_material_cost || 0)}
          change={0}
          icon={Package}
          color="amber"
        />
        <MetricCard
          title="Avg Profit/Month"
          value={formatCurrency(stats.avg_profit_per_month || 0)}
          change={0}
          icon={Activity}
          color="emerald"
        />
      </div>

      {/* Additional Metrics Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Avg Order Value"
          value={formatCurrency(stats.avg_order_value)}
          change={0}
          icon={DollarSign}
          color="blue"
        />
        <MetricCard
          title="Months with Data"
          value={stats.months_with_data.toString()}
          change={0}
          icon={Activity}
          color="purple"
        />
        <MetricCard
          title="Year"
          value={stats.year.toString()}
          change={0}
          icon={BarChart3}
          color="amber"
        />
        <MetricCard
          title="Branch"
          value={branchName}
          change={0}
          icon={Users}
          color="blue"
        />
      </div>

      {/* Revenue Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Monthly Revenue for Year {stats.year}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRevenueYear" x1="0" y1="0" x2="0" y2="1">
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
                fill="url(#colorRevenueYear)"
                name="Revenue"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Profit Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Annual Profit Summary for {stats.year}</h3>
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
            <p className="text-sm text-gray-600 mb-1">Total Material Cost</p>
            <p className="text-xl font-bold text-red-700">{formatCurrency(stats.total_material_cost || 0)} VNĐ</p>
          </div>
        </div>
      </div>

      {/* Monthly Breakdown */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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

