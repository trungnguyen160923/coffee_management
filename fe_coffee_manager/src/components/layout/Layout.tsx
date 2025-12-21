import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useStaffPermissions } from '../../hooks/useStaffPermissions';
import {
  Coffee,
  Users,
  Package,
  BarChart3,
  LogOut,
  Home,
  Store,
  BookOpen,
  ShoppingCart,
  Calendar,
  Archive,
  Truck,
  FileText,
  ArrowLeft,
  UtensilsCrossed,
  Square,
  Tag,
  Terminal,
  Eye,
  Droplet,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  Clock,
  AlertCircle,
  Inbox,
  DollarSign,
  Settings,
} from 'lucide-react';

import { NotificationBell } from '../notifications/NotificationBell';
import { UsageFloatingWidget } from '../stock/UsageFloatingWidget';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, managerBranch, logout } = useAuth();
  const staffPermissions = useStaffPermissions();
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showMoreNav, setShowMoreNav] = useState(false);
  const [maxVisibleItems, setMaxVisibleItems] = useState(6);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

  const navigationItems = useMemo(() => {
    if (user?.role === 'admin') {
      return [
        { icon: Home, label: 'Overview', path: '/admin' },
        { icon: Package, label: 'Products', path: '/admin/products' },
        { icon: Truck, label: 'Suppliers', path: '/admin/suppliers' },
        { icon: UtensilsCrossed, label: 'Ingredients', path: '/admin/ingredients' },
        { icon: BookOpen, label: 'Recipes', path: '/admin/recipes' },
        { icon: Store, label: 'Branches', path: '/admin/branches' },
        { icon: Eye, label: 'Branch Activities', path: '/admin/branch-activities' },
        { icon: Users, label: 'Managers', path: '/admin/managers' },
        { icon: Tag, label: 'Discounts', path: '/admin/discounts' },
        { icon: DollarSign, label: 'Payroll', path: '/admin/payroll' },
        { icon: Settings, label: 'Payroll Templates', path: '/admin/payroll-templates' },
        { icon: FileText, label: 'Payroll Reports', path: '/admin/payroll-reports' },
        { icon: Settings, label: 'Payroll Settings', path: '/admin/payroll-settings' },
        { icon: BarChart3, label: 'Statistics', path: '/admin/statistics' },
      ];
    } else if (user?.role === 'manager') {
      return [
        { icon: Home, label: 'Overview', path: '/manager' },
        { icon: Users, label: 'Staff', path: '/manager/staff' },
        { icon: Package, label: 'Products', path: '/manager/products' },
        { icon: Calendar, label: 'Shifts', path: '/manager/shifts' },
        { icon: Calendar, label: 'Shift Templates', path: '/manager/shift-templates' },
        { icon: Users, label: 'Shift Assignments', path: '/manager/shift-assignments' },
        { icon: Inbox, label: 'Shift Requests', path: '/manager/shift-requests' },
        { icon: Calendar, label: 'Staff Schedule', path: '/manager/staff-schedule' },
        { icon: Store, label: 'Branch Closures', path: '/manager/branch-closures' },
        { icon: Square, label: 'Tables', path: '/manager/tables' },
        { icon: Tag, label: 'Discounts', path: '/manager/discounts' },
        { icon: DollarSign, label: 'Payroll', path: '/manager/payroll' },
        { icon: DollarSign, label: 'Rewards & Penalties', path: '/manager/bonus-penalty-allowance' },
        { icon: Settings, label: 'Payroll Templates', path: '/manager/payroll-templates' },
        { icon: Settings, label: 'Payroll Settings', path: '/manager/payroll-settings' },
        { icon: Truck, label: 'Procurement', path: '/manager/procurement' },
        { icon: FileText, label: 'Purchase Orders', path: '/manager/purchase-orders' },
        { icon: Truck, label: 'Suppliers', path: '/manager/suppliers' },
        { icon: Archive, label: 'Inventory', path: '/manager/inventory' },
        { icon: UtensilsCrossed, label: 'Ingredients', path: '/manager/ingredients' },
        { icon: FileText, label: 'Goods Receipts', path: '/manager/goods-receipts' },
        { icon: FileText, label: 'Return Goods', path: '/manager/return-goods' },
        { icon: BarChart3, label: 'Statistics', path: '/manager/statistics' },
      ];
    } else {
      // Staff menu items - filter based on permissions
      const allStaffItems = [
        { icon: Home, label: 'Overview', path: '/staff', requiresPermission: 'canViewMenuItems' },
        { icon: Terminal, label: 'POS', path: '/staff/pos', requiresPermission: 'canViewPOS' },
        { icon: ShoppingCart, label: 'Orders', path: '/staff/orders', requiresPermission: 'canViewOrders' },
        { icon: Calendar, label: 'Reservations', path: '/staff/reservations', requiresPermission: 'canViewReservations' },
        { icon: Clock, label: 'Shift Registration', path: '/staff/shifts', requiresPermission: null }, // Always visible
        { icon: Calendar, label: 'My Schedule', path: '/staff/my-shifts', requiresPermission: null }, // Always visible
        { icon: AlertCircle, label: 'My Requests', path: '/staff/my-requests', requiresPermission: null }, // Always visible
        { icon: Settings, label: 'Payroll Settings', path: '/staff/payroll-settings', requiresPermission: null }, // Always visible
        { icon: Square, label: 'Tables', path: '/staff/tables', requiresPermission: 'canViewTables' },
        { icon: BookOpen, label: 'Recipes', path: '/staff/recipes', requiresPermission: 'canViewRecipes' },
        { icon: Droplet, label: 'Stock Usage', path: '/staff/stock-usage', requiresPermission: 'canViewStockUsage' },
      ];

      // Filter items based on permissions
      return allStaffItems.filter(item => {
        if (!item.requiresPermission) return true; // Always visible items (Shift menu)
        
        // If permissions are still loading, hide items that require permissions to avoid showing unauthorized items
        // Only show items that are always visible (Shift menu)
        if (staffPermissions.loading) return false;
        
        // Check permission
        const permission = item.requiresPermission as keyof typeof staffPermissions;
        return staffPermissions[permission] === true;
      });
    }
  }, [
    user?.role, 
    staffPermissions.loading,
    staffPermissions.canViewMenuItems,
    staffPermissions.canViewPOS,
    staffPermissions.canViewOrders,
    staffPermissions.canViewReservations,
    staffPermissions.canViewTables,
    staffPermissions.canViewRecipes,
    staffPermissions.canViewStockUsage,
  ]);

  // Grouped navigation (tree-style menu) per role
  const navGroups = useMemo(() => {
    const byPath = new Map(navigationItems.map((item) => [item.path, item]));

    const pick = (paths: string[]) =>
      paths
        .map((path) => byPath.get(path))
        .filter((x): x is typeof navigationItems[number] => Boolean(x));

    if (user?.role === 'manager') {
      return [
        { title: 'Overview', items: pick(['/manager']) },
        { title: 'Store & Staff', items: pick(['/manager/staff', '/manager/branch-closures', '/manager/tables']) },
        { title: 'Shift', items: pick(['/manager/shifts', '/manager/shift-templates', '/manager/shift-assignments', '/manager/staff-schedule', '/manager/shift-requests']) },
        {
          title: 'Menu & Promotions',
          items: pick(['/manager/products', '/manager/ingredients', '/manager/discounts']),
        },
        {
          title: 'Payroll',
          items: pick([
            '/manager/payroll',
            '/manager/bonus-penalty-allowance',
            '/manager/payroll-templates',
            '/manager/payroll-settings',
          ]),
        },
        {
          title: 'Inventory & Purchasing',
          items: pick([
            '/manager/inventory',
            '/manager/procurement',
            '/manager/purchase-orders',
            '/manager/suppliers',
            '/manager/goods-receipts',
            '/manager/return-goods',
          ]),
        },
        { title: 'Analytics', items: pick(['/manager/statistics']) },
      ].filter((group) => group.items.length > 0);
    }

    if (user?.role === 'admin') {
      return [
        { title: 'Overview', items: pick(['/admin']) },
        {
          title: 'Catalog',
          items: pick(['/admin/products', '/admin/ingredients', '/admin/recipes', '/admin/discounts']),
        },
        {
          title: 'Organization',
          items: pick([
            '/admin/branches',
            '/admin/managers',
            '/admin/branch-activities',
            '/admin/suppliers',
          ]),
        },
        {
          title: 'Payroll',
          items: pick([
            '/admin/payroll',
            '/admin/payroll-templates',
            '/admin/payroll-reports',
            '/admin/payroll-settings',
          ]),
        },
        { title: 'Analytics', items: pick(['/admin/statistics']) },
      ].filter((group) => group.items.length > 0);
    }

    if (user?.role === 'staff') {
      const groups = [];
      
      // Overview - only if can view menu items (hide when loading to avoid showing unauthorized items)
      if (!staffPermissions.loading && staffPermissions.canViewMenuItems) {
        groups.push({ title: 'Overview', items: pick(['/staff']) });
      }
      
      // Operations - filter based on permissions (hide when loading)
      if (!staffPermissions.loading) {
        const operationsItems = pick(['/staff/pos', '/staff/orders', '/staff/reservations', '/staff/tables']).filter(item => {
          if (item.path === '/staff/pos') return staffPermissions.canViewPOS;
          if (item.path === '/staff/orders') return staffPermissions.canViewOrders;
          if (item.path === '/staff/reservations') return staffPermissions.canViewReservations;
          if (item.path === '/staff/tables') return staffPermissions.canViewTables;
          return false;
        });
        if (operationsItems.length > 0) {
          groups.push({ title: 'Operations', items: operationsItems });
        }
      }
      
      // Knowledge (Recipes) - only if can view recipes (hide when loading)
      if (!staffPermissions.loading && staffPermissions.canViewRecipes) {
        const recipesItems = pick(['/staff/recipes']);
        if (recipesItems.length > 0) {
          groups.push({ title: 'Knowledge', items: recipesItems });
        }
      }
      
      // Inventory (Stock Usage) - only if can view stock usage (hide when loading)
      if (!staffPermissions.loading && staffPermissions.canViewStockUsage) {
        const stockItems = pick(['/staff/stock-usage']);
        if (stockItems.length > 0) {
          groups.push({ title: 'Inventory', items: stockItems });
        }
      }
      
      // Shift - always visible
      groups.push({
        title: 'Shift',
        items: pick(['/staff/shifts', '/staff/my-shifts', '/staff/my-requests', '/staff/pending-requests']),
      });

      // Payroll Settings - always visible
      groups.push({
        title: 'Payroll Settings',
        items: pick(['/staff/payroll-settings']),
      });
      
      return groups.filter((group) => group.items.length > 0);
    }

    return null;
  }, [
    user?.role, 
    navigationItems,
    staffPermissions.loading,
    staffPermissions.canViewMenuItems,
    staffPermissions.canViewPOS,
    staffPermissions.canViewOrders,
    staffPermissions.canViewReservations,
    staffPermissions.canViewTables,
    staffPermissions.canViewRecipes,
    staffPermissions.canViewStockUsage,
  ]);

  // Open/close state for nav groups
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!navGroups) return;
    setOpenGroups((prev) => {
      const next: Record<string, boolean> = {};
      navGroups.forEach((group, index) => {
        next[group.title] = prev[group.title] ?? index === 0; // open first group by default
      });
      return next;
    });
  }, [navGroups]);

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const getBasePath = () => {
    if (user?.role === 'admin') return '/admin';
    if (user?.role === 'manager') return '/manager';
    return '/staff';
  };

  const getCurrentPageLabel = () => {
    const path = location.pathname;

    // Exact match first
    const exact = navigationItems.find((item) => item.path === path);
    if (exact) return exact.label;

    // Longest prefix match (so /admin/products chọn "Products" chứ không phải "Overview")
    const prefixMatch = navigationItems
      .filter((item) => path.startsWith(item.path))
      .sort((a, b) => b.path.length - a.path.length)[0];
    if (prefixMatch) return prefixMatch.label;

    // Fallback to first nav item (e.g. Overview)
    return navigationItems[0]?.label || 'Overview';
  };

  const getRoleLabel = () => {
    if (user?.role === 'manager') return 'Manager';
    if (user?.role === 'admin') return 'Admin';
    if (user?.role === 'staff') return 'Staff';
    return user?.role || 'User';
  };

  const getUserInitials = () => {
    if (!user?.name) return 'U';
    const parts = user.name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || 'U';
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleOpenAccountSettings = () => {
    const basePath = getBasePath();
    setAvatarMenuOpen(false);
    navigate(`${basePath}/account`);
  };

  // Close avatar dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        avatarMenuRef.current &&
        !avatarMenuRef.current.contains(event.target as Node)
      ) {
        setAvatarMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate maximum visible items based on available space
  useEffect(() => {
    const calculateMaxItems = () => {
      if (!navRef.current || !headerRef.current || !footerRef.current) return;

      // Get actual heights of elements
      const headerHeight = headerRef.current.offsetHeight;
      const footerHeight = footerRef.current.offsetHeight;

      // Calculate available height more precisely
      const totalHeight = window.innerHeight;
      const usedHeight = headerHeight + footerHeight;
      const availableHeight = totalHeight - usedHeight - 32; // 32px for nav padding and margins

      // More conservative item height calculation
      const itemHeight = 48; // py-2.5 (20px) + mb-1 (4px) + margins and borders (24px)
      const moreButtonHeight = 48; // Same as item height

      // Calculate how many items can fit
      let maxItems = Math.floor(availableHeight / itemHeight);

      // If we need a "More" button, reserve space for it
      if (navigationItems.length > maxItems) {
        maxItems = Math.floor((availableHeight - moreButtonHeight) / itemHeight);
        // Ensure we have at least 1 item visible
        maxItems = Math.max(1, maxItems);
      }

      // Ensure we show at least 2 items and at most all items
      const calculatedMax = Math.max(2, Math.min(maxItems, navigationItems.length));


      setMaxVisibleItems(calculatedMax);
    };

    // Calculate on mount and resize with a small delay to ensure DOM is ready
    const timeoutId = setTimeout(calculateMaxItems, 100);

    // Also use ResizeObserver for more accurate tracking
    let resizeObserver: ResizeObserver | null = null;

    if (window.ResizeObserver && navRef.current) {
      resizeObserver = new ResizeObserver(() => {
        setTimeout(calculateMaxItems, 50);
      });
      resizeObserver.observe(navRef.current);
    }

    window.addEventListener('resize', calculateMaxItems);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', calculateMaxItems);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [navigationItems.length]);

  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      logout();
      // Redirect sẽ được xử lý bởi AuthContext và App.tsx
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-50">
      <div className="flex h-full">
        {/* Sidebar */}
        <div
          className={`bg-white text-slate-700 h-screen shadow-md border-r border-slate-100 flex flex-col transform transition-transform duration-200 ease-out
          fixed inset-y-0 left-0 z-40 w-60 md:w-48 lg:w-52 xl:w-56 md:relative md:sticky md:top-0
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        >
          {/* Header Section */}
          <div ref={headerRef} className="px-3 py-3 border-b border-slate-100 flex-shrink-0 relative">
            {/* Mobile close button - floating on top-right corner (only when sidebar is open) */}
            {isSidebarOpen && (
              <div className="md:hidden absolute top-1 -right-3">
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white shadow-lg border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-sky-300 hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  aria-label="Close navigation"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex items-center justify-center space-x-2 mb-3">
              <div className="p-2 bg-blue-500 rounded-lg shadow-sm">
                <Coffee className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 text-center">
                <h1 className="text-sm font-bold text-slate-900 tracking-wide truncate">CoffeeChain</h1>
                <p className="text-xs font-medium text-slate-400 truncate">
                  {getRoleLabel()} Panel
                </p>
              </div>
            </div>

            {/* Branch Information Card - Compact (for manager & staff) */}
            {(managerBranch || user?.branch) && (
              <div className="mt-2 p-2 bg-sky-50 rounded-lg border border-sky-100 shadow-sm group relative">
                {(() => {
                  const branch = managerBranch || user?.branch;
                  if (!branch) return null;
                  return (
                    <>
                      <div className="flex items-center space-x-2">
                        <Store className="h-3.5 w-3.5 text-sky-600 flex-shrink-0" />
                        <h3 className="text-slate-800 text-xs font-semibold truncate">
                          {branch.name}
                        </h3>
                      </div>
                      {/* Hover tooltip with full info */}
                      <div className="absolute left-0 right-0 top-full mt-1 p-2 bg-slate-900/95 backdrop-blur-sm rounded-lg shadow-xl border border-slate-700/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                        <div className="text-slate-100 text-xs">
                          <div className="font-semibold mb-1">{branch.name}</div>
                          <div className="text-slate-300 leading-relaxed">{branch.address}</div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Branch Not Loaded State - Compact (Only for Manager and Staff, not Admin) */}
            {user && user.role !== 'admin' && !managerBranch && !user.branch && (
              <div className="mt-2 p-2 bg-red-50 rounded-lg border border-red-200 shadow-sm">
                <div className="flex items-center space-x-2">
                  <Store className="h-3.5 w-3.5 text-red-500" />
                  <h3 className="text-xs font-semibold text-red-700">
                    Branch not loaded
                  </h3>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Section - Scrollable */}
          <nav ref={navRef} className="flex-1 overflow-y-auto scrollbar-hide px-2 py-2 pl-4 min-h-0">
            {navGroups ? (
              <div className="space-y-3">
                {navGroups.map((group) => {
                  // If a group has only one item, render it as a normal flat item (no collapsible parent)
                  if (group.items.length === 1) {
                    const item = group.items[0];
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end
                        className={({ isActive }) =>
                          `relative flex items-center space-x-2 px-3 py-2.5 mx-1 rounded-lg transition-all duration-200 group ${
                            isActive
                              ? 'bg-sky-50 text-sky-700 shadow-sm border border-sky-200'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-sky-700'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && (
                              <span className="absolute left-0 top-1 bottom-1 w-1 rounded-r-full bg-sky-500" />
                            )}
                            <item.icon
                              className={`h-4 w-4 transition-colors duration-200 flex-shrink-0 ${
                                isActive ? 'text-sky-600' : 'text-slate-400 group-hover:text-sky-600'
                              }`}
                            />
                            <span className="font-medium text-sm truncate">{item.label}</span>
                          </>
                        )}
                      </NavLink>
                    );
                  }

                  const isOpen = openGroups[group.title];
                  const GroupIcon = group.items[0]?.icon ?? Square;
                  return (
                    <div key={group.title}>
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.title)}
                        className="flex w-full items-center justify-between px-3 py-2 mx-1 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <span className="inline-flex items-center gap-2">
                          <GroupIcon className="h-4 w-4 text-slate-400" />
                          <span className="tracking-wide">{group.title}</span>
                        </span>
                        <ChevronRight
                          className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                            isOpen ? 'rotate-90' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="mt-1 space-y-0.5">
                          {group.items.map((item) => (
                            <NavLink
                              key={item.path}
                              to={item.path}
                              className={({ isActive }) =>
                                `relative flex items-center space-x-2 pl-9 pr-3 py-2 mx-1 rounded-lg transition-all duration-200 group ${
                                  isActive
                                    ? 'bg-sky-50 text-sky-700 shadow-sm border border-sky-200'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-sky-700'
                                }`
                              }
                            >
                              {({ isActive }) => (
                                <>
                                  {isActive && (
                                    <span className="absolute left-0 top-1 bottom-1 w-1 rounded-r-full bg-sky-500" />
                                  )}
                                  <item.icon
                                    className={`h-3.5 w-3.5 transition-colors duration-200 flex-shrink-0 ${
                                      isActive
                                        ? 'text-sky-600'
                                        : 'text-slate-400 group-hover:text-sky-600'
                                    }`}
                                  />
                                  <span className="font-medium text-[13px] truncate">{item.label}</span>
                                </>
                              )}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              (() => {
                const primary = navigationItems.slice(0, maxVisibleItems);
                const secondary = navigationItems.slice(maxVisibleItems);
                const itemsToRender = showMoreNav ? secondary : primary;
                return (
                  <>
                    {itemsToRender.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === '/admin' || item.path === '/staff'}
                        className={({ isActive }) =>
                          `relative flex items-center space-x-2 px-3 py-2.5 mx-1 rounded-lg transition-all duration-200 group mb-1 ${
                            isActive
                              ? 'bg-sky-50 text-sky-700 shadow-sm border border-sky-200'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-sky-700'
                          }`
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && (
                              <span className="absolute left-0 top-1 bottom-1 w-1 rounded-r-full bg-sky-500" />
                            )}
                            <item.icon
                              className={`h-4 w-4 transition-colors duration-200 flex-shrink-0 ${
                                isActive ? 'text-sky-600' : 'text-slate-400 group-hover:text-sky-600'
                              }`}
                            />
                            <span className="font-medium text-sm truncate">{item.label}</span>
                          </>
                        )}
                      </NavLink>
                    ))}
                    {navigationItems.length > maxVisibleItems && (
                      <button
                        onClick={() => setShowMoreNav(v => !v)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 mx-1 mt-1 rounded-lg transition-all duration-200 ${
                          showMoreNav
                            ? 'bg-slate-100 text-slate-800'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                        }`}
                        title={showMoreNav ? 'Back' : 'More'}
                      >
                        <span className="flex items-center gap-2">
                          {showMoreNav ? (
                            <ArrowLeft className="h-4 w-4 text-slate-400" />
                          ) : (
                            <Archive className="h-4 w-4 text-slate-400" />
                          )}
                          <span className="font-medium text-sm">{showMoreNav ? 'Back' : 'More'}</span>
                        </span>
                        <span className="text-xs text-amber-300">
                          {showMoreNav ? 'Show primary' : `+${secondary.length}`}
                        </span>
                      </button>
                    )}
                  </>
                );
              })()
            )}
          </nav>

          {/* Spacer anchored for scroll calculations (no user card anymore) */}
          <div ref={footerRef} className="h-4 flex-shrink-0" />
        </div>

        {/* Mobile sidebar backdrop */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-slate-900/30 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="relative flex-1 h-screen overflow-y-auto">
          {/* Top page header: breadcrumb + greeting */}
          <div className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-100">
            <div className="flex items-center justify-between px-6 pt-5 pb-4">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2.5 text-sm text-slate-500">
                {/* Mobile sidebar toggle (only when sidebar is closed) */}
                {!isSidebarOpen && (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md p-2 text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-400 md:hidden"
                    onClick={() => setIsSidebarOpen(true)}
                    aria-label="Open navigation"
                  >
                    <Menu className="h-5 w-5" />
                  </button>
                )}
                <Link
                  to={getBasePath()}
                  className="flex items-center gap-1.5 text-slate-500 hover:text-sky-600 transition-colors"
                >
                  <Home className="h-4.5 w-4.5" />
                  <span className="sr-only">
                    {navigationItems[0]?.label || 'Home'}
                  </span>
                </Link>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-base text-slate-700">
                  {getCurrentPageLabel()}
                  </span>
                </div>

              {/* Right side: actions + greeting */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <NotificationBell />
                </div>
                <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right leading-tight">
                    <p className="text-sm font-semibold text-slate-600">
                      Hi, {user?.name && (
                      <span className="text-sky-700 truncate max-w-[180px] text-md ">
                        {user.name}!
                      </span>
                    )}
                    </p>
                    <p className="text-slate-400 text-xs">{getRoleLabel()}</p>
              </div>
                  <div className="relative" ref={avatarMenuRef}>
                    <button
                      type="button"
                      onClick={() => setAvatarMenuOpen(prev => !prev)}
                      className="relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 p-[2px] shadow-md focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-2 focus:ring-offset-white"
                    >
                      <span className="flex h-full w-full items-center justify-center rounded-full bg-white text-sky-700 text-sm font-semibold">
                        {getUserInitials()}
                </span>
                    </button>
                    <div
                      className={`absolute -bottom-1 right-0 h-4 w-4 rounded-full bg-white border border-slate-300 shadow-sm flex items-center justify-center transition-transform ${
                        avatarMenuOpen ? 'rotate-180 border-sky-400' : ''
                      }`}
                    >
                      <ChevronDown
                        className={`h-2.5 w-2.5 ${
                          avatarMenuOpen ? 'text-sky-600' : 'text-slate-500'
                        }`}
                      />
                    </div>
                    {avatarMenuOpen && (
                      <div className="absolute right-0 mt-2 w-44 rounded-xl bg-white border border-slate-100 shadow-lg z-40 py-1">
                        <button
                          type="button"
                          onClick={handleOpenAccountSettings}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                        >
                          <Settings className="h-4 w-4 text-slate-400" />
                          <span>Account settings</span>
                        </button>
                        <div className="my-1 h-px bg-slate-100" />
                        <button
                          onClick={handleLogout}
                          disabled={isLoggingOut}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          <LogOut className="h-4 w-4 text-slate-400" />
                          <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
                        </button>
                      </div>
                    )}
                  </div>
          </div>
        </div>
            </div>
          </div>

          {children}
          <UsageFloatingWidget />
        </div>
      </div>
    </div>
  );
}