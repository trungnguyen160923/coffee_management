import React, { useState, useEffect } from 'react';
import { 
  Calculator, 
  CheckCircle, 
  DollarSign, 
  Eye, 
  Filter, 
  RefreshCw,
  X,
  Calendar,
  Building2,
  User,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import { payrollService, Payroll, PayrollFilters, PayrollStatus } from '../../services';
import { branchService, managerService } from '../../services';
import { Branch, UserResponseDto } from '../../types';
import ConfirmModal from '../../components/common/modal/ConfirmModal';
import { PayrollManagementSkeleton } from '../../components/admin/skeletons';

const AdminPayrollManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'manager' | 'staff'>('manager');
  
  // Manager tab state
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [managerList, setManagerList] = useState<UserResponseDto[]>([]);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCalculateModal, setShowCalculateModal] = useState(false);
  const [showBatchApproveModal, setShowBatchApproveModal] = useState(false);
  const [selectedPayrollIds, setSelectedPayrollIds] = useState<number[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Filters for manager tab
  const [filters, setFilters] = useState<PayrollFilters>({
    branchId: undefined,
    period: undefined,
    status: undefined,
  });
  const [showFilters, setShowFilters] = useState(false);

  // Calculate form
  const [calculateUserId, setCalculateUserId] = useState<number | ''>('');
  const [calculatePeriod, setCalculatePeriod] = useState<string>('');

  // Staff tab state (read-only)
  const [staffPayrolls, setStaffPayrolls] = useState<Payroll[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [selectedBranchForStaff, setSelectedBranchForStaff] = useState<number | ''>('');
  const [staffPeriod, setStaffPeriod] = useState<string>('');

  // Export state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMode, setExportMode] = useState<'ALL_BRANCHES' | 'SELECTED_BRANCH'>('ALL_BRANCHES');
  const [exporting, setExporting] = useState(false);
  const [exportPeriod, setExportPeriod] = useState<string>('');
  const [exportBranchId, setExportBranchId] = useState<number | ''>('');

  useEffect(() => {
    fetchBranches();
    fetchPayrolls();
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchPayrolls();
  }, [filters]);

  // Tự động load / reload Staff Payrolls khi:
  // - Chuyển sang tab "staff"
  // - Hoặc đổi branch / period filter của staff
  useEffect(() => {
    if (activeTab === 'staff') {
      fetchStaffPayrolls();
    }
  }, [activeTab, selectedBranchForStaff, staffPeriod]);


  const fetchBranches = async () => {
    try {
      const response = await branchService.getBranches();
      setBranches(response.branches || []);
      if (!response.branches || response.branches.length === 0) {
        console.warn('No branches found in response');
      }
    } catch (err: any) {
      console.error('Error fetching branches:', err);
      toast.error(err?.message || 'Failed to load branches');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      // Admin only calculates payroll for Managers
      const managers = await managerService.getManagerProfiles();
      setManagerList(managers || []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      toast.error(err?.message || 'Failed to load managers');
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      setError(null);
      // Filter only MANAGER role payrolls
      const data = await payrollService.getPayrolls(filters);
      const managerPayrolls = data.filter(p => p.userRole === 'MANAGER');
      setPayrolls(managerPayrolls);
    } catch (err: any) {
      const msg = err?.message || 'Failed to load payrolls';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffPayrolls = async () => {
    try {
      setStaffLoading(true);
      const staffFilters: PayrollFilters = {
        branchId: selectedBranchForStaff ? Number(selectedBranchForStaff) : undefined,
        period: staffPeriod || undefined,
        status: 'APPROVED',
      };
      const data = await payrollService.getPayrolls(staffFilters);
      // Filter only STAFF role payrolls
      const staffOnlyPayrolls = data.filter(p => p.userRole === 'STAFF');
      setStaffPayrolls(staffOnlyPayrolls);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load staff payrolls');
    } finally {
      setStaffLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  const getStatusBadge = (status: PayrollStatus) => {
    const statusConfig = {
      DRAFT: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
      REVIEW: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending Review' },
      APPROVED: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Approved' },
      PAID: { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' },
    };
    const config = statusConfig[status] || statusConfig.DRAFT;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const handleCalculatePayroll = async () => {
    if (!calculateUserId || !calculatePeriod) {
      toast.error('Please select employee and pay period');
      return;
    }

    try {
      setActionLoading(true);
      await payrollService.calculatePayroll({
        userId: calculateUserId as number,
        period: calculatePeriod,
      });
      toast.success('Payroll calculated successfully');
      setShowCalculateModal(false);
      setCalculateUserId('');
      setCalculatePeriod('');
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
      toast.success('Payroll approved successfully');
      fetchPayrolls();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to approve payroll');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveBatch = async () => {
    if (selectedPayrollIds.length === 0) {
      toast.error('Please select at least one payroll to approve');
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

  const handleMarkAsPaid = async (payrollId: number) => {
    try {
      setActionLoading(true);
      await payrollService.markPayrollAsPaid(payrollId);
      toast.success('Marked as paid successfully');
      fetchPayrolls();
    } catch (err: any) {
      toast.error(err?.message || 'Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecalculate = async (payrollId: number) => {
    try {
      setActionLoading(true);
      await payrollService.recalculatePayroll(payrollId);
      toast.success('Recalculation completed successfully');
      fetchPayrolls();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to recalculate');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDetail = (payroll: Payroll) => {
    setSelectedPayroll(payroll);
    setShowDetailModal(true);
  };

  const getCurrentMonthPeriod = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  // Export Manager Payrolls (by period)
  const handleExportManagerPayrolls = async () => {
    try {
      setExporting(true);

      if (!exportPeriod) {
        toast.error('Please select a period to export');
        return;
      }

      // Fetch all manager payrolls for the selected period
      const exportFilters: PayrollFilters = {
        period: exportPeriod,
        branchId: filters.branchId,
        status: filters.status,
      };
      const data = await payrollService.getPayrolls(exportFilters);
      const managerPayrolls = data.filter(p => p.userRole === 'MANAGER');

      if (managerPayrolls.length === 0) {
        toast.error('No payroll data to export for the selected period');
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

      const sheetData = [
        header,
        ...managerPayrolls.map((p) => [
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
        ]),
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Manager_Payrolls');

      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const ts = `${exportPeriod || 'all'}_${new Date().toISOString().split('T')[0]}`;
      link.href = url;
      link.setAttribute('download', `manager_payrolls_${ts}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${managerPayrolls.length} manager payroll record(s)`);
      setShowExportModal(false);
    } catch (err: any) {
      console.error('Export manager payroll error:', err);
      toast.error(err?.message || 'Failed to export manager payroll report');
    } finally {
      setExporting(false);
    }
  };

  // Export Staff Payrolls (all branches or selected branch)
  const handleExportStaffPayrolls = async () => {
    try {
      setExporting(true);

      if (!exportPeriod) {
        toast.error('Please select a period to export');
        return;
      }

      // Fetch staff payrolls based on export mode
      let payrollsToExport: Payroll[] = [];
      
      if (exportMode === 'ALL_BRANCHES') {
        // Fetch all branches' staff payrolls for the period
        const allStaffFilters: PayrollFilters = {
          period: exportPeriod,
          status: 'APPROVED',
        };
        const data = await payrollService.getPayrolls(allStaffFilters);
        payrollsToExport = data.filter(p => p.userRole === 'STAFF');
      } else {
        // Export only selected branch
        if (!exportBranchId) {
          toast.error('Please select a branch to export');
          return;
        }
        const branchStaffFilters: PayrollFilters = {
          branchId: Number(exportBranchId),
          period: exportPeriod,
          status: 'APPROVED',
        };
        const data = await payrollService.getPayrolls(branchStaffFilters);
        payrollsToExport = data.filter(p => p.userRole === 'STAFF');
      }

      if (payrollsToExport.length === 0) {
        toast.error('No payroll data to export for the selected period');
        return;
      }

      const workbook = XLSX.utils.book_new();
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

      if (exportMode === 'ALL_BRANCHES') {
        // Group by branch and create one sheet per branch
        const branchMap = new Map<number, { branchName: string; payrolls: Payroll[] }>();
        
        payrollsToExport.forEach((p) => {
          const branchId = p.branchId;
          if (!branchMap.has(branchId)) {
            branchMap.set(branchId, {
              branchName: p.branchName || `Branch #${branchId}`,
              payrolls: [],
            });
          }
          branchMap.get(branchId)!.payrolls.push(p);
        });

        // Create one sheet per branch
        branchMap.forEach(({ branchName, payrolls: branchPayrolls }, branchId) => {
          const sheetData = [
            header,
            ...branchPayrolls.map((p) => [
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
            ]),
          ];

          const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
          // Excel sheet name max 31 chars, no special chars
          let sheetName = branchName.replace(/[*?:/\[\]]/g, '_').slice(0, 31);
          XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || `B_${branchId}`);
        });
      } else {
        // Single sheet for selected branch
        const sheetData = [
          header,
          ...payrollsToExport.map((p) => [
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
          ]),
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
        const branchName = payrollsToExport[0]?.branchName || `Branch_${exportBranchId}`;
        let sheetName = branchName.replace(/[*?:/\[\]]/g, '_').slice(0, 31);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || 'Staff_Payrolls');
      }

      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const ts = `${staffPeriod}_${new Date().toISOString().split('T')[0]}`;
      link.href = url;
      link.setAttribute('download', `staff_payrolls_${ts}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${payrollsToExport.length} staff payroll record(s)`);
      setShowExportModal(false);
    } catch (err: any) {
      console.error('Export staff payroll error:', err);
      toast.error(err?.message || 'Failed to export staff payroll report');
    } finally {
      setExporting(false);
    }
  };

  // Show skeleton during initial load
  if (loading && payrolls.length === 0) {
    return <PayrollManagementSkeleton />;
  }

  // Show skeleton for staff tab loading
  if (activeTab === 'staff' && staffLoading && staffPayrolls.length === 0) {
    return <PayrollManagementSkeleton />;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Payroll Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage and approve payrolls for the entire system</p>
        </div>
        
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('manager')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'manager'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Manager Payroll Management
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'staff'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              View Staff Payroll
            </button>
          </nav>
        </div>
      </div>

      {/* Manager Tab */}
      {activeTab === 'manager' && (
        <>
          <div className="mb-6 flex items-center justify-between">
            <div></div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowFilters(!showFilters);
            }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button
            onClick={() => {
              // Initialize export period from current filter
              setExportPeriod(filters.period || '');
              setShowExportModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => {
              setCalculatePeriod(getCurrentMonthPeriod());
              setCalculateUserId('');
              fetchUsers();
              setShowCalculateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            <Calculator className="w-4 h-4" />
            Calculate Payroll
          </button>
          <button
            onClick={fetchPayrolls}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Branch
              </label>
              <select
                value={filters.branchId || ''}
                onChange={(e) =>
                  setFilters({ ...filters, branchId: e.target.value ? Number(e.target.value) : undefined })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="">All</option>
                {branches.map((branch) => (
                  <option key={branch.branchId} value={branch.branchId}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pay Period (YYYY-MM)
              </label>
              <input
                type="month"
                value={filters.period || ''}
                onChange={(e) =>
                  setFilters({ ...filters, period: e.target.value || undefined })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) =>
                  setFilters({ ...filters, status: (e.target.value as PayrollStatus) || undefined })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="">All</option>
                <option value="DRAFT">Draft</option>
                <option value="REVIEW">Pending Review</option>
                <option value="APPROVED">Approved</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setFilters({ branchId: undefined, period: undefined, status: undefined });
              }}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedPayrollIds.length === payrolls.length && payrolls.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPayrollIds(payrolls.map((p) => p.payrollId));
                      } else {
                        setSelectedPayrollIds([]);
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                </th>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payrolls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                        No data
                  </td>
                </tr>
              ) : (
                payrolls.map((payroll) => (
                  <tr key={payroll.payrollId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedPayrollIds.includes(payroll.payrollId)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPayrollIds([...selectedPayrollIds, payroll.payrollId]);
                          } else {
                            setSelectedPayrollIds(selectedPayrollIds.filter((id) => id !== payroll.payrollId));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </td>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payroll.period}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(payroll.netSalary)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(payroll.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetail(payroll)}
                          className="text-amber-600 hover:text-amber-900"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {payroll.status === 'REVIEW' && (
                          <button
                            onClick={() => handleApprovePayroll(payroll.payrollId)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Approve"
                            disabled={actionLoading}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {payroll.status === 'APPROVED' && (
                          <button
                            onClick={() => handleMarkAsPaid(payroll.payrollId)}
                            className="text-green-600 hover:text-green-900"
                            title="Mark as paid"
                            disabled={actionLoading}
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )}
                        {payroll.status !== 'PAID' && (
                          <button
                            onClick={() => handleRecalculate(payroll.payrollId)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Recalculate"
                            disabled={actionLoading}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Approve Button */}
      {selectedPayrollIds.length > 0 && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setShowBatchApproveModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Approve {selectedPayrollIds.length} selected payroll(s)
          </button>
        </div>
      )}

      {/* Calculate Modal */}
      {showCalculateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1300]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Calculate Payroll</h3>
              <button
                onClick={() => {
                  setShowCalculateModal(false);
                  setCalculateUserId('');
                  setCalculatePeriod('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Admin only calculates payroll for Managers. Staff payroll calculation is done by the branch Manager.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manager <span className="text-red-500">*</span>
                </label>
                <select
                  value={calculateUserId || ''}
                  onChange={(e) => setCalculateUserId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  disabled={loadingUsers}
                >
                  <option value="">Select Manager</option>
                  {managerList.map((user) => (
                    <option key={user.user_id} value={user.user_id}>
                      {user.fullname || user.email} {user.branch ? `- ${user.branch.name}` : ''}
                    </option>
                  ))}
                </select>
                {loadingUsers && (
                  <p className="mt-1 text-sm text-gray-500">Loading list...</p>
                )}
                {managerList.length === 0 && !loadingUsers && (
                  <p className="mt-1 text-sm text-gray-500">
                    No managers available
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pay Period (YYYY-MM) <span className="text-red-500">*</span>
                </label>
                <input
                  type="month"
                  value={calculatePeriod}
                  onChange={(e) => setCalculatePeriod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCalculateModal(false);
                  setCalculateUserId('');
                  setCalculatePeriod('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCalculatePayroll}
                disabled={actionLoading || !calculateUserId || !calculatePeriod || loadingUsers}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-400"
              >
                {actionLoading ? 'Processing...' : 'Calculate Payroll'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Approve Modal */}
      <ConfirmModal
        open={showBatchApproveModal}
        title="Approve Batch Payroll"
        description={`Are you sure you want to approve ${selectedPayrollIds.length} selected payroll(s)?`}
        confirmText="Approve"
        cancelText="Cancel"
        onConfirm={handleApproveBatch}
        onCancel={() => {
          setShowBatchApproveModal(false);
        }}
        loading={actionLoading}
      />
        </>
      )}

      {/* Staff Tab - Read Only */}
      {activeTab === 'staff' && (
        <div>
          {/* Filters for Staff Tab */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex-1 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Branch
                </label>
                <select
                  value={selectedBranchForStaff || ''}
                  onChange={(e) => setSelectedBranchForStaff(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch.branchId} value={branch.branchId}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pay Period (YYYY-MM)
                </label>
                <input
                  type="month"
                  value={staffPeriod}
                  onChange={(e) => setStaffPeriod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
            </div>
          </div>
          <div className="ml-4">
            <button
              onClick={() => {
                // Initialize export period and branch from current filters
                setExportPeriod(staffPeriod || '');
                setExportBranchId(selectedBranchForStaff || '');
                setShowExportModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
          </div>

          {/* Staff Payrolls Table - Read Only */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {staffLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : staffPayrolls.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                        No data
                      </td>
                    </tr>
                  ) : (
                    staffPayrolls.map((payroll) => (
                      <tr
                        key={payroll.payrollId}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleViewDetail(payroll)}
                      >
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {payroll.period}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(payroll.netSalary)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(payroll.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetail(payroll);
                            }}
                            className="text-amber-600 hover:text-amber-900"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal (dùng chung cho Manager + Staff) */}
      {showDetailModal && selectedPayroll && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1300]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Payroll Details</h3>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedPayroll(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">User ID</label>
                  <p className="text-sm text-gray-900">{selectedPayroll.userId}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Pay Period</label>
                  <p className="text-sm text-gray-900">{selectedPayroll.period}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedPayroll.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Base Salary</label>
                  <p className="text-sm text-gray-900">{formatCurrency(selectedPayroll.baseSalary)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Overtime</label>
                  <p className="text-sm text-gray-900">
                    {selectedPayroll.overtimeHours}h - {formatCurrency(selectedPayroll.overtimePay)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Total Allowances</label>
                  <p className="text-sm text-gray-900">{formatCurrency(selectedPayroll.totalAllowances)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Total Bonuses</label>
                  <p className="text-sm text-gray-900">{formatCurrency(selectedPayroll.totalBonuses)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Total Penalties</label>
                  <p className="text-sm text-gray-900">{formatCurrency(selectedPayroll.totalPenalties)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Gross Salary</label>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(selectedPayroll.grossSalary)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Social Insurance Deduction</label>
                  <p className="text-sm text-gray-900">{formatCurrency(selectedPayroll.amountInsurances)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Income Tax</label>
                  <p className="text-sm text-gray-900">{formatCurrency(selectedPayroll.amountTax)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Total Deductions</label>
                  <p className="text-sm text-gray-900">{formatCurrency(selectedPayroll.totalDeductions)}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700">Net Salary</label>
                  <p className="text-lg font-bold text-amber-600">{formatCurrency(selectedPayroll.netSalary)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Export Payroll
                </h3>
                <p className="text-sm text-slate-500">
                  {activeTab === 'manager' 
                    ? 'Export manager payrolls by period'
                    : 'Export staff payrolls by period'}
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
              {activeTab === 'manager' ? (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">
                      Pay Period (YYYY-MM) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="month"
                      value={exportPeriod}
                      onChange={(e) => setExportPeriod(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="Select period"
                    />
                    {!exportPeriod && (
                      <p className="mt-2 text-sm text-red-600">
                        Please select a period to export.
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 mb-2">
                      Additional Filters
                    </p>
                    <div className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
                      <p className="mb-1">
                        <strong>Branch:</strong> {filters.branchId 
                          ? branches.find(b => b.branchId === filters.branchId)?.name || 'All'
                          : 'All'}
                      </p>
                      <p>
                        <strong>Status:</strong> {filters.status || 'All'}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 mb-2">
                      Export Scope
                    </p>
                    <div className="space-y-2 text-sm text-slate-800">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="exportMode"
                          value="ALL_BRANCHES"
                          checked={exportMode === 'ALL_BRANCHES'}
                          onChange={() => setExportMode('ALL_BRANCHES')}
                          className="text-amber-600 border-slate-300"
                        />
                        <span>
                          All Branches
                          <span className="text-slate-500 ml-1">
                            (Each branch will be a separate sheet)
                          </span>
                        </span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="exportMode"
                          value="SELECTED_BRANCH"
                          checked={exportMode === 'SELECTED_BRANCH'}
                          onChange={() => setExportMode('SELECTED_BRANCH')}
                          className="text-amber-600 border-slate-300"
                        />
                        <span>
                          Selected Branch Only
                        </span>
                      </label>
                    </div>
                    {exportMode === 'SELECTED_BRANCH' && (
                      <div className="mt-3 ml-6">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Select Branch <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={exportBranchId || ''}
                          onChange={(e) => setExportBranchId(e.target.value ? Number(e.target.value) : '')}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        >
                          <option value="">-- Select Branch --</option>
                          {branches.map((branch) => (
                            <option key={branch.branchId} value={branch.branchId}>
                              {branch.name}
                            </option>
                          ))}
                        </select>
                        {!exportBranchId && (
                          <p className="mt-2 text-sm text-red-600">
                            Please select a branch to export.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-2">
                      Pay Period (YYYY-MM) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="month"
                      value={exportPeriod}
                      onChange={(e) => setExportPeriod(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="Select period"
                    />
                    {!exportPeriod && (
                      <p className="mt-2 text-sm text-red-600">
                        Please select a period to export.
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
                {activeTab === 'manager' 
                  ? 'The export will include all manager payrolls for the selected period, with optional branch and status filters applied.'
                  : exportMode === 'ALL_BRANCHES'
                  ? 'The export will create one sheet per branch with staff payrolls for the selected period.'
                  : 'The export will include staff payrolls for the selected branch and period.'}
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
                onClick={() => {
                  if (activeTab === 'manager') {
                    handleExportManagerPayrolls();
                  } else {
                    handleExportStaffPayrolls();
                  }
                }}
                disabled={
                  exporting ||
                  !exportPeriod ||
                  (activeTab === 'staff' && exportMode === 'SELECTED_BRANCH' && !exportBranchId)
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
    </div>
  );
};

export default AdminPayrollManagement;

