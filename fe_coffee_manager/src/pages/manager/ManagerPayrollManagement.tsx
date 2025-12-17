import React, { useState, useEffect } from 'react';
import { Calculator, RefreshCw, CheckCircle, Download, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { payrollService } from '../../services';
import { Payroll, PayrollFilters } from '../../types';
import { staffService } from '../../services';
import { StaffWithUserDto } from '../../types';
import PayrollTable from '../../components/payroll/PayrollTable';
import PayrollFiltersComponent from '../../components/payroll/PayrollFilters';
import PayrollDetailModal from '../../components/payroll/PayrollDetailModal';
import PayrollCalculationForm from '../../components/payroll/PayrollCalculationForm';
import ConfirmModal from '../../components/common/modal/ConfirmModal';
import { ManagerPayrollManagementSkeleton } from '../../components/manager/skeletons';

const ManagerPayrollManagement: React.FC = () => {
  const { managerBranch } = useAuth();
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [staffList, setStaffList] = useState<StaffWithUserDto[]>([]);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCalculateModal, setShowCalculateModal] = useState(false);
  const [showBatchApproveModal, setShowBatchApproveModal] = useState(false);
  const [selectedPayrollIds, setSelectedPayrollIds] = useState<number[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  // Export state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMode, setExportMode] = useState<'ALL' | 'SELECTED'>('ALL');
  const [exporting, setExporting] = useState(false);

  const [filters, setFilters] = useState<PayrollFilters>({
    branchId: managerBranch?.branchId,
    period: undefined,
    status: undefined,
  });

  useEffect(() => {
    if (managerBranch?.branchId) {
      fetchPayrolls();
      fetchStaff();
    }
  }, [managerBranch]);

  useEffect(() => {
    if (managerBranch?.branchId) {
      fetchPayrolls();
    }
  }, [filters]);

  const fetchStaff = async () => {
    if (!managerBranch?.branchId) return;
    try {
      setLoadingStaff(true);
      const staffs = await staffService.getStaffsWithUserInfoByBranch(managerBranch.branchId);
      setStaffList(staffs || []);
    } catch (err: any) {
      console.error('Error fetching staff:', err);
      toast.error(err?.message || 'Failed to load staff list');
    } finally {
      setLoadingStaff(false);
    }
  };

  const fetchPayrolls = async () => {
    if (!managerBranch?.branchId) return;
    try {
      setLoading(true);
      setError(null);
      // Manager chỉ xem payroll của Staff trong branch của mình
      const data = await payrollService.getPayrolls({
        ...filters,
        branchId: managerBranch.branchId,
      });
      // Filter chỉ STAFF role
      const staffPayrolls = data.filter((p) => p.userRole === 'STAFF');
      setPayrolls(staffPayrolls);
    } catch (err: any) {
      const msg = err?.message || 'Failed to load payrolls';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculatePayroll = async (userIds: number[], period: string) => {
    if (!managerBranch?.branchId) return;

    try {
      setActionLoading(true);

      let createdCount = 0;
      let recalculatedCount = 0;
      const failedUsers: number[] = [];

      // Xử lý lần lượt từng nhân viên để dễ kiểm soát lỗi
      for (const userId of userIds) {
        try {
          // Kiểm tra xem kỳ lương này đã tồn tại cho user chưa
          const existingPayrolls = await payrollService.getPayrolls({
            userId,
            period,
            branchId: managerBranch.branchId,
          });

          if (existingPayrolls && existingPayrolls.length > 0) {
            // Đã có payroll → gọi tính lại
            const payrollToRecalc = existingPayrolls[0];
            await payrollService.recalculatePayroll(payrollToRecalc.payrollId);
            recalculatedCount += 1;
          } else {
            // Chưa có payroll → tính mới
            await payrollService.calculatePayroll({ userId, period });
            createdCount += 1;
          }
        } catch (err) {
          // Ghi nhận user bị lỗi nhưng không chặn các user khác
          failedUsers.push(userId);
          console.error('Failed to calculate/recalculate payroll for user', userId, err);
        }
      }

      // Summary notifications
      if (createdCount > 0) {
        toast.success(`Calculated new payroll for ${createdCount} employee(s)`);
      }
      if (recalculatedCount > 0) {
        toast.success(`Recalculated payroll for ${recalculatedCount} employee(s)`);
      }
      if (failedUsers.length > 0) {
        toast.error(`Failed to process ${failedUsers.length} employee(s). Please check logs or try again.`);
      }

      setShowCalculateModal(false);
      fetchPayrolls();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to calculate payroll');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprovePayroll = async (payrollId: number) => {
    try {
      setActionLoading(true);
      await payrollService.approvePayroll(payrollId);
      toast.success('Duyệt lương thành công');
      fetchPayrolls();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to approve payroll');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecalculatePayroll = async (payrollId: number) => {
    try {
      setActionLoading(true);
      await payrollService.recalculatePayroll(payrollId);
      toast.success('Payroll recalculated successfully');
      // Refresh payrolls list
      fetchPayrolls();
      // Update selected payroll if it's the one being recalculated
      if (selectedPayroll?.payrollId === payrollId) {
        const updatedPayrolls = await payrollService.getPayrolls({
          ...filters,
          branchId: managerBranch.branchId,
        });
        const updated = updatedPayrolls.find((p) => p.payrollId === payrollId);
        if (updated) {
          setSelectedPayroll(updated);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to recalculate payroll');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveBatch = async () => {
    if (selectedPayrollIds.length === 0) {
      toast.error('Please select at least one payroll');
      return;
    }

    try {
      setActionLoading(true);
      await payrollService.approvePayrollBatch({ payrollIds: selectedPayrollIds });
      toast.success(`Approved ${selectedPayrollIds.length} payroll(s)`);
      setShowBatchApproveModal(false);
      setSelectedPayrollIds([]);
      fetchPayrolls();
    } catch (err: any) {
      toast.error(err?.message || 'Batch approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDetail = (payroll: Payroll) => {
    setSelectedPayroll(payroll);
    setShowDetailModal(true);
  };

  const handleSelectPayroll = (payrollId: number, selected: boolean) => {
    if (selected) {
      setSelectedPayrollIds([...selectedPayrollIds, payrollId]);
    } else {
      setSelectedPayrollIds(selectedPayrollIds.filter((id) => id !== payrollId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedPayrollIds(payrolls.map((p) => p.payrollId));
    } else {
      setSelectedPayrollIds([]);
    }
  };

  const getCurrentMonthPeriod = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  // Export payrolls to XLSX (Excel)
  const handleExportPayrolls = () => {
    try {
      setExporting(true);

      let rows = payrolls;
      if (exportMode === 'SELECTED') {
        rows = rows.filter((p) => selectedPayrollIds.includes(p.payrollId));
      }

      if (rows.length === 0) {
        toast.error('No payroll data to export');
        return;
      }

      const header = [
        'PayrollId',
        'UserId',
        'UserName',
        'BranchId',
        'BranchName',
        'Period',
        'Status',
        'BaseSalary',
        'GrossSalary',
        'NetSalary',
        'TotalAllowances',
        'TotalBonuses',
        'TotalPenalties',
        'AmountInsurances',
        'AmountTax',
        'AmountAdvances',
        'CreateAt',
        'UpdateAt',
        'ApprovedAt',
        'PaidAt',
      ];

      const data = rows.map((p) => [
        p.payrollId,
        p.userId,
        p.userName || `User #${p.userId}`,
        p.branchId,
        p.branchName || `Branch #${p.branchId}`,
        p.period,
        p.status,
        p.baseSalary,
        p.grossSalary,
        p.netSalary,
        p.totalAllowances,
        p.totalBonuses,
        p.totalPenalties,
        p.amountInsurances,
        p.amountTax,
        p.amountAdvances,
        p.createAt,
        p.updateAt,
        p.approvedAt || '',
        p.paidAt || '',
      ]);

      const sheetData = [header, ...data];
      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Payrolls');

      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const now = new Date();
      const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
        2,
        '0'
      )}-${String(now.getDate()).padStart(2, '0')}`;
      link.href = url;
      link.setAttribute(
        'download',
        `payroll_report_${managerBranch?.name || 'branch'}_${ts}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${rows.length} payroll record(s)`);
      setShowExportModal(false);
    } catch (err: any) {
      console.error('Export payroll error:', err);
      toast.error(err?.message || 'Failed to export payroll report');
    } finally {
      setExporting(false);
    }
  };

  // Convert StaffWithUserDto to UserResponseDto format for PayrollCalculationForm
  const staffAsUsers = staffList.map((staff) => ({
    user_id: staff.userId,
    email: staff.email,
    fullname: staff.fullname,
    phoneNumber: staff.phoneNumber,
    dob: staff.dob,
    avatarUrl: staff.avatarUrl,
    bio: staff.bio,
    role: { roleId: 0, name: 'STAFF' as const },
    identityCard: staff.identityCard,
    branch: staff.branch,
    hireDate: staff.hireDate,
    position: null,
    salary: staff.baseSalary,
    adminLevel: null,
    notes: null,
  }));

  if (!managerBranch) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          <p>You are not assigned to any branch. Please contact Admin.</p>
        </div>
      </div>
    );
  }

  // Show skeleton during initial load
  if (loading && payrolls.length === 0) {
    return <ManagerPayrollManagementSkeleton />;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Staff Payroll Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage and approve payroll for staff in {managerBranch.name} branch
          </p>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <PayrollFiltersComponent
          filters={filters}
          onFiltersChange={setFilters}
          showBranchFilter={false}
          branches={[]}
        />
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowCalculateModal(true);
              fetchStaff();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            <Calculator className="w-4 h-4" />
            Calculate Payroll
          </button>
          <button
            type="button"
            onClick={() => {
              setExportMode('ALL');
              setShowExportModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={fetchPayrolls}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <PayrollTable
        payrolls={payrolls}
        selectedPayrollIds={selectedPayrollIds}
        onSelectPayroll={handleSelectPayroll}
        onSelectAll={handleSelectAll}
        onViewDetail={handleViewDetail}
        onApprove={handleApprovePayroll}
        showCheckbox={true}
        showActions={true}
        loading={loading}
      />

      {/* Batch Approve Button */}
      {selectedPayrollIds.length > 0 && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setShowBatchApproveModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4" />
            Approve {selectedPayrollIds.length} selected payroll(s)
          </button>
        </div>
      )}

      {/* Calculate Modal */}
      <PayrollCalculationForm
        open={showCalculateModal}
        onClose={() => setShowCalculateModal(false)}
        onSubmit={handleCalculatePayroll}
        users={staffAsUsers}
        loadingUsers={loadingStaff}
        loading={actionLoading}
        userLabel="Staff"
        defaultPeriod={getCurrentMonthPeriod()}
      />

      {/* Batch Approve Modal */}
      <ConfirmModal
        open={showBatchApproveModal}
        title="Approve Multiple Payrolls"
        description={`Are you sure you want to approve ${selectedPayrollIds.length} selected payroll(s)?`}
        confirmText="Approve"
        cancelText="Cancel"
        onConfirm={handleApproveBatch}
        onCancel={() => setShowBatchApproveModal(false)}
        loading={actionLoading}
      />

      {/* Export Payrolls Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Export Payroll
                </h3>
                <p className="text-sm text-slate-500">
                  Select the scope of payroll data to export (CSV can be opened in Excel)
                </p>
              </div>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-2 rounded-lg hover:bg-slate-100"
                aria-label="Close export modal"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-800 mb-2">
                  Export Scope
                </p>
                <div className="space-y-2 text-sm text-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="exportMode"
                      value="ALL"
                      checked={exportMode === 'ALL'}
                      onChange={() => setExportMode('ALL')}
                      className="text-amber-600 border-slate-300"
                    />
                    <span>
                      All payrolls currently displayed
                      <span className="text-slate-500 ml-1">
                        ({payrolls.length} records)
                      </span>
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="exportMode"
                      value="SELECTED"
                      checked={exportMode === 'SELECTED'}
                      onChange={() => setExportMode('SELECTED')}
                      className="text-amber-600 border-slate-300"
                    />
                    <span>
                      Only selected payrolls
                      <span className="text-slate-500 ml-1">
                        ({selectedPayrollIds.length} selected)
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
                The file will apply current filters (pay period, status, ...).
                If you select &quot;Only selected payrolls&quot; mode but haven't selected
                any records, the system will show an error.
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-100"
                disabled={exporting}
              >
                Cancel
              </button>
              <button
                onClick={handleExportPayrolls}
                disabled={
                  exporting ||
                  (exportMode === 'SELECTED' && selectedPayrollIds.length === 0)
                }
                className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {exporting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export XLSX
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <PayrollDetailModal
        open={showDetailModal}
        payroll={selectedPayroll}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedPayroll(null);
        }}
        onApprove={handleApprovePayroll}
        onRecalculate={handleRecalculatePayroll}
        loading={actionLoading}
      />
    </div>
  );
};

export default ManagerPayrollManagement;

