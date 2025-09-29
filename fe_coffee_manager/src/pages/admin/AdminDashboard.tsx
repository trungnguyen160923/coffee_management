import React from 'react';
import { 
  TrendingUp, 
  Store, 
  Users, 
  Package, 
  DollarSign,
  Coffee,
  ShoppingBag,
  Calendar
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

export function AdminDashboard() {
  const stats = [
    { title: 'Total Revenue', value: '2.5B', change: '+12%', icon: DollarSign, color: 'bg-green-500' },
    { title: 'Branches', value: '15', change: '+3', icon: Store, color: 'bg-blue-500' },
    { title: 'Managers', value: '18', change: '+2', icon: Users, color: 'bg-purple-500' },
    { title: 'Products', value: '45', change: '+5', icon: Coffee, color: 'bg-amber-500' }
  ];

  const branchRevenue = [
    { name: 'District 1', revenue: 450 },
    { name: 'District 3', revenue: 380 },
    { name: 'District 7', revenue: 290 },
    { name: 'Thu Duc', revenue: 420 },
    { name: 'Binh Thanh', revenue: 350 }
  ];

  const monthlyTrend = [
    { month: 'Jan', revenue: 2100, orders: 1200 },
    { month: 'Feb', revenue: 2300, orders: 1350 },
    { month: 'Mar', revenue: 2500, orders: 1480 },
    { month: 'Apr', revenue: 2200, orders: 1290 },
    { month: 'May', revenue: 2800, orders: 1650 },
    { month: 'Jun', revenue: 3200, orders: 1890 }
  ];

  const productSales = [
    { name: 'Iced Coffee', value: 35, color: '#8B4513' },
    { name: 'Coffee with Milk', value: 25, color: '#D2691E' },
    { name: 'Cappuccino', value: 20, color: '#CD853F' },
    { name: 'Latte', value: 15, color: '#F4A460' },
    { name: 'Others', value: 5, color: '#DEB887' }
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">System Overview</h1>
        <p className="text-gray-600">Manage your entire coffee chain system</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
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
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Revenue by Branch</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={branchRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                labelStyle={{ color: '#374151' }}
              />
              <Bar dataKey="revenue" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Product Sales Pie Chart */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top Selling Products</h3>
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
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            {productSales.map((item, index) => (
              <div key={index} className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></div>
                <span className="text-sm text-gray-600">{item.name} ({item.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Trend */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Xu hướng doanh thu & đơn hàng</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={monthlyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" stroke="#666" />
            <YAxis yAxisId="left" stroke="#666" />
            <YAxis yAxisId="right" orientation="right" stroke="#666" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              labelStyle={{ color: '#374151' }}
            />
            <Line 
              yAxisId="left" 
              type="monotone" 
              dataKey="revenue" 
              stroke="#f59e0b" 
              strokeWidth={3} 
              dot={{ fill: '#f59e0b', strokeWidth: 2, r: 6 }}
              name="Doanh thu (triệu)"
            />
            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey="orders" 
              stroke="#3b82f6" 
              strokeWidth={3} 
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
              name="Số đơn hàng"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Activity */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Hoạt động gần đây</h3>
          <div className="space-y-4">
            {[
              { action: 'Chi nhánh Quận 1 vượt target doanh thu tháng', time: '2 giờ trước', icon: TrendingUp, color: 'text-green-600' },
              { action: 'Thêm sản phẩm mới: Cold Brew Coffee', time: '5 giờ trước', icon: Coffee, color: 'text-amber-600' },
              { action: 'Quản lý mới được thêm vào chi nhánh Thủ Đức', time: '1 ngày trước', icon: Users, color: 'text-blue-600' },
              { action: 'Cập nhật công thức cho Cappuccino', time: '2 ngày trước', icon: Package, color: 'text-purple-600' }
            ].map((activity, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors duration-200">
                <div className={`p-2 rounded-full bg-gray-100`}>
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
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Top chi nhánh hiệu suất</h3>
          <div className="space-y-4">
            {[
              { name: 'Chi nhánh Quận 1', revenue: '450 triệu', growth: '+15%', rank: 1 },
              { name: 'Chi nhánh Thủ Đức', revenue: '420 triệu', growth: '+12%', rank: 2 },
              { name: 'Chi nhánh Quận 3', revenue: '380 triệu', growth: '+8%', rank: 3 },
              { name: 'Chi nhánh Bình Thạnh', revenue: '350 triệu', growth: '+5%', rank: 4 }
            ].map((branch) => (
              <div key={branch.rank} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors duration-200">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                    branch.rank === 1 ? 'bg-yellow-500' : 
                    branch.rank === 2 ? 'bg-gray-400' : 
                    branch.rank === 3 ? 'bg-amber-600' : 'bg-gray-300'
                  }`}>
                    {branch.rank}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{branch.name}</p>
                    <p className="text-sm text-gray-500">{branch.revenue}</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-green-600">{branch.growth}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}