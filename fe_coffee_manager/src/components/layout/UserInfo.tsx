import { useAuth } from '../../context/AuthContext';
import { DEFAULT_IMAGES } from '../../config/constants';

// Component để hiển thị thông tin user
export function UserInfo() {
  const { user } = useAuth();
  const defaultAvatar = DEFAULT_IMAGES.USER_AVATAR;

  if (!user) return null;

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Quản trị viên';
      case 'manager':
        return 'Quản lý';
      case 'staff':
        return 'Nhân viên';
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'staff':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex items-center space-x-4">
        <img
            src={user?.avatar || DEFAULT_IMAGES.USER_AVATAR}
            alt={user?.name}
            className="w-10 h-10 rounded-full object-cover"
        />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800">{user.name}</h3>
          <p className="text-sm text-gray-600">{user.email}</p>
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
            {getRoleDisplayName(user.role)}
          </span>
        </div>
      </div>
    </div>
  );
}
