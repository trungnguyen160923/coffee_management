import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ManagerDashboard } from './components/manager/ManagerDashboard';
import { StaffDashboard } from './components/staff/StaffDashboard';

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-orange-600 rounded-2xl flex items-center justify-center mb-4 mx-auto animate-pulse">
            <div className="w-8 h-8 bg-white rounded-full"></div>
          </div>
          <p className="text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Layout>
      <Routes>
        {user.role === 'admin' && (
          <>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/products" element={<div className="p-8"><h1 className="text-2xl font-bold">Quản lý sản phẩm</h1></div>} />
            <Route path="/admin/recipes" element={<div className="p-8"><h1 className="text-2xl font-bold">Quản lý công thức</h1></div>} />
            <Route path="/admin/branches" element={<div className="p-8"><h1 className="text-2xl font-bold">Quản lý chi nhánh</h1></div>} />
            <Route path="/admin/managers" element={<div className="p-8"><h1 className="text-2xl font-bold">Quản lý quản lý</h1></div>} />
            <Route path="/admin/statistics" element={<div className="p-8"><h1 className="text-2xl font-bold">Thống kê</h1></div>} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </>
        )}
        
        {user.role === 'manager' && (
          <>
            <Route path="/manager" element={<ManagerDashboard />} />
            <Route path="/manager/staff" element={<div className="p-8"><h1 className="text-2xl font-bold">Quản lý nhân viên</h1></div>} />
            <Route path="/manager/inventory" element={<div className="p-8"><h1 className="text-2xl font-bold">Quản lý kho</h1></div>} />
            <Route path="/manager/statistics" element={<div className="p-8"><h1 className="text-2xl font-bold">Thống kê chi nhánh</h1></div>} />
            <Route path="*" element={<Navigate to="/manager" replace />} />
          </>
        )}
        
        {user.role === 'staff' && (
          <>
            <Route path="/staff" element={<StaffDashboard />} />
            <Route path="/staff/orders" element={<div className="p-8"><h1 className="text-2xl font-bold">Quản lý đơn hàng</h1></div>} />
            <Route path="/staff/reservations" element={<div className="p-8"><h1 className="text-2xl font-bold">Quản lý đặt bàn</h1></div>} />
            <Route path="/staff/recipes" element={<div className="p-8"><h1 className="text-2xl font-bold">Xem công thức</h1></div>} />
            <Route path="*" element={<Navigate to="/staff" replace />} />
          </>
        )}
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;