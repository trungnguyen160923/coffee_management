import React from 'react';
import { Toaster } from 'react-hot-toast';

export const AppToaster: React.FC = () => {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      containerClassName=""
      containerStyle={{ top: 'var(--app-header-offset)', zIndex: 999999 }}
      toasterId="default"
      toastOptions={{
        className: '',
        duration: 4000,
        removeDelay: 1000,
        style: {
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: '#fff',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
        success: {
          duration: 3000,
          style: {
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#fff',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
          iconTheme: {
            primary: '#fff',
            secondary: '#10b981',
          },
        },
        error: {
          duration: 4000,
          style: {
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: '#fff',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(239, 68, 68, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
          iconTheme: {
            primary: '#fff',
            secondary: '#ef4444',
          },
        },
      }}
    />
  );
};

export default AppToaster;


