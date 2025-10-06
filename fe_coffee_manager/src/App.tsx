import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppToaster from './components/common/AppToaster';
import { Login } from './pages/auth/Login';
import { Layout } from './components/layout/Layout';
import { RoleRedirect } from './components/common/RoleRedirect';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { NotFoundPage } from './components/common/NotFoundPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import ManagerManagement from './pages/admin/ManagerManagement';
import BranchManagement from './pages/admin/BranchManagement';
import ProductManagement from './pages/admin/ProductManagement';
import SupplierManagement from './pages/admin/SupplierManagement';
import IngredientManagement from './pages/admin/IngredientManagement';
import RecipeManagement from './pages/admin/RecipeManagement';
import { ManagerDashboard } from './pages/manager/ManagerDashboard';
import StaffManagement from './pages/manager/StaffManagement';
import { StaffDashboard } from './pages/staff/StaffDashboard';

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

  // Only show Login if there is no token at all. If a token exists but user
  // is not yet resolved, keep routes so 404/guards can render appropriately.
  const hasToken = !!localStorage.getItem('coffee-token');
  if (!user && !hasToken) {
    return <Login />;
  }

  return (
    <Routes>
      {/* Root redirect - chuyển hướng đến trang tương ứng với role */}
      <Route path="/" element={<RoleRedirect />} />
      
      {/* Admin routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <Layout>
            <AdminDashboard />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/admin/*" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <Routes>
            <Route path="products" element={<Layout><ProductManagement /></Layout>} />
            <Route path="suppliers" element={<Layout><SupplierManagement /></Layout>} />
            <Route path="ingredients" element={<Layout><IngredientManagement /></Layout>} />
            <Route path="recipes" element={<Layout><RecipeManagement /></Layout>} />
            <Route path="branches" element={<Layout><BranchManagement /></Layout>} />
            <Route path="managers" element={<Layout><ManagerManagement /></Layout>} />
            <Route path="statistics" element={<Layout><div className="p-8"><h1 className="text-2xl font-bold">Thống kê</h1></div></Layout>} />
            {/* Unknown admin subroute: show 404 without Layout */}
            <Route path="*" element={<NotFoundPage showLoginButton={false} />} />
          </Routes>
        </ProtectedRoute>
      } />
      
      {/* Manager routes */}
      <Route path="/manager" element={
        <ProtectedRoute allowedRoles={['manager']}>
          <Layout>
            <ManagerDashboard />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/manager/*" element={
        <ProtectedRoute allowedRoles={['manager']}>
          <Routes>
            <Route path="staff" element={<Layout><StaffManagement /></Layout>} />
            <Route path="inventory" element={<Layout><div className="p-8"><h1 className="text-2xl font-bold">Quản lý kho</h1></div></Layout>} />
            <Route path="statistics" element={<Layout><div className="p-8"><h1 className="text-2xl font-bold">Thống kê chi nhánh</h1></div></Layout>} />
            <Route path="*" element={<NotFoundPage showLoginButton={false} />} />
          </Routes>
        </ProtectedRoute>
      } />
      
      {/* Staff routes */}
      <Route path="/staff" element={
        <ProtectedRoute allowedRoles={['staff']}>
          <Layout>
            <StaffDashboard />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/staff/*" element={
        <ProtectedRoute allowedRoles={['staff']}>
          <Routes>
            <Route path="orders" element={<Layout><div className="p-8"><h1 className="text-2xl font-bold">Quản lý đơn hàng</h1></div></Layout>} />
            <Route path="reservations" element={<Layout><div className="p-8"><h1 className="text-2xl font-bold">Quản lý đặt bàn</h1></div></Layout>} />
            <Route path="recipes" element={<Layout><div className="p-8"><h1 className="text-2xl font-bold">Xem công thức</h1></div></Layout>} />
            <Route path="*" element={<NotFoundPage showLoginButton={false} />} />
          </Routes>
        </ProtectedRoute>
      } />
      
      {/* Global 404 */}
      <Route path="*" element={<NotFoundPage showLoginButton={false} />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppToaster />
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;