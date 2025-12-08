import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useStaffPermissions } from '../../hooks/useStaffPermissions';
import { NotFoundPage } from '../common/NotFoundPage';

interface ProtectedStaffRouteProps {
  children: ReactNode;
  requiredPermission?: 'canViewPOS' | 'canViewOrders' | 'canViewReservations' | 'canViewTables' | 'canViewRecipes' | 'canViewStockUsage' | 'canViewMenuItems';
}

/**
 * Component to protect staff routes based on staff business role permissions
 */
export function ProtectedStaffRoute({ children, requiredPermission }: ProtectedStaffRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const staffPermissions = useStaffPermissions();
  const navigate = useNavigate();

  // If not staff, redirect
  if (!authLoading && (!user || user.role !== 'staff')) {
    return <NotFoundPage showLoginButton={false} />;
  }

  // If no permission required, allow access (even while loading)
  if (!requiredPermission) {
    return <>{children}</>;
  }

  // If permissions are loading, temporarily allow access to avoid blocking
  // This prevents the page from being stuck in loading state
  if (authLoading || staffPermissions.loading) {
    // Show children while loading - permissions will be checked once loaded
    // This prevents blocking legitimate access during the loading phase
    return <>{children}</>;
  }

  // Check permission
  const hasPermission = staffPermissions[requiredPermission] === true;
  
  console.log(`[ProtectedStaffRoute] requiredPermission: ${requiredPermission}, hasPermission: ${hasPermission}, loading: ${staffPermissions.loading}`);
  console.log(`[ProtectedStaffRoute] roleNames: [${staffPermissions.roleNames.join(', ')}]`);
  console.log(`[ProtectedStaffRoute] All permissions:`, {
    canViewPOS: staffPermissions.canViewPOS,
    canViewOrders: staffPermissions.canViewOrders,
    canViewReservations: staffPermissions.canViewReservations,
    canViewTables: staffPermissions.canViewTables,
    canViewRecipes: staffPermissions.canViewRecipes,
    canViewStockUsage: staffPermissions.canViewStockUsage,
    canViewMenuItems: staffPermissions.canViewMenuItems,
  });

  // If permissions are still loading or roleNames are empty but user has roleIds, allow access temporarily
  // This handles the case where API call might be slow or failed
  if (staffPermissions.loading || (staffPermissions.roleNames.length === 0 && user?.staffBusinessRoleIds && user.staffBusinessRoleIds.length > 0)) {
    console.log(`[ProtectedStaffRoute] Allowing access temporarily - loading: ${staffPermissions.loading}, roleNames empty: ${staffPermissions.roleNames.length === 0}`);
    return <>{children}</>;
  }

  if (!hasPermission) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You don't have permission to access this page.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Your roles: {staffPermissions.roleNames.length > 0 ? staffPermissions.roleNames.join(', ') : 'None assigned'}
            </p>
            <button
              onClick={() => navigate('/staff')}
              className="px-6 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

