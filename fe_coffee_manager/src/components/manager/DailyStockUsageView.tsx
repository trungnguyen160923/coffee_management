import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { stockService, StockAdjustment, StockAdjustmentStatus, PaginatedResponse, DailyUsageSummaryResponse, DailyUsageItem } from '../../services/stockService';
import { AlertTriangle, CheckCircle2, XCircle, X, RefreshCw, Package, PlayCircle } from 'lucide-react';

const statusLabels: Record<StockAdjustmentStatus, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  COMMITTED: { label: 'Committed', color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600' },
  AUTO_COMMITTED: { label: 'Auto committed', color: 'bg-blue-100 text-blue-700' },
};

const today = new Date().toISOString().split('T')[0];

interface DailyStockUsageViewProps {
  branchId: number;
}

export const DailyStockUsageView: React.FC<DailyStockUsageViewProps> = ({ branchId }) => {
  const { user } = useAuth();
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
  const [missingEntryModal, setMissingEntryModal] = useState<{
    show: boolean;
    item: DailyUsageItem | null;
    action: 'auto-create' | 'enter' | 'skip' | null;
  }>({
    show: false,
    item: null,
    action: null,
  });
  const [enterManualModal, setEnterManualModal] = useState<{
    show: boolean;
    item: DailyUsageItem | null;
    quantity: string;
    notes: string;
  }>({
    show: false,
    item: null,
    quantity: '',
    notes: '',
  });
  const [commitPreviewModal, setCommitPreviewModal] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [autoCreating, setAutoCreating] = useState(false);
  const [commitPreviewData, setCommitPreviewData] = useState<{
    adjustment: StockAdjustment;
    currentStock: number;
    stockAfterCommit: number;
    unitName: string;
  } | null>(null);
  const [commitOnlySafe, setCommitOnlySafe] = useState(false); // Filter: chỉ commit items không có warning

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
    if (!adjustment) return;

    // Lấy current stock để preview
    try {
      const usageItem = usageSummary?.items.find(i => i.ingredientId === adjustment.ingredientId);
      const unitName = usageItem?.unitName || 'unit';
      
      // Lấy stock hiện tại từ API
      const stocks = await stockService.getStocksByBranch(branchId, 0, 1000);
      const currentStock = stocks.content.find(s => s.ingredientId === adjustment.ingredientId);
      const currentQty = currentStock?.quantity || 0;
      
      // Tính stock sau commit
      // variance = actual - system
      // Nếu variance > 0 (actual > system) → ADJUST_OUT → trừ quantity = variance
      // Nếu variance < 0 (actual < system) → ADJUST_IN → cộng quantity = |variance|
      // Công thức chung: stockAfterCommit = currentQty - variance (đúng cho cả 2 trường hợp)
      const stockAfterCommit = currentQty - adjustment.variance;
      
      setCommitPreviewData({
        adjustment,
        currentStock: currentQty,
        stockAfterCommit,
        unitName,
      });
      setCommitPreviewModal(true);
    } catch (error: any) {
      console.error('Failed to load stock info:', error);
      // Fallback to simple confirm if can't load stock
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
    }
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

  const handleEdit = (item: StockAdjustment) => {
    setEditingAdjustment(item);
    setEditQuantity(item.actualQuantity.toString());
    setEditNotes(item.notes || '');
  };

  // Tính toán preview variance khi edit
  const getPreviewVariance = (actualQty: number): { variance: number; warning: { level: 'none' | 'warning' | 'critical'; message: string } } => {
    if (!editingAdjustment) return { variance: 0, warning: { level: 'none', message: '' } };
    
    const systemQty = editingAdjustment.systemQuantity;
    const variance = actualQty - systemQty;
    const absVariance = Math.abs(variance);
    const percentVariance = systemQty > 0 ? (absVariance / systemQty) * 100 : 0;
    
    let level: 'none' | 'warning' | 'critical' = 'none';
    let message = '';
    
    if (percentVariance > 20 || absVariance > 2) {
      level = 'critical';
      message = `Large variance: ${percentVariance.toFixed(1)}% (${absVariance.toFixed(2)})`;
    } else if (percentVariance > 10 || absVariance > 1) {
      level = 'warning';
      message = `Variance detected: ${percentVariance.toFixed(1)}% (${absVariance.toFixed(2)})`;
    }
    
    return { variance, warning: { level, message } };
  };

  const handleSaveEdit = async () => {
    if (!editingAdjustment) return;
    if (!editQuantity || Number(editQuantity) < 0) {
      toast.error('Quantity must be greater than or equal to 0');
      return;
    }

    const newActualQty = Number(editQuantity);
    const preview = getPreviewVariance(newActualQty);
    
    // Yêu cầu notes nếu variance lớn
    if (preview.warning.level === 'critical' && !editNotes.trim()) {
      toast.error('Please provide notes for large variance adjustments');
      return;
    }

    // Cảnh báo nếu variance lớn nhưng vẫn cho phép save
    const confirmMessage = preview.warning.level !== 'none' 
      ? `Warning: ${preview.warning.message}. Are you sure you want to save this adjustment?`
      : `Are you sure you want to save changes for "${editingAdjustment.ingredientName || 'N/A'}"?`;

    setConfirmModal({
      show: true,
      title: preview.warning.level === 'critical' ? 'Confirm update (Large Variance)' : 'Confirm update',
      message: confirmMessage,
      onConfirm: async () => {
        try {
          await stockService.updateStockAdjustment(
            editingAdjustment.adjustmentId,
            newActualQty,
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

  // Phân loại items theo trạng thái
  const categorizedItems = useMemo(() => {
    if (!usageSummary) return { ready: [], missing: [], warning: [], critical: [], blocked: [] };
    
    const ready: DailyUsageItem[] = [];
    const missing: DailyUsageItem[] = [];
    const warning: DailyUsageItem[] = [];
    const critical: DailyUsageItem[] = [];
    const blocked: DailyUsageItem[] = [];
    
    usageSummary.items.forEach(item => {
      if (!item.hasAdjustment) {
        missing.push(item);
      } else {
        const warningLevel = getVarianceWarning(item);
        if (warningLevel.level === 'critical') {
          critical.push(item);
        } else if (warningLevel.level === 'warning') {
          warning.push(item);
        } else {
          // Check if can commit (not blocked by insufficient stock)
          if (item.adjustmentStatus === 'PENDING') {
            ready.push(item);
          }
        }
      }
    });
    
    return { ready, missing, warning, critical, blocked };
  }, [usageSummary]);

  // Xử lý missing entry
  const handleMissingEntry = (item: DailyUsageItem, action: 'auto-create' | 'enter' | 'skip') => {
    if (action === 'auto-create') {
      // Tạo adjustment với actual = system
      handleAutoCreateMissing(item);
    } else if (action === 'enter') {
      setEnterManualModal({ show: true, item, quantity: item.systemQuantity.toFixed(2), notes: '' });
    } else if (action === 'skip') {
      toast.success(`Skipped ${item.ingredientName} - will not be committed`);
    }
    setMissingEntryModal({ show: false, item: null, action: null });
  };

  const handleAutoCreateMissing = async (item: DailyUsageItem) => {
    try {
      await stockService.reconcileDailyUsage({
        branchId,
        adjustmentDate: selectedDate,
        userId: user?.user_id ? Number(user.user_id) : undefined,
        adjustedBy: user?.name || user?.fullname || 'Manager',
        commitImmediately: false,
        items: [{
          ingredientId: item.ingredientId,
          actualUsedQuantity: item.systemQuantity, // Auto-create với actual = system
          notes: 'Auto-created by manager (actual = system)',
        }],
      });
      toast.success(`Auto-created adjustment for ${item.ingredientName}`);
      loadData();
      loadUsageSummary();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Failed to auto-create adjustment');
    }
  };

  // Auto-create tất cả missing entries cùng lúc
  const handleAutoCreateAllMissing = async () => {
    const missingItems = categorizedItems.missing;
    if (missingItems.length === 0) {
      toast.error('No missing entries to create');
      return;
    }

    setConfirmModal({
      show: true,
      title: 'Auto-create all missing entries',
      message: `This will create ${missingItems.length} adjustments with actual quantity = system quantity (variance = 0). Continue?`,
      onConfirm: async () => {
        setAutoCreating(true);
        try {
          const promises = missingItems.map(item => 
            stockService.reconcileDailyUsage({
              branchId,
              adjustmentDate: selectedDate,
              userId: user?.user_id ? Number(user.user_id) : undefined,
              adjustedBy: user?.name || user?.fullname || 'Manager',
              commitImmediately: false,
              items: [{
                ingredientId: item.ingredientId,
                actualUsedQuantity: item.systemQuantity,
                notes: 'Auto-created by manager (actual = system)',
              }],
            })
          );

          await Promise.all(promises);
          toast.success(`Auto-created ${missingItems.length} adjustments`);
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
          loadData();
          loadUsageSummary();
        } catch (error: any) {
          console.error(error);
          toast.error(error?.message || 'Failed to auto-create adjustments');
          setConfirmModal({ show: false, title: '', message: '', onConfirm: () => {} });
        } finally {
          setAutoCreating(false);
        }
      },
    });
  };

  const handleEnterManualMissing = async () => {
    if (!enterManualModal.item) return;
    if (!enterManualModal.quantity || Number(enterManualModal.quantity) < 0) {
      toast.error('Quantity must be greater than or equal to 0');
      return;
    }

    try {
      await stockService.reconcileDailyUsage({
        branchId,
        adjustmentDate: selectedDate,
        userId: user?.user_id ? Number(user.user_id) : undefined,
        adjustedBy: user?.name || user?.fullname || 'Manager',
        commitImmediately: false,
        items: [{
          ingredientId: enterManualModal.item.ingredientId,
          actualUsedQuantity: Number(enterManualModal.quantity),
          notes: enterManualModal.notes || undefined,
        }],
      });
      toast.success(`Created adjustment for ${enterManualModal.item.ingredientName}`);
      setEnterManualModal({ show: false, item: null, quantity: '', notes: '' });
      loadData();
      loadUsageSummary();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Failed to create adjustment');
    }
  };

  // Smart commit all với preview
  const handleSmartCommitAll = () => {
    setCommitPreviewModal(true);
  };

  const executeSmartCommit = async () => {
    setCommitting(true);
    try {
      const missingItems = categorizedItems.missing;
      
      // 1. Auto-create missing entries với actual = system (chỉ nếu không filter)
      if (missingItems.length > 0 && !commitOnlySafe) {
        const autoCreatePromises = missingItems.map(item => 
          stockService.reconcileDailyUsage({
            branchId,
            adjustmentDate: selectedDate,
            userId: user?.user_id ? Number(user.user_id) : undefined,
            adjustedBy: user?.name || user?.fullname || 'Manager',
            commitImmediately: false,
            items: [{
              ingredientId: item.ingredientId,
              actualUsedQuantity: item.systemQuantity,
              notes: 'Auto-created by manager during commit all',
            }],
          })
        );
        await Promise.all(autoCreatePromises);
      }
      
      // 2. Reload để lấy adjustments mới tạo
      await loadData(true);
      await loadUsageSummary();
      
      // 3. Lấy lại danh sách pending sau khi reload
      const response = await stockService.getStockAdjustments({
        branchId,
        adjustmentDate: selectedDate,
        status: 'PENDING',
        page: 0,
        size: 1000, // Lấy tất cả
      });
      
      // 4. Filter adjustments nếu commitOnlySafe = true
      let adjustmentsToCommit = response.content || [];
      let skippedCount = 0;
      
      if (commitOnlySafe) {
        const originalCount = adjustmentsToCommit.length;
        adjustmentsToCommit = adjustmentsToCommit.filter(adj => {
          const usageItem = usageSummary?.items.find(i => i.ingredientId === adj.ingredientId);
          if (!usageItem) return false;
          
          const warning = getVarianceWarning({
            ingredientId: adj.ingredientId,
            ingredientName: adj.ingredientName || '',
            unitCode: usageItem.unitCode,
            unitName: usageItem.unitName,
            systemQuantity: adj.systemQuantity,
            hasAdjustment: true,
            actualQuantity: adj.actualQuantity,
            variance: adj.variance,
            adjustmentStatus: adj.status
          });
          
          // Chỉ commit nếu không có warning hoặc critical
          return warning.level === 'none';
        });
        skippedCount = originalCount - adjustmentsToCommit.length;
      }
      
      // 5. Commit filtered adjustments
      if (adjustmentsToCommit.length > 0) {
        const commitPromises = adjustmentsToCommit.map(adj => 
          stockService.commitStockAdjustment(adj.adjustmentId)
        );
        await Promise.all(commitPromises);
      }
      
      const message = `Committed ${adjustmentsToCommit.length} adjustments${
        missingItems.length > 0 && !commitOnlySafe ? ` (${missingItems.length} auto-created)` : ''
      }${skippedCount > 0 ? ` (${skippedCount} skipped due to warnings)` : ''}`;
      toast.success(message);
      setCommitPreviewModal(false);
      setCommitOnlySafe(false); // Reset filter
      loadData();
      loadUsageSummary();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Failed to commit adjustments');
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Dashboard */}
      {usageSummary && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Summary</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <div className="text-xs text-green-800 font-medium">Ready</div>
              </div>
              <div className="text-2xl font-bold text-green-700">{categorizedItems.ready.length}</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-orange-600" />
                <div className="text-xs text-orange-800 font-medium">Missing</div>
              </div>
              <div className="text-2xl font-bold text-orange-700">{categorizedItems.missing.length}</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <div className="text-xs text-yellow-800 font-medium">Warning</div>
              </div>
              <div className="text-2xl font-bold text-yellow-700">{categorizedItems.warning.length}</div>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <div className="text-xs text-red-800 font-medium">Critical</div>
              </div>
              <div className="text-2xl font-bold text-red-700">{categorizedItems.critical.length}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-gray-600" />
                <div className="text-xs text-gray-800 font-medium">Total</div>
              </div>
              <div className="text-2xl font-bold text-gray-700">{usageSummary.items.length}</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <div className="flex items-end">
            <button
              onClick={() => {
                loadData(true);
                loadUsageSummary();
              }}
              disabled={refreshing || loading}
              className="w-full rounded-lg bg-sky-500 text-white py-2 px-4 text-sm font-semibold hover:bg-sky-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Section: Ingredients used today */}
      {usageSummary && usageSummary.items.length > 0 && (
        <div className="rounded-xl bg-white border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Ingredients used today</h3>
              <p className="text-sm text-gray-500">
                System-suggested usage • {new Date(selectedDate).toLocaleDateString('en-US')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-500">
                {usageSummary.items.length} ingredients
              </div>
              {categorizedItems.missing.length > 0 && (
                <button
                  onClick={handleAutoCreateAllMissing}
                  disabled={autoCreating || committing}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {autoCreating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Package className="w-4 h-4" />
                      Auto-create All Missing ({categorizedItems.missing.length})
                    </>
                  )}
                </button>
              )}
              <button
                onClick={handleSmartCommitAll}
                disabled={committing || autoCreating || (categorizedItems.ready.length === 0 && categorizedItems.missing.length === 0)}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-green-500 text-white hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {committing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Committing...
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-4 h-4" />
                    Smart Commit All
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50/60 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">Ingredient</th>
                  <th className="px-4 py-3 text-right">System usage</th>
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
                {!loadingSummary && usageSummary.items.map((item) => {
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
                        {item.systemQuantity.toFixed(2)} {item.unitName}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.hasAdjustment ? (
                          <span className="font-semibold text-gray-900">
                            {item.actualQuantity?.toFixed(2)} {item.unitName}
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
                          <div className="flex flex-col gap-1">
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                              Not logged
                            </span>
                            <div className="flex gap-1 justify-center">
                              <button
                                onClick={() => setMissingEntryModal({ show: true, item, action: null })}
                                className="px-2 py-0.5 text-xs font-medium rounded bg-sky-500 text-white hover:bg-sky-600 transition"
                                title="Handle missing entry"
                              >
                                Action
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {usageSummary.items.some(item => !item.hasAdjustment) && (
            <div className="p-4 bg-orange-50 border-t border-orange-100">
              <p className="text-sm text-orange-700">
                <strong>Reminder:</strong> {usageSummary.items.filter(i => !i.hasAdjustment).length} ingredients have not been logged yet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Adjustment log */}
      <div className="rounded-xl bg-white border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
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
            {data?.content?.some(item => item.status === 'PENDING') && (
              <button
                onClick={handleCommitAll}
                className="px-4 py-2 text-sm font-semibold rounded-lg bg-sky-500 text-white hover:bg-sky-600 transition shadow-md"
              >
                Commit all
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50/60 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Ingredient</th>
                <th className="px-4 py-3 text-right">System</th>
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
                const warning = getVarianceWarning({
                  ingredientId: item.ingredientId,
                  ingredientName: item.ingredientName || '',
                  unitCode: '',
                  unitName: 'unit',
                  systemQuantity: item.systemQuantity,
                  hasAdjustment: true,
                  actualQuantity: item.actualQuantity,
                  variance: item.variance,
                  adjustmentStatus: item.status
                });
                
                const usageItem = usageSummary?.items.find(i => i.ingredientId === item.ingredientId);
                const unitName = usageItem?.unitName || 'unit';
                
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
                      {item.systemQuantity.toFixed(2)} {unitName}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 font-semibold">
                      {item.actualQuantity.toFixed(2)} {unitName}
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
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-500 text-white hover:bg-sky-600 transition"
                              title="Edit"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(item.adjustmentId)}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
                              title="Delete"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => handleCommit(item.adjustmentId)}
                              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-500 text-white hover:bg-green-600 transition"
                              title="Commit"
                            >
                              Commit
                            </button>
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
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 text-sm">
            <span className="text-gray-500">
              Page {data.number + 1}/{data.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={data.first}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-50"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages - 1, p + 1))}
                disabled={data.last}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingAdjustment && (() => {
        const usageItem = usageSummary?.items.find(i => i.ingredientId === editingAdjustment.ingredientId);
        const unitName = usageItem?.unitName || 'unit';
        const currentVariance = editingAdjustment.variance;
        const newActualQty = editQuantity ? Number(editQuantity) : editingAdjustment.actualQuantity;
        const preview = getPreviewVariance(newActualQty);
        const varianceChanged = Math.abs(preview.variance - currentVariance) > 0.01;
        
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    System quantity
                  </label>
                  <p className="text-sm text-gray-600">
                    {editingAdjustment.systemQuantity.toFixed(2)} {unitName}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">
                    Current variance
                  </label>
                  <p className={`text-sm font-semibold ${
                    currentVariance >= 0 ? 'text-red-600' : 'text-emerald-600'
                  }`}>
                    {currentVariance > 0 
                      ? `-${currentVariance.toFixed(2)}` 
                      : `+${Math.abs(currentVariance).toFixed(2)}`} {unitName}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Actual quantity used <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 ${
                    preview.warning.level === 'critical' 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                      : preview.warning.level === 'warning'
                      ? 'border-yellow-300 focus:border-yellow-500 focus:ring-yellow-200'
                      : 'border-gray-200 focus:border-amber-500 focus:ring-amber-200'
                  }`}
                  placeholder="Enter actual quantity"
                />
              </div>

              {/* Preview New Variance */}
              {editQuantity && varianceChanged && (
                <div className={`rounded-lg p-3 border ${
                  preview.warning.level === 'critical' 
                    ? 'bg-red-50 border-red-200' 
                    : preview.warning.level === 'warning'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-start gap-2">
                    {preview.warning.level !== 'none' && (
                      <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                        preview.warning.level === 'critical' ? 'text-red-600' : 'text-yellow-600'
                      }`} />
                    )}
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-gray-700 mb-1">New variance after save:</p>
                      <p className={`text-sm font-semibold ${
                        preview.variance >= 0 ? 'text-red-600' : 'text-emerald-600'
                      }`}>
                        {preview.variance > 0 
                          ? `-${preview.variance.toFixed(2)}` 
                          : `+${Math.abs(preview.variance).toFixed(2)}`} {unitName}
                      </p>
                      {preview.warning.level !== 'none' && (
                        <p className={`text-xs mt-1 ${
                          preview.warning.level === 'critical' ? 'text-red-700' : 'text-yellow-700'
                        }`}>
                          {preview.warning.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Notes {preview.warning.level === 'critical' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 ${
                    preview.warning.level === 'critical' && !editNotes.trim()
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-gray-200 focus:border-amber-500 focus:ring-amber-200'
                  }`}
                  placeholder={preview.warning.level === 'critical' ? 'Required for large variance adjustments' : 'Spillage, damage...'}
                />
                {preview.warning.level === 'critical' && (
                  <p className="text-xs text-red-600 mt-1">Notes are required for large variance adjustments</p>
                )}
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
                  className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg text-white transition ${
                    preview.warning.level === 'critical'
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-sky-500 hover:bg-sky-600'
                  }`}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Missing Entry Modal */}
      {missingEntryModal.show && missingEntryModal.item && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Handle Missing Entry</h3>
              <button
                onClick={() => setMissingEntryModal({ show: false, item: null, action: null })}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-orange-900 mb-2">{missingEntryModal.item.ingredientName}</p>
              <p className="text-xs text-orange-700">System usage: {missingEntryModal.item.systemQuantity.toFixed(2)} {missingEntryModal.item.unitName}</p>
              <p className="text-xs text-orange-600 mt-1">No actual usage recorded yet</p>
            </div>

            <p className="text-sm text-gray-600">Choose how to handle this missing entry:</p>

            <div className="space-y-2">
              <button
                onClick={() => handleMissingEntry(missingEntryModal.item!, 'auto-create')}
                className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-green-50 hover:border-green-300 transition"
              >
                <div className="font-semibold text-gray-900">Auto-create with system quantity</div>
                <div className="text-xs text-gray-500 mt-1">Create adjustment with actual = system (variance = 0)</div>
              </button>
              <button
                onClick={() => handleMissingEntry(missingEntryModal.item!, 'enter')}
                className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-sky-50 hover:border-sky-300 transition"
              >
                <div className="font-semibold text-gray-900">Enter manually</div>
                <div className="text-xs text-gray-500 mt-1">Enter the actual quantity used</div>
              </button>
              <button
                onClick={() => handleMissingEntry(missingEntryModal.item!, 'skip')}
                className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition"
              >
                <div className="font-semibold text-gray-900">Skip for now</div>
                <div className="text-xs text-gray-500 mt-1">Skip this item (will not be committed)</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enter Manual Missing Modal */}
      {enterManualModal.show && enterManualModal.item && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Enter Actual Usage</h3>
              <button
                onClick={() => setEnterManualModal({ show: false, item: null, quantity: '', notes: '' })}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Ingredient
              </label>
              <p className="text-sm text-gray-900 font-semibold">{enterManualModal.item.ingredientName}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                System usage
              </label>
              <p className="text-sm text-gray-600">
                {enterManualModal.item.systemQuantity.toFixed(2)} {enterManualModal.item.unitName}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Actual quantity used <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={enterManualModal.quantity}
                onChange={(e) => setEnterManualModal({ ...enterManualModal, quantity: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-amber-500 focus:ring-amber-200"
                placeholder="Enter actual quantity"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Notes (optional)
              </label>
              <textarea
                value={enterManualModal.notes}
                onChange={(e) => setEnterManualModal({ ...enterManualModal, notes: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-amber-500 focus:ring-amber-200"
                placeholder="Spillage, damage..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEnterManualModal({ show: false, item: null, quantity: '', notes: '' })}
                className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleEnterManualMissing}
                className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg bg-sky-500 text-white hover:bg-sky-600 transition"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Commit Preview Modal - Single Adjustment */}
      {commitPreviewModal && commitPreviewData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Commit Preview</h3>
              <button
                onClick={() => {
                  setCommitPreviewModal(false);
                  setCommitPreviewData(null);
                }}
                className="text-gray-400 hover:text-gray-600"
                disabled={committing}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Ingredient
              </label>
              <p className="text-sm text-gray-900 font-semibold">
                {commitPreviewData.adjustment.ingredientName || `Ingredient #${commitPreviewData.adjustment.ingredientId}`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  System quantity
                </label>
                <p className="text-sm text-gray-600">
                  {commitPreviewData.adjustment.systemQuantity.toFixed(2)} {commitPreviewData.unitName}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Actual quantity
                </label>
                <p className="text-sm text-gray-900 font-semibold">
                  {commitPreviewData.adjustment.actualQuantity.toFixed(2)} {commitPreviewData.unitName}
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Variance
              </label>
              <p className={`text-sm font-semibold ${
                commitPreviewData.adjustment.variance >= 0 ? 'text-red-600' : 'text-emerald-600'
              }`}>
                {commitPreviewData.adjustment.variance > 0 
                  ? `-${commitPreviewData.adjustment.variance.toFixed(2)}` 
                  : `+${Math.abs(commitPreviewData.adjustment.variance).toFixed(2)}`} {commitPreviewData.unitName}
              </p>
            </div>

            <div className={`rounded-lg p-4 border ${
              commitPreviewData.stockAfterCommit < 0
                ? 'bg-red-50 border-red-200'
                : commitPreviewData.stockAfterCommit < 10
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <p className="text-sm font-semibold text-gray-900 mb-2">Stock Impact:</p>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Current stock:</span>
                  <span className="font-semibold">{commitPreviewData.currentStock.toFixed(2)} {commitPreviewData.unitName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">After commit:</span>
                  <span className={`font-bold ${
                    commitPreviewData.stockAfterCommit < 0
                      ? 'text-red-600'
                      : commitPreviewData.stockAfterCommit < 10
                      ? 'text-yellow-600'
                      : 'text-emerald-600'
                  }`}>
                    {commitPreviewData.stockAfterCommit.toFixed(2)} {commitPreviewData.unitName}
                  </span>
                </div>
              </div>
              {commitPreviewData.stockAfterCommit < 0 && (
                <div className="mt-2 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                  <p className="text-xs text-red-700">
                    <strong>Warning:</strong> Stock will be negative after commit. This may cause issues with future orders.
                  </p>
                </div>
              )}
              {commitPreviewData.stockAfterCommit >= 0 && commitPreviewData.stockAfterCommit < 10 && (
                <div className="mt-2 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <p className="text-xs text-yellow-700">
                    <strong>Note:</strong> Stock will be low after commit.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setCommitPreviewModal(false);
                  setCommitPreviewData(null);
                }}
                className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
                disabled={committing}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    setCommitting(true);
                    await stockService.commitStockAdjustment(commitPreviewData.adjustment.adjustmentId);
                    toast.success('Adjustment committed');
                    setCommitPreviewModal(false);
                    setCommitPreviewData(null);
                    loadData();
                    loadUsageSummary();
                  } catch (error: any) {
                    console.error(error);
                    toast.error(error?.message || 'Failed to commit adjustment');
                  } finally {
                    setCommitting(false);
                  }
                }}
                className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg text-white transition disabled:opacity-50 ${
                  commitPreviewData.stockAfterCommit < 0
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-sky-500 hover:bg-sky-600'
                }`}
                disabled={committing}
              >
                {committing ? 'Committing...' : commitPreviewData.stockAfterCommit < 0 ? 'Commit Anyway' : 'Commit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Commit Preview Modal - Smart Commit All */}
      {commitPreviewModal && !commitPreviewData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Smart Commit All - Preview</h3>
              <button
                onClick={() => setCommitPreviewModal(false)}
                className="text-gray-400 hover:text-gray-600"
                disabled={committing}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-900 mb-2">What will happen:</p>
                <ul className="text-xs text-blue-700 space-y-1 list-disc list-inside">
                  <li>Will commit: <strong>{categorizedItems.ready.length}</strong> pending adjustments</li>
                  {categorizedItems.missing.length > 0 && (
                    <li>Will auto-create: <strong>{categorizedItems.missing.length}</strong> adjustments (actual = system)</li>
                  )}
                  {categorizedItems.warning.length > 0 && (
                    <li className="text-yellow-700">⚠️ <strong>{categorizedItems.warning.length}</strong> items with variance warnings</li>
                  )}
                  {categorizedItems.critical.length > 0 && (
                    <li className="text-red-700">🚨 <strong>{categorizedItems.critical.length}</strong> items with critical variance</li>
                  )}
                </ul>
              </div>

              {categorizedItems.warning.length > 0 || categorizedItems.critical.length > 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 mb-2">
                    <strong>Note:</strong> Some items have variance warnings. Please review them before committing.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={commitOnlySafe}
                      onChange={(e) => setCommitOnlySafe(e.target.checked)}
                      className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span className="text-xs text-yellow-800">
                      Only commit items without warnings (will skip {categorizedItems.warning.length + categorizedItems.critical.length} items)
                    </span>
                  </label>
                </div>
              ) : null}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setCommitPreviewModal(false);
                  setCommitOnlySafe(false);
                }}
                className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition"
                disabled={committing}
              >
                Cancel
              </button>
              <button
                onClick={executeSmartCommit}
                disabled={committing}
                className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg bg-green-500 text-white hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {committing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Committing...
                  </>
                ) : (
                  'Confirm & Commit'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
      )}
    </div>
  );
};

