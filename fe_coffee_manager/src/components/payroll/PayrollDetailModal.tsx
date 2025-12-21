import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Building2, Info, Clock, Undo2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { Payroll } from '../../types';
import PayrollStatusBadge from './PayrollStatusBadge';
import payrollService from '../../services/payrollService';

interface PayrollDetailModalProps {
  open: boolean;
  payroll: Payroll | null;
  onClose: () => void;
  onApprove?: (payrollId: number) => void;
  onMarkAsPaid?: (payrollId: number) => void;
  onRecalculate?: (payrollId: number) => void;
  onRevert?: (payrollId: number) => void;
  loading?: boolean;
}

const PayrollDetailModal: React.FC<PayrollDetailModalProps> = ({
  open,
  payroll,
  onClose,
  onApprove,
  onMarkAsPaid,
  onRecalculate,
  onRevert,
  loading = false,
}) => {
  // State để quản lý expand/collapse cho từng phần giải thích
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  // State cho part-time info
  const [isPartTime, setIsPartTime] = useState<boolean>(false);
  const [totalHoursWorked, setTotalHoursWorked] = useState<number>(0);
  const [totalShiftsWorked, setTotalShiftsWorked] = useState<number>(0);
  const [loadingPartTimeInfo, setLoadingPartTimeInfo] = useState<boolean>(false);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // Fetch part-time information
  useEffect(() => {
    const fetchPartTimeInfo = async () => {
      if (!open || !payroll) {
        setIsPartTime(false);
        setTotalHoursWorked(0);
        setTotalShiftsWorked(0);
        return;
      }
      
      // Kiểm tra nếu có hourlyRateSnapshot > 0 thì là part-time
      // Kiểm tra userRole không phân biệt hoa thường
      const isStaff = payroll.userRole?.toUpperCase() === 'STAFF';
      const hasHourlyRate = payroll.hourlyRateSnapshot > 0;
      
      console.log('Payroll part-time check:', {
        userId: payroll.userId,
        userRole: payroll.userRole,
        isStaff,
        hourlyRateSnapshot: payroll.hourlyRateSnapshot,
        hasHourlyRate,
        baseSalary: payroll.baseSalary
      });
      
      if (hasHourlyRate && isStaff) {
        setIsPartTime(true);
        setLoadingPartTimeInfo(true);
        
        try {
          // Fetch thông tin giờ làm và số ca từ API (tính từ shift start/end time)
          const summary = await payrollService.getShiftWorkSummary(payroll.userId, payroll.period);
          setTotalHoursWorked(summary.totalHours);
          setTotalShiftsWorked(summary.totalShifts);
        } catch (err) {
          console.error('Failed to fetch shift work summary:', err);
          // Fallback: Tính từ baseSalary nếu không fetch được
          if (payroll.hourlyRateSnapshot > 0) {
            const hours = payroll.baseSalary / payroll.hourlyRateSnapshot;
            setTotalHoursWorked(Math.round(hours * 100) / 100);
            // Ước tính số ca (giả sử mỗi ca 8 giờ)
            setTotalShiftsWorked(Math.ceil(hours / 8));
          }
        } finally {
          setLoadingPartTimeInfo(false);
        }
      } else {
        setIsPartTime(false);
        setTotalHoursWorked(0);
        setTotalShiftsWorked(0);
      }
    };

    fetchPartTimeInfo();
  }, [open, payroll]);

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
            <h2 className="text-xl font-bold text-gray-900">Payroll Details</h2>
            <p className="text-sm text-gray-600 mt-1">
              Pay Period: {payroll.period}
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
                <p className="text-sm text-gray-600">Branch</p>
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

          {/* Part-time Information */}
          {(isPartTime || (payroll.hourlyRateSnapshot > 0 && payroll.userRole?.toUpperCase() === 'STAFF')) && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-gray-900">Part-time Information</h4>
              </div>
              {loadingPartTimeInfo ? (
                <div className="text-sm text-gray-600">Loading information...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Hourly Rate</p>
                    <p className="font-medium text-gray-900">
                      {formatCurrency(payroll.hourlyRateSnapshot)}/hour
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Hours Worked</p>
                    <p className="font-medium text-gray-900">
                      {totalHoursWorked > 0 ? `${totalHoursWorked.toFixed(2)} hours` : '0'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Shifts Worked</p>
                    <p className="font-medium text-gray-900">
                      {totalShiftsWorked > 0 ? `${totalShiftsWorked} shifts` : '0'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Salary Breakdown */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Salary Breakdown</h3>
            <div className="space-y-3">
              {/* Earnings */}
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Earnings</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Base Salary</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSection('baseSalary')}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="View calculation explanation"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(payroll.baseSalary)}
                      </span>
                    </div>
                  </div>
                  {expandedSections.has('baseSalary') && (
                    <div className="ml-4 mt-2 p-3 bg-white rounded border border-green-200 text-xs text-gray-700">
                      <p className="font-semibold mb-1">Base Salary Calculation:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>Full-time (MONTHLY):</strong> Base Salary = Configured base salary</li>
                        <li><strong>Part-time (HOURLY):</strong> Base Salary = Total hours worked × Hourly Rate</li>
                        <li>Total hours worked = Sum of hours from all CHECKED_OUT shifts in the period</li>
                        <li>Each shift is calculated from shift start time to shift end time</li>
                      </ul>
                    </div>
                  )}
                  {payroll.overtimeHours > 0 && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          Overtime ({payroll.overtimeHours.toFixed(1)} hours)
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleSection('overtime')}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title="View calculation explanation"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(payroll.overtimePay)}
                          </span>
                        </div>
                      </div>
                      {expandedSections.has('overtime') && (
                        <div className="ml-4 mt-2 p-3 bg-white rounded border border-green-200 text-xs text-gray-700">
                          <p className="font-semibold mb-1">Overtime Calculation:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li><strong>Overtime Hours:</strong> Calculated daily within the period</li>
                            <li><strong>Regular days:</strong> OT = Total hours worked - 8 hours (if &gt; 0)</li>
                            <li><strong>Weekends/Holidays:</strong> All hours worked = OT</li>
                            <li><strong>Overtime Pay:</strong> Sum of (OT hours × Hourly Rate × Multiplier) for each day</li>
                            <li><strong>Multiplier:</strong> Regular days = 1.5x, Weekends = 2x, Holidays = 3x</li>
                            <li><strong>Hourly Rate:</strong> Part-time uses hourly_rate, Full-time = base_salary ÷ (standard days × 8 hours)</li>
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                  {payroll.totalAllowances > 0 && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Allowances</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleSection('allowances')}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title="View calculation explanation"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(payroll.totalAllowances)}
                          </span>
                        </div>
                      </div>
                      {expandedSections.has('allowances') && (
                        <div className="ml-4 mt-2 p-3 bg-white rounded border border-green-200 text-xs text-gray-700">
                          <p className="font-semibold mb-1">Allowances Calculation:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Total allowances = Sum of all allowances with status = ACTIVE in the period</li>
                            <li>Each allowance is calculated according to the configured amount</li>
                            <li>Only allowances with period matching the payroll period are counted</li>
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                  {payroll.totalBonuses > 0 && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Bonuses</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleSection('bonuses')}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title="View calculation explanation"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(payroll.totalBonuses)}
                          </span>
                        </div>
                      </div>
                      {expandedSections.has('bonuses') && (
                        <div className="ml-4 mt-2 p-3 bg-white rounded border border-green-200 text-xs text-gray-700">
                          <p className="font-semibold mb-1">Bonuses Calculation:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Total bonuses = Sum of all bonuses with status = APPROVED in the period</li>
                            <li>Only approved bonuses (APPROVED) are counted</li>
                            <li>PENDING or REJECTED bonuses are not included in salary</li>
                            <li>Each bonus is calculated according to the configured amount</li>
                          </ul>
                        </div>
                      )}
                    </>
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
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Social Insurance (SI, HI, UI)</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSection('insurances')}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="View calculation explanation"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(payroll.amountInsurances)}
                      </span>
                    </div>
                  </div>
                  {expandedSections.has('insurances') && (
                    <div className="ml-4 mt-2 p-3 bg-white rounded border border-red-200 text-xs text-gray-700">
                      <p className="font-semibold mb-1">Insurance Calculation:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Insurance = Insurance Salary × Insurance rate (default 10.5%)</li>
                        <li>Insurance Salary = insurance_salary if available, otherwise = base_salary</li>
                        <li>Includes: Social Insurance (8%), Health Insurance (1.5%), Unemployment Insurance (1%)</li>
                      </ul>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Income Tax</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSection('tax')}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="View calculation explanation"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(payroll.amountTax)}
                      </span>
                    </div>
                  </div>
                  {expandedSections.has('tax') && (
                    <div className="ml-4 mt-2 p-3 bg-white rounded border border-red-200 text-xs text-gray-700">
                      <p className="font-semibold mb-1">Personal Income Tax Calculation:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li><strong>Taxable Income:</strong> Gross Salary - Insurance - Personal Deduction - Dependent Deduction</li>
                        <li><strong>Personal Deduction:</strong> 11,000,000 VND/month</li>
                        <li><strong>Dependent Deduction:</strong> 4,400,000 VND/person/month</li>
                        <li><strong>Tax by bracket:</strong></li>
                        <li className="ml-4">• 0-5M: 5%</li>
                        <li className="ml-4">• 5-10M: 10%</li>
                        <li className="ml-4">• 10-18M: 15%</li>
                        <li className="ml-4">• 18-32M: 20%</li>
                        <li className="ml-4">• 32-52M: 25%</li>
                        <li className="ml-4">• 52-80M: 30%</li>
                        <li className="ml-4">• Above 80M: 35%</li>
                      </ul>
                    </div>
                  )}
                  {payroll.amountAdvances > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Salary Advance</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(payroll.amountAdvances)}
                      </span>
                    </div>
                  )}
                  {payroll.totalPenalties > 0 && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Penalties</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleSection('penalties')}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                            title="View calculation explanation"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                          <span className="text-sm font-medium text-gray-900">
                            {formatCurrency(payroll.totalPenalties)}
                          </span>
                        </div>
                      </div>
                      {expandedSections.has('penalties') && (
                        <div className="ml-4 mt-2 p-3 bg-white rounded border border-red-200 text-xs text-gray-700">
                          <p className="font-semibold mb-1">Penalties Calculation:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Total penalties = Sum of all penalties with status = APPROVED in the period</li>
                            <li>Only approved penalties (APPROVED) are counted</li>
                            <li>PENDING or REJECTED penalties are not included in salary</li>
                            <li>Each penalty is calculated according to the configured amount</li>
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                  <div className="border-t border-red-200 pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-900">Total Deductions</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleSection('totalDeductions')}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                          title="View calculation explanation"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                        <span className="font-bold text-red-700">
                          {formatCurrency(payroll.totalDeductions + payroll.totalPenalties)}
                        </span>
                      </div>
                    </div>
                    {expandedSections.has('totalDeductions') && (
                      <div className="mt-2 p-3 bg-white rounded border border-red-200 text-xs text-gray-700">
                        <p className="font-semibold mb-1">Total Deductions Formula:</p>
                        <p className="font-mono bg-gray-50 p-2 rounded">
                          Total Deductions = Insurance + Tax + Salary Advance + Penalties
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Net Salary */}
              <div className="bg-amber-50 rounded-lg p-4 border-2 border-amber-300">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-gray-900">Net Salary</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleSection('netSalary')}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="Xem giải thích cách tính"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                    <span className="text-2xl font-bold text-amber-700">
                      {formatCurrency(payroll.netSalary)}
                    </span>
                  </div>
                </div>
                {expandedSections.has('netSalary') && (
                  <div className="mt-3 p-3 bg-white rounded border border-amber-300 text-xs text-gray-700">
                    <p className="font-semibold mb-1">Net Salary Formula:</p>
                    <p className="font-mono bg-gray-50 p-2 rounded mb-2">
                      Net Salary = Gross Salary - Total Deductions - Penalties
                    </p>
                    <p className="text-gray-600 italic">This is the final amount received.</p>
                  </div>
                )}
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
          {onRevert && (payroll.status === 'PAID' || payroll.status === 'APPROVED') && (() => {
            const now = new Date();
            const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const oneMonthAgoStr = `${oneMonthAgo.getFullYear()}-${String(oneMonthAgo.getMonth() + 1).padStart(2, '0')}`;
            return payroll.period === currentMonth || payroll.period === oneMonthAgoStr;
          })() && (
            <button
              onClick={() => onRevert(payroll.payrollId)}
              disabled={loading}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Undo2 className="w-4 h-4" />
              {payroll.status === 'PAID' ? 'Revert to Approved' : 'Revert to Draft'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PayrollDetailModal;

