import React, { useState } from 'react';
import { 
  Coffee, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Plus,
  Calendar,
  Users,
  Timer,
  DollarSign
} from 'lucide-react';

export function StaffDashboard() {
  const [activeTab, setActiveTab] = useState('orders');

  const todayStats = [
    { title: 'Đơn hàng hôm nay', value: '32', icon: Coffee, color: 'bg-blue-500' },
    { title: 'Đang chế biến', value: '5', icon: Clock, color: 'bg-orange-500' },
    { title: 'Hoàn thành', value: '27', icon: CheckCircle, color: 'bg-green-500' },
    { title: 'Đặt bàn hôm nay', value: '8', icon: Calendar, color: 'bg-purple-500' }
  ];

  const currentOrders = [
    { 
      id: '#001', 
      items: ['Cà phê đá x2', 'Bánh mì x1'], 
      total: 85000, 
      status: 'preparing', 
      time: '2 phút', 
      customer: 'Khách hàng A',
      type: 'dine-in'
    },
    { 
      id: '#002', 
      items: ['Cappuccino x1', 'Croissant x1'], 
      total: 120000, 
      status: 'ready', 
      time: '5 phút', 
      customer: 'Nguyễn Văn B',
      type: 'takeaway'
    },
    { 
      id: '#003', 
      items: ['Latte x3', 'Bánh ngọt x2'], 
      total: 210000, 
      status: 'pending', 
      time: '1 phút', 
      customer: 'Trần Thị C',
      type: 'online'
    }
  ];

  const todayReservations = [
    { 
      id: 'R001', 
      customerName: 'Lê Văn D', 
      phone: '0901234567', 
      table: 5, 
      guests: 4, 
      time: '14:30', 
      status: 'confirmed' 
    },
    { 
      id: 'R002', 
      customerName: 'Phạm Thị E', 
      phone: '0912345678', 
      table: 3, 
      guests: 2, 
      time: '16:00', 
      status: 'seated' 
    },
    { 
      id: 'R003', 
      customerName: 'Hoàng Văn F', 
      phone: '0923456789', 
      table: 8, 
      guests: 6, 
      time: '19:00', 
      status: 'confirmed' 
    }
  ];

  const popularRecipes = [
    { 
      name: 'Cà phê đá', 
      ingredients: ['Cà phê robusta 20g', 'Nước đá', 'Đường 10g'], 
      steps: ['Pha cà phê với nước nóng 90°C', 'Thêm đường khuấy đều', 'Cho đá và phục vụ'],
      prepTime: '3 phút'
    },
    { 
      name: 'Cappuccino', 
      ingredients: ['Espresso 30ml', 'Sữa tươi 150ml', 'Bột ca cao'], 
      steps: ['Pha espresso', 'Đánh sữa tạo foam', 'Rót sữa vào espresso', 'Trang trí với ca cao'],
      prepTime: '4 phút'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'preparing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'seated': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Chờ xử lý';
      case 'preparing': return 'Đang pha';
      case 'ready': return 'Sẵn sàng';
      case 'completed': return 'Hoàn thành';
      case 'confirmed': return 'Đã xác nhận';
      case 'seated': return 'Đã nhận bàn';
      default: return status;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'dine-in': return 'bg-purple-100 text-purple-800';
      case 'takeaway': return 'bg-orange-100 text-orange-800';
      case 'online': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'dine-in': return 'Tại quán';
      case 'takeaway': return 'Mang đi';
      case 'online': return 'Online';
      default: return type;
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Trang nhân viên</h1>
        <p className="text-gray-600">Quản lý đơn hàng và phục vụ khách hàng</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {todayStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <div className="flex space-x-4">
          <button className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg">
            <Plus className="h-5 w-5" />
            <span>Tạo đơn hàng mới</span>
          </button>
          <button className="flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg">
            <Calendar className="h-5 w-5" />
            <span>Đặt bàn mới</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 rounded-xl p-1">
          {[
            { id: 'orders', label: 'Đơn hàng', icon: Coffee },
            { id: 'reservations', label: 'Đặt bàn', icon: Calendar },
            { id: 'recipes', label: 'Công thức', icon: Coffee }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                activeTab === tab.id 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800">Đơn hàng hiện tại</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {currentOrders.map((order) => (
              <div key={order.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="text-lg font-bold text-gray-900">{order.id}</div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${getTypeColor(order.type)}`}>
                      {getTypeText(order.type)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Timer className="h-4 w-4" />
                      <span>{order.time}</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {order.total.toLocaleString('vi-VN')}đ
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Khách hàng:</p>
                    <p className="text-gray-900">{order.customer}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Sản phẩm:</p>
                    <ul className="text-gray-900">
                      {order.items.map((item, index) => (
                        <li key={index} className="text-sm">• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex space-x-3">
                  {order.status === 'pending' && (
                    <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200">
                      Bắt đầu pha
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors duration-200">
                      Hoàn thành
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors duration-200">
                      Đã giao
                    </button>
                  )}
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200">
                    Xem chi tiết
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'reservations' && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800">Đặt bàn hôm nay</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {todayReservations.map((reservation) => (
              <div key={reservation.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="text-lg font-bold text-gray-900">{reservation.id}</div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(reservation.status)}`}>
                      {getStatusText(reservation.status)}
                    </span>
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {reservation.time}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Khách hàng:</p>
                    <p className="text-gray-900">{reservation.customerName}</p>
                    <p className="text-sm text-gray-500">{reservation.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Bàn số:</p>
                    <p className="text-gray-900 text-xl font-bold">{reservation.table}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Số khách:</p>
                    <p className="text-gray-900">{reservation.guests} người</p>
                  </div>
                </div>

                <div className="flex space-x-3">
                  {reservation.status === 'confirmed' && (
                    <button className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors duration-200">
                      Nhận bàn
                    </button>
                  )}
                  {reservation.status === 'seated' && (
                    <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200">
                      Tạo đơn hàng
                    </button>
                  )}
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200">
                    Chỉnh sửa
                  </button>
                  <button className="px-4 py-2 border border-red-300 text-red-700 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors duration-200">
                    Hủy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'recipes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {popularRecipes.map((recipe, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">{recipe.name}</h3>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  <span>{recipe.prepTime}</span>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Nguyên liệu:</h4>
                <ul className="space-y-1">
                  {recipe.ingredients.map((ingredient, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-center">
                      <div className="w-2 h-2 bg-amber-400 rounded-full mr-3"></div>
                      {ingredient}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Cách pha:</h4>
                <ol className="space-y-2">
                  {recipe.steps.map((step, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex">
                      <span className="flex-shrink-0 w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                        {idx + 1}
                      </span>
                      <span className="flex-1">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}