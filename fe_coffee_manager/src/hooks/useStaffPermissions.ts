import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getStaffRoleNames, canViewRecipesSync, canViewMenuItemsSync, canViewPOSSync, canViewOrdersSync, canViewReservationsSync, canViewTablesSync, canViewStockUsageSync } from '../utils/staffPermissions';

/**
 * Hook to manage staff permissions with role names caching
 */
export function useStaffPermissions() {
  const { user } = useAuth();
  const [roleNames, setRoleNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || user.role !== 'staff') {
      setRoleNames([]);
      setLoading(false);
      return;
    }

    const fetchRoleNames = async () => {
      try {
        const names = await getStaffRoleNames(user);
        setRoleNames(names);
      } catch (error) {
        console.error('Failed to fetch staff role names:', error);
        setRoleNames([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRoleNames();
  }, [user]);

  const permissions = useMemo(() => {
    if (!user || user.role !== 'staff') {
      return {
        canViewRecipes: false,
        canViewMenuItems: false,
        canViewPOS: false,
        canViewOrders: false,
        canViewReservations: false,
        canViewTables: false,
        canViewStockUsage: false,
      };
    }

    const perms = {
      canViewRecipes: canViewRecipesSync(user, roleNames),
      canViewMenuItems: canViewMenuItemsSync(user, roleNames),
      canViewPOS: canViewPOSSync(user, roleNames),
      canViewOrders: canViewOrdersSync(user, roleNames),
      canViewReservations: canViewReservationsSync(user, roleNames),
      canViewTables: canViewTablesSync(user, roleNames),
      canViewStockUsage: canViewStockUsageSync(user, roleNames),
    };
    return perms;
  }, [
    user?.id, 
    user?.role, 
    user?.staffBusinessRoleIds?.join(','), 
    roleNames.join(',')
  ]);

  // Return stable object reference to prevent infinite loops
  // Use individual permission values instead of permissions object
  return useMemo(() => ({
    canViewRecipes: permissions.canViewRecipes,
    canViewMenuItems: permissions.canViewMenuItems,
    canViewPOS: permissions.canViewPOS,
    canViewOrders: permissions.canViewOrders,
    canViewReservations: permissions.canViewReservations,
    canViewTables: permissions.canViewTables,
    canViewStockUsage: permissions.canViewStockUsage,
    roleNames,
    loading,
  }), [
    permissions.canViewRecipes,
    permissions.canViewMenuItems,
    permissions.canViewPOS,
    permissions.canViewOrders,
    permissions.canViewReservations,
    permissions.canViewTables,
    permissions.canViewStockUsage,
    roleNames.join(','),
    loading,
  ]);
}

