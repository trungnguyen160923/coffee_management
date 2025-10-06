import React, { useState } from 'react';
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
  UtensilsCrossed
} from 'lucide-react';

import { DEFAULT_IMAGES } from '../../config/constants';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, managerBranch, logout } = useAuth();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Debug logs
  console.log('Layout - user:', user);
  console.log('Layout - user details:', JSON.stringify(user, null, 2));
  console.log('Layout - managerBranch:', managerBranch);


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
        { icon: BarChart3, label: 'Statistics', path: '/admin/statistics' },
      ];
    } else if (user?.role === 'manager') {
      return [
        { icon: Home, label: 'Overview', path: '/manager' },
        { icon: Users, label: 'Staff', path: '/manager/staff' },
        { icon: Archive, label: 'Inventory', path: '/manager/inventory' },
        { icon: BarChart3, label: 'Statistics', path: '/manager/statistics' },
      ];
    } else {
      return [
        { icon: Home, label: 'Overview', path: '/staff' },
        { icon: ShoppingCart, label: 'Orders', path: '/staff/orders' },
        { icon: Calendar, label: 'Reservations', path: '/staff/reservations' },
        { icon: BookOpen, label: 'Recipes', path: '/staff/recipes' },
      ];
    }
  };

  const navigationItems = getNavigationItems();

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
        <div className="w-64 bg-gradient-to-b from-amber-900 to-amber-800 text-white h-screen shadow-2xl sticky top-0 relative">
          <div className="p-6 border-b border-amber-700/30">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-amber-600 to-amber-700 rounded-xl shadow-lg">
                <Coffee className="h-6 w-6 text-amber-100" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white tracking-wide">CoffeeChain</h1>
                <p className="text-amber-200 text-sm capitalize font-medium">{user?.role} Panel</p>
              </div>
            </div>
            
            {/* Branch Information Card */}
            {user?.role === 'manager' && managerBranch && (
              <div className="mt-4 p-4 bg-gradient-to-r from-amber-800/60 to-amber-700/60 rounded-xl border border-amber-600/30 shadow-lg backdrop-blur-sm">
                <div className="flex items-start space-x-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-amber-100 text-sm font-semibold mb-1 truncate">{managerBranch.name}</h3>
                    <p className="text-amber-300 text-xs leading-relaxed mb-1 line-clamp-2">{managerBranch.address}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Branch Not Loaded State */}
            {user?.role === 'manager' && !managerBranch && (
              <div className="mt-4 p-4 bg-gradient-to-r from-red-800/60 to-red-700/60 rounded-xl border border-red-600/30 shadow-lg backdrop-blur-sm">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-red-600/80 rounded-lg shadow-md">
                    <Store className="h-5 w-5 text-red-100" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-red-100 text-sm font-semibold mb-1">Branch not loaded</h3>
                    <p className="text-red-300 text-xs">BranchId: {user.branch?.branchId}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <nav className="mt-6 px-3">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 mx-2 rounded-lg transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-lg border-l-4 border-amber-300'
                      : 'text-amber-100 hover:bg-amber-700/50 hover:text-white hover:shadow-md'
                  }`}
                >
                  <item.icon className={`h-5 w-5 transition-colors duration-200 ${
                    isActive ? 'text-amber-100' : 'text-amber-300 group-hover:text-amber-100'
                  }`} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 w-64 p-4 border-t border-amber-700/30 bg-gradient-to-t from-amber-900/80 to-transparent backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-3">
              <div className="relative">
                <img
                  src={user?.avatar || DEFAULT_IMAGES.USER_AVATAR}
                  alt={user?.name}
                  className="w-10 h-10 rounded-full object-cover border-2 border-amber-500/60 shadow-md"
                />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-amber-900 shadow-sm"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                <p className="text-xs text-amber-200/80 truncate">{user?.email}</p>
                <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-amber-500/80 to-amber-600/80 text-amber-100 mt-1 shadow-sm">
                  {user?.role === 'admin' ? 'Administrator' : 
                   user?.role === 'manager' ? 'Manager' : 
                   user?.role === 'staff' ? 'Staff' : user?.role}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={`group flex items-center justify-center space-x-2 transition-all duration-200 w-full p-2.5 rounded-lg font-medium border ${
                isLoggingOut 
                  ? 'text-amber-400 cursor-not-allowed bg-amber-800/20 border-amber-600/20' 
                  : 'text-amber-200 hover:text-white hover:bg-gradient-to-r hover:from-red-500/10 hover:to-red-600/10 hover:border-red-400/30 hover:shadow-sm border-amber-600/20'
              }`}
            >
              <LogOut className={`h-4 w-4 transition-colors duration-200 ${
                isLoggingOut ? 'text-amber-400' : 'text-amber-300 group-hover:text-red-200'
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