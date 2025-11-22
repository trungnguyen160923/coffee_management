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
  Users,
  Star,
  Package,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

// Mock data - Trong thực tế sẽ fetch từ API
const mockBranchesData = [
  {
    id: 1,
    name: 'Chi nhánh Quận 1',
    revenue: 257000,
    orders: 3,
    avgOrderValue: 128500,
    rating: 4.0,
    customerRetention: 0,
    newCustomers: 2,
    lowStock: 0,
    outOfStock: 0,
    profitMargin: 44778.5,
    status: 'warning', // good, warning, critical
    trend: 'down',
    topProduct: 'Cà phê đen đá',
  },
  {
    id: 2,
    name: 'Chi nhánh Quận 3',
    revenue: 450000,
    orders: 12,
    avgOrderValue: 37500,
    rating: 4.5,
    customerRetention: 35,
    newCustomers: 8,
    lowStock: 2,
    outOfStock: 0,
    profitMargin: 180000,
    status: 'good',
    trend: 'up',
    topProduct: 'Trà sữa trân châu',
  },
  {
    id: 3,
    name: 'Chi nhánh Quận 7',
    revenue: 520000,
    orders: 15,
    avgOrderValue: 34667,
    rating: 4.7,
    customerRetention: 42,
    newCustomers: 9,
    lowStock: 1,
    outOfStock: 0,
    profitMargin: 220000,
    status: 'good',
    trend: 'up',
    topProduct: 'Cà phê sữa đá',
  },
  {
    id: 4,
    name: 'Chi nhánh Thủ Đức',
    revenue: 180000,
    orders: 6,
    avgOrderValue: 30000,
    rating: 3.8,
    customerRetention: 15,
    newCustomers: 5,
    lowStock: 5,
    outOfStock: 3,
    profitMargin: 45000,
    status: 'critical',
    trend: 'down',
    topProduct: 'Trà đào cam sả',
  },
  {
    id: 5,
    name: 'Chi nhánh Bình Thạnh',
    revenue: 380000,
    orders: 10,
    avgOrderValue: 38000,
    rating: 4.2,
    customerRetention: 25,
    newCustomers: 7,
    lowStock: 1,
    outOfStock: 0,
    profitMargin: 150000,
    status: 'good',
    trend: 'stable',
    topProduct: 'Matcha đá xay',
  },
];

const COLORS = {
  good: '#10b981',
  warning: '#f59e0b',
  critical: '#ef4444',
};

export default function MultiBranchDashboard() {
  const [viewMode, setViewMode] = useState<'single' | 'all'>('all');
  const [selectedBranch, setSelectedBranch] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);

  // Calculate system totals
  const systemTotals = {
    totalRevenue: mockBranchesData.reduce((sum, b) => sum + b.revenue, 0),
    totalOrders: mockBranchesData.reduce((sum, b) => sum + b.orders, 0),
    avgRating: (mockBranchesData.reduce((sum, b) => sum + b.rating, 0) / mockBranchesData.length).toFixed(1),
    criticalBranches: mockBranchesData.filter(b => b.status === 'critical').length,
    warningBranches: mockBranchesData.filter(b => b.status === 'warning').length,
    totalProfit: mockBranchesData.reduce((sum, b) => sum + b.profitMargin, 0),
  };

  // Top performers
  const topPerformers = [...mockBranchesData]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 3);

  // Need attention
  const needAttention = mockBranchesData.filter(
    b => b.status === 'critical' || b.status === 'warning'
  );

  // Comparison chart data
  const comparisonData = mockBranchesData.map(b => ({
    name: b.name.replace('Chi nhánh ', ''),
    revenue: b.revenue / 1000,
    orders: b.orders,
    rating: b.rating,
  }));

  // Performance radar data
  const radarData = mockBranchesData.map(b => ({
    branch: b.name.replace('Chi nhánh ', ''),
    doanhthu: (b.revenue / 520000) * 100,
    donhang: (b.orders / 15) * 100,
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
            onClick={() => setLoading(true)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 transition-colors">
            <Download className="h-4 w-4" />
            Xuất báo cáo
          </button>
        </div>
      </div>

      {/* View Mode Toggle */}
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
                onClick={() => setViewMode('single')}
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
                {mockBranchesData.map((branch) => (
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
            />
          </div>
        </div>
      </div>

      {viewMode === 'all' ? (
        <>
          {/* System Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <SystemMetricCard
              title="Tổng doanh thu hệ thống"
              value={`${(systemTotals.totalRevenue / 1000000).toFixed(1)}tr`}
              subtitle={`${systemTotals.totalOrders} đơn hàng`}
              icon={DollarSign}
              color="text-green-600"
              bgColor="bg-green-50"
              trend="up"
              trendValue="12%"
            />
            <SystemMetricCard
              title="Đánh giá trung bình"
              value={`${systemTotals.avgRating} ⭐`}
              subtitle={`${mockBranchesData.length} chi nhánh`}
              icon={Star}
              color="text-amber-600"
              bgColor="bg-amber-50"
              trend="stable"
              trendValue="0.2"
            />
            <SystemMetricCard
              title="Chi nhánh cần chú ý"
              value={`${systemTotals.criticalBranches + systemTotals.warningBranches}/${mockBranchesData.length}`}
              subtitle={`${systemTotals.criticalBranches} nghiêm trọng`}
              icon={AlertTriangle}
              color="text-red-600"
              bgColor="bg-red-50"
              trend="down"
              trendValue="-1"
            />
            <SystemMetricCard
              title="Lợi nhuận biên"
              value={`${(systemTotals.totalProfit / 1000000).toFixed(1)}tr`}
              subtitle={`${((systemTotals.totalProfit / systemTotals.totalRevenue) * 100).toFixed(1)}% margin`}
              icon={TrendingUp}
              color="text-blue-600"
              bgColor="bg-blue-50"
              trend="up"
              trendValue="8%"
            />
          </div>

          {/* Top Performers & Need Attention */}
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

          {/* Comparison Charts */}
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

          {/* AI System Insights */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl shadow-sm border border-amber-200 p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Brain className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800 mb-3">
                  Phân tích AI tổng hợp hệ thống
                </h3>
                <div className="space-y-3 text-gray-700">
                  <p className="leading-relaxed">
                    <strong>🎯 Phát hiện chính:</strong> Có 2 chi nhánh đang gặp vấn đề nghiêm trọng về giữ chân khách hàng. 
                    Chi nhánh Quận 1 có 0% khách quay lại mặc dù giá trị đơn cao (128k), cho thấy vấn đề về dịch vụ hoặc chất lượng sản phẩm.
                  </p>
                  <p className="leading-relaxed">
                    <strong>📊 Xu hướng:</strong> Chi nhánh Quận 7 đang dẫn đầu với doanh thu 520k và rating 4.7/5, 
                    có 42% khách hàng quay lại. Đây là mô hình cần nhân rộng cho các chi nhánh khác.
                  </p>
                  <p className="leading-relaxed">
                    <strong>⚠️ Cảnh báo:</strong> Chi nhánh Thủ Đức có 3 sản phẩm hết hàng và 5 sản phẩm sắp hết, 
                    cần bổ sung tồn kho ngay để tránh mất doanh thu. Chi phí nguyên liệu tại Quận 1 cao bất thường (82% doanh thu).
                  </p>
                  <div className="mt-4 pt-4 border-t border-amber-200">
                    <h4 className="font-semibold mb-2">💡 Khuyến nghị hành động:</h4>
                    <ul className="space-y-2">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Triển khai chương trình loyalty toàn hệ thống với ưu tiên cao cho Quận 1 và Thủ Đức</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Học hỏi best practices từ chi nhánh Quận 7 (đào tạo nhân viên, quy trình phục vụ)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Kiểm tra và tối ưu hóa quy trình quản lý tồn kho tại Thủ Đức</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Rà soát chi phí nguyên liệu và nhà cung cấp tại Quận 1 để cải thiện lợi nhuận</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Branch Table */}
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
                  {mockBranchesData.map((branch) => (
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
        </>
      ) : (
        // Single Branch View - Original dashboard for selected branch
        <SingleBranchView branch={mockBranchesData.find(b => b.id === selectedBranch)!} />
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

// Single Branch View Component
function SingleBranchView({ branch }: { branch: any }) {
  // Mock detailed data for single branch view
  const revenueByHour = [
    { hour: 8, revenue: 0.05, orders: 2 },
    { hour: 9, revenue: 0.08, orders: 3 },
    { hour: 10, revenue: 0.12, orders: 5 },
    { hour: 11, revenue: 0.18, orders: 7 },
    { hour: 12, revenue: 0.25, orders: 10 },
    { hour: 13, revenue: 0.22, orders: 8 },
    { hour: 14, revenue: 0.15, orders: 6 },
    { hour: 15, revenue: 0.19, orders: 7 },
    { hour: 16, revenue: 0.28, orders: 12 },
    { hour: 17, revenue: 0.24, orders: 9 },
  ];

  const topProducts = [
    { name: 'Cà phê đen đá', value: 25, revenue: 0.45 },
    { name: 'Cà phê sữa đá', value: 20, revenue: 0.38 },
    { name: 'Trà sữa trân châu', value: 15, revenue: 0.32 },
    { name: 'Trà đào cam sả', value: 12, revenue: 0.25 },
    { name: 'Matcha đá xay', value: 10, revenue: 0.22 },
  ];

  const recentReviews = [
    { id: 1, rating: 5, comment: 'Cà phê ngon, phục vụ nhiệt tình!', date: '2025-11-09' },
    { id: 2, rating: 4, comment: 'Trà đào hơi ngọt, lần sau giảm đường', date: '2025-11-09' },
    { id: 3, rating: 3, comment: 'Bánh mì bị nguội khi giao', date: '2025-11-09' },
  ];

  return (
    <div className="space-y-6">
      {/* Branch Info Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{branch.name}</h2>
            <p className="text-gray-600">Phân tích chi tiết ngày {new Date().toLocaleDateString('vi-VN')}</p>
          </div>
          <div className={`px-4 py-2 rounded-lg ${
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
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Doanh thu"
          value={`${(branch.revenue / 1000).toFixed(0)}k`}
          change={0}
          icon={DollarSign}
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <MetricCard
          title="Số đơn hàng"
          value={branch.orders.toString()}
          change={0}
          icon={BarChart3}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <MetricCard
          title="Giá trị đơn TB"
          value={`${(branch.avgOrderValue / 1000).toFixed(0)}k`}
          change={0}
          icon={TrendingUp}
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
        <MetricCard
          title="Đánh giá"
          value={`${branch.rating}/5.0`}
          change={0}
          icon={Star}
          color="text-amber-600"
          bgColor="bg-amber-50"
        />
      </div>

      {/* AI Analysis */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl shadow-sm border border-amber-200 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-100 rounded-lg">
            <Brain className="h-6 w-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Phân tích AI chi nhánh</h3>
            <div className="space-y-3 text-gray-700 leading-relaxed">
              <p><strong>📊 Tổng quan:</strong> Chi nhánh ghi nhận doanh thu {(branch.revenue / 1000).toFixed(0)}k với {branch.orders} đơn hàng. Giá trị đơn hàng trung bình {(branch.avgOrderValue / 1000).toFixed(0)}k cho thấy khách hàng sẵn sàng chi tiêu.</p>
              
              {branch.customerRetention === 0 && (
                <p className="text-red-700"><strong>⚠️ Vấn đề nghiêm trọng:</strong> Tỷ lệ khách hàng quay lại là 0%. Cần khẩn trương triển khai chương trình giữ chân khách hàng và cải thiện chất lượng dịch vụ.</p>
              )}
              
              {branch.lowStock > 0 && (
                <p className="text-yellow-700"><strong>📦 Cảnh báo tồn kho:</strong> Có {branch.lowStock} sản phẩm sắp hết hàng, cần bổ sung ngay để đảm bảo hoạt động kinh doanh.</p>
              )}
              
              <div className="mt-4 pt-4 border-t border-amber-200">
                <h4 className="font-semibold mb-2">💡 Khuyến nghị:</h4>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Thiết lập chương trình khách hàng thân thiết với ưu đãi hấp dẫn</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Đa dạng hóa menu để thu hút khách hàng mới</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Tối ưu hóa chi phí nguyên liệu để cải thiện lợi nhuận</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Doanh thu theo giờ</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueByHour}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: '#f59e0b', r: 4 }}
                name="Doanh thu (triệu)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Sản phẩm bán chạy</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topProducts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" stroke="#666" />
              <YAxis dataKey="name" type="category" stroke="#666" width={120} />
              <Tooltip />
              <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Reviews */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Phản hồi khách hàng gần đây</h3>
        <div className="space-y-3">
          {recentReviews.map((review) => (
            <div key={review.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={`text-lg ${i < review.rating ? 'text-amber-400' : 'text-gray-300'}`}>
                      ★
                    </span>
                  ))}
                </div>
                <span className="text-sm text-gray-500">{new Date(review.date).toLocaleDateString('vi-VN')}</span>
              </div>
              <p className="text-gray-700">{review.comment}</p>
            </div>
          ))}
        </div>
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

function MetricCard({ title, value, change, icon: Icon, color, bgColor }: MetricCardProps) {
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