import React from 'react';
import { 
  Users, 
  Package, 
  TrendingUp, 
  Clock,
  DollarSign,
  ShoppingBag,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export function ManagerDashboard() {
  const stats = [
    { title: 'Today\'s Revenue', value: '12.5M', change: '+8%', icon: DollarSign, color: 'bg-green-500' },
    { title: 'Orders', value: '156', change: '+12', icon: ShoppingBag, color: 'bg-blue-500' },
    { title: 'Staff', value: '12', change: '2 shifts', icon: Users, color: 'bg-purple-500' },
    { title: 'Inventory', value: '8 low', change: 'need restock', icon: AlertTriangle, color: 'bg-red-500' }
  ];

  const hourlyOrders = [
    { hour: '6h', orders: 5 },
    { hour: '7h', orders: 12 },
    { hour: '8h', orders: 25 },
    { hour: '9h', orders: 18 },
    { hour: '10h', orders: 15 },
    { hour: '11h', orders: 22 },
    { hour: '12h', orders: 35 },
    { hour: '13h', orders: 28 },
    { hour: '14h', orders: 20 },
    { hour: '15h', orders: 24 },
    { hour: '16h', orders: 30 },
    { hour: '17h', orders: 18 }
  ];

  const weeklyRevenue = [
    { day: 'T2', revenue: 8.5, target: 10 },
    { day: 'T3', revenue: 12.3, target: 10 },
    { day: 'T4', revenue: 11.2, target: 10 },
    { day: 'T5', revenue: 15.8, target: 10 },
    { day: 'T6', revenue: 18.5, target: 10 },
    { day: 'T7', revenue: 22.1, target: 10 },
    { day: 'CN', revenue: 19.8, target: 10 }
  ];

  const lowStockItems = [
    { name: 'Cà phê Arabica', current: 2, min: 10, unit: 'kg' },
    { name: 'Sữa tươi', current: 5, min: 20, unit: 'lít' },
    { name: 'Đường trắng', current: 3, min: 15, unit: 'kg' },
    { name: 'Ly giấy size M', current: 50, min: 200, unit: 'cái' }
  ];

  const todayStaff = [
    { name: 'Nguyễn Văn A', shift: 'Ca sáng', status: 'active', avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=150' },
    { name: 'Trần Thị B', shift: 'Ca sáng', status: 'active', avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=150' },
    { name: 'Lê Văn C', shift: 'Ca chiều', status: 'scheduled', avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150' },
    { name: 'Phạm Thị D', shift: 'Ca tối', status: 'scheduled', avatar: 'https://images.pexels.com/photos/762020/pexels-photo-762020.jpeg?auto=compress&cs=tinysrgb&w=150' }
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Quản lý chi nhánh</h1>
        <p className="text-gray-600">Chi nhánh Quận 1 - Hôm nay, {new Date().toLocaleDateString('vi-VN')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.change}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Hourly Orders */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Đơn hàng theo giờ</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={hourlyOrders}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                labelStyle={{ color: '#374151' }}
              />
              <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly Revenue */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Doanh thu tuần này</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                labelStyle={{ color: '#374151' }}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#10b981" 
                strokeWidth={3} 
                dot={{ fill: '#10b981', strokeWidth: 2, r: 6 }}
                name="Doanh thu (triệu)"
              />
              <Line 
                type="monotone" 
                dataKey="target" 
                stroke="#ef4444" 
                strokeWidth={2} 
                strokeDasharray="5 5"
                dot={false}
                name="Target (triệu)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alert */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Cảnh báo hàng tồn kho</h3>
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <div className="space-y-4">
            {lowStockItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-100">
                <div>
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-sm text-red-600">
                    Còn {item.current} {item.unit} (tối thiểu: {item.min} {item.unit})
                  </p>
                </div>
                <button className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors duration-200">
                  Nhập hàng
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Staff */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Nhân viên hôm nay</h3>
            <Users className="h-5 w-5 text-blue-500" />
          </div>
          <div className="space-y-4">
            {todayStaff.map((staff, index) => (
              <div key={index} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors duration-200">
                <div className="flex items-center space-x-3">
                  <img
                    src={staff.avatar}
                    alt={staff.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{staff.name}</p>
                    <p className="text-sm text-gray-500">{staff.shift}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {staff.status === 'active' ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-green-600 font-medium">Đang làm</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500 font-medium">Chờ ca</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}