import React from 'react';
import { useTokenCheck } from '../hooks/useTokenCheck';
import Layout from './layout/Layout';
import AppRoutes from "../routes/AppRoutes";

const AppContent = ({ pageTitle }) => {
  // Sử dụng hook để kiểm tra token định kỳ
  useTokenCheck();

  return (
    <Layout pageTitle={pageTitle}>
      <AppRoutes />
    </Layout>
  );
};

export default AppContent;
