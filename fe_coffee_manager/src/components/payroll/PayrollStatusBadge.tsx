import React from 'react';
import { PayrollStatus } from '../../types';

interface PayrollStatusBadgeProps {
  status: PayrollStatus;
  className?: string;
}

const PayrollStatusBadge: React.FC<PayrollStatusBadgeProps> = ({ status, className = '' }) => {
  const getStatusConfig = (status: PayrollStatus) => {
    switch (status) {
      case 'DRAFT':
        return {
          label: 'Draft',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-300',
        };
      case 'REVIEW':
        return {
          label: 'Pending Review',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-300',
        };
      case 'APPROVED':
        return {
          label: 'Approved',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-300',
        };
      case 'PAID':
        return {
          label: 'Paid',
          bgColor: 'bg-amber-100',
          textColor: 'text-amber-800',
          borderColor: 'border-amber-300',
        };
      default:
        return {
          label: status,
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-300',
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor} ${className}`}
    >
      {config.label}
    </span>
  );
};

export default PayrollStatusBadge;

