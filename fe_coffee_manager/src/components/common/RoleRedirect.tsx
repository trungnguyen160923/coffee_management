import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Component để chuyển hướng dựa trên role sau khi đăng nhập
export function RoleRedirect() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      // Chuyển hướng dựa trên role
      switch (user.role) {
        case 'admin':
          navigate('/admin', { replace: true });
          break;
        case 'manager':
          navigate('/manager', { replace: true });
          break;
        case 'staff':
          navigate('/staff', { replace: true });
          break;
        default:
          console.warn('Unknown role:', user.role);
          navigate('/login', { replace: true }); // Default fallback
      }
    }
  }, [user, navigate]);

  // Hiển thị loading trong khi chuyển hướng
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-amber-600 to-orange-600 rounded-2xl flex items-center justify-center mb-4 mx-auto animate-pulse">
          <div className="w-8 h-8 bg-white rounded-full"></div>
        </div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
