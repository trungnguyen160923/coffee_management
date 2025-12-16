import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Download, Calendar, Building2, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { payrollService, Payroll } from '../../services';
import { branchService } from '../../services';
import { Branch } from '../../types';
import { toast } from 'react-hot-toast';
import { PayrollReportsSkeleton } from '../../components/admin/skeletons';

const AdminPayrollReports: React.FC = () => {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(undefined);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [showExportModal, setShowExportModal] = useState(false);
  // OVERVIEW: 1 sheet tổng hợp tất cả chi nhánh (đang filter)
  // ALL_BRANCH_SHEETS: mỗi chi nhánh 1 sheet
  // SELECTED_BRANCHES: chỉ export những chi nhánh được chọn, mỗi chi nhánh 1 sheet
  const [exportMode, setExportMode] = useState<'OVERVIEW' | 'ALL_BRANCH_SHEETS' | 'SELECTED_BRANCHES'>('OVERVIEW');
  const [exportBranchIds, setExportBranchIds] = useState<number[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchBranches();
    const currentMonth = new Date();
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, '0');
    setSelectedPeriod(`${year}-${month}`);
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      fetchPayrolls();
    }
  }, [selectedBranchId, selectedPeriod]);

  const fetchBranches = async () => {
    try {
      const response = await branchService.getBranches();
      setBranches(response.branches || []);
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  };

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      const data = await payrollService.getPayrolls({
        branchId: selectedBranchId,
        period: selectedPeriod,
      });
      setPayrolls(data);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load payrolls');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const totalPayrolls = payrolls.length;
    const totalNetSalary = payrolls.reduce((sum, p) => sum + p.netSalary, 0);
    const totalGrossSalary = payrolls.reduce((sum, p) => sum + p.grossSalary, 0);
    const totalDeductions = payrolls.reduce((sum, p) => sum + p.totalDeductions, 0);
    const avgNetSalary = totalPayrolls > 0 ? totalNetSalary / totalPayrolls : 0;

    const byStatus = payrolls.reduce(
      (acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalPayrolls,
      totalNetSalary,
      totalGrossSalary,
      totalDeductions,
      avgNetSalary,
      byStatus,
    };
  }, [payrolls]);

  const handleExport = () => {
    if (payrolls.length === 0) {
      toast.error('No payroll data to export');
      return;
    }
    setExportMode('OVERVIEW');
    setExportBranchIds([]);
    setShowExportModal(true);
  };

  const handleConfirmExport = () => {
    try {
      setExporting(true);

      if (payrolls.length === 0) {
        toast.error('No payroll data to export with current filters');
        return;
      }

      // Group payrolls by branch
      const branchMap = new Map<
        number,
        { branchName: string; rows: Payroll[] }
      >();
      payrolls.forEach((p) => {
        if (!branchMap.has(p.branchId)) {
          branchMap.set(p.branchId, {
            branchName: p.branchName || `Branch #${p.branchId}`,
            rows: [],
          });
        }
        branchMap.get(p.branchId)!.rows.push(p);
      });

      // Determine which branches to export for branch sheets
      let branchIdsToExport: number[] = Array.from(branchMap.keys());
      if (exportMode === 'SELECTED_BRANCHES' && exportBranchIds.length > 0) {
        branchIdsToExport = branchIdsToExport.filter((id) =>
          exportBranchIds.includes(id)
        );
      }

      if (
        (exportMode === 'ALL_BRANCH_SHEETS' ||
          exportMode === 'SELECTED_BRANCHES') &&
        branchIdsToExport.length === 0
      ) {
        toast.error('No branches selected to export');
        return;
      }

      const workbook = XLSX.utils.book_new();

      // Option 1: Overview sheet (summary all branches)
      if (exportMode === 'OVERVIEW') {
        const overviewData: any[][] = [
          [
            'BranchId',
            'BranchName',
            'Period',
            'Count',
            'TotalGross',
            'TotalDeductions',
            'TotalNet',
          ],
        ];

        let totalGross = 0;
        let totalDeductions = 0;
        let totalNet = 0;

        branchMap.forEach((value, branchId) => {
          const { branchName, rows } = value;
          const count = rows.length;
          const gross = rows.reduce((sum, p) => sum + p.grossSalary, 0);
          const deductions = rows.reduce(
            (sum, p) => sum + p.totalDeductions,
            0
          );
          const net = rows.reduce((sum, p) => sum + p.netSalary, 0);

          totalGross += gross;
          totalDeductions += deductions;
          totalNet += net;

          overviewData.push([
            branchId,
            branchName,
            selectedPeriod || rows[0]?.period || '',
            count,
            gross,
            deductions,
            net,
          ]);
        });

        // Grand total row
        overviewData.push([
          '',
          'TOTAL',
          selectedPeriod || '',
          payrolls.length,
          totalGross,
          totalDeductions,
          totalNet,
        ]);

        const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
        XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');
      } else {
        // Option 2 & 3: one sheet per branch
        branchIdsToExport.forEach((branchId) => {
          const group = branchMap.get(branchId);
          if (!group) return;

          const { branchName, rows } = group;

          const header = [
            'PayrollId',
            'UserId',
            'UserName',
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
          let sheetName = branchName || `Branch_${branchId}`;
          // Excel sheet name max 31 chars, no special chars
          sheetName = sheetName.replace(/[*?:/\[\]]/g, '_').slice(0, 31);

          const ws = XLSX.utils.aoa_to_sheet(sheetData);
          XLSX.utils.book_append_sheet(workbook, ws, sheetName || `B_${branchId}`);
        });
      }

      const wbout = XLSX.write(workbook, {
        bookType: 'xlsx',
        type: 'array',
      });
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
        `admin_payroll_report_${selectedPeriod || 'all'}_${ts}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Exported payroll report successfully');
      setShowExportModal(false);
    } catch (err: any) {
      console.error('Export payroll error:', err);
      toast.error(err?.message || 'Failed to export payroll report');
    } finally {
      setExporting(false);
    }
  };

  if (loading && payrolls.length === 0) {
    return <PayrollReportsSkeleton />;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll Reports</h1>
          <p className="text-sm text-gray-600 mt-1">Statistics and payroll reports by period</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Download className="w-4 h-4" />
          Export Excel
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Branch
            </label>
            <select
              value={selectedBranchId || ''}
              onChange={(e) =>
                setSelectedBranchId(e.target.value ? Number(e.target.value) : undefined)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
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
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Payrolls</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.totalPayrolls}
              </p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Net Salary</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats.totalNetSalary)}
              </p>
            </div>
            <Building2 className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Deductions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats.totalDeductions)}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average Salary</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(stats.avgNetSalary)}
              </p>
            </div>
            <FileText className="w-8 h-8 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Draft</p>
            <p className="text-xl font-bold text-gray-900">
              {stats.byStatus.DRAFT || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Pending Review</p>
            <p className="text-xl font-bold text-gray-900">
              {stats.byStatus.REVIEW || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Approved</p>
            <p className="text-xl font-bold text-gray-900">
              {stats.byStatus.APPROVED || 0}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Paid</p>
            <p className="text-xl font-bold text-gray-900">
              {stats.byStatus.PAID || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Summary</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Pay Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total Gross
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total Deductions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total Net
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {selectedPeriod}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {stats.totalPayrolls}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatCurrency(stats.totalGrossSalary)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatCurrency(stats.totalDeductions)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-amber-600">
                  {formatCurrency(stats.totalNetSalary)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Export Payroll Reports
                </h3>
                <p className="text-sm text-slate-500">
                  Export current payroll data to CSV (can be opened in Excel)
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
                  Export mode
                </p>
                <div className="space-y-2 text-sm text-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="exportMode"
                      value="OVERVIEW"
                      checked={exportMode === 'OVERVIEW'}
                      onChange={() => setExportMode('OVERVIEW')}
                      className="text-amber-600 border-slate-300"
                    />
                    <span>
                      1. Overview - summary of all branches
                      <span className="text-slate-500 ml-1">
                        ({payrolls.length} records)
                      </span>
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="exportMode"
                      value="ALL_BRANCH_SHEETS"
                      checked={exportMode === 'ALL_BRANCH_SHEETS'}
                      onChange={() => setExportMode('ALL_BRANCH_SHEETS')}
                      className="text-amber-600 border-slate-300"
                    />
                    <span>2. One sheet per branch (all branches in current view)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="exportMode"
                      value="SELECTED_BRANCHES"
                      checked={exportMode === 'SELECTED_BRANCHES'}
                      onChange={() => setExportMode('SELECTED_BRANCHES')}
                      className="text-amber-600 border-slate-300"
                    />
                    <span>3. One sheet per selected branch</span>
                  </label>

                  {exportMode === 'SELECTED_BRANCHES' && (
                    <div className="mt-2 ml-6">
                      <p className="text-xs text-slate-500 mb-2">
                        Select branches to include. If none selected, export will fail.
                      </p>
                      <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
                        {branches.length === 0 ? (
                          <p className="text-xs text-slate-500 text-center py-2">
                            No branches available
                          </p>
                        ) : (
                          branches.map((branch) => {
                            const checked = exportBranchIds.includes(branch.branchId);
                            return (
                              <label
                                key={branch.branchId}
                                className="flex items-center gap-2 text-sm cursor-pointer px-2 py-1 rounded hover:bg-slate-50"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setExportBranchIds((prev) => {
                                      if (checked) {
                                        return [...prev, branch.branchId];
                                      }
                                      return prev.filter((id) => id !== branch.branchId);
                                    });
                                  }}
                                  className="text-amber-600 border-slate-300"
                                />
                                <span>{branch.name}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
                The export will respect current filters (branch, period, status).
                Use mode 1 for a high-level summary of all branches. Mode 2 and 3
                will include detailed sheets per branch.
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
                onClick={handleConfirmExport}
                disabled={
                  exporting ||
                  (exportMode === 'SELECTED_BRANCHES' && exportBranchIds.length === 0)
                }
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {exporting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export CSV
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

export default AdminPayrollReports;

