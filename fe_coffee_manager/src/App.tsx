import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppToaster from './components/common/AppToaster';
import { Login } from './pages/auth/Login';
import { Layout } from './components/layout/Layout';
import { RoleRedirect } from './components/common/RoleRedirect';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ProtectedStaffRoute } from './components/auth/ProtectedStaffRoute';
import { NotFoundPage } from './components/common/NotFoundPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import ManagerManagement from './pages/admin/ManagerManagement';
import BranchManagement from './pages/admin/BranchManagement';
import ProductManagement from './pages/admin/ProductManagement';
import SupplierManagement from './pages/admin/SupplierManagement';
import IngredientManagement from './pages/admin/IngredientManagement';
import RecipeManagement from './pages/admin/RecipeManagement';
import AdminDiscountManagementPage from './pages/admin/DiscountManagement';
import AIStatistics from './pages/admin/AIStatistics';
import { AdminBranchActivities } from './pages/admin/AdminBranchActivities';
import AdminPayrollManagement from './pages/admin/AdminPayrollManagement';
import AdminPayrollTemplates from './pages/admin/AdminPayrollTemplates';
import AdminPayrollReports from './pages/admin/AdminPayrollReports';
import { ManagerDashboard } from './pages/manager/ManagerDashboard';
import StaffManagement from './pages/manager/StaffManagement';
import ManagerSupplierManagement from './pages/manager/SupplierManagement';
import ManagerProductManagement from './pages/manager/ProductManagement';
import IngredientProcurement from './pages/manager/IngredientProcurement';
import PurchaseOrders from './pages/manager/PurchaseOrders';
import StockManagement from './pages/manager/StockManagement';
import GoodsReceipts from './pages/manager/GoodsReceipts';
import ReturnGoods from './pages/manager/ReturnGoods';
import { TableManagement } from './pages/manager/TableManagement';
import DiscountManagementPage from './pages/manager/DiscountManagement';
import ManagerIngredientManagement from './pages/manager/IngredientManagement';
import ManagerAIStatistics from './pages/manager/AIStatistics';
import ManagerStaffSchedule from './pages/manager/ManagerStaffSchedule';
import ShiftTemplateManagement from './pages/manager/ShiftTemplateManagement';
import ShiftCalendarPage from './pages/manager/ShiftCalendarPage';
import ShiftAssignmentsManagement from './pages/manager/ShiftAssignmentsManagement';
import BranchClosureManagement from './pages/manager/BranchClosureManagement';
import ManagerShiftRequests from './pages/manager/ManagerShiftRequests';
import ManagerPayrollManagement from './pages/manager/ManagerPayrollManagement';
import ManagerBonusPenaltyAllowanceManagement from './pages/manager/ManagerBonusPenaltyAllowanceManagement';
import ManagerPayrollTemplates from './pages/manager/ManagerPayrollTemplates';
import { StaffDashboard } from './pages/staff/StaffDashboard';
import SupplierConfirmPage from './pages/supplier/SupplierConfirmPage';
import SupplierSuccessPage from './pages/supplier/SupplierSuccessPage';
import SupplierCancelledPage from './pages/supplier/SupplierCancelledPage';
import StaffOrders from './pages/staff/StaffOrders';
import StaffReservations from './pages/staff/StaffReservations';
import StaffRecipes from './pages/staff/StaffRecipes';
import StaffPOS from './pages/staff/StaffPOS';
import StaffTables from './pages/staff/StaffTables';
import StaffStockUsage from './pages/staff/StaffStockUsage';
import StaffShiftRegistration from './pages/staff/StaffShiftRegistration';
import StaffMyShifts from './pages/staff/StaffMyShifts';
import StaffMyRequests from './pages/staff/StaffMyRequests';
import AccountSettingsPage from './pages/common/AccountSettingsPage';

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

  // Check if current path is a public supplier route
  const isPublicSupplierRoute = window.location.pathname.startsWith('/supplier/');

  // For public supplier routes, always allow access
  if (isPublicSupplierRoute) {
    return (
      <Routes>
        <Route path="/supplier/po/:poId/confirm" element={<SupplierConfirmPage />} />
        <Route path="/supplier/po/:poId/cancel" element={<SupplierConfirmPage />} />
        <Route path="/supplier/success" element={<SupplierSuccessPage />} />
        <Route path="/supplier/cancelled" element={<SupplierCancelledPage />} />
        <Route path="*" element={<NotFoundPage showLoginButton={false} />} />
      </Routes>
    );
  }

  // Only show Login if there is no token at all
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
            <Route path="branch-activities" element={<Layout><AdminBranchActivities /></Layout>} />
            <Route path="managers" element={<Layout><ManagerManagement /></Layout>} />
            <Route path="discounts" element={<Layout><AdminDiscountManagementPage /></Layout>} />
            <Route path="statistics" element={<Layout><AIStatistics /></Layout>} />
            <Route path="payroll" element={<Layout><AdminPayrollManagement /></Layout>} />
            <Route path="payroll-templates" element={<Layout><AdminPayrollTemplates /></Layout>} />
            <Route path="payroll-reports" element={<Layout><AdminPayrollReports /></Layout>} />
            <Route path="account" element={<Layout><AccountSettingsPage /></Layout>} />
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
            <Route path="products" element={<Layout><ManagerProductManagement /></Layout>} />
            <Route path="shifts" element={<Layout><ShiftCalendarPage /></Layout>} />
            <Route path="shift-templates" element={<Layout><ShiftTemplateManagement /></Layout>} />
            <Route path="shift-assignments" element={<Layout><ShiftAssignmentsManagement /></Layout>} />
            <Route path="shift-requests" element={<Layout><ManagerShiftRequests /></Layout>} />
            <Route path="staff-schedule" element={<Layout><ManagerStaffSchedule /></Layout>} />
            <Route path="branch-closures" element={<Layout><BranchClosureManagement /></Layout>} />
            <Route path="tables" element={<Layout><TableManagement /></Layout>} />
            <Route path="discounts" element={<Layout><DiscountManagementPage /></Layout>} />
            <Route path="payroll" element={<Layout><ManagerPayrollManagement /></Layout>} />
            <Route path="bonus-penalty-allowance" element={<Layout><ManagerBonusPenaltyAllowanceManagement /></Layout>} />
            <Route path="payroll-templates" element={<Layout><ManagerPayrollTemplates /></Layout>} />
            <Route path="procurement" element={<Layout><IngredientProcurement /></Layout>} />
            <Route path="suppliers" element={<Layout><ManagerSupplierManagement /></Layout>} />
            <Route path="purchase-orders" element={<Layout><PurchaseOrders /></Layout>} />
            <Route path="inventory" element={<Layout><StockManagement /></Layout>} />
            <Route path="ingredients" element={<Layout><ManagerIngredientManagement /></Layout>} />
            <Route path="goods-receipts" element={<Layout><GoodsReceipts /></Layout>} />
            <Route path="return-goods" element={<Layout><ReturnGoods /></Layout>} />
            <Route path="statistics" element={<Layout><ManagerAIStatistics /></Layout>} />
            <Route path="account" element={<Layout><AccountSettingsPage /></Layout>} />
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
            <Route path="orders" element={<ProtectedStaffRoute requiredPermission="canViewOrders"><Layout><StaffOrders /></Layout></ProtectedStaffRoute>} />
            <Route path="reservations" element={<ProtectedStaffRoute requiredPermission="canViewReservations"><Layout><StaffReservations /></Layout></ProtectedStaffRoute>} />
            <Route path="tables" element={<ProtectedStaffRoute requiredPermission="canViewTables"><Layout><StaffTables /></Layout></ProtectedStaffRoute>} />
            <Route path="recipes" element={<ProtectedStaffRoute requiredPermission="canViewRecipes"><Layout><StaffRecipes /></Layout></ProtectedStaffRoute>} />
            <Route path="pos" element={<ProtectedStaffRoute requiredPermission="canViewPOS"><StaffPOS /></ProtectedStaffRoute>} />
            <Route path="stock-usage" element={<ProtectedStaffRoute requiredPermission="canViewStockUsage"><Layout><StaffStockUsage /></Layout></ProtectedStaffRoute>} />
            <Route path="shifts" element={<Layout><StaffShiftRegistration /></Layout>} />
            <Route path="my-shifts" element={<Layout><StaffMyShifts /></Layout>} />
            <Route path="my-requests" element={<Layout><StaffMyRequests /></Layout>} />
            <Route path="pending-requests" element={<Layout><StaffMyRequests /></Layout>} />
            <Route path="account" element={<Layout><AccountSettingsPage /></Layout>} />
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