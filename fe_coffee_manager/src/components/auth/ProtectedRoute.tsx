import { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { NotFoundPage } from '../common/NotFoundPage';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles: string[];
}

// Component bảo vệ route dựa trên role
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  // Nếu đang loading, hiển thị loading spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-orange-600 rounded-2xl flex items-center justify-center mb-4 mx-auto animate-pulse">
            <div className="w-8 h-8 bg-white rounded-full"></div>
          </div>
          <p className="text-gray-600">Đang kiểm tra quyền truy cập...</p>
        </div>
      </div>
    );
  }

  // Nếu chưa đăng nhập, chuyển về trang login
  if (!user) {
    return <NotFoundPage showLoginButton={true} />;
  }

  // Kiểm tra role có được phép truy cập không
  if (!allowedRoles.includes(user.role)) {
    return <NotFoundPage showLoginButton={false} />;
  }

  // Nếu có quyền, hiển thị component con
  return <>{children}</>;
}
