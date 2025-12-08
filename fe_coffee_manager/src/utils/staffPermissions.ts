import { User } from '../types';

/**
 * Staff business role names
 */
export const STAFF_ROLES = {
  BARISTA_STAFF: 'BARISTA_STAFF',
  CASHIER_STAFF: 'CASHIER_STAFF',
  SERVER_STAFF: 'SERVER_STAFF',
  SECURITY_STAFF: 'SECURITY_STAFF',
} as const;

/**
 * Roles that can view recipes
 * If user has multiple roles, they can view recipes if they have at least one role that allows it
 */
const ROLES_CAN_VIEW_RECIPES = [
  STAFF_ROLES.BARISTA_STAFF,
];

/**
 * Roles that can view POS (only CASHIER_STAFF)
 */
const ROLES_CAN_VIEW_POS = [
  STAFF_ROLES.CASHIER_STAFF,
];

/**
 * Roles that can view Orders (CASHIER, SERVER, BARISTA)
 */
const ROLES_CAN_VIEW_ORDERS = [
  STAFF_ROLES.CASHIER_STAFF,
  STAFF_ROLES.SERVER_STAFF,
  STAFF_ROLES.BARISTA_STAFF,
];

/**
 * Roles that can view Reservations (CASHIER, SERVER)
 */
const ROLES_CAN_VIEW_RESERVATIONS = [
  STAFF_ROLES.CASHIER_STAFF,
  STAFF_ROLES.SERVER_STAFF,
];

/**
 * Roles that can view Tables (CASHIER, SERVER)
 */
const ROLES_CAN_VIEW_TABLES = [
  STAFF_ROLES.CASHIER_STAFF,
  STAFF_ROLES.SERVER_STAFF,
];

/**
 * Roles that can view Stock Usage (only BARISTA_STAFF)
 */
const ROLES_CAN_VIEW_STOCK_USAGE = [
  STAFF_ROLES.BARISTA_STAFF,
];

/**
 * Roles that can only see Shift menu
 * Currently only SECURITY_STAFF has this restriction
 */
// const ROLES_ONLY_SHIFT_MENU = [
//   STAFF_ROLES.SECURITY_STAFF,
// ];

// Cache for roles mapping (roleId -> roleName)
let rolesCache: Map<number, string> | null = null;
let rolesCachePromise: Promise<Map<number, string>> | null = null;

/**
 * Get roles mapping (roleId -> roleName)
 * Uses cache to avoid multiple API calls
 */
async function getRolesMapping(): Promise<Map<number, string>> {
  if (rolesCache) {
    return rolesCache;
  }
  
  if (rolesCachePromise) {
    return rolesCachePromise;
  }
  
  rolesCachePromise = (async () => {
    try {
      const { authService } = await import('../services/authService');
      const roles = await authService.getStaffBusinessRoles();
      console.log('[getRolesMapping] Fetched roles from API:', roles);
      const mapping = new Map<number, string>();
      roles.forEach(role => {
        mapping.set(role.roleId, role.name);
        console.log(`[getRolesMapping] Mapped roleId ${role.roleId} -> ${role.name}`);
      });
      rolesCache = mapping;
      return mapping;
    } catch (error) {
      console.error('Failed to fetch staff business roles:', error);
      return new Map<number, string>();
    } finally {
      rolesCachePromise = null;
    }
  })();
  
  return rolesCachePromise;
}

/**
 * Get staff role names from user's roleIds
 */
export async function getStaffRoleNames(user: User | null): Promise<string[]> {
  if (!user || user.role !== 'staff' || !user.staffBusinessRoleIds || user.staffBusinessRoleIds.length === 0) {
    console.log(`[getStaffRoleNames] User ${user?.id} has no roleIds, returning empty array`);
    return [];
  }
  
  try {
    const rolesMapping = await getRolesMapping();
    console.log(`[getStaffRoleNames] Roles mapping size: ${rolesMapping.size}`);
    
    const roleNames = user.staffBusinessRoleIds
      .map(roleId => {
        const name = rolesMapping.get(roleId);
        console.log(`[getStaffRoleNames] Mapping roleId ${roleId} -> ${name || 'NOT FOUND'}`);
        return name;
      })
      .filter((name): name is string => Boolean(name));
    
    console.log(`[getStaffRoleNames] Final roleNames for user ${user.id}:`, roleNames);
    
    // If we have roleIds but no roleNames mapped, log warning
    if (user.staffBusinessRoleIds.length > 0 && roleNames.length === 0) {
      console.warn(`[getStaffRoleNames] WARNING: User ${user.id} has roleIds [${user.staffBusinessRoleIds.join(', ')}] but no roleNames were mapped!`);
    }
    
    return roleNames;
  } catch (error) {
    console.error(`[getStaffRoleNames] Error mapping roleIds for user ${user.id}:`, error);
    // Return empty array on error - permissions will default to allowing (backward compatibility)
    return [];
  }
}

/**
 * Check if user has a specific staff business role
 */
export async function hasStaffRole(user: User | null, roleName: string): Promise<boolean> {
  const roleNames = await getStaffRoleNames(user);
  return roleNames.includes(roleName);
}

/**
 * Check if staff has any of the specified roles
 */
export async function hasAnyStaffRole(user: User | null, roleNames: string[]): Promise<boolean> {
  const userRoleNames = await getStaffRoleNames(user);
  return roleNames.some(roleName => userRoleNames.includes(roleName));
}

/**
 * Check if staff can view recipes
 * Rules:
 * - BARISTA_STAFF: can view recipes
 * - CASHIER_STAFF: cannot view recipes
 * - SERVER_STAFF: cannot view recipes
 * - SECURITY_STAFF: cannot view recipes (and other menus)
 * 
 * If user has multiple roles, they can view recipes if they have at least one role that allows it (BARISTA_STAFF)
 */
export async function canViewRecipes(user: User | null): Promise<boolean> {
  if (!user || user.role !== 'staff') {
    return false;
  }
  
  // If no staff roles assigned, default to allowing (for backward compatibility)
  if (!user.staffBusinessRoleIds || user.staffBusinessRoleIds.length === 0) {
    return true;
  }
  
  const userRoleNames = await getStaffRoleNames(user);
  // If user has at least one role that can view recipes, return true
  return ROLES_CAN_VIEW_RECIPES.some(role => userRoleNames.includes(role));
}

/**
 * Check if staff can view menu items (other than Shift menu)
 * Rules:
 * - SECURITY_STAFF: can only see Shift menu
 * - Other staff: can see all menus (except recipes if restricted)
 */
export async function canViewMenuItems(user: User | null): Promise<boolean> {
  if (!user || user.role !== 'staff') {
    return false;
  }
  
  // If no staff roles assigned, default to allowing
  if (!user.staffBusinessRoleIds || user.staffBusinessRoleIds.length === 0) {
    return true;
  }
  
  const userRoleNames = await getStaffRoleNames(user);
  // If user has SECURITY_STAFF role, they can only see Shift menu
  return !userRoleNames.includes(STAFF_ROLES.SECURITY_STAFF);
}

/**
 * Synchronous version using cached roles (for use in components)
 * Note: This requires roles to be pre-fetched
 */
export function canViewRecipesSync(user: User | null, roleNames: string[]): boolean {
  if (!user || user.role !== 'staff') {
    return false;
  }
  
  if (!user.staffBusinessRoleIds || user.staffBusinessRoleIds.length === 0) {
    return true;
  }
  
  // If roleNames is empty but user has roleIds, might be still loading - allow temporarily
  if (roleNames.length === 0 && user.staffBusinessRoleIds.length > 0) return true;
  
  // If user has at least one role that can view recipes, return true
  const result = ROLES_CAN_VIEW_RECIPES.some(role => roleNames.includes(role));
  console.log(`[canViewRecipesSync] User ${user.id}, roleNames: [${roleNames.join(', ')}], canViewRecipes: ${result}`);
  return result;
}

export function canViewMenuItemsSync(user: User | null, roleNames: string[]): boolean {
  if (!user || user.role !== 'staff') {
    return false;
  }
  
  if (!user.staffBusinessRoleIds || user.staffBusinessRoleIds.length === 0) {
    return true;
  }
  
  // If roleNames is empty but user has roleIds, might be still loading - allow temporarily
  if (roleNames.length === 0 && user.staffBusinessRoleIds.length > 0) return true;
  
  const result = !roleNames.includes(STAFF_ROLES.SECURITY_STAFF);
  console.log(`[canViewMenuItemsSync] User ${user.id}, roleNames: [${roleNames.join(', ')}], canViewMenuItems: ${result}`);
  return result;
}

/**
 * Check if staff can view POS
 * Rules: Only CASHIER_STAFF can view POS
 */
export async function canViewPOS(user: User | null): Promise<boolean> {
  if (!user || user.role !== 'staff') {
    return false;
  }
  
  if (!user.staffBusinessRoleIds || user.staffBusinessRoleIds.length === 0) {
    return true; // Default allow for backward compatibility
  }
  
  const userRoleNames = await getStaffRoleNames(user);
  return ROLES_CAN_VIEW_POS.some(role => userRoleNames.includes(role));
}

/**
 * Check if staff can view Orders
 * Rules: CASHIER_STAFF, SERVER_STAFF, BARISTA_STAFF can view orders
 */
export async function canViewOrders(user: User | null): Promise<boolean> {
  if (!user || user.role !== 'staff') {
    return false;
  }
  
  if (!user.staffBusinessRoleIds || user.staffBusinessRoleIds.length === 0) {
    return true; // Default allow for backward compatibility
  }
  
  const userRoleNames = await getStaffRoleNames(user);
  return ROLES_CAN_VIEW_ORDERS.some(role => userRoleNames.includes(role));
}

/**
 * Check if staff can view Reservations
 * Rules: CASHIER_STAFF, SERVER_STAFF can view reservations
 */
export async function canViewReservations(user: User | null): Promise<boolean> {
  if (!user || user.role !== 'staff') {
    return false;
  }
  
  if (!user.staffBusinessRoleIds || user.staffBusinessRoleIds.length === 0) {
    return true; // Default allow for backward compatibility
  }
  
  const userRoleNames = await getStaffRoleNames(user);
  return ROLES_CAN_VIEW_RESERVATIONS.some(role => userRoleNames.includes(role));
}

/**
 * Check if staff can view Tables
 * Rules: CASHIER_STAFF, SERVER_STAFF can view tables
 */
export async function canViewTables(user: User | null): Promise<boolean> {
  if (!user || user.role !== 'staff') {
    return false;
  }
  
  if (!user.staffBusinessRoleIds || user.staffBusinessRoleIds.length === 0) {
    return true; // Default allow for backward compatibility
  }
  
  const userRoleNames = await getStaffRoleNames(user);
  return ROLES_CAN_VIEW_TABLES.some(role => userRoleNames.includes(role));
}

/**
 * Check if staff can view Stock Usage
 * Rules: Only BARISTA_STAFF can view stock usage
 */
export async function canViewStockUsage(user: User | null): Promise<boolean> {
  if (!user || user.role !== 'staff') {
    return false;
  }
  
  if (!user.staffBusinessRoleIds || user.staffBusinessRoleIds.length === 0) {
    return true; // Default allow for backward compatibility
  }
  
  const userRoleNames = await getStaffRoleNames(user);
  return ROLES_CAN_VIEW_STOCK_USAGE.some(role => userRoleNames.includes(role));
}

/**
 * Synchronous versions (for use in components with pre-fetched role names)
 */
export function canViewPOSSync(user: User | null, roleNames: string[]): boolean {
  if (!user || user.role !== 'staff') return false;
  if (!user.staffBusinessRoleIds || user.staffBusinessRoleIds.length === 0) return true;
  // If roleNames is empty but user has roleIds, might be still loading - allow temporarily
  if (roleNames.length === 0 && user.staffBusinessRoleIds.length > 0) return true;
  const result = ROLES_CAN_VIEW_POS.some(role => roleNames.includes(role));
  console.log(`[canViewPOSSync] User ${user.id}, roleNames: [${roleNames.join(', ')}], canViewPOS: ${result}`);
  return result;
}

export function canViewOrdersSync(user: User | null, roleNames: string[]): boolean {
  if (!user || user.role !== 'staff') return false;
  if (!user.staffBusinessRoleIds || user.staffBusinessRoleIds.length === 0) return true;
  // If roleNames is empty but user has roleIds, might be still loading - allow temporarily
  if (roleNames.length === 0 && user.staffBusinessRoleIds.length > 0) return true;
  const result = ROLES_CAN_VIEW_ORDERS.some(role => roleNames.includes(role));
  console.log(`[canViewOrdersSync] User ${user.id}, roleNames: [${roleNames.join(', ')}], canViewOrders: ${result}`);
  return result;
}

export function canViewReservationsSync(user: User | null, roleNames: string[]): boolean {
  if (!user || user.role !== 'staff') return false;
  if (!user.staffBusinessRoleIds || user.staffBusinessRoleIds.length === 0) return true;
  // If roleNames is empty but user has roleIds, might be still loading - allow temporarily
  if (roleNames.length === 0 && user.staffBusinessRoleIds.length > 0) return true;
  const result = ROLES_CAN_VIEW_RESERVATIONS.some(role => roleNames.includes(role));
  console.log(`[canViewReservationsSync] User ${user.id}, roleNames: [${roleNames.join(', ')}], canViewReservations: ${result}`);
  return result;
}

export function canViewTablesSync(user: User | null, roleNames: string[]): boolean {
  if (!user || user.role !== 'staff') return false;
  if (!user.staffBusinessRoleIds || user.staffBusinessRoleIds.length === 0) return true;
  // If roleNames is empty but user has roleIds, might be still loading - allow temporarily
  if (roleNames.length === 0 && user.staffBusinessRoleIds.length > 0) return true;
  const result = ROLES_CAN_VIEW_TABLES.some(role => roleNames.includes(role));
  console.log(`[canViewTablesSync] User ${user.id}, roleNames: [${roleNames.join(', ')}], canViewTables: ${result}`);
  return result;
}

export function canViewStockUsageSync(user: User | null, roleNames: string[]): boolean {
  if (!user || user.role !== 'staff') return false;
  if (!user.staffBusinessRoleIds || user.staffBusinessRoleIds.length === 0) return true;
  // If roleNames is empty but user has roleIds, might be still loading - allow temporarily
  if (roleNames.length === 0 && user.staffBusinessRoleIds.length > 0) return true;
  const result = ROLES_CAN_VIEW_STOCK_USAGE.some(role => roleNames.includes(role));
  console.log(`[canViewStockUsageSync] User ${user.id}, roleNames: [${roleNames.join(', ')}], canViewStockUsage: ${result}`);
  return result;
}

/**
 * Clear roles cache (useful for testing or when roles are updated)
 */
export function clearRolesCache(): void {
  rolesCache = null;
  rolesCachePromise = null;
}

