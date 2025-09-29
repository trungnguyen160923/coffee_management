import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({ 
  message = 'Đang tải...', 
  size = 'md' 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100">
      <div className="text-center">
        <div className={`animate-spin rounded-full border-b-2 border-amber-600 mx-auto mb-4 ${sizeClasses[size]}`}></div>
        <p className="text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );
}
