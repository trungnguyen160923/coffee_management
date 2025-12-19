import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useStaffPermissions } from '../../hooks/useStaffPermissions';
import { stockService, StockAdjustment, StockAdjustmentStatus, PaginatedResponse, DailyUsageSummaryResponse, DailyUsageItem, StockAdjustmentEntry } from '../../services/stockService';
import { DailyUsageForm } from '../../components/stock/DailyUsageForm';
import { AlertTriangle, CheckCircle2, XCircle, X, RefreshCw, ChevronDown, ChevronRight, Info } from 'lucide-react';
import { StockUsageSkeleton } from '../../components/staff/skeletons';
import { useActiveShift } from '../../hooks/useActiveShift';
import { ActiveShiftBanner } from '../../components/staff/ActiveShiftBanner';
import ModalPortal from '../../components/common/ModalPortal';

const statusLabels: Record<StockAdjustmentStatus, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  COMMITTED: { label: 'Committed', color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600' },
  AUTO_COMMITTED: { label: 'Auto committed', color: 'bg-blue-100 text-blue-700' },
};

const today = new Date().toISOString().split('T')[0];

export const StaffStockUsage = () => {
  const { user } = useAuth();
  const staffPermissions = useStaffPermissions();
  const { hasActiveShift, loading: shiftLoading } = useActiveShift();
  const branchId = useMemo(() => {
    if (user?.branch?.branchId) return user.branch.branchId;
    if (user?.branchId) return Number(user.branchId);
    return undefined;
  }, [user]);

  // Chỉ Manager/Admin mới có quyền commit
  const canCommit = useMemo(() => {
    const roleData = (user as any)?.roles ?? user?.role;
    if (Array.isArray(roleData)) {
      return roleData.some((r: string) => r === 'MANAGER' || r === 'ADMIN');
    }
    return roleData === 'MANAGER' || roleData === 'ADMIN';
  }, [user]);

  const [selectedDate, setSelectedDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState<'ALL' | StockAdjustmentStatus>('PENDING');
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [data, setData] = useState<PaginatedResponse<StockAdjustment> | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [usageSummary, setUsageSummary] = useState<DailyUsageSummaryResponse | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [editingAdjustment, setEditingAdjustment] = useState<StockAdjustment | null>(null);
  const [editQuantity, setEditQuantity] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [adjustmentEntries, setAdjustmentEntries] = useState<StockAdjustmentEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [entryPendingDelete, setEntryPendingDelete] = useState<StockAdjustmentEntry | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<StockAdjustmentEntry | null>(null);
  const [editEntryQuantity, setEditEntryQuantity] = useState('');
  const [editEntryNotes, setEditEntryNotes] = useState('');

  // Lấy đơn vị hiển thị cho nguyên liệu (ưu tiên code, fallback sang name)
  const getUnitLabelForIngredient = (ingredientId?: number) => {
    if (!ingredientId || !usageSummary) return 'unit';
    const item = usageSummary.items.find((i) => i.ingredientId === ingredientId);
    return item?.unitCode || item?.unitName || 'unit';
  };
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    show: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Toggle hiển thị từng bảng ở "Ingredients used today"
  const [showCommittedUsage, setShowCommittedUsage] = useState(true);
  const [showOtherUsage, setShowOtherUsage] = useState(true);

  // Tách items theo trạng thái committed vs còn lại
  const committedUsageItems = useMemo(
    () =>
      usageSummary?.items.filter(
        (item) =>
          item.hasAdjustment &&
          (item.adjustmentStatus === 'COMMITTED' || item.adjustmentStatus === 'AUTO_COMMITTED'),
      ) ?? [],
    [usageSummary],
  );

  const otherUsageItems = useMemo(
    () =>
      usageSummary?.items.filter(
        (item) =>
          !(
            item.hasAdjustment &&
            (item.adjustmentStatus === 'COMMITTED' || item.adjustmentStatus === 'AUTO_COMMITTED')
          ),
      ) ?? [],
    [usageSummary],
  );

  // Debug logs for Ingredients used today lists
  useEffect(() => {
    if (!usageSummary) return;
    // eslint-disable-next-line no-console
    console.log('[StaffStockUsage] committedUsageItems:', committedUsageItems);
    // eslint-disable-next-line no-console
    console.log('[StaffStockUsage] otherUsageItems:', otherUsageItems);
  }, [usageSummary, committedUsageItems, otherUsageItems]);

  const loadData = async (isRefresh = false) => {
    if (!branchId) return;
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const response = await stockService.getStockAdjustments({
        branchId,
        adjustmentDate: selectedDate,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        page,
        size,
      });
      setData(response);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Unable to load adjustments');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const loadUsageSummary = async () => {
    if (!branchId) return;
    try {
      setLoadingSummary(true);
      const summary = await stockService.getDailyUsageSummary(branchId, selectedDate);
      setUsageSummary(summary);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Unable to load usage summary');
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    loadData();
    loadUsageSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, selectedDate, statusFilter, page]);

  const handleCommit = async (adjustmentId: number) => {
    const adjustment = data?.content?.find(item => item.adjustmentId === adjustmentId);
    setConfirmModal({
      show: true,
      title: 'Confirm commit',
      message: `Are you sure you want to commit the adjustment for "${adjustment?.ingredientName || 'N/A'}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await stockService.commitStockAdjustment(adjustmentId);
          toast.success('Adjustment committed');
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
          loadData();
          loadUsageSummary();
        } catch (error: any) {
          console.error(error);
          toast.error(error?.message || 'Failed to commit adjustment');
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
        }
      },
    });
  };

  const handleCommitAll = () => {
    const pendingAdjustments = data?.content?.filter(item => item.status === 'PENDING') || [];
    if (pendingAdjustments.length === 0) {
      toast.error('No pending adjustments to commit');
      return;
    }

    setConfirmModal({
      show: true,
      title: 'Confirm commit all',
      message: `Are you sure you want to commit all ${pendingAdjustments.length} pending adjustments? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const promises = pendingAdjustments.map(adj => 
            stockService.commitStockAdjustment(adj.adjustmentId)
          );
          await Promise.all(promises);
          toast.success(`Committed ${pendingAdjustments.length} adjustments`);
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
          loadData();
          loadUsageSummary();
        } catch (error: any) {
          console.error(error);
          toast.error(error?.message || 'Failed to commit adjustments');
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
        }
      },
    });
  };

  const handleEdit = async (item: StockAdjustment) => {
    setEditingAdjustment(item);
    setEditQuantity(item.actualQuantity.toString());
    setEditNotes(item.notes || '');
    setLoadingEntries(true);
    try {
      const entries = await stockService.getStockAdjustmentEntries(item.adjustmentId);
      setAdjustmentEntries(entries);
      setSelectedEntry(null);
      setEditEntryQuantity('');
      setEditEntryNotes('');
    } catch (error: any) {
      console.error('Failed to load adjustment entries', error);
      toast.error(error?.message || 'Failed to load history for this adjustment');
      setAdjustmentEntries([]);
    } finally {
      setLoadingEntries(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingAdjustment) return;

    // Với logic mới, quantity thực được tính từ entries, ở đây chỉ cho phép sửa notes

    setConfirmModal({
      show: true,
      title: 'Confirm update',
      message: `Are you sure you want to save notes for "${editingAdjustment.ingredientName || 'N/A'}"?`,
      onConfirm: async () => {
        try {
          // actualQuantity gửi lên chỉ để thỏa validation, BE sẽ tự tính lại từ entries
          const totalActual =
            adjustmentEntries.reduce((sum, e) => sum + e.entryQuantity, 0);
          await stockService.updateStockAdjustment(
            editingAdjustment.adjustmentId,
            totalActual,
            editNotes || undefined
          );
          toast.success('Adjustment updated');
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
          setEditingAdjustment(null);
          loadData();
          loadUsageSummary();
        } catch (error: any) {
          console.error(error);
          toast.error(error?.message || 'Failed to update adjustment');
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
        }
      },
    });
  };

  const handleDelete = async (adjustmentId: number) => {
    const adjustment = data?.content?.find(item => item.adjustmentId === adjustmentId);
    setConfirmModal({
      show: true,
      title: 'Confirm deletion',
      message: `Are you sure you want to delete the adjustment for "${adjustment?.ingredientName || 'N/A'}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await stockService.deleteStockAdjustment(adjustmentId);
          toast.success('Adjustment deleted');
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
          loadData();
          loadUsageSummary();
        } catch (error: any) {
          console.error(error);
          toast.error(error?.message || 'Failed to delete adjustment');
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
        }
      },
    });
  };

  const handleDeleteEntry = (entry: StockAdjustmentEntry) => {
    setEntryPendingDelete(entry);
    const by = entry.recordedBy || `User #${entry.userId ?? 'N/A'}`;
    const time = new Date(entry.entryTime).toLocaleTimeString();
    const qty = entry.entryQuantity.toFixed(2);
    const notes = entry.notes || '—';

    setConfirmModal({
      show: true,
      title: 'Delete entry',
      message: `You created an entry of ${qty} at ${time} by "${by}" with notes "${notes}". Do you really want to delete this entry?`,
      onConfirm: async () => {
        if (!entryPendingDelete) return;
        try {
          await stockService.deleteStockAdjustmentEntry(entryPendingDelete.entryId);
          toast.success('Entry deleted');
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
          // Reload entries & main data
          if (editingAdjustment) {
            const refreshed = await stockService.getStockAdjustmentEntries(editingAdjustment.adjustmentId);
            setAdjustmentEntries(refreshed);
            setSelectedEntry(null);
            setEditEntryQuantity('');
            setEditEntryNotes('');
          }
          await loadData();
          await loadUsageSummary();
        } catch (error: any) {
          console.error('Failed to delete entry', error);
          toast.error(error?.message || 'Failed to delete entry');
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
        } finally {
          setEntryPendingDelete(null);
        }
      },
    });
  };


  // Tính toán cảnh báo variance lớn
  const getVarianceWarning = (item: DailyUsageItem): { level: 'none' | 'warning' | 'critical'; message: string } => {
    if (!item.hasAdjustment || item.variance === undefined) return { level: 'none', message: '' };
    
    const absVariance = Math.abs(item.variance);
    const systemQty = item.systemQuantity;
    
    // Cảnh báo nếu variance > 10% hoặc > 1 đơn vị
    const percentVariance = systemQty > 0 ? (absVariance / systemQty) * 100 : 0;
    
    if (percentVariance > 20 || absVariance > 2) {
      return { 
        level: 'critical', 
        message: `Large variance: ${percentVariance.toFixed(1)}% (${absVariance.toFixed(2)} ${item.unitName})` 
      };
    } else if (percentVariance > 10 || absVariance > 1) {
      return { 
        level: 'warning', 
        message: `Variance detected: ${percentVariance.toFixed(1)}% (${absVariance.toFixed(2)} ${item.unitName})` 
      };
    }
    
    return { level: 'none', message: '' };
  };

  if (!branchId) {
    return (
      <div className="p-6">
        <div className="rounded-2xl bg-white border border-rose-100 p-6 text-center">
          <p className="text-lg font-semibold text-rose-700">Branch not found</p>
          <p className="text-sm text-rose-500 mt-2">Please contact your manager to assign a branch to this account.</p>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return <StockUsageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <ActiveShiftBanner />
      <div className={`max-w-7xl mx-auto px-2 py-4 sm:px-4 lg:px-4 space-y-6 ${!shiftLoading && !hasActiveShift ? 'pt-16' : ''}`}>
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-8 pt-6 pb-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Daily Stock Usage</h1>
              <p className="text-sm text-slate-500">
                Log and cross-check stock consumption at the end of the shift.
              </p>
            </div>
          </div>

      <div className={`grid gap-6 p-6 lg:p-8 pt-4 ${(staffPermissions.canViewRecipes || staffPermissions.loading) ? 'lg:grid-cols-2' : 'lg:grid-cols-1'}`}>
        {(staffPermissions.canViewRecipes || staffPermissions.loading) && (
          <div className="rounded-2xl bg-white shadow-sm border border-amber-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-amber-700 uppercase tracking-wide">Quick usage log</p>
                <h2 className="text-xl font-bold text-gray-900">Daily Stock Count</h2>
                <p className="text-sm text-gray-500">Enter the actual quantity used during the shift</p>
              </div>
            </div>
            <DailyUsageForm
              allowDateChange
              defaultDate={selectedDate}
              onSuccess={() => {
                loadData(false);
                loadUsageSummary();
              }}
            />
          </div>
        )}

        <div className="rounded-2xl bg-white shadow-sm border border-amber-100 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Filters</h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Reconciliation date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setPage(0);
                }}
                max={today}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-amber-500 focus:ring-amber-200"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as 'ALL' | StockAdjustmentStatus);
                  setPage(0);
                }}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-amber-500 focus:ring-amber-200"
              >
                <option value="ALL">All</option>
                <option value="PENDING">Pending</option>
                <option value="COMMITTED">Committed</option>
                <option value="AUTO_COMMITTED">Auto committed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <button
              onClick={() => {
                loadData();
                loadUsageSummary();
              }}
              className="w-full rounded-full bg-sky-500 text-white py-2 font-semibold shadow-lg shadow-sky-500/30 hover:bg-sky-600 hover:shadow-xl transition"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Section: Ingredients used today */}
      {usageSummary && usageSummary.items.length > 0 && (
        <div className={`mt-6 ${committedUsageItems.length > 0 && otherUsageItems.length > 0 ? 'grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch' : 'space-y-4'}`}>
          {/* Bảng: Đã committed */}
          {committedUsageItems.length > 0 && (
            <div className="rounded-2xl bg-white border border-emerald-100 shadow-sm h-full flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-neutral-100">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Ingredients used today – Committed</h3>
                  <p className="text-sm text-gray-500">
                    Finalized usage • {new Date(selectedDate).toLocaleDateString('en-US')}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    {committedUsageItems.length} ingredients
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowCommittedUsage((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900"
                  >
                    {showCommittedUsage ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    {showCommittedUsage ? 'Collapse' : 'Expand'}
                  </button>
                </div>
              </div>

              {showCommittedUsage && (
                <div className="overflow-x-auto overflow-y-hidden">
                  <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead className="bg-gray-50/60 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-3 text-left">Ingredient</th>
                        <th className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 group relative">
                            <span>System usage</span>
                            <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                            <div className="absolute right-0 top-full mt-2 w-64 p-2 bg-white text-gray-800 text-xs rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                              Total ingredient usage calculated from all committed orders for the entire day. This represents the complete system-tracked consumption.
                            </div>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-right">Actual usage</th>
                        <th className="px-4 py-3 text-right">Variance</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {loadingSummary && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-500">
                            Loading data...
                          </td>
                        </tr>
                      )}
                      {!loadingSummary && committedUsageItems.map((item) => {
                        const warning = getVarianceWarning(item);
                        const isMissing = !item.hasAdjustment;
                        return (
                          <tr
                            key={item.ingredientId}
                            className={`hover:bg-emerald-50/40 transition ${
                              warning.level === 'critical' ? 'bg-red-50/50' :
                              warning.level === 'warning' ? 'bg-yellow-50/50' : ''
                            }`}
                          >
                            <td className="px-4 py-3 font-medium text-gray-900">
                              <div className="flex items-center gap-2">
                                {isMissing && <XCircle className="h-4 w-4 text-orange-500" />}
                                {item.hasAdjustment && warning.level === 'none' && (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                )}
                                {warning.level === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                                {warning.level === 'critical' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                                <span>{item.ingredientName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600">
                              {item.systemQuantity.toFixed(2)} {item.unitCode || item.unitName}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {item.hasAdjustment ? (
                                <span className="font-semibold text-gray-900">
                                  {item.actualQuantity?.toFixed(2)} {item.unitCode || item.unitName}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">No entry</span>
                              )}
                            </td>
                            <td
                              className={`px-4 py-3 text-right font-semibold ${
                                item.hasAdjustment && item.variance !== undefined
                                  ? item.variance > 0
                                    ? 'text-red-600'
                                    : 'text-emerald-600'
                                  : 'text-gray-400'
                              }`}
                            >
                              {item.hasAdjustment && item.variance !== undefined ? (
                                item.variance > 0
                                  ? `-${item.variance.toFixed(2)}`
                                  : `+${Math.abs(item.variance).toFixed(2)}`
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                {item.adjustmentStatus === 'COMMITTED' ? 'Committed' : 'Auto committed'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Bảng: Các trạng thái còn lại (Pending / Not logged / khác) */}
          {otherUsageItems.length > 0 && (
            <div className="rounded-2xl bg-white border border-amber-100 shadow-sm h-full flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-neutral-100">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Ingredients used today – Pending / Not logged</h3>
                  <p className="text-sm text-gray-500">
                    Items needing review • {new Date(selectedDate).toLocaleDateString('en-US')}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    {otherUsageItems.length} ingredients
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowOtherUsage((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900"
                  >
                    {showOtherUsage ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    {showOtherUsage ? 'Collapse' : 'Expand'}
                  </button>
                </div>
              </div>

              {showOtherUsage && (
                <div className="overflow-x-auto overflow-y-hidden">
                  <table className="min-w-full divide-y divide-gray-100 text-sm">
                    <thead className="bg-gray-50/60 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-3 text-left">Ingredient</th>
                        <th className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5 group relative">
                            <span>System usage</span>
                            <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                            <div className="absolute right-0 top-full mt-2 w-64 p-2 bg-white text-gray-800 text-xs rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                              Total ingredient usage calculated from all committed orders for the entire day. This represents the complete system-tracked consumption.
                            </div>
                          </div>
                        </th>
                        <th className="px-4 py-3 text-right">Actual usage</th>
                        <th className="px-4 py-3 text-right">Variance</th>
                        <th className="px-4 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {loadingSummary && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-500">
                            Loading data...
                          </td>
                        </tr>
                      )}
                      {!loadingSummary && otherUsageItems.map((item) => {
                  const warning = getVarianceWarning(item);
                  const isMissing = !item.hasAdjustment;
                  return (
                    <tr 
                      key={item.ingredientId} 
                      className={`hover:bg-amber-50/40 transition ${
                        warning.level === 'critical' ? 'bg-red-50/50' : 
                        warning.level === 'warning' ? 'bg-yellow-50/50' : 
                        isMissing ? 'bg-orange-50/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {isMissing && <XCircle className="h-4 w-4 text-orange-500" />}
                          {item.hasAdjustment && warning.level === 'none' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                          {warning.level === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                          {warning.level === 'critical' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                          <span>{item.ingredientName}</span>
                        </div>
                        {isMissing && (
                          <div className="text-xs text-orange-600 mt-1 font-medium">
                            ⚠️ Not recorded yet
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {item.systemQuantity.toFixed(2)} {item.unitCode || item.unitName}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.hasAdjustment ? (
                          <span className="font-semibold text-gray-900">
                            {item.actualQuantity?.toFixed(2)} {item.unitCode || item.unitName}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">No entry</span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${
                        item.hasAdjustment && item.variance !== undefined
                          ? item.variance > 0 ? 'text-red-600' : 'text-emerald-600'
                          : 'text-gray-400'
                      }`}>
                        {item.hasAdjustment && item.variance !== undefined ? (
                          item.variance > 0 ? `-${item.variance.toFixed(2)}` : `+${Math.abs(item.variance).toFixed(2)}`
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.hasAdjustment ? (
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            item.adjustmentStatus === 'COMMITTED' || item.adjustmentStatus === 'AUTO_COMMITTED'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {item.adjustmentStatus === 'COMMITTED' ? 'Committed' : 
                             item.adjustmentStatus === 'AUTO_COMMITTED' ? 'Auto committed' : 'Pending'}
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                            Not logged
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
              )}

              {otherUsageItems.some(item => !item.hasAdjustment) && (
                <div className="p-4 bg-orange-50 border-t border-orange-100">
                  <p className="text-sm text-orange-700">
                    <strong>Reminder:</strong> {otherUsageItems.filter(i => !i.hasAdjustment).length} ingredients have not been logged yet. 
                    Please use the form above to add the missing entries.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

        <div className="rounded-2xl bg-white border border-neutral-100 shadow-sm mt-6">
        <div className="flex items-center justify-between p-5 border-b border-neutral-100">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Adjustment log</h3>
            <p className="text-sm text-gray-500">
              Branch #{branchId} • {new Date(selectedDate).toLocaleDateString('en-US')}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500">
              {data ? `${data.totalElements} adjustments` : 'Loading...'}
            </div>
            <button
              onClick={() => {
                loadData(true);
                loadUsageSummary();
              }}
              disabled={refreshing || loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            {canCommit && data?.content?.some(item => item.status === 'PENDING') && (
              <button
                onClick={handleCommitAll}
                className="px-4 py-2 text-sm font-semibold rounded-full bg-sky-500 text-white hover:bg-sky-600 transition shadow-md"
              >
                Commit all
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-visible min-h-[220px]">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50/60 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Ingredient</th>
                <th className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5 group relative">
                    <span>System</span>
                    <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                    <div className="absolute right-0 top-full mt-2 w-64 p-2 bg-white text-gray-800 text-xs rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none">
                      System usage calculated from the last committed adjustment to end of day. This shows only the portion that hasn't been reconciled yet.
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 text-right">Actual</th>
                <th className="px-4 py-3 text-right">Variance</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-left">Notes</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="py-8">
                    <div className="flex justify-center">
                      <div className="w-8 h-8 border-4 border-slate-200 border-t-sky-600 rounded-full animate-spin"></div>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && data?.content?.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No adjustments for the selected date.
                  </td>
                </tr>
              )}
              {data?.content?.map((item) => {
                // Tính warning để highlight row
                const warning = getVarianceWarning({
                  ingredientId: item.ingredientId,
                  ingredientName: item.ingredientName || '',
                  unitCode: '',
                  unitName: 'unit', // Fallback if summary not available
                  systemQuantity: item.systemQuantity,
                  hasAdjustment: true,
                  actualQuantity: item.actualQuantity,
                  variance: item.variance,
                  adjustmentStatus: item.status
                });
                
                // Tìm unitCode/unitName từ usageSummary nếu có
                const usageItem = usageSummary?.items.find(i => i.ingredientId === item.ingredientId);
                const unitLabel = usageItem?.unitCode || usageItem?.unitName || 'unit';
                
                return (
                  <tr 
                    key={item.adjustmentId} 
                    className={`hover:bg-amber-50/40 transition ${
                      warning.level === 'critical' ? 'bg-red-50/50 border-l-4 border-red-400' : 
                      warning.level === 'warning' ? 'bg-yellow-50/50 border-l-4 border-yellow-400' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        {warning.level === 'critical' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                        {warning.level === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                        <span>{item.ingredientName || `Ingredient #${item.ingredientId}`}</span>
                      </div>
                      <div className="text-xs text-gray-400">#{item.adjustmentId}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {item.systemQuantity.toFixed(2)} {unitLabel}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 font-semibold">
                      {item.actualQuantity.toFixed(2)} {unitLabel}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${
                      item.variance >= 0 ? 'text-red-600' : 'text-emerald-600'
                    }`}>
                      <div className="flex flex-col items-end">
                        <span className={warning.level === 'critical' ? 'font-bold text-base' : ''}>
                          {item.variance > 0 
                            ? `-${item.variance.toFixed(2)}` 
                            : `+${Math.abs(item.variance).toFixed(2)}`}
                        </span>
                        {warning.level !== 'none' && (
                          <span className={`text-xs mt-0.5 ${
                            warning.level === 'critical' ? 'text-red-600 font-semibold' : 'text-yellow-600'
                          }`}>
                            {warning.message}
                          </span>
                        )}
                      </div>
                    </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusLabels[item.status].color}`}>
                      {statusLabels[item.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">{item.notes || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {item.status === 'PENDING' ? (
                        <>
                          <button
                            onClick={() => handleEdit(item)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-full bg-sky-500 text-white hover:bg-sky-600 transition"
                            title="Edit"
                          >
                            Edit
                          </button>
                          {canCommit && (
                            <button
                              onClick={() => handleCommit(item.adjustmentId)}
                              className="px-3 py-1.5 text-xs font-semibold rounded-full bg-sky-500 text-white hover:bg-sky-600 transition"
                              title="Commit"
                            >
                              Commit
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </div>
                  </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-neutral-100 text-sm">
                <span className="text-gray-500">
                  Page {data.number + 1}/{data.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={data.first}
                className="px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages - 1, p + 1))}
                disabled={data.last}
                className="px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Modal sửa adjustment */}
      {editingAdjustment && (
        <ModalPortal>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Edit adjustment</h3>
              <button
                onClick={() => setEditingAdjustment(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Ingredient
              </label>
              <p className="text-sm text-gray-900 font-semibold">
                {editingAdjustment.ingredientName || `Ingredient #${editingAdjustment.ingredientId}`}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    System quantity deducted
                  </label>
                  <p className="text-sm text-gray-600">
                    {editingAdjustment.systemQuantity.toFixed(2)}{' '}
                    {getUnitLabelForIngredient(editingAdjustment.ingredientId)}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Total actual quantity used
                  </label>
                  <p className="text-sm text-gray-900 font-semibold">
                    {adjustmentEntries.reduce((sum, e) => sum + e.entryQuantity, 0).toFixed(2)}{' '}
                    {getUnitLabelForIngredient(editingAdjustment.ingredientId)}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    This total is calculated from all history entries below. To change it, add or delete entries in the history.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Notes
                  </label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-amber-500 focus:ring-amber-200"
                    placeholder="Spillage, damage..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-800">History</h4>
                  {loadingEntries && (
                    <span className="text-xs text-gray-400">Loading...</span>
                  )}
                </div>
                {adjustmentEntries.length === 0 && !loadingEntries ? (
                  <p className="text-xs text-gray-500">
                    No individual entries recorded for this adjustment.
                  </p>
                ) : (
                  <>
                    <div className="max-h-40 overflow-y-auto border border-gray-100 rounded-lg">
                      <table className="min-w-full text-xs">
                        <thead className="bg-gray-50 text-gray-500">
                          <tr>
                            <th className="px-2 py-1 text-left">By</th>
                            <th className="px-2 py-1 text-right">Qty</th>
                            <th className="px-2 py-1 text-left">Notes</th>
                            <th className="px-2 py-1 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                        {adjustmentEntries.map((entry) => {
                          const isMine =
                            entry.userId &&
                            user &&
                            (user.user_id ? Number(user.user_id) : undefined) === entry.userId;
                          return (
                            <tr
                              key={entry.entryId}
                              className={`border-t border-gray-100 ${
                                isMine && selectedEntry?.entryId === entry.entryId ? 'bg-amber-50' : ''
                              } ${isMine ? 'cursor-pointer hover:bg-amber-50/60' : ''}`}
                              onClick={() => {
                                if (!isMine) return;
                                setSelectedEntry(entry);
                                setEditEntryQuantity(entry.entryQuantity.toString());
                                setEditEntryNotes(entry.notes || '');
                              }}
                            >
                              <td className="px-2 py-1 align-top">
                                <div className="text-gray-800 font-medium">
                                  {entry.recordedBy || `User #${entry.userId ?? 'N/A'}`}
                                </div>
                                <div className="text-[10px] text-gray-400">
                                  {new Date(entry.entryTime).toLocaleTimeString()}
                                  {isMine && <span className="ml-1 text-emerald-600 font-semibold">(you)</span>}
                                </div>
                              </td>
                              <td className="px-2 py-1 text-right align-top text-gray-700">
                                {entry.entryQuantity.toFixed(2)}{' '}
                                {getUnitLabelForIngredient(entry.ingredientId)}
                              </td>
                              <td className="px-2 py-1 text-left align-top text-gray-600">
                                {entry.notes || '—'}
                              </td>
                              <td className="px-2 py-1 text-center align-top">
                                {isMine ? (
                                  <button
                                    onClick={() => handleDeleteEntry(entry)}
                                    className="px-2 py-1 text-[11px] font-semibold rounded-full bg-red-50 text-red-600 hover:bg-red-100 transition"
                                  >
                                    Delete
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-gray-300">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        </tbody>
                      </table>
                    </div>

                    {selectedEntry && (
                      <div className="mt-3 p-3 border border-amber-100 rounded-lg bg-amber-50/40">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-xs font-semibold text-amber-800">
                            Edit entry ({selectedEntry.entryQuantity.toFixed(2)} → new value)
                          </h5>
                          <button
                            className="text-[11px] text-gray-400 hover:text-gray-600"
                            onClick={() => {
                              setSelectedEntry(null);
                              setEditEntryQuantity('');
                              setEditEntryNotes('');
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          <div>
                            <label className="text-[11px] font-medium text-gray-600 block mb-1">
                              Quantity
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editEntryQuantity}
                              onChange={(e) => setEditEntryQuantity(e.target.value)}
                              className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:border-amber-500 focus:ring-amber-200"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-gray-600 block mb-1">
                              Notes
                            </label>
                            <textarea
                              rows={2}
                              value={editEntryNotes}
                              onChange={(e) => setEditEntryNotes(e.target.value)}
                              className="w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs focus:border-amber-500 focus:ring-amber-200"
                            />
                          </div>
                          <div className="flex justify-end gap-2 mt-1">
                            <button
                              type="button"
                              className="px-3 py-1.5 text-[11px] font-semibold rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50"
                              onClick={() => {
                                setSelectedEntry(null);
                                setEditEntryQuantity('');
                                setEditEntryNotes('');
                              }}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="px-3 py-1.5 text-[11px] font-semibold rounded-full bg-sky-500 text-white hover:bg-sky-600"
                              onClick={async () => {
                                if (!selectedEntry) return;
                                const qty = Number(editEntryQuantity);
                                if (Number.isNaN(qty) || qty < 0) {
                                  toast.error('Quantity must be greater than or equal to 0');
                                  return;
                                }
                                try {
                                  await stockService.updateStockAdjustmentEntry(
                                    selectedEntry.entryId,
                                    qty,
                                    editEntryNotes || undefined
                                  );
                                  toast.success('Entry updated');
                                  if (editingAdjustment) {
                                    const refreshed = await stockService.getStockAdjustmentEntries(
                                      editingAdjustment.adjustmentId
                                    );
                                    setAdjustmentEntries(refreshed);
                                  }
                                  await loadData();
                                  await loadUsageSummary();
                                  setSelectedEntry(null);
                                  setEditEntryQuantity('');
                                  setEditEntryNotes('');
                                } catch (error: any) {
                                  console.error('Failed to update entry', error);
                                  toast.error(error?.message || 'Failed to update entry');
                                }
                              }}
                            >
                              Save entry
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditingAdjustment(null)}
                className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg bg-sky-500 text-white hover:bg-sky-600 transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Confirm Modal */}
      {confirmModal.show && (
        <ModalPortal>
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">{confirmModal.title}</h3>
              <button
                onClick={() => setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} })}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-sm text-gray-600">{confirmModal.message}</p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} })}
                className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg bg-sky-500 text-white hover:bg-sky-600 transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
      </div>
    </div>
  );
};

export default StaffStockUsage;

