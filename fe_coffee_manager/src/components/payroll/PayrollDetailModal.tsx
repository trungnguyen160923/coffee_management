import React from 'react';
import { X, DollarSign, Calendar, User, Building2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Payroll } from '../../types';
import PayrollStatusBadge from './PayrollStatusBadge';

interface PayrollDetailModalProps {
  open: boolean;
  payroll: Payroll | null;
  onClose: () => void;
  onApprove?: (payrollId: number) => void;
  onMarkAsPaid?: (payrollId: number) => void;
  onRecalculate?: (payrollId: number) => void;
  loading?: boolean;
}

const PayrollDetailModal: React.FC<PayrollDetailModalProps> = ({
  open,
  payroll,
  onClose,
  onApprove,
  onMarkAsPaid,
  onRecalculate,
  loading = false,
}) => {
  if (!open || !payroll) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('vi-VN');
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1300]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Chi tiết lương</h2>
            <p className="text-sm text-gray-600 mt-1">
              Kỳ lương: {payroll.period}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Employee</p>
                <p className="font-medium text-gray-900">
                  {payroll.userName || `User #${payroll.userId}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Chi nhánh</p>
                <p className="font-medium text-gray-900">
                  {payroll.branchName || `Branch #${payroll.branchId}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600">Pay Period</p>
                <p className="font-medium text-gray-900">{payroll.period}</p>
              </div>
            </div>
            <div>
                <p className="text-sm text-gray-600">Status</p>
              <PayrollStatusBadge status={payroll.status} className="mt-1" />
            </div>
          </div>

          {/* Salary Breakdown */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Salary Breakdown</h3>
            <div className="space-y-3">
              {/* Earnings */}
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Earnings</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Base Salary</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(payroll.baseSalary)}
                    </span>
                  </div>
                  {payroll.overtimeHours > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Overtime ({payroll.overtimeHours.toFixed(1)} hours)
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(payroll.overtimePay)}
                        </span>
                      </div>
                    </>
                  )}
                  {payroll.totalAllowances > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Phụ cấp</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(payroll.totalAllowances)}
                      </span>
                    </div>
                  )}
                  {payroll.totalBonuses > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Bonuses</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(payroll.totalBonuses)}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-green-200 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Total Earnings</span>
                      <span className="font-bold text-green-700">
                        {formatCurrency(payroll.grossSalary)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="bg-red-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Deductions</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Social Insurance (SI, HI, UI)</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(payroll.amountInsurances)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Income Tax</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(payroll.amountTax)}
                    </span>
                  </div>
                  {payroll.amountAdvances > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Salary Advance</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(payroll.amountAdvances)}
                      </span>
                    </div>
                  )}
                  {payroll.totalPenalties > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Penalties</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(payroll.totalPenalties)}
                      </span>
                    </div>
                  )}
                  <div className="border-t border-red-200 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Total Deductions</span>
                      <span className="font-bold text-red-700">
                        {formatCurrency(payroll.totalDeductions + payroll.totalPenalties)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Salary */}
              <div className="bg-amber-50 rounded-lg p-4 border-2 border-amber-300">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Net Salary</span>
                  <span className="text-2xl font-bold text-amber-700">
                    {formatCurrency(payroll.netSalary)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Snapshot Info */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Snapshot Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Base Salary (snapshot)</p>
                <p className="font-medium text-gray-900">
                  {formatCurrency(payroll.baseSalarySnapshot)}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Hourly Rate (snapshot)</p>
                <p className="font-medium text-gray-900">
                  {formatCurrency(payroll.hourlyRateSnapshot)}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Insurance Salary (snapshot)</p>
                <p className="font-medium text-gray-900">
                  {formatCurrency(payroll.insuranceSalarySnapshot)}
                </p>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Timestamps</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Created At</p>
                <p className="font-medium text-gray-900">{formatDate(payroll.createAt)}</p>
              </div>
              <div>
                <p className="text-gray-600">Updated At</p>
                <p className="font-medium text-gray-900">{formatDate(payroll.updateAt)}</p>
              </div>
              {payroll.approvedAt && (
                <div>
                  <p className="text-gray-600">Approved At</p>
                  <p className="font-medium text-gray-900">{formatDate(payroll.approvedAt)}</p>
                </div>
              )}
              {payroll.paidAt && (
                <div>
                  <p className="text-gray-600">Paid At</p>
                  <p className="font-medium text-gray-900">{formatDate(payroll.paidAt)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {payroll.notes && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Notes</h3>
              <p className="text-sm text-gray-600">{payroll.notes}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
          {onRecalculate && (
            <button
              onClick={() => onRecalculate(payroll.payrollId)}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Recalculate
            </button>
          )}
          {onApprove && payroll.status !== 'APPROVED' && payroll.status !== 'PAID' && (
            <button
              onClick={() => onApprove(payroll.payrollId)}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              Approve
            </button>
          )}
          {onMarkAsPaid && payroll.status === 'APPROVED' && (
            <button
              onClick={() => onMarkAsPaid(payroll.payrollId)}
              disabled={loading}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              Mark as Paid
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PayrollDetailModal;

