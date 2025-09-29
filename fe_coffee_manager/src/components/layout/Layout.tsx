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
  Archive
} from 'lucide-react';

import { DEFAULT_IMAGES } from '../../config/constants';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const getNavigationItems = () => {
    if (user?.role === 'admin') {
      return [
        { icon: Home, label: 'Overview', path: '/admin' },
        { icon: Package, label: 'Products', path: '/admin/products' },
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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-gradient-to-b from-amber-900 to-amber-800 text-white min-h-screen shadow-xl">
          <div className="p-6 border-b border-amber-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-amber-700 rounded-lg">
                <Coffee className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">CoffeeChain</h1>
                <p className="text-amber-200 text-sm capitalize">{user?.role} Panel</p>
              </div>
            </div>
          </div>

          <nav className="mt-6">
            {navigationItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-6 py-3 transition-colors duration-200 border-l-4 ${
                    isActive
                      ? 'bg-amber-700 text-white border-amber-300'
                      : 'text-amber-100 hover:bg-amber-700 hover:text-white border-transparent hover:border-amber-300'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 w-64 p-6 border-t border-amber-700">
            <div className="flex items-center space-x-3 mb-4">
              <img
                src={user?.avatar || DEFAULT_IMAGES.USER_AVATAR}
                alt={user?.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-amber-200">{user?.email}</p>
                <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-amber-700 text-amber-100 mt-1">
                  {user?.role === 'admin' ? 'Administrator' : 
                   user?.role === 'manager' ? 'Manager' : 
                   user?.role === 'staff' ? 'Staff' : user?.role}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={`flex items-center space-x-2 transition-colors duration-200 w-full p-2 rounded ${
                isLoggingOut 
                  ? 'text-amber-400 cursor-not-allowed' 
                  : 'text-amber-200 hover:text-white hover:bg-amber-700'
              }`}
            >
              <LogOut className="h-4 w-4" />
                <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}