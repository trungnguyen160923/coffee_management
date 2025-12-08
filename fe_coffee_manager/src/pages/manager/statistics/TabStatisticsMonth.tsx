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
import { BranchMonthlyStats } from '../../services/aiStatisticsService';

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

// Monthly Stats View Component
interface MonthlyStatsViewProps {
  stats: BranchMonthlyStats;
  branchName: string;
}

export default function MonthlyStatsView({ stats, branchName }: MonthlyStatsViewProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}tr`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toFixed(0);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(stats.total_revenue)}
          change={0}
          icon={DollarSign}
          color="emerald"
        />
        <MetricCard
          title="Total Orders"
          value={stats.total_orders.toString()}
          change={0}
          icon={ShoppingCart}
          color="blue"
        />
        <MetricCard
          title="Avg Revenue/Day"
          value={formatCurrency(stats.avg_revenue_per_day)}
          change={0}
          icon={Activity}
          color="purple"
        />
        <MetricCard
          title="Avg Orders/Day"
          value={stats.avg_orders_per_day.toFixed(1)}
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
          title="Material Cost"
          value={formatCurrency(stats.total_material_cost || 0)}
          change={0}
          icon={Package}
          color="amber"
        />
        <MetricCard
          title="Avg Profit/Day"
          value={formatCurrency(stats.avg_profit_per_day || 0)}
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
          title="Days with Data"
          value={stats.days_with_data.toString()}
          change={0}
          icon={Activity}
          color="purple"
        />
        <MetricCard
          title="Customers"
          value={stats.customer_count.toString()}
          change={0}
          icon={Users}
          color="blue"
        />
        <MetricCard
          title="Month"
          value={monthNames[stats.month - 1]}
          change={0}
          icon={BarChart3}
          color="amber"
        />
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {branchName} - Summary for {monthNames[stats.month - 1]} {stats.year}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total_revenue)} VNĐ</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Total Orders</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_orders} đơn</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Average per Day</p>
            <p className="text-xl font-bold text-gray-900">
              {formatCurrency(stats.avg_revenue_per_day)} VNĐ / {stats.avg_orders_per_day.toFixed(1)} đơn
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Average Order Value</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.avg_order_value)} VNĐ</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <p className="text-sm text-gray-600 mb-1">Profit</p>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(stats.total_profit || 0)} VNĐ</p>
            <p className="text-xs text-gray-500 mt-1">Margin: {(stats.profit_margin || 0).toFixed(1)}%</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <p className="text-sm text-gray-600 mb-1">Material Cost</p>
            <p className="text-xl font-bold text-red-700">{formatCurrency(stats.total_material_cost || 0)} VNĐ</p>
          </div>
        </div>
      </div>
    </div>
  );
}

