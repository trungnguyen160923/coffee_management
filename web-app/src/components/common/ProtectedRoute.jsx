import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // Hiển thị loading khi đang kiểm tra authentication
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Nếu chưa đăng nhập, chuyển hướng về trang login
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  // Nếu đã đăng nhập, hiển thị component con
  return children;
};

export default ProtectedRoute;
