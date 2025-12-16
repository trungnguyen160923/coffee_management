import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Payroll } from '../../types';

interface PayrollSummaryCardProps {
  payroll: Payroll;
  className?: string;
  showBreakdown?: boolean;
}

const PayrollSummaryCard: React.FC<PayrollSummaryCardProps> = ({
  payroll,
  className = '',
  showBreakdown = true,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const getPercentage = (part: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((part / total) * 100);
  };

  const breakdown = [
    {
      label: 'Base Salary',
      amount: payroll.baseSalary,
      color: 'bg-blue-500',
    },
    {
      label: 'Overtime',
      amount: payroll.overtimePay,
      color: 'bg-purple-500',
    },
    {
      label: 'Allowances',
      amount: payroll.totalAllowances,
      color: 'bg-green-500',
    },
    {
      label: 'Bonuses',
      amount: payroll.totalBonuses,
      color: 'bg-yellow-500',
    },
  ].filter((item) => item.amount > 0);

  const deductions = [
    {
      label: 'Insurance',
      amount: payroll.amountInsurances,
      color: 'bg-red-500',
    },
    {
      label: 'Income Tax',
      amount: payroll.amountTax,
      color: 'bg-orange-500',
    },
    {
      label: 'Salary Advance',
      amount: payroll.amountAdvances,
      color: 'bg-pink-500',
    },
    {
      label: 'Penalties',
      amount: payroll.totalPenalties,
      color: 'bg-red-600',
    },
  ].filter((item) => item.amount > 0);

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Payroll Summary</h3>
        <p className="text-sm text-gray-600">Period: {payroll.period}</p>
      </div>

      {/* Net Salary - Highlight */}
      <div className="mb-6 p-4 bg-amber-50 rounded-lg border-2 border-amber-300">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Net Salary</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">
              {formatCurrency(payroll.netSalary)}
            </p>
          </div>
          <DollarSign className="w-8 h-8 text-amber-600" />
        </div>
      </div>

      {showBreakdown && (
        <>
          {/* Gross Salary Breakdown */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Earnings</h4>
            <div className="space-y-2">
              {breakdown.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded ${item.color}`}></div>
                    <span className="text-sm text-gray-600">{item.label}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">Total Earnings</span>
                  <span className="text-sm font-bold text-green-700">
                    {formatCurrency(payroll.grossSalary)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Deductions Breakdown */}
          {deductions.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Deductions</h4>
              <div className="space-y-2">
                {deductions.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded ${item.color}`}></div>
                      <span className="text-sm text-gray-600">{item.label}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">Total Deductions</span>
                    <span className="text-sm font-bold text-red-700">
                      {formatCurrency(payroll.totalDeductions + payroll.totalPenalties)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Visual Breakdown Chart */}
          {payroll.grossSalary > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Earnings Distribution</h4>
              <div className="space-y-2">
                {breakdown.map((item, index) => {
                  const percentage = getPercentage(item.amount, payroll.grossSalary);
                  return (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">{item.label}</span>
                        <span className="text-xs text-gray-500">{percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${item.color}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PayrollSummaryCard;

