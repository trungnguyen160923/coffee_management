import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface NotFoundPageProps {
  showLoginButton?: boolean;
}

// Component 404 page
export function NotFoundPage({ showLoginButton = false }: NotFoundPageProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleBackClick = () => {
    if (user) {
      // Nếu đã đăng nhập, chuyển về trang chính của role
      switch (user.role) {
        case 'admin':
          navigate('/admin');
          break;
        case 'manager':
          navigate('/manager');
          break;
        case 'staff':
          navigate('/staff');
          break;
        default:
          navigate('/');
      }
    } else {
      // Nếu chưa đăng nhập, chuyển về trang login
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20">
          {/* 404 Icon */}
          <div className="w-24 h-24 bg-gradient-to-br from-amber-600 to-orange-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
            <span className="text-3xl font-bold text-white">404</span>
          </div>
          
          {/* Title */}
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Page Not Found
          </h1>
          
          {/* Description */}
          <p className="text-gray-600 mb-8">
            {user 
              ? 'You do not have permission to access this page or the page does not exist.'
              : 'This page does not exist or you are not logged in.'
            }
          </p>
          
          {/* Back Button */}
          <button
            onClick={handleBackClick}
            className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white py-3 px-6 rounded-xl font-medium hover:from-amber-700 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {user 
              ? `Back to ${user.role === 'admin' ? 'Admin' : user.role === 'manager' ? 'Manager' : 'Staff'} Dashboard`
              : 'Back to Login'
            }
          </button>
          
          {/* Additional Info */}
          <div className="mt-6 text-sm text-gray-500">
            <p>If you believe this is an error, please contact the administrator.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
