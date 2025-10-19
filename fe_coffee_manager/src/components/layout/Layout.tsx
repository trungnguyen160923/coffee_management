import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
  Terminal
} from 'lucide-react';

import { DEFAULT_IMAGES } from '../../config/constants';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, managerBranch, logout } = useAuth();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showMoreNav, setShowMoreNav] = useState(false);
  const [maxVisibleItems, setMaxVisibleItems] = useState(6);
  const navRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);


  const getNavigationItems = () => {
    if (user?.role === 'admin') {
      return [
        { icon: Home, label: 'Overview', path: '/admin' },
        { icon: Package, label: 'Products', path: '/admin/products' },
        { icon: Truck, label: 'Suppliers', path: '/admin/suppliers' },
        { icon: UtensilsCrossed, label: 'Ingredients', path: '/admin/ingredients' },
        { icon: BookOpen, label: 'Recipes', path: '/admin/recipes' },
        { icon: Store, label: 'Branches', path: '/admin/branches' },
        { icon: Users, label: 'Managers', path: '/admin/managers' },
        { icon: Tag, label: 'Discounts', path: '/admin/discounts' },
        { icon: BarChart3, label: 'Statistics', path: '/admin/statistics' },
      ];
    } else if (user?.role === 'manager') {
      return [
        { icon: Home, label: 'Overview', path: '/manager' },
        { icon: Users, label: 'Staff', path: '/manager/staff' },
        { icon: Package, label: 'Products', path: '/manager/products' },
        { icon: Square, label: 'Tables', path: '/manager/tables' },
        { icon: Tag, label: 'Discounts', path: '/manager/discounts' },
        { icon: Truck, label: 'Procurement', path: '/manager/procurement' },
        { icon: FileText, label: 'Purchase Orders', path: '/manager/purchase-orders' },
        { icon: Truck, label: 'Suppliers', path: '/manager/suppliers' },
        { icon: Archive, label: 'Inventory', path: '/manager/inventory' },
        { icon: FileText, label: 'Goods Receipts', path: '/manager/goods-receipts' },
        { icon: FileText, label: 'Return Goods', path: '/manager/return-goods' },
        { icon: BarChart3, label: 'Statistics', path: '/manager/statistics' },
      ];
    } else {
      return [
        { icon: Home, label: 'Overview', path: '/staff' },
        { icon: Terminal, label: 'POS', path: '/staff/pos' },
        { icon: ShoppingCart, label: 'Orders', path: '/staff/orders' },
        { icon: Calendar, label: 'Reservations', path: '/staff/reservations' },
        { icon: Square, label: 'Tables', path: '/staff/tables' },
        { icon: BookOpen, label: 'Recipes', path: '/staff/recipes' },
      ];
    }
  };

  const navigationItems = getNavigationItems();

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
    <div className="h-screen overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="flex h-full">
        {/* Sidebar */}
        <div className="w-48 lg:w-52 xl:w-56 bg-gradient-to-b from-amber-800 to-amber-700 text-white h-screen shadow-2xl sticky top-0 relative flex flex-col">
          {/* Header Section */}
          <div ref={headerRef} className="p-3 pl-4 border-b border-amber-600/30 flex-shrink-0">
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-2 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg shadow-lg">
                <Coffee className="h-4 w-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-sm font-bold text-white tracking-wide truncate">CoffeeChain</h1>
                <p className="text-amber-200 text-xs capitalize font-medium truncate">{user?.role} Panel</p>
              </div>
            </div>

            {/* Branch Information Card - Compact */}
            {user?.role === 'manager' && managerBranch && (
              <div className="mt-2 p-2 bg-gradient-to-r from-amber-700/80 to-amber-600/80 rounded-lg border border-amber-500/50 shadow-lg backdrop-blur-sm group relative">
                <div className="flex items-center space-x-2">
                  <Store className="h-3.5 w-3.5 text-white flex-shrink-0" />
                  <h3 className="text-white text-xs font-semibold truncate">{managerBranch.name}</h3>
                </div>
                {/* Hover tooltip with full info */}
                <div className="absolute left-0 right-0 top-full mt-1 p-2 bg-amber-900/95 backdrop-blur-sm rounded-lg shadow-xl border border-amber-600/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                  <div className="text-amber-100 text-xs">
                    <div className="font-semibold mb-1">{managerBranch.name}</div>
                    <div className="text-amber-300 leading-relaxed">{managerBranch.address}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Branch Not Loaded State - Compact */}
            {user?.role === 'manager' && !managerBranch && (
              <div className="mt-2 p-2 bg-gradient-to-r from-red-700/80 to-red-600/80 rounded-lg border border-red-500/50 shadow-lg backdrop-blur-sm">
                <div className="flex items-center space-x-2">
                  <Store className="h-3.5 w-3.5 text-white" />
                  <h3 className="text-white text-xs font-semibold">Branch not loaded</h3>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Section - Scrollable */}
          <nav ref={navRef} className="flex-1 overflow-y-auto scrollbar-hide px-2 py-2 pl-4 min-h-0">
            {(() => {
              const primary = navigationItems.slice(0, maxVisibleItems);
              const secondary = navigationItems.slice(maxVisibleItems);
              const itemsToRender = showMoreNav ? secondary : primary;
              return (
                <>
                  {itemsToRender.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center space-x-2 px-3 py-2.5 mx-1 rounded-lg transition-all duration-200 group mb-1 ${isActive
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg border-l-4 border-amber-300'
                          : 'text-amber-200 hover:bg-amber-800/50 hover:text-white hover:shadow-md'
                          }`}
                      >
                        <item.icon className={`h-4 w-4 transition-colors duration-200 flex-shrink-0 ${isActive ? 'text-white' : 'text-amber-300 group-hover:text-white'
                          }`} />
                        <span className="font-medium text-sm truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                  {navigationItems.length > maxVisibleItems && (
                    <button
                      onClick={() => setShowMoreNav(v => !v)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 mx-1 mt-1 rounded-lg transition-all duration-200 ${showMoreNav ? 'bg-amber-800/50 text-white' : 'text-amber-200 hover:bg-amber-800/50 hover:text-white'
                        }`}
                      title={showMoreNav ? 'Back' : 'More'}
                    >
                      <span className="flex items-center gap-2">
                        {showMoreNav ? <ArrowLeft className="h-4 w-4 text-amber-300" /> : <Archive className="h-4 w-4 text-amber-300" />}
                        <span className="font-medium text-sm">{showMoreNav ? 'Back' : 'More'}</span>
                      </span>
                      <span className="text-xs text-amber-300">{showMoreNav ? 'Show primary' : `+${secondary.length}`}</span>
                    </button>
                  )}
                </>
              );
            })()}
          </nav>

          {/* User Profile Section - Fixed at bottom */}
          <div ref={footerRef} className="p-3 pl-4 border-t border-amber-600/30 bg-gradient-to-t from-amber-900/80 to-transparent backdrop-blur-sm flex-shrink-0">
            <div className="flex items-center space-x-2 mb-2">
              <div className="relative flex-shrink-0">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md border-2 border-amber-500/60">
                  <span className="text-white text-xs font-bold">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
                <p className="text-xs text-amber-300/80 truncate">{user?.email}</p>
                <span className="inline-block px-1.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-amber-500/80 to-amber-600/80 text-white mt-0.5 shadow-sm">
                  {user?.role === 'admin' ? 'Admin' :
                    user?.role === 'manager' ? 'Manager' :
                      user?.role === 'staff' ? 'Staff' : user?.role}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={`group flex items-center justify-center space-x-1.5 transition-all duration-200 w-full p-2 rounded-lg font-medium border ${isLoggingOut
                ? 'text-amber-400 cursor-not-allowed bg-amber-800/20 border-amber-600/20'
                : 'text-amber-200 hover:text-white hover:bg-gradient-to-r hover:from-red-500/10 hover:to-red-600/10 hover:border-red-400/30 hover:shadow-sm border-amber-600/20'
                }`}
            >
              <LogOut className={`h-3.5 w-3.5 transition-colors duration-200 ${isLoggingOut ? 'text-amber-400' : 'text-amber-300 group-hover:text-red-200'
                }`} />
              <span className="text-xs font-medium">{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 h-screen overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}