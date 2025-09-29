import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
}

// Component để bảo vệ routes dựa trên trạng thái đăng nhập
export function AuthGuard({ 
  children, 
  fallback = null, 
  requireAuth = true 
}: AuthGuardProps) {
  const { user, loading: authLoading } = useAuth();

  // Hiển thị loading khi đang kiểm tra auth
  if (authLoading) {
    return <LoadingSpinner message="Đang kiểm tra đăng nhập..." />;
  }

  // Nếu cần đăng nhập nhưng chưa đăng nhập
  if (requireAuth && !user) {
    return fallback || (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Cần đăng nhập</h1>
          <p className="text-gray-600">Vui lòng đăng nhập để tiếp tục</p>
        </div>
      </div>
    );
  }

  // Nếu không cần đăng nhập hoặc đã đăng nhập
  return <>{children}</>;
}

// Component để bảo vệ routes chỉ dành cho user chưa đăng nhập
export function GuestGuard({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAuth={false}>
      {children}
    </AuthGuard>
  );
}
