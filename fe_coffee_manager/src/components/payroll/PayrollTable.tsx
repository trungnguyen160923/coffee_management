import React from 'react';
import { Eye, CheckCircle, DollarSign, RefreshCw, Undo2, User, Building2, Calendar } from 'lucide-react';
import { Payroll } from '../../types';
import PayrollStatusBadge from './PayrollStatusBadge';

interface PayrollTableProps {
  payrolls: Payroll[];
  selectedPayrollIds?: number[];
  onSelectPayroll?: (payrollId: number, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  onViewDetail?: (payroll: Payroll) => void;
  onApprove?: (payrollId: number) => void;
  onMarkAsPaid?: (payrollId: number) => void;
  onRecalculate?: (payrollId: number) => void;
  onRevert?: (payrollId: number) => void;
  showCheckbox?: boolean;
  showActions?: boolean;
  loading?: boolean;
}

const PayrollTable: React.FC<PayrollTableProps> = ({
  payrolls,
  selectedPayrollIds = [],
  onSelectPayroll,
  onSelectAll,
  onViewDetail,
  onApprove,
  onMarkAsPaid,
  onRecalculate,
  onRevert,
  showCheckbox = false,
  showActions = true,
  loading = false,
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  /**
   * Kiểm tra period có phải tháng hiện tại hoặc 1 tháng trước không
   */
  const canRevert = (period: string): boolean => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const oneMonthAgoStr = `${oneMonthAgo.getFullYear()}-${String(oneMonthAgo.getMonth() + 1).padStart(2, '0')}`;
    
    return period === currentMonth || period === oneMonthAgoStr;
  };

  const allSelected = payrolls.length > 0 && selectedPayrollIds.length === payrolls.length;
  const someSelected = selectedPayrollIds.length > 0 && selectedPayrollIds.length < payrolls.length;

  if (loading && payrolls.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200"></div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-100 border-b border-gray-200"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {showCheckbox && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = someSelected;
                    }}
                    onChange={(e) => onSelectAll?.(e.target.checked)}
                    className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Branch
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pay Period
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Net Salary
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              {showActions && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payrolls.length === 0 ? (
              <tr>
                <td
                  colSpan={showCheckbox ? (showActions ? 7 : 6) : showActions ? 6 : 5}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  No data
                </td>
              </tr>
            ) : (
              payrolls.map((payroll) => (
                <tr key={payroll.payrollId} className="hover:bg-gray-50">
                  {showCheckbox && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedPayrollIds.includes(payroll.payrollId)}
                        onChange={(e) => onSelectPayroll?.(payroll.payrollId, e.target.checked)}
                        className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">
                        {payroll.userName || `User #${payroll.userId}`}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Building2 className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">
                        {payroll.branchName || `Branch #${payroll.branchId}`}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-900">{payroll.period}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(payroll.netSalary)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <PayrollStatusBadge status={payroll.status} />
                  </td>
                  {showActions && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {onViewDetail && (
                          <button
                            onClick={() => onViewDetail(payroll)}
                            className="text-amber-600 hover:text-amber-900"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                        {onApprove && payroll.status !== 'APPROVED' && payroll.status !== 'PAID' && (
                          <button
                            onClick={() => onApprove(payroll.payrollId)}
                            className="text-green-600 hover:text-green-900"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {onMarkAsPaid && payroll.status === 'APPROVED' && (
                          <button
                            onClick={() => onMarkAsPaid(payroll.payrollId)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Mark as Paid"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )}
                        {onRevert && (payroll.status === 'PAID' || payroll.status === 'APPROVED') && canRevert(payroll.period) && (
                          <button
                            onClick={() => onRevert(payroll.payrollId)}
                            className="text-orange-600 hover:text-orange-900"
                            title={payroll.status === 'PAID' ? 'Revert to Approved' : 'Revert to Draft'}
                          >
                            <Undo2 className="w-4 h-4" />
                          </button>
                        )}
                        {onRecalculate && (payroll.status === 'DRAFT' || payroll.status === 'REVIEW') && (
                          <button
                            onClick={() => onRecalculate(payroll.payrollId)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Recalculate"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PayrollTable;

