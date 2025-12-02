import React from 'react';
import {
  DollarSign,
  ShoppingCart,
  Activity,
  TrendingUp,
  Package,
  Building2,
} from 'lucide-react';
import {
  AllBranchesMonthlyStats,
  BranchMonthlyStats,
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

// Admin Monthly Stats View Component (for all branches)
interface AdminMonthlyStatsViewProps {
  stats: AllBranchesMonthlyStats;
}

export function AdminMonthlyStatsView({ stats }: AdminMonthlyStatsViewProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}tr`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toFixed(0);
  };

  const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 
                      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SystemMetricCard
          title="Tổng doanh thu"
          value={formatCurrency(stats.total_revenue)}
          subtitle={`${stats.total_orders} đơn hàng`}
          icon={DollarSign}
          color="text-green-600"
          bgColor="bg-green-50"
          trend="up"
          trendValue={formatCurrency(stats.avg_revenue_per_branch)}
        />
        <SystemMetricCard
          title="Thực lời (Lợi nhuận)"
          value={formatCurrency(stats.total_profit || 0)}
          subtitle={`Tỷ suất: ${(stats.profit_margin || 0).toFixed(1)}%`}
          icon={TrendingUp}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
          trend="up"
          trendValue={formatCurrency(stats.avg_profit_per_day || 0)}
        />
        <SystemMetricCard
          title="Chi phí nguyên liệu"
          value={formatCurrency(stats.total_material_cost || 0)}
          subtitle={`${stats.branch_count} chi nhánh`}
          icon={Package}
          color="text-red-600"
          bgColor="bg-red-50"
          trend="stable"
          trendValue={formatCurrency((stats.total_material_cost || 0) / stats.branch_count)}
        />
        <SystemMetricCard
          title="Số chi nhánh"
          value={stats.branch_count.toString()}
          subtitle={`${stats.days_with_data} ngày có dữ liệu`}
          icon={Building2}
          color="text-blue-600"
          bgColor="bg-blue-50"
          trend="stable"
          trendValue={`${stats.total_customer_count} khách hàng`}
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SystemMetricCard
          title="TB doanh thu/ngày"
          value={formatCurrency(stats.avg_revenue_per_day)}
          subtitle={`TB đơn hàng: ${stats.avg_orders_per_day.toFixed(1)}`}
          icon={Activity}
          color="text-purple-600"
          bgColor="bg-purple-50"
          trend="up"
          trendValue={formatCurrency(stats.avg_order_value)}
        />
        <SystemMetricCard
          title="TB lợi nhuận/ngày"
          value={formatCurrency(stats.avg_profit_per_day || 0)}
          subtitle={`TB doanh thu/chi nhánh: ${formatCurrency(stats.avg_revenue_per_branch)}`}
          icon={TrendingUp}
          color="text-emerald-600"
          bgColor="bg-emerald-50"
          trend="up"
          trendValue={`${monthNames[stats.month - 1]} ${stats.year}`}
        />
        <SystemMetricCard
          title="Giá trị đơn TB"
          value={formatCurrency(stats.avg_order_value)}
          subtitle={`Tổng khách hàng: ${stats.total_customer_count}`}
          icon={ShoppingCart}
          color="text-amber-600"
          bgColor="bg-amber-50"
          trend="stable"
          trendValue={`${stats.days_with_data} ngày`}
        />
        <SystemMetricCard
          title="Tổng đơn hàng"
          value={stats.total_orders.toString()}
          subtitle={`TB ${stats.avg_orders_per_day.toFixed(1)} đơn/ngày`}
          icon={ShoppingCart}
          color="text-blue-600"
          bgColor="bg-blue-50"
          trend="up"
          trendValue={formatCurrency(stats.total_revenue)}
        />
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Tổng hợp tháng {monthNames[stats.month - 1]} năm {stats.year} - Tất cả chi nhánh
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Tổng doanh thu</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total_revenue)} VNĐ</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <p className="text-sm text-gray-600 mb-1">Thực lời (Lợi nhuận)</p>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(stats.total_profit || 0)} VNĐ</p>
            <p className="text-xs text-gray-500 mt-1">Tỷ suất: {(stats.profit_margin || 0).toFixed(1)}%</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <p className="text-sm text-gray-600 mb-1">Chi phí nguyên liệu</p>
            <p className="text-xl font-bold text-red-700">{formatCurrency(stats.total_material_cost || 0)} VNĐ</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Tổng số đơn hàng</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_orders} đơn</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Monthly Stats View Component (for single branch - reuse from manager)
interface MonthlyStatsViewProps {
  stats: BranchMonthlyStats;
  branchName: string;
}

export function MonthlyStatsView({ stats, branchName }: MonthlyStatsViewProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}tr`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toFixed(0);
  };

  const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 
                      'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-600">Tổng doanh thu</p>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.total_revenue)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-600">Tổng đơn hàng</p>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-gray-900">{stats.total_orders}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-600">Thực lời</p>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.total_profit || 0)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-600">Tỷ suất lợi nhuận</p>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-gray-900">{(stats.profit_margin || 0).toFixed(1)}%</p>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {branchName} - Tổng hợp tháng {monthNames[stats.month - 1]} năm {stats.year}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Tổng doanh thu</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.total_revenue)} VNĐ</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <p className="text-sm text-gray-600 mb-1">Thực lời (Lợi nhuận)</p>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(stats.total_profit || 0)} VNĐ</p>
            <p className="text-xs text-gray-500 mt-1">Tỷ suất: {(stats.profit_margin || 0).toFixed(1)}%</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <p className="text-sm text-gray-600 mb-1">Chi phí nguyên liệu</p>
            <p className="text-xl font-bold text-red-700">{formatCurrency(stats.total_material_cost || 0)} VNĐ</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Tổng số đơn hàng</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total_orders} đơn</p>
          </div>
        </div>
      </div>
    </div>
  );
}

