import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Pencil, Trash2, X, User, Calendar, Eye, 
  Gift, AlertTriangle, HandCoins, TrendingUp, TrendingDown,
  ArrowUpDown, Wallet, Scale, Download, Search, Filter,
  ArrowLeft, CheckCircle, History
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { bonusService, penaltyService, allowanceService, staffService, shiftService, managerService } from '../../services';
import apiClient from '../../config/api';
import { payrollTemplateService } from '../../services';
import { Bonus, Penalty, Allowance, BonusType, PenaltyType, AllowanceType } from '../../types';
import { BonusTemplate, PenaltyConfig, AllowanceTemplate } from '../../services/payrollTemplateService';
import { StaffWithUserDto } from '../../types';
import { Shift } from '../../services/shiftService';
import ConfirmModal from '../../components/common/modal/ConfirmModal';
import { RewardsPenaltiesManagementSkeleton, QuickRewardsPenaltiesSkeleton } from '../../components/manager/skeletons';

type TransactionType = 'all' | 'bonus' | 'penalty' | 'allowance';
type ExportMode = 'ALL' | 'BY_STAFF' | 'BY_TYPE';

interface UnifiedTransaction {
  id: string;
  type: 'bonus' | 'penalty' | 'allowance';
  date: string;
  userId: number;
  branchId: number;
  amount: number;
  description: string;
  period: string;
  status: string;
  createdBy: number;
  shiftId?: number | null;
  incidentDate?: string | null;
  // Type-specific fields
  bonusType?: BonusType;
  penaltyType?: PenaltyType;
  allowanceType?: AllowanceType;
  // Original data
  originalData: Bonus | Penalty | Allowance;
}

const ManagerBonusPenaltyAllowanceManagement: React.FC = () => {
  const { managerBranch } = useAuth();
  
  // Data state
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [staffList, setStaffList] = useState<StaffWithUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickTab, setQuickTab] = useState<'bonus' | 'penalty' | 'allowance'>('bonus');
  const [selectedQuickStaffIds, setSelectedQuickStaffIds] = useState<number[]>([]);
  const [shiftMap, setShiftMap] = useState<Map<number, Shift>>(new Map());
  const [creatorNameMap, setCreatorNameMap] = useState<Map<number, string>>(new Map());
  
  // Filter state
  const [filterType, setFilterType] = useState<TransactionType>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusModalTx, setStatusModalTx] = useState<UnifiedTransaction | null>(null);
  const [statusModalAction, setStatusModalAction] = useState<'approve' | 'reject' | null>(null);
  const [createType, setCreateType] = useState<'bonus' | 'penalty' | 'allowance'>('bonus');
  const [selectedItem, setSelectedItem] = useState<UnifiedTransaction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Bulk action modals
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteItems, setBulkDeleteItems] = useState<string[]>([]);
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
  const [bulkRejectItems, setBulkRejectItems] = useState<string[]>([]);
  const [bulkRejectNotes, setBulkRejectNotes] = useState<string>('');
  
  // Form state
  const [formUserIds, setFormUserIds] = useState<number[]>([]); // Changed to array for multiple selection
  const [formPeriod, setFormPeriod] = useState<string>('');
  const [formType, setFormType] = useState<string>('');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formShiftId, setFormShiftId] = useState<number | ''>('');
  const [formIncidentDate, setFormIncidentDate] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE' | 'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  
  // Shifts state (for penalty form)
  const [staffShifts, setStaffShifts] = useState<Shift[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [bonusTemplates, setBonusTemplates] = useState<BonusTemplate[]>([]);
  const [allowanceTemplates, setAllowanceTemplates] = useState<AllowanceTemplate[]>([]);
  const [penaltyConfigs, setPenaltyConfigs] = useState<PenaltyConfig[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Selection state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportMode, setExportMode] = useState<ExportMode>('ALL');
  const [exportStaffId, setExportStaffId] = useState<number | ''>('');
  const [exportType, setExportType] = useState<'bonus' | 'penalty' | 'allowance' | ''>('');
  const [exporting, setExporting] = useState(false);

  // Initialize date filters to current month
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const firstDay = `${year}-${month}-01`;
    const lastDay = `${year}-${month}-${new Date(year, now.getMonth() + 1, 0).getDate()}`;
    setFilterDateFrom(firstDay);
    setFilterDateTo(lastDay);
  }, []);

  useEffect(() => {
    if (managerBranch?.branchId) {
      fetchData();
      fetchStaff();
    }
  }, [managerBranch]);

  // Load templates for mapping sourceTemplateId -> name
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const [bonusTs, allowanceTs] = await Promise.all([
          payrollTemplateService.getBonusTemplatesForManager(),
          payrollTemplateService.getAllowanceTemplatesForManager(),
        ]);
        setBonusTemplates(bonusTs || []);
        setAllowanceTemplates(allowanceTs || []);
      } catch (err) {
        console.error('Failed to load templates for mapping sourceTemplateId', err);
      }
    };
    loadTemplates();
  }, []);

  // Load all templates when entering Quick page
  useEffect(() => {
    if (showQuickAdd) {
      const loadQuickTemplates = async () => {
        try {
          setLoadingTemplates(true);
          const [bonusTs, allowanceTs, penaltyCs] = await Promise.all([
            payrollTemplateService.getBonusTemplatesForManager(),
            payrollTemplateService.getAllowanceTemplatesForManager(),
            payrollTemplateService.getPenaltyConfigsForManager(),
          ]);
          setBonusTemplates(bonusTs || []);
          setAllowanceTemplates(allowanceTs || []);
          setPenaltyConfigs(penaltyCs || []);
        } catch (err) {
          console.error('Failed to load templates for Quick page', err);
          toast.error('Failed to load templates');
        } finally {
          setLoadingTemplates(false);
        }
      };
      loadQuickTemplates();
    }
  }, [showQuickAdd]);


  // Load shifts when user and period selected (for penalty)
  // Note: For multiple users, we'll use the first selected user for shift loading
  useEffect(() => {
    if (createType === 'penalty' && formUserIds.length > 0 && formPeriod) {
      fetchStaffShifts(formUserIds[0], formPeriod);
    } else {
      setStaffShifts([]);
      setFormShiftId('');
    }
  }, [formUserIds, formPeriod, createType]);

  const fetchData = async () => {
    if (!managerBranch?.branchId) return;
    try {
      setLoading(true);
      const branchId = managerBranch.branchId;
      
      const [bonusData, penaltyData, allowanceData] = await Promise.all([
        bonusService.getBonuses({ branchId }),
        penaltyService.getPenalties({ branchId }),
        allowanceService.getAllowances({ branchId }),
      ]);
      
      setBonuses(bonusData || []);
      setPenalties(penaltyData || []);
      setAllowances(allowanceData || []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    if (!managerBranch?.branchId) return;
    try {
      setLoadingStaff(true);
      const staffs = await staffService.getStaffsWithUserInfoByBranch(managerBranch.branchId);
      setStaffList(staffs || []);
    } catch (err: any) {
      console.error('Error fetching staff:', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  const fetchStaffShifts = async (userId: number, period: string) => {
    try {
      setLoadingShifts(true);
      const shifts = await shiftService.getShiftsByStaffAndPeriod(userId, period);
      setStaffShifts(shifts || []);
    } catch (err: any) {
      console.error('Error fetching shifts:', err);
      setStaffShifts([]);
    } finally {
      setLoadingShifts(false);
    }
  };

  const getCurrentMonthPeriod = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  // Combine all transactions into unified format
  const unifiedTransactions = useMemo<UnifiedTransaction[]>(() => {
    const transactions: UnifiedTransaction[] = [];
    
    bonuses.forEach(bonus => {
      transactions.push({
        id: `bonus-${bonus.bonusId}`,
        type: 'bonus',
        date: bonus.createAt,
        userId: bonus.userId,
        branchId: bonus.branchId,
        amount: bonus.amount,
        description: bonus.description,
        period: bonus.period,
        status: bonus.status,
        createdBy: bonus.createdBy,
        bonusType: bonus.bonusType,
        shiftId: bonus.shiftId,
        originalData: bonus,
      });
    });
    
    penalties.forEach(penalty => {
      transactions.push({
        id: `penalty-${penalty.penaltyId}`,
        type: 'penalty',
        date: penalty.createAt,
        userId: penalty.userId,
        branchId: penalty.branchId,
        amount: penalty.amount,
        description: penalty.description,
        period: penalty.period,
        status: penalty.status,
        createdBy: penalty.createdBy,
        shiftId: penalty.shiftId,
        incidentDate: penalty.incidentDate,
        penaltyType: penalty.penaltyType,
        originalData: penalty,
      });
    });
    
    allowances.forEach(allowance => {
      transactions.push({
        id: `allowance-${allowance.allowanceId}`,
        type: 'allowance',
        date: allowance.createAt,
        userId: allowance.userId,
        branchId: allowance.branchId,
        amount: allowance.amount,
        description: allowance.description,
        period: allowance.period,
        status: allowance.status,
        createdBy: allowance.createdBy,
        allowanceType: allowance.allowanceType,
        originalData: allowance,
      });
    });
    
    // Sort: PENDING status first, then by date (newest first)
    return transactions.sort((a, b) => {
      // Priority: PENDING status comes first
      const aIsPending = a.status === 'PENDING';
      const bIsPending = b.status === 'PENDING';
      
      if (aIsPending && !bIsPending) return -1; // a comes first
      if (!aIsPending && bIsPending) return 1;  // b comes first
      
      // If both have same pending status, sort by date (newest first)
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [bonuses, penalties, allowances]);

  // Fetch shift details for transactions (to show shift date/time)
  useEffect(() => {
    const shiftIds = Array.from(
      new Set(unifiedTransactions.map((tx) => tx.shiftId).filter((id): id is number => !!id))
    );
    const missingIds = shiftIds.filter((id) => !shiftMap.has(id));
    if (missingIds.length === 0) return;

    const load = async () => {
      try {
        const results = await Promise.all(
          missingIds.map((id) =>
            shiftService.getById(id).then((shift) => ({ id, shift })).catch(() => null)
          )
        );
        setShiftMap((prev) => {
          const next = new Map(prev);
          results.forEach((item) => {
            if (item?.shift) next.set(item.id, item.shift);
          });
          return next;
        });
      } catch (err) {
        console.error('Failed to load shift info for transactions', err);
      }
    };

    load();
  }, [unifiedTransactions, shiftMap]);

  // Fetch creator names (try user, fallback staff/manager), ignore errors per id
  useEffect(() => {
    const existingIds = new Set<number>();
    staffList.forEach((s) => existingIds.add(s.userId));
    creatorNameMap.forEach((_, k) => existingIds.add(k));

    const creatorIds = Array.from(
      new Set(unifiedTransactions.map((tx) => tx.createdBy).filter((id): id is number => !!id))
    ).filter((id) => !existingIds.has(id));

    if (creatorIds.length === 0) return;

    const loadCreators = async () => {
      const results = await Promise.all(
        creatorIds.map(async (id) => {
          // Prefer generic auth-service user to avoid 500/403 from manager/staff endpoints
          try {
            const res = await apiClient.get<{ code: number; result?: { fullname?: string; email?: string } }>(`/api/auth-service/users/${id}`);
            const name = res?.result?.fullname || res?.result?.email || `User #${id}`;
            return { id, name };
          } catch (_e) {
            // As a fallback, silently try staff profile
            try {
              const u = await staffService.getStaffProfile(id);
              return { id, name: u.fullname || u.email || `User #${id}` };
            } catch (_e2) {
              // Last fallback: manager profile (may require permission)
              try {
                const mgr = await managerService.getManagerProfile(id);
                if (mgr?.fullname || mgr?.email) {
                  return { id, name: mgr.fullname || mgr.email || `User #${id}` };
                }
              } catch (_e3) {
                // ignore
              }
              return null;
            }
          }
        })
      );
      setCreatorNameMap((prev) => {
        const next = new Map(prev);
        results.forEach((item) => {
          if (item?.name) next.set(item.id, item.name);
        });
        return next;
      });
    };

    loadCreators();
  }, [unifiedTransactions, staffList, creatorNameMap]);

  // Ensure shift info loaded for the shift selected in form (bonus or penalty edit)
  useEffect(() => {
    const sid = (formShiftId as number | '') || selectedItem?.shiftId;
    if (!sid || typeof sid !== 'number' || shiftMap.has(sid)) return;
    shiftService.getById(sid).then((shift) => {
      if (shift) {
        setShiftMap((prev) => {
          const next = new Map(prev);
          next.set(sid, shift);
          return next;
        });
      }
    }).catch(() => {});
  }, [formShiftId, selectedItem, shiftMap]);

  // Fetch shift details for transactions (to show shift date/time)
  useEffect(() => {
    const shiftIds = Array.from(
      new Set(unifiedTransactions.map((tx) => tx.shiftId).filter((id): id is number => !!id))
    );
    const missingIds = shiftIds.filter((id) => !shiftMap.has(id));
    if (missingIds.length === 0) return;

    const load = async () => {
      try {
        const results = await Promise.all(
          missingIds.map((id) =>
            shiftService.getById(id).then((shift) => ({ id, shift })).catch(() => null)
          )
        );
        setShiftMap((prev) => {
          const next = new Map(prev);
          results.forEach((item) => {
            if (item?.shift) next.set(item.id, item.shift);
          });
          return next;
        });
      } catch (err) {
        console.error('Failed to load shift info for transactions', err);
      }
    };

    load();
  }, [unifiedTransactions, shiftMap]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
    setSelectedItems(new Set());
  }, [filterType, filterStatus, filterDateFrom, filterDateTo, searchQuery]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return unifiedTransactions.filter(tx => {
      // Type filter
      if (filterType !== 'all' && tx.type !== filterType) return false;

      // Status filter
      if (filterStatus !== 'all' && tx.status !== filterStatus) return false;
      
      // Date filter
      if (filterDateFrom) {
        const txDate = new Date(tx.date);
        const fromDate = new Date(filterDateFrom);
        if (txDate < fromDate) return false;
      }
      if (filterDateTo) {
        const txDate = new Date(tx.date);
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        if (txDate > toDate) return false;
      }
      
      // Search filter
      if (searchQuery) {
        const staff = staffList.find(s => s.userId === tx.userId);
        const searchLower = searchQuery.toLowerCase();
        const staffName = staff?.fullname?.toLowerCase() || '';
        const description = tx.description?.toLowerCase() || '';
        if (!staffName.includes(searchLower) && !description.includes(searchLower)) {
          return false;
        }
      }
      
      return true;
    });
  }, [unifiedTransactions, filterType, filterStatus, filterDateFrom, filterDateTo, searchQuery, staffList]);

  // Paginated transactions
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredTransactions.length / pageSize) || 1),
    [filteredTransactions.length, pageSize]
  );

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(paginatedTransactions.map(tx => tx.id));
      setSelectedItems(allIds);
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedItems(newSelected);
  };

  const isAllSelected = paginatedTransactions.length > 0 && 
    paginatedTransactions.every(tx => selectedItems.has(tx.id));
  const isIndeterminate = paginatedTransactions.some(tx => selectedItems.has(tx.id)) && !isAllSelected;

  // Calculate KPIs
  const kpis = useMemo(() => {
    const currentMonth = getCurrentMonthPeriod();
    const currentMonthTxs = unifiedTransactions.filter(tx => tx.period === currentMonth);
    
    // Calculate last month period
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthPeriod = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
    const lastMonthTxs = unifiedTransactions.filter(tx => tx.period === lastMonthPeriod);
    
    // Current month totals
    const totalBonus = currentMonthTxs
      .filter(tx => tx.type === 'bonus' && tx.status === 'APPROVED')
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const totalAllowance = currentMonthTxs
      .filter(tx => tx.type === 'allowance' && tx.status === 'ACTIVE')
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const totalPenalty = currentMonthTxs
      .filter(tx => tx.type === 'penalty' && tx.status === 'APPROVED')
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    // Last month totals
    const lastMonthBonus = lastMonthTxs
      .filter(tx => tx.type === 'bonus' && tx.status === 'APPROVED')
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const lastMonthAllowance = lastMonthTxs
      .filter(tx => tx.type === 'allowance' && tx.status === 'ACTIVE')
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const lastMonthPenalty = lastMonthTxs
      .filter(tx => tx.type === 'penalty' && tx.status === 'APPROVED')
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    // Calculate percentage changes
    const calculatePercentageChange = (current: number, last: number): number => {
      if (last === 0) return current > 0 ? 100 : 0;
      return ((current - last) / last) * 100;
    };
    
    const bonusChange = calculatePercentageChange(totalBonus, lastMonthBonus);
    const allowanceChange = calculatePercentageChange(totalAllowance, lastMonthAllowance);
    const penaltyChange = calculatePercentageChange(totalPenalty, lastMonthPenalty);
    
    const totalTransactions = unifiedTransactions.length;
    const todayTransactions = unifiedTransactions.filter(tx => {
      const txDate = new Date(tx.date);
      const today = new Date();
      return txDate.toDateString() === today.toDateString();
    }).length;
    
    // Average net salary
    const currentMonthTotalAmount = totalBonus + totalAllowance - totalPenalty;
    const lastMonthTotalAmount = lastMonthBonus + lastMonthAllowance - lastMonthPenalty;
    const averageNetSalary = currentMonthTotalAmount / Math.max(currentMonthTxs.length, 1);
    const lastMonthAverageNetSalary = lastMonthTotalAmount / Math.max(lastMonthTxs.length, 1);
    const averageNetSalaryChange = calculatePercentageChange(averageNetSalary, lastMonthAverageNetSalary);
    
    const totalAmount = totalBonus + totalAllowance - totalPenalty;
    const ratio = totalAmount > 0 
      ? {
          bonus: Math.round((totalBonus / totalAmount) * 100),
          penalty: Math.round((totalPenalty / totalAmount) * 100),
          allowance: Math.round((totalAllowance / totalAmount) * 100),
        }
      : { bonus: 0, penalty: 0, allowance: 0 };
    
    return {
      totalBonus,
      totalAllowance,
      totalPenalty,
      totalTransactions,
      todayTransactions,
      averageNetSalary,
      ratio,
      bonusChange,
      allowanceChange,
      penaltyChange,
      averageNetSalaryChange,
    };
  }, [unifiedTransactions]);

  const handleCreate = (type: 'bonus' | 'penalty' | 'allowance') => {
    setCreateType(type);
    setFormUserIds([]);
    setFormPeriod(getCurrentMonthPeriod());
    setFormType('');
    setFormAmount('');
    setFormDescription('');
    setFormShiftId('');
    setFormIncidentDate('');
    setFormStatus(type === 'allowance' ? 'ACTIVE' : 'PENDING');
    setShowCreateModal(true);
  };

  const handleEdit = (tx: UnifiedTransaction) => {
    setSelectedItem(tx);
    setCreateType(tx.type);
    setFormUserIds([tx.userId]); // Single user for edit mode
    setFormPeriod(tx.period);
    setFormAmount(tx.amount);
    setFormDescription(tx.description);
    setFormStatus(tx.status as any);
    
    if (tx.type === 'bonus') {
      setFormType(tx.bonusType || '');
      setFormShiftId(tx.shiftId || '');
    } else if (tx.type === 'penalty') {
      setFormType(tx.penaltyType || '');
      setFormShiftId(tx.shiftId || '');
      setFormIncidentDate(tx.incidentDate || '');
    } else {
      setFormType(tx.allowanceType || '');
    }
    
    setShowEditModal(true);
  };

  const handleView = (tx: UnifiedTransaction) => {
    setSelectedItem(tx);
    setShowViewModal(true);
  };

  const handleApproveTransaction = async (tx: UnifiedTransaction) => {
    try {
      setActionLoading(true);

      if (tx.type === 'bonus') {
        const bonus = tx.originalData as Bonus;
        const updated = await bonusService.approveBonus(bonus.bonusId);
        setBonuses((prev) =>
          prev.map((b) => (b.bonusId === updated.bonusId ? updated : b))
        );
        toast.success('Bonus approved');
      } else if (tx.type === 'penalty') {
        const penalty = tx.originalData as Penalty;
        const updated = await penaltyService.approvePenalty(penalty.penaltyId);
        setPenalties((prev) =>
          prev.map((p) => (p.penaltyId === updated.penaltyId ? updated : p))
        );
        toast.success('Penalty approved');
      } else {
        // Allowance currently has no approve flow
        toast.error('Allowance does not support approval flow');
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.response?.message || err?.message || 'Failed to approve transaction';
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkApprove = async () => {
    const itemsToApprove = Array.from(selectedItems)
      .map(id => unifiedTransactions.find(t => t.id === id))
      .filter((tx): tx is UnifiedTransaction => 
        tx !== undefined && tx.status === 'PENDING' && (tx.type === 'bonus' || tx.type === 'penalty')
      );

    if (itemsToApprove.length === 0) {
      toast.error('No pending bonus/penalty items selected');
      return;
    }

    try {
      setActionLoading(true);
      const promises = itemsToApprove.map(tx => handleApproveTransaction(tx));
      await Promise.all(promises);
      toast.success(`Successfully approved ${itemsToApprove.length} item(s)`);
      setSelectedItems(new Set());
    } catch (error: any) {
      console.error('Error approving items:', error);
      toast.error(error.response?.data?.message || 'Failed to approve some items');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkReject = async () => {
    const itemsToReject = Array.from(bulkRejectItems)
      .map(id => unifiedTransactions.find(t => t.id === id))
      .filter((tx): tx is UnifiedTransaction => 
        tx !== undefined && tx.status === 'PENDING' && (tx.type === 'bonus' || tx.type === 'penalty')
      );

    if (itemsToReject.length === 0) {
      toast.error('No pending bonus/penalty items selected');
      return;
    }

    try {
      setActionLoading(true);
      const promises = itemsToReject.map(tx => handleRejectTransaction(tx, bulkRejectNotes));
      await Promise.all(promises);
      toast.success(`Successfully rejected ${itemsToReject.length} item(s)`);
      setSelectedItems(new Set());
      setShowBulkRejectModal(false);
      setBulkRejectNotes('');
    } catch (error: any) {
      console.error('Error rejecting items:', error);
      toast.error(error.response?.data?.message || 'Failed to reject some items');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    const itemsToDelete = Array.from(bulkDeleteItems)
      .map(id => unifiedTransactions.find(t => t.id === id))
      .filter((tx): tx is UnifiedTransaction => tx !== undefined);

    if (itemsToDelete.length === 0) {
      toast.error('No items selected');
      return;
    }

    try {
      setActionLoading(true);
      const promises = itemsToDelete.map(async (tx) => {
        try {
          if (tx.type === 'bonus') {
            await bonusService.deleteBonus(Number(tx.id.split('-')[1]));
          } else if (tx.type === 'penalty') {
            await penaltyService.deletePenalty(Number(tx.id.split('-')[1]));
          } else if (tx.type === 'allowance') {
            await allowanceService.deleteAllowance(Number(tx.id.split('-')[1]));
          }
        } catch (err: any) {
          console.error(`Error deleting ${tx.id}:`, err);
          throw err;
        }
      });
      
      await Promise.all(promises);
      toast.success(`Successfully deleted ${itemsToDelete.length} item(s)`);
      setSelectedItems(new Set());
      setShowBulkDeleteModal(false);
      await fetchData();
    } catch (error: any) {
      console.error('Error deleting items:', error);
      toast.error(error.response?.data?.message || 'Failed to delete some items');
    } finally {
      setActionLoading(false);
    }
  };

  // Export to XLSX (Excel)
  const handleExport = async () => {
    try {
      setExporting(true);

      // Bắt đầu từ danh sách đã filter trên UI
      let rows = filteredTransactions;

      if (exportMode === 'BY_STAFF' && exportStaffId) {
        rows = rows.filter((tx) => tx.userId === Number(exportStaffId));
      }

      if (exportMode === 'BY_TYPE' && exportType) {
        rows = rows.filter((tx) => tx.type === exportType);
      }

      if (rows.length === 0) {
        toast.error('Không có dữ liệu để export với bộ lọc hiện tại');
        return;
      }

      const header = [
        'Date',
        'Employee',
        'UserId',
        'Type',
        'Period',
        'Amount',
        'Status',
        'Description',
        'CreatedBy',
        'BranchId',
      ];

      const data = rows.map((tx) => {
        const staff = staffList.find((s) => s.userId === tx.userId);
        const employeeName =
          staff?.fullname || staff?.email || `User #${tx.userId}`;

        return [
          tx.date,
          employeeName,
          tx.userId,
          tx.type.toUpperCase(),
          tx.period,
          tx.amount,
          tx.status,
          (tx.description || '').replace(/\r?\n/g, ' '),
          tx.createdBy,
          tx.branchId,
        ];
      });

      const sheetData = [header, ...data];
      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Rewards_Penalties');

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
        `rewards_penalties_${managerBranch?.name || 'branch'}_${ts}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Đã xuất ${rows.length} dòng báo cáo`);
      setShowExportModal(false);
    } catch (err: any) {
      console.error('Export error:', err);
      toast.error(err?.message || 'Xuất báo cáo thất bại');
    } finally {
      setExporting(false);
    }
  };

  const handleRejectTransaction = async (tx: UnifiedTransaction, notes?: string) => {
    try {
      setActionLoading(true);

      if (tx.type === 'bonus') {
        const bonus = tx.originalData as Bonus;
        const updated = await bonusService.rejectBonus(bonus.bonusId, notes || '');
        setBonuses((prev) =>
          prev.map((b) => (b.bonusId === updated.bonusId ? updated : b))
        );
        toast.success('Bonus rejected');
      } else if (tx.type === 'penalty') {
        const penalty = tx.originalData as Penalty;
        const updated = await penaltyService.rejectPenalty(penalty.penaltyId, notes || '');
        setPenalties((prev) =>
          prev.map((p) => (p.penaltyId === updated.penaltyId ? updated : p))
        );
        toast.success('Penalty rejected');
      } else {
        toast.error('Allowance does not support rejection flow');
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.response?.message || err?.message || 'Failed to reject transaction';
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSave = async () => {
    if (formUserIds.length === 0 || !formPeriod || !formType || !formAmount) {
      toast.error('Please fill in all required fields and select at least one employee');
      return;
    }

    try {
      setActionLoading(true);
      
      if (selectedItem) {
        // Update - only single user for edit mode
        const userId = formUserIds[0];
        if (createType === 'bonus') {
          const bonus = selectedItem.originalData as Bonus;
          const updated = await bonusService.updateBonus(bonus.bonusId, {
            userId: bonus.userId,
            period: bonus.period,
            bonusType: formType as BonusType,
            amount: Number(formAmount),
            description: formDescription,
            shiftId: formShiftId ? Number(formShiftId) : undefined,
          });
          setBonuses((prev) =>
            prev.map((b) => (b.bonusId === updated.bonusId ? updated : b))
          );
          toast.success('Bonus updated successfully');
        } else if (createType === 'penalty') {
          const penalty = selectedItem.originalData as Penalty;
          const updated = await penaltyService.updatePenalty(penalty.penaltyId, {
            userId: penalty.userId,
            period: penalty.period,
            penaltyType: formType as PenaltyType,
            amount: Number(formAmount),
            description: formDescription,
            shiftId: formShiftId ? Number(formShiftId) : undefined,
            incidentDate: formIncidentDate || undefined,
            reasonCode: penalty.reasonCode,
          });
          setPenalties((prev) =>
            prev.map((p) => (p.penaltyId === updated.penaltyId ? updated : p))
          );
          toast.success('Penalty updated successfully');
        } else {
          await allowanceService.updateAllowance(
            (selectedItem.originalData as Allowance).allowanceId,
            {
              userId,
              period: formPeriod,
              allowanceType: formType as AllowanceType,
              amount: Number(formAmount),
              description: formDescription,
            }
          );
          toast.success('Allowance updated successfully');
        }
      } else {
        // Create - multiple users
        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        for (const userId of formUserIds) {
          try {
            if (createType === 'bonus') {
              await bonusService.createBonus({
                userId,
                period: formPeriod,
                bonusType: formType as BonusType,
                amount: Number(formAmount),
                description: formDescription,
              });
              successCount++;
            } else if (createType === 'penalty') {
              await penaltyService.createPenalty({
                userId,
                period: formPeriod,
                penaltyType: formType as PenaltyType,
                amount: Number(formAmount),
                description: formDescription,
                shiftId: formShiftId ? Number(formShiftId) : null,
                incidentDate: formIncidentDate || null,
              });
              successCount++;
            } else {
              await allowanceService.createAllowance({
                userId,
                period: formPeriod,
                allowanceType: formType as AllowanceType,
                amount: Number(formAmount),
                description: formDescription,
              });
              successCount++;
            }
          } catch (err: any) {
            errorCount++;
            const errorMessage = err?.message || 
                                err?.response?.message || 
                                err?.response?.result?.message ||
                                'Unknown error';
            errors.push(`User ${userId}: ${errorMessage}`);
            console.error(`Error creating ${createType} for user ${userId}:`, err);
          }
        }

        if (successCount > 0) {
          toast.success(`Successfully created ${successCount} ${createType}${successCount > 1 ? 'es' : ''}`);
        }
        if (errorCount > 0) {
          const errorMsg = errors.length <= 3 
            ? errors.join('; ') 
            : `${errors[0]} and ${errorCount - 1} more error(s)`;
          toast.error(`Failed to create ${errorCount} ${createType}${errorCount > 1 ? 's' : ''}. ${errorMsg}`, {
            duration: 6000,
          });
        }
      }
      
      setShowCreateModal(false);
      setShowEditModal(false);
      setSelectedItem(null);
      fetchData();
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.response?.message || err?.message || 'Operation failed';
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;

    try {
      setActionLoading(true);
      
      if (selectedItem.type === 'bonus') {
        await bonusService.deleteBonus((selectedItem.originalData as Bonus).bonusId);
        toast.success('Bonus deleted successfully');
      } else if (selectedItem.type === 'penalty') {
        await penaltyService.deletePenalty((selectedItem.originalData as Penalty).penaltyId);
        toast.success('Penalty deleted successfully');
      } else {
        await allowanceService.deleteAllowance((selectedItem.originalData as Allowance).allowanceId);
        toast.success('Allowance deleted successfully');
      }
      
      setShowDeleteModal(false);
      setSelectedItem(null);
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5); // HH:mm
  };

  const getTypeLabel = (tx: UnifiedTransaction) => {
    if (tx.type === 'bonus') {
      const labels: Record<BonusType, string> = {
        PERFORMANCE: 'Performance',
        ATTENDANCE: 'Attendance',
        SPECIAL: 'Special',
        HOLIDAY: 'Holiday',
        OTHER: 'Other',
      };
      return labels[tx.bonusType!] || tx.bonusType;
    } else if (tx.type === 'penalty') {
      const labels: Record<PenaltyType, string> = {
        NO_SHOW: 'No Show',
        LATE: 'Late',
        EARLY_LEAVE: 'Early Leave',
        MISTAKE: 'Mistake',
        VIOLATION: 'Violation',
        OTHER: 'Other',
      };
      return labels[tx.penaltyType!] || tx.penaltyType;
    } else {
      const labels: Record<AllowanceType, string> = {
        TRANSPORT: 'Transport',
        MEAL: 'Meal',
        PHONE: 'Phone',
        HOUSING: 'Housing',
        OTHER: 'Other',
      };
      return labels[tx.allowanceType!] || tx.allowanceType;
    }
  };

  const getTypeBadge = (tx: UnifiedTransaction) => {
    if (tx.type === 'bonus') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <Gift className="w-3 h-3" />
          Bonus
        </span>
      );
    } else if (tx.type === 'penalty') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertTriangle className="w-3 h-3" />
          Penalty
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          <HandCoins className="w-3 h-3" />
          Allowance
        </span>
      );
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      PENDING: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      APPROVED: { label: 'Approved', className: 'bg-green-100 text-green-800' },
      REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-800' },
      ACTIVE: { label: 'Active', className: 'bg-green-100 text-green-800' },
      INACTIVE: { label: 'Inactive', className: 'bg-gray-100 text-gray-800' },
    };
    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const getCreatorName = (userId: number) => {
    const staff = staffList.find(s => s.userId === userId);
    if (staff?.fullname) return staff.fullname;
    const cached = creatorNameMap.get(userId);
    return cached || `User #${userId}`;
  };

  const toggleQuickStaff = (userId: number) => {
    setSelectedQuickStaffIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllQuickStaff = () => {
    setSelectedQuickStaffIds(staffList.map(s => s.userId));
  };

  const handleDeselectAllQuickStaff = () => {
    setSelectedQuickStaffIds([]);
  };

  const toggleFormStaff = (userId: number) => {
    setFormUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllFormStaff = () => {
    setFormUserIds(staffList.map(s => s.userId));
  };

  const handleDeselectAllFormStaff = () => {
    setFormUserIds([]);
  };

  const handleApplyTemplate = async (item: typeof quickTemplates[0]) => {
    if (selectedQuickStaffIds.length === 0) {
      toast.error('Please select at least one staff');
      return;
    }

    try {
      setActionLoading(true);
      const period = getCurrentMonthPeriod();
      let successCount = 0;
      const errorMessages: string[] = [];
      const errorDetails: Array<{ userId: number; message: string }> = [];

      // Apply template cho từng staff đã chọn
      for (const userId of selectedQuickStaffIds) {
        try {
          if (item.type === 'bonus') {
            await bonusService.applyTemplate({
              userId,
              period,
              templateId: item.templateId,
            });
            successCount++;
          } else if (item.type === 'penalty') {
            await penaltyService.applyTemplate({
              userId,
              period,
              templateId: item.templateId,
            });
            successCount++;
          } else if (item.type === 'allowance') {
            await allowanceService.applyTemplate({
              userId,
              period,
              templateId: item.templateId,
            });
            successCount++;
          }
        } catch (err: any) {
          // Extract error message from backend
          const errorMessage = err?.message || 
                              err?.response?.message || 
                              err?.response?.result?.message ||
                              'Unknown error';
          
          console.error(`Error applying template for user ${userId}:`, err);
          errorMessages.push(errorMessage);
          errorDetails.push({ userId, message: errorMessage });
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully applied to ${successCount} staff${successCount > 1 ? 's' : ''}`);
        // Reload data
        await fetchData();
        // Clear selection
        setSelectedQuickStaffIds([]);
      }
      
      if (errorDetails.length > 0) {
        // Hiển thị chi tiết lỗi
        const uniqueErrors = [...new Set(errorMessages)];
        if (uniqueErrors.length === 1) {
          // Tất cả lỗi giống nhau
          toast.error(`${uniqueErrors[0]} (${errorDetails.length} staff)`);
        } else {
          // Nhiều loại lỗi khác nhau
          toast.error(`Failed to apply to ${errorDetails.length} staff. ${uniqueErrors[0]}`, {
            duration: 5000,
          });
          // Log chi tiết để debug
          console.error('Error details:', errorDetails);
        }
      }
    } catch (err: any) {
      // Extract error message from backend
      const errorMessage = err?.message || 
                          err?.response?.message || 
                          err?.response?.result?.message ||
                          'Failed to apply template';
      toast.error(errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickCreate = () => {
    setCreateType(quickTab);
    setFormUserIds([]);
    setFormPeriod(getCurrentMonthPeriod());
    setFormType('');
    setFormAmount('');
    setFormDescription('');
    setFormShiftId('');
    setFormIncidentDate('');
    setFormStatus(quickTab === 'allowance' ? 'ACTIVE' : 'PENDING');
    setShowCreateModal(true);
  };

  const quickTemplates = useMemo(() => {
    // Lấy từ templates thực sự, chỉ lấy active templates
    const bonusCards = bonusTemplates
      .filter(t => t.isActive)
      .map((t) => ({
        id: `BON-T-${t.templateId}`,
        templateId: t.templateId,
        title: t.name || t.description || 'Bonus',
        description: t.description || t.name || 'Bonus reward',
        amount: t.amount,
        mode: t.branchId === null ? 'SYSTEM' : 'BRANCH',
        type: 'bonus' as const,
        template: t,
      }));

    const penaltyCards = penaltyConfigs
      .filter(t => t.isActive)
      .map((t) => ({
        id: `PEN-C-${t.configId}`,
        templateId: t.configId,
        title: t.name || t.description || 'Penalty',
        description: t.description || t.name || 'Penalty rule',
        amount: t.amount,
        mode: t.branchId === null ? 'SYSTEM' : 'BRANCH',
        type: 'penalty' as const,
        template: t,
      }));

    const allowanceCards = allowanceTemplates
      .filter(t => t.isActive)
      .map((t) => ({
        id: `ALW-T-${t.templateId}`,
        templateId: t.templateId,
        title: t.name || t.description || 'Allowance',
        description: t.description || t.name || 'Allowance support',
        amount: t.amount,
        mode: t.branchId === null ? 'SYSTEM' : 'BRANCH',
        type: 'allowance' as const,
        template: t,
      }));

    return [...bonusCards, ...penaltyCards, ...allowanceCards];
  }, [bonusTemplates, penaltyConfigs, allowanceTemplates]);

  const filteredQuickTemplates = useMemo(
    () => quickTemplates.filter((t) => t.type === quickTab),
    [quickTemplates, quickTab]
  );

  if (!managerBranch) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          <p>You are not assigned to any branch. Please contact Admin.</p>
        </div>
      </div>
    );
  }

  // Show skeleton for Quick Rewards & Penalties page
  if (showQuickAdd && (loadingTemplates || loadingStaff)) {
    return <QuickRewardsPenaltiesSkeleton />;
  }

  if (showQuickAdd) {
    return (
      <>
      <div className="min-h-screen bg-slate-50">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowQuickAdd(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold">Quick Rewards &amp; Penalties</h1>
                <p className="text-sm text-white/80">Apply bonuses, penalties, and allowances fast</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 text-sm rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 flex items-center gap-2">
                <History className="w-4 h-4" />
                History
              </button>
              <button className="px-4 py-2 text-sm font-semibold rounded-lg bg-amber-400 text-slate-900 hover:bg-amber-300 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Confirm All
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            {(['bonus', 'penalty', 'allowance'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setQuickTab(tab)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium ${
                  quickTab === tab
                    ? 'bg-white text-blue-600 border-blue-200 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                }`}
              >
                {tab === 'bonus' && 'Bonus'}
                {tab === 'penalty' && 'Penalty'}
                {tab === 'allowance' && 'Allowance'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-slate-400" />
                  <span className="text-sm font-semibold text-slate-900">Select Staff</span>
                  {selectedQuickStaffIds.length > 0 && (
                    <span className="text-xs text-green-600 font-medium">
                      ({selectedQuickStaffIds.length} selected)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedQuickStaffIds.length === staffList.length ? (
                    <button
                      onClick={handleDeselectAllQuickStaff}
                      className="text-xs px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      Deselect All
                    </button>
                  ) : (
                    <button
                      onClick={handleSelectAllQuickStaff}
                      className="text-xs px-2 py-1 rounded border border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      Select All
                    </button>
                  )}
                </div>
              </div>
              {loadingStaff ? (
                <div className="py-8 text-center text-slate-500 text-sm">Loading staff...</div>
              ) : staffList.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm">No staff available</div>
              ) : (
                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {staffList.map((staff) => (
                    <label
                      key={staff.userId}
                      className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg hover:border-slate-300"
                    >
                      <input
                        type="checkbox"
                        checked={selectedQuickStaffIds.includes(staff.userId)}
                        onChange={() => toggleQuickStaff(staff.userId)}
                        className="mt-1 rounded border-slate-300"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900 truncate">
                            {staff.fullname || staff.email || `Staff #${staff.userId}`}
                          </span>
                          {staff.branch?.name && (
                            <span className="px-2 py-0.5 text-[11px] rounded-full bg-slate-100 text-slate-700">
                              {staff.branch.name}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 truncate">{staff.email}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  {quickTab === 'bonus' ? 'Bonus' : quickTab === 'penalty' ? 'Penalty' : 'Allowance'} Templates
                </h2>
                <button
                  onClick={handleQuickCreate}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  Create New {quickTab === 'bonus' ? 'Bonus' : quickTab === 'penalty' ? 'Penalty' : 'Allowance'}
                </button>
              </div>
              {loadingTemplates ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
                  Loading templates...
                </div>
              ) : filteredQuickTemplates.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-500">
                  No templates available. Click "Create New" to add one.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredQuickTemplates.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                          {item.id}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {item.mode}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                      </div>
                      <div className="text-lg font-bold text-amber-600">
                        {typeof item.amount === 'number'
                          ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.amount)
                          : item.amount}
                      </div>
                      <button
                        onClick={() => handleApplyTemplate(item)}
                        disabled={actionLoading || selectedQuickStaffIds.length === 0}
                        className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 text-blue-700 px-4 py-2 text-sm font-medium hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {actionLoading ? 'Applying...' : 'Apply to Selected'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal - Render in Quick page too */}
      {(showCreateModal || showEditModal) && createPortal(
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1300] p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreateModal(false);
              setShowEditModal(false);
              setSelectedItem(null);
            }
          }}
          style={{ overscrollBehavior: 'contain' }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col my-auto">
            {/* Header với màu sắc theo loại */}
            <div className={`px-6 py-4 flex-shrink-0 ${
              createType === 'bonus' ? 'bg-gradient-to-r from-green-500 to-green-600' :
              createType === 'penalty' ? 'bg-gradient-to-r from-red-500 to-red-600' :
              'bg-gradient-to-r from-orange-500 to-orange-600'
            } text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {createType === 'bonus' ? (
                    <Gift className="w-6 h-6" />
                  ) : createType === 'penalty' ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : (
                    <HandCoins className="w-6 h-6" />
                  )}
                  <div>
                    <h3 className="text-xl font-bold">
                      {selectedItem ? `Edit ${createType === 'bonus' ? 'Bonus' : createType === 'penalty' ? 'Penalty' : 'Allowance'}` : `Create ${createType === 'bonus' ? 'Bonus' : createType === 'penalty' ? 'Penalty' : 'Allowance'}`}
                    </h3>
                    <p className="text-sm text-white/90 mt-0.5">
                      {selectedItem ? 'Update transaction details' : 'Add a new transaction record'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setSelectedItem(null);
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-6" style={{ overscrollBehavior: 'contain' }}>
              <div className="space-y-5">
                {/* Employee Selection - Multiple */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-1.5" />
                    {selectedItem ? 'Employee' : 'Select Employees'} <span className="text-red-500">*</span>
                    {!selectedItem && formUserIds.length > 0 && (
                      <span className="ml-2 text-sm font-normal text-green-600">
                        ({formUserIds.length} selected)
                      </span>
                    )}
                  </label>
                  {selectedItem ? (
                    // Edit mode: single select (read-only)
                    <select
                      value={formUserIds[0] || ''}
                      disabled
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                    >
                      {staffList
                        .filter(s => formUserIds.includes(s.userId))
                        .map((staff) => (
                          <option key={staff.userId} value={staff.userId}>
                            {staff.fullname || staff.email} {staff.branch?.name ? `(${staff.branch.name})` : ''}
                          </option>
                        ))}
                    </select>
                  ) : (
                    // Create mode: multiple selection with checkboxes
                    <div className="border-2 border-gray-200 rounded-lg bg-white">
                      {/* Select All / Deselect All buttons */}
                      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
                        <span className="text-xs text-gray-600">
                          {formUserIds.length} of {staffList.length} selected
                        </span>
                        <div className="flex items-center gap-2">
                          {formUserIds.length === staffList.length ? (
                            <button
                              onClick={handleDeselectAllFormStaff}
                              className="text-xs px-2.5 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 font-medium"
                            >
                              Deselect All
                            </button>
                          ) : (
                            <button
                              onClick={handleSelectAllFormStaff}
                              className="text-xs px-2.5 py-1 rounded border border-blue-300 text-blue-700 hover:bg-blue-50 font-medium"
                            >
                              Select All
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="p-3 max-h-64 overflow-y-auto">
                        {staffList.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">No staff available</p>
                        ) : (
                          <div className="space-y-2">
                            {staffList.map((staff) => (
                              <label
                                key={staff.userId}
                                className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={formUserIds.includes(staff.userId)}
                                  onChange={() => toggleFormStaff(staff.userId)}
                                  className="mt-1 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900">
                                    {staff.fullname || staff.email || `Staff #${staff.userId}`}
                                  </div>
                                  {staff.branch?.name && (
                                    <div className="text-xs text-gray-500">{staff.branch.name}</div>
                                  )}
                                  {staff.email && staff.fullname && (
                                    <div className="text-xs text-gray-400">{staff.email}</div>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Grid: Period and Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1.5" />
                      Pay Period <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="month"
                      value={formPeriod}
                      onChange={(e) => setFormPeriod(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                      required
                      disabled={!!selectedItem}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                      required
                    >
                      <option value="">Select type</option>
                      {createType === 'bonus' ? (() => {
                        // Lấy danh sách bonus types từ templates (unique)
                        const bonusTypesFromTemplates = Array.from(
                          new Set(bonusTemplates.map(t => t.bonusType))
                        ).sort();
                        
                        // Danh sách bonus types mặc định
                        const defaultBonusTypes: BonusType[] = ['PERFORMANCE', 'ATTENDANCE', 'SPECIAL', 'HOLIDAY', 'OTHER'];
                        
                        // Kết hợp và loại bỏ trùng lặp
                        const allBonusTypes = Array.from(
                          new Set([...defaultBonusTypes, ...bonusTypesFromTemplates])
                        ) as BonusType[];
                        
                        const typeLabels: Record<BonusType, string> = {
                          PERFORMANCE: 'Performance',
                          ATTENDANCE: 'Attendance',
                          SPECIAL: 'Special',
                          HOLIDAY: 'Holiday',
                          OTHER: 'Other',
                        };
                        
                        return (
                          <>
                            {allBonusTypes.map((type) => (
                              <option key={type} value={type}>
                                {typeLabels[type] || type}
                              </option>
                            ))}
                          </>
                        );
                      })() : createType === 'penalty' ? (
                        <>
                          <option value="NO_SHOW">No Show</option>
                          <option value="LATE">Late</option>
                          <option value="EARLY_LEAVE">Early Leave</option>
                          <option value="MISTAKE">Mistake</option>
                          <option value="VIOLATION">Violation</option>
                          <option value="OTHER">Other</option>
                        </>
                      ) : (
                        <>
                          <option value="TRANSPORT">Transport</option>
                          <option value="MEAL">Meal</option>
                          <option value="PHONE">Phone</option>
                          <option value="HOUSING">Housing</option>
                          <option value="OTHER">Other</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Wallet className="w-4 h-4 inline mr-1.5" />
                    Amount (VND) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors pr-20"
                      required
                      min="0"
                      step="1000"
                      placeholder="0"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₫</span>
                  </div>
                  {formAmount && typeof formAmount === 'number' && formAmount > 0 && (
                    <p className="mt-1.5 text-sm text-gray-600">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(formAmount)}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors resize-none"
                    rows={4}
                    placeholder="Enter description (optional)"
                  />
                </div>

                {/* Bonus shift info when editing (read-only) */}
                {(() => {
                  const bonusShiftId = (formShiftId as number | '') || selectedItem?.shiftId || null;
                  return createType === 'bonus' && bonusShiftId ? (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Calendar className="w-4 h-4 inline mr-1.5" />
                        Work Shift <span className="text-gray-500 text-xs font-normal">(read-only)</span>
                      </label>
                      <input
                        type="text"
                        value={
                          typeof bonusShiftId === 'number' && shiftMap.get(bonusShiftId)
                            ? `${formatDate(shiftMap.get(bonusShiftId)!.shiftDate)} - ${formatTime(shiftMap.get(bonusShiftId)!.startTime)} → ${formatTime(shiftMap.get(bonusShiftId)!.endTime)}`
                            : `Shift #${bonusShiftId}`
                        }
                        disabled
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                      />
                    </div>
                  ) : null;
                })()}

                {/* Penalty specific fields */}
                {createType === 'penalty' && (formType === 'LATE' || formType === 'EARLY_LEAVE' || formType === 'NO_SHOW') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Calendar className="w-4 h-4 inline mr-1.5" />
                        Work Shift <span className="text-gray-500 text-xs font-normal">(optional)</span>
                      </label>
                      <select
                        value={formShiftId || ''}
                        onChange={(e) => setFormShiftId(e.target.value ? Number(e.target.value) : '')}
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                        disabled={loadingShifts || formUserIds.length === 0 || !formPeriod || !!selectedItem}
                      >
                        <option value="">No shift (general penalty)</option>
                        {staffShifts.map((shift) => (
                          <option key={shift.shiftId} value={shift.shiftId}>
                            {formatDate(shift.shiftDate)} - {formatTime(shift.startTime)} → {formatTime(shift.endTime)}
                          </option>
                        ))}
                      </select>
                      {loadingShifts && (
                        <p className="mt-1.5 text-sm text-amber-600 flex items-center gap-1">
                          <span className="w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></span>
                          Loading shifts...
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Calendar className="w-4 h-4 inline mr-1.5" />
                        Incident Date <span className="text-gray-500 text-xs font-normal">(optional)</span>
                      </label>
                      <input
                        type="date"
                        value={formIncidentDate}
                        onChange={(e) => setFormIncidentDate(e.target.value)}
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                        disabled={!!selectedItem}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer với buttons */}
            <div className="px-6 py-4 flex-shrink-0 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setSelectedItem(null);
                }}
                className="px-5 py-2.5 border-2 border-gray-300 rounded-lg hover:bg-gray-100 font-medium text-gray-700 transition-colors"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={actionLoading || formUserIds.length === 0 || !formPeriod || !formType || !formAmount}
                className={`px-5 py-2.5 rounded-lg font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  createType === 'bonus' ? 'bg-green-600 hover:bg-green-700' :
                  createType === 'penalty' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {actionLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Processing...
                  </span>
                ) : selectedItem ? (
                  'Update'
                ) : (
                  'Create'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      </>
    );
  }

  // Show skeleton for main Rewards & Penalties Management page
  if (loading && bonuses.length === 0 && penalties.length === 0 && allowances.length === 0) {
    return <RewardsPenaltiesManagementSkeleton />;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rewards & Penalties Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage bonuses, penalties, and allowances for staff in {managerBranch.name} branch
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setExportMode('ALL');
              setExportStaffId('');
              setExportType('');
              setShowExportModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <Download className="w-4 h-4" />
            Export Report
          </button>
          <button
            onClick={() => setShowQuickAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Quick Rewards / Penalties / Allowances
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Total Bonus */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Bonus This Month</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(kpis.totalBonus)}</p>
              {kpis.bonusChange !== 0 && (
                <div className={`flex items-center gap-1 mt-2 text-sm ${kpis.bonusChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {kpis.bonusChange > 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>
                    {kpis.bonusChange > 0 ? '+' : ''}{kpis.bonusChange.toFixed(1)}% vs last month
                  </span>
                </div>
              )}
              {kpis.bonusChange === 0 && (
                <div className="flex items-center gap-1 mt-2 text-gray-500 text-sm">
                  <span>No change vs last month</span>
                </div>
              )}
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Gift className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Total Allowance */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Allowance This Month</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(kpis.totalAllowance)}</p>
              {kpis.allowanceChange !== 0 && (
                <div className={`flex items-center gap-1 mt-2 text-sm ${kpis.allowanceChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {kpis.allowanceChange > 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>
                    {kpis.allowanceChange > 0 ? '+' : ''}{kpis.allowanceChange.toFixed(1)}% vs last month
                  </span>
                </div>
              )}
              {kpis.allowanceChange === 0 && (
                <div className="flex items-center gap-1 mt-2 text-gray-500 text-sm">
                  <span>No change vs last month</span>
                </div>
              )}
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <HandCoins className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Total Penalty */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Penalty This Month</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(kpis.totalPenalty)}</p>
              {kpis.penaltyChange !== 0 && (
                <div className={`flex items-center gap-1 mt-2 text-sm ${kpis.penaltyChange < 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {kpis.penaltyChange < 0 ? (
                    <TrendingDown className="w-4 h-4" />
                  ) : (
                    <TrendingUp className="w-4 h-4" />
                  )}
                  <span>
                    {kpis.penaltyChange > 0 ? '+' : ''}{kpis.penaltyChange.toFixed(1)}% vs last month
                  </span>
                </div>
              )}
              {kpis.penaltyChange === 0 && (
                <div className="flex items-center gap-1 mt-2 text-gray-500 text-sm">
                  <span>No change vs last month</span>
                </div>
              )}
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        {/* Total Transactions */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{kpis.totalTransactions}</p>
              <div className="flex items-center gap-1 mt-2 text-green-600 text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>+{kpis.todayTransactions} today</span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <ArrowUpDown className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Average Net Salary */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average Net Salary</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(kpis.averageNetSalary)}</p>
              {kpis.averageNetSalaryChange !== 0 && (
                <div className={`flex items-center gap-1 mt-2 text-sm ${kpis.averageNetSalaryChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {kpis.averageNetSalaryChange > 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>
                    {kpis.averageNetSalaryChange > 0 ? '+' : ''}{kpis.averageNetSalaryChange.toFixed(1)}% vs last month
                  </span>
                </div>
              )}
              {kpis.averageNetSalaryChange === 0 && (
                <div className="flex items-center gap-1 mt-2 text-gray-500 text-sm">
                  <span>No change vs last month</span>
                </div>
              )}
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Wallet className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Ratio */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Bonus/Penalty/Allowance Ratio</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {kpis.ratio.bonus}% : {kpis.ratio.penalty}% : {kpis.ratio.allowance}%
              </p>
              <div className="flex items-center gap-1 mt-2 text-green-600 text-sm">
                <Scale className="w-4 h-4" />
                <span>Well balanced</span>
              </div>
            </div>
            <div className="p-3 bg-indigo-100 rounded-full">
              <Scale className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Table */}
      <div className="bg-white rounded-lg shadow">
        {/* Bulk Actions Bar - Show when items are selected */}
        {selectedItems.size > 0 && (
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setSelectedItems(new Set())}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center gap-2">
              {/* Bulk Approve - Only for PENDING bonus/penalty */}
              {Array.from(selectedItems).some(id => {
                const tx = unifiedTransactions.find(t => t.id === id);
                return tx && tx.status === 'PENDING' && (tx.type === 'bonus' || tx.type === 'penalty');
              }) && (
                <button
                  onClick={handleBulkApprove}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve Selected
                </button>
              )}
              {/* Bulk Reject - Only for PENDING bonus/penalty */}
              {Array.from(selectedItems).some(id => {
                const tx = unifiedTransactions.find(t => t.id === id);
                return tx && tx.status === 'PENDING' && (tx.type === 'bonus' || tx.type === 'penalty');
              }) && (
                <button
                  onClick={() => {
                    setBulkRejectItems(Array.from(selectedItems));
                    setShowBulkRejectModal(true);
                  }}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-4 h-4" />
                  Reject Selected
                </button>
              )}
              {/* Bulk Delete */}
              <button
                onClick={() => {
                  setBulkDeleteItems(Array.from(selectedItems));
                  setShowBulkDeleteModal(true);
                }}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="p-4 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as TransactionType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">All</option>
                <option value="bonus">Bonus</option>
                <option value="penalty">Penalty</option>
                <option value="allowance">Allowance</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">All</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Employee...</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search employee..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = isIndeterminate;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DATE</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EMPLOYEE</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TYPE</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">REASON</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SHIFT</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AMOUNT</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STATUS</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    No data
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => {
                  const staff = staffList.find((s) => s.userId === tx.userId);
                  const staffName = staff?.fullname || getCreatorName(tx.createdBy);
                  
                  return (
                    <tr 
                      key={tx.id} 
                      className={`cursor-pointer transition-colors ${
                        selectedItems.has(tx.id) 
                          ? 'bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-500' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={(e) => {
                        // Không toggle nếu click vào checkbox hoặc các button trong Actions
                        const target = e.target as HTMLElement;
                        if (target.closest('input[type="checkbox"]') || target.closest('button') || target.closest('a')) {
                          return;
                        }
                        // Toggle checkbox khi click vào row
                        handleSelectItem(tx.id, !selectedItems.has(tx.id));
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedItems.has(tx.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectItem(tx.id, e.target.checked);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(tx.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {staffName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getTypeBadge(tx)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>{tx.description || '-'}</div>
                        <div className="text-xs text-gray-500 mt-1">{getTypeLabel(tx)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {tx.shiftId && shiftMap.get(tx.shiftId) ? (
                          <div className="flex flex-col">
                            <span className="text-gray-700">
                              {formatDate(shiftMap.get(tx.shiftId)!.shiftDate)}
                            </span>
                            <span className="text-gray-500">
                              {shiftMap.get(tx.shiftId)!.startTime.substring(0, 5)} - {shiftMap.get(tx.shiftId)!.endTime.substring(0, 5)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={tx.type === 'penalty' ? 'text-red-600' : 'text-green-600'}>
                          {tx.type === 'penalty' ? '-' : '+'}{formatCurrency(tx.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {getStatusBadge(tx.status)}
                      </td>
                      <td 
                        className="px-6 py-4 whitespace-nowrap text-sm font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2">
                          {/* Approve / Reject for PENDING bonus & penalty */}
                          {tx.status === 'PENDING' && (tx.type === 'bonus' || tx.type === 'penalty') && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApproveTransaction(tx);
                                }}
                                className="text-green-600 hover:text-green-800 flex items-center gap-1"
                                title="Approve"
                                disabled={actionLoading}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setStatusModalTx(tx);
                                  setStatusModalAction('reject');
                                  setShowStatusModal(true);
                                }}
                                className="text-red-600 hover:text-red-800 flex items-center gap-1"
                                title="Reject"
                                disabled={actionLoading}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleView(tx);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(tx);
                            }}
                            className="text-amber-600 hover:text-amber-900"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedItem(tx);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">
              Showing {paginatedTransactions.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
              {Math.min(currentPage * pageSize, filteredTransactions.length)} of{' '}
              {filteredTransactions.length} results
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="ml-4 px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 border rounded-md text-sm ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal - Continue in next part due to length */}
      {/* View Modal */}
      {showViewModal && selectedItem && createPortal(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1300]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Transaction Details</h3>
              <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {/* Basic info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
                  <div className="flex items-center gap-2">
                    {getTypeBadge(selectedItem)}
                    <span className="text-xs text-gray-600">
                      {getTypeLabel(selectedItem)}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">ID</label>
                  <p className="text-sm text-gray-900">
                    {selectedItem.type === 'bonus'
                      ? `BON-${(selectedItem.originalData as Bonus).bonusId}`
                      : selectedItem.type === 'penalty'
                        ? `PEN-${(selectedItem.originalData as Penalty).penaltyId}`
                        : `ALW-${(selectedItem.originalData as Allowance).allowanceId}`}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Employee</label>
                  <p className="text-sm text-gray-900">
                    {staffList.find(s => s.userId === selectedItem.userId)?.fullname ||
                      staffList.find(s => s.userId === selectedItem.userId)?.email ||
                      `User #${selectedItem.userId}`}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Branch</label>
                  <p className="text-sm text-gray-900">
                    {managerBranch?.name || `Branch #${selectedItem.branchId}`}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Pay Period</label>
                  <p className="text-sm text-gray-900">{selectedItem.period}</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Created At</label>
                  <p className="text-sm text-gray-900">
                    {formatDate(selectedItem.date)}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Amount</label>
                  <p className="text-lg font-bold text-gray-900">
                    {selectedItem.type === 'penalty' ? '-' : '+'}{formatCurrency(selectedItem.amount)}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                  <div>{getStatusBadge(selectedItem.status)}</div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Created By</label>
                  <p className="text-sm text-gray-900">
                    {getCreatorName(selectedItem.createdBy)}
                  </p>
                </div>
                {selectedItem.type === 'bonus' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Source Template</label>
                    <p className="text-sm text-gray-900">
                      {(() => {
                        const srcId = (selectedItem.originalData as Bonus).sourceTemplateId;
                        if (srcId == null) return '-';
                        const tpl = bonusTemplates.find((t) => t.templateId === srcId);
                        return tpl?.name || `Template #${srcId}`;
                      })()}
                    </p>
                  </div>
                )}
                {selectedItem.type === 'allowance' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Source Template</label>
                    <p className="text-sm text-gray-900">
                      {(() => {
                        const srcId = (selectedItem.originalData as Allowance).sourceTemplateId;
                        if (srcId == null) return '-';
                        const tpl = allowanceTemplates.find((t) => t.templateId === srcId);
                        return tpl?.name || `Template #${srcId}`;
                      })()}
                    </p>
                  </div>
                )}
              </div>

              {/* Shift / incident info */}
              {(selectedItem.shiftId || selectedItem.type === 'penalty') && (
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-500">Shift / Incident</p>
                  {selectedItem.shiftId && (
                    <p className="text-sm text-gray-900">
                      {shiftMap.get(selectedItem.shiftId)
                        ? `${formatDate(shiftMap.get(selectedItem.shiftId)!.shiftDate)} · ${formatTime(shiftMap.get(selectedItem.shiftId)!.startTime)} → ${formatTime(shiftMap.get(selectedItem.shiftId)!.endTime)}`
                        : `Shift #${selectedItem.shiftId}`}
                    </p>
                  )}
                  {selectedItem.type === 'penalty' && (selectedItem.originalData as Penalty).incidentDate && (
                    <p className="text-sm text-gray-900">
                      Incident date: {formatDate((selectedItem.originalData as Penalty).incidentDate!)}
                    </p>
                  )}
                </div>
              )}

              {/* Description */}
              <div className="border-t border-gray-100 pt-3">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
                <p className="text-sm text-gray-900 whitespace-pre-line">
                  {selectedItem.description || '-'}
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && createPortal(
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1300] p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreateModal(false);
              setShowEditModal(false);
              setSelectedItem(null);
            }
          }}
          style={{ overscrollBehavior: 'contain' }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col my-auto">
            {/* Header với màu sắc theo loại */}
            <div className={`px-6 py-4 ${
              createType === 'bonus' ? 'bg-gradient-to-r from-green-500 to-green-600' :
              createType === 'penalty' ? 'bg-gradient-to-r from-red-500 to-red-600' :
              'bg-gradient-to-r from-orange-500 to-orange-600'
            } text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {createType === 'bonus' ? (
                    <Gift className="w-6 h-6" />
                  ) : createType === 'penalty' ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : (
                    <HandCoins className="w-6 h-6" />
                  )}
                  <div>
                    <h3 className="text-xl font-bold">
                      {selectedItem ? `Edit ${createType === 'bonus' ? 'Bonus' : createType === 'penalty' ? 'Penalty' : 'Allowance'}` : `Create ${createType === 'bonus' ? 'Bonus' : createType === 'penalty' ? 'Penalty' : 'Allowance'}`}
                    </h3>
                    <p className="text-sm text-white/90 mt-0.5">
                      {selectedItem ? 'Update transaction details' : 'Add a new transaction record'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setSelectedItem(null);
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-6" style={{ overscrollBehavior: 'contain' }}>
              <div className="space-y-5">
                {/* Employee Selection - Multiple */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-1.5" />
                    {selectedItem ? 'Employee' : 'Select Employees'} <span className="text-red-500">*</span>
                    {!selectedItem && formUserIds.length > 0 && (
                      <span className="ml-2 text-sm font-normal text-green-600">
                        ({formUserIds.length} selected)
                      </span>
                    )}
                  </label>
                  {selectedItem ? (
                    // Edit mode: single select (read-only)
                    <select
                      value={formUserIds[0] || ''}
                      disabled
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                    >
                      {staffList
                        .filter(s => formUserIds.includes(s.userId))
                        .map((staff) => (
                          <option key={staff.userId} value={staff.userId}>
                            {staff.fullname || staff.email} {staff.branch?.name ? `(${staff.branch.name})` : ''}
                          </option>
                        ))}
                    </select>
                  ) : (
                    // Create mode: multiple selection with checkboxes
                    <div className="border-2 border-gray-200 rounded-lg bg-white">
                      {/* Select All / Deselect All buttons */}
                      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
                        <span className="text-xs text-gray-600">
                          {formUserIds.length} of {staffList.length} selected
                        </span>
                        <div className="flex items-center gap-2">
                          {formUserIds.length === staffList.length ? (
                            <button
                              onClick={handleDeselectAllFormStaff}
                              className="text-xs px-2.5 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 font-medium"
                            >
                              Deselect All
                            </button>
                          ) : (
                            <button
                              onClick={handleSelectAllFormStaff}
                              className="text-xs px-2.5 py-1 rounded border border-blue-300 text-blue-700 hover:bg-blue-50 font-medium"
                            >
                              Select All
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="p-3 max-h-64 overflow-y-auto">
                        {staffList.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">No staff available</p>
                        ) : (
                          <div className="space-y-2">
                            {staffList.map((staff) => (
                              <label
                                key={staff.userId}
                                className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={formUserIds.includes(staff.userId)}
                                  onChange={() => toggleFormStaff(staff.userId)}
                                  className="mt-1 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900">
                                    {staff.fullname || staff.email || `Staff #${staff.userId}`}
                                  </div>
                                  {staff.branch?.name && (
                                    <div className="text-xs text-gray-500">{staff.branch.name}</div>
                                  )}
                                  {staff.email && staff.fullname && (
                                    <div className="text-xs text-gray-400">{staff.email}</div>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Grid: Period and Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1.5" />
                      Pay Period <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="month"
                      value={formPeriod}
                      onChange={(e) => setFormPeriod(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                      required
                      disabled={!!selectedItem}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                      required
                    >
                      <option value="">Select type</option>
                      {createType === 'bonus' ? (() => {
                        // Lấy danh sách bonus types từ templates (unique)
                        const bonusTypesFromTemplates = Array.from(
                          new Set(bonusTemplates.map(t => t.bonusType))
                        ).sort();
                        
                        // Danh sách bonus types mặc định
                        const defaultBonusTypes: BonusType[] = ['PERFORMANCE', 'ATTENDANCE', 'SPECIAL', 'HOLIDAY', 'OTHER'];
                        
                        // Kết hợp và loại bỏ trùng lặp
                        const allBonusTypes = Array.from(
                          new Set([...defaultBonusTypes, ...bonusTypesFromTemplates])
                        ) as BonusType[];
                        
                        const typeLabels: Record<BonusType, string> = {
                          PERFORMANCE: 'Performance',
                          ATTENDANCE: 'Attendance',
                          SPECIAL: 'Special',
                          HOLIDAY: 'Holiday',
                          OTHER: 'Other',
                        };
                        
                        return (
                          <>
                            {allBonusTypes.map((type) => (
                              <option key={type} value={type}>
                                {typeLabels[type] || type}
                              </option>
                            ))}
                          </>
                        );
                      })() : createType === 'penalty' ? (
                        <>
                          <option value="NO_SHOW">No Show</option>
                          <option value="LATE">Late</option>
                          <option value="EARLY_LEAVE">Early Leave</option>
                          <option value="MISTAKE">Mistake</option>
                          <option value="VIOLATION">Violation</option>
                          <option value="OTHER">Other</option>
                        </>
                      ) : (
                        <>
                          <option value="TRANSPORT">Transport</option>
                          <option value="MEAL">Meal</option>
                          <option value="PHONE">Phone</option>
                          <option value="HOUSING">Housing</option>
                          <option value="OTHER">Other</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <Wallet className="w-4 h-4 inline mr-1.5" />
                    Amount (VND) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors pr-20"
                      required
                      min="0"
                      step="1000"
                      placeholder="0"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">₫</span>
                  </div>
                  {formAmount && typeof formAmount === 'number' && formAmount > 0 && (
                    <p className="mt-1.5 text-sm text-gray-600">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(formAmount)}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors resize-none"
                    rows={4}
                    placeholder="Enter description (optional)"
                  />
                </div>
                {/* Bonus shift info when editing (read-only) */}
                {(() => {
                  const bonusShiftId = (formShiftId as number | '') || selectedItem?.shiftId || null;
                  return createType === 'bonus' && bonusShiftId ? (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Calendar className="w-4 h-4 inline mr-1.5" />
                        Work Shift <span className="text-gray-500 text-xs font-normal">(read-only)</span>
                      </label>
                      <input
                        type="text"
                        value={
                          typeof bonusShiftId === 'number' && shiftMap.get(bonusShiftId)
                            ? `${formatDate(shiftMap.get(bonusShiftId)!.shiftDate)} - ${formatTime(shiftMap.get(bonusShiftId)!.startTime)} → ${formatTime(shiftMap.get(bonusShiftId)!.endTime)}`
                            : `Shift #${bonusShiftId}`
                        }
                        disabled
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                      />
                    </div>
                  ) : null;
                })()}

                {/* Penalty specific fields */}
                {createType === 'penalty' && (formType === 'LATE' || formType === 'EARLY_LEAVE' || formType === 'NO_SHOW') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Calendar className="w-4 h-4 inline mr-1.5" />
                        Work Shift <span className="text-gray-500 text-xs font-normal">(optional)</span>
                      </label>
                      <select
                        value={formShiftId || ''}
                        onChange={(e) => setFormShiftId(e.target.value ? Number(e.target.value) : '')}
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                        disabled={loadingShifts || formUserIds.length === 0 || !formPeriod || !!selectedItem}
                      >
                        <option value="">No shift (general penalty)</option>
                        {staffShifts.map((shift) => (
                          <option key={shift.shiftId} value={shift.shiftId}>
                            {formatDate(shift.shiftDate)} - {formatTime(shift.startTime)} → {formatTime(shift.endTime)}
                          </option>
                        ))}
                      </select>
                      {loadingShifts && (
                        <p className="mt-1.5 text-sm text-amber-600 flex items-center gap-1">
                          <span className="w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></span>
                          Loading shifts...
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Calendar className="w-4 h-4 inline mr-1.5" />
                        Incident Date <span className="text-gray-500 text-xs font-normal">(optional)</span>
                      </label>
                      <input
                        type="date"
                        value={formIncidentDate}
                        onChange={(e) => setFormIncidentDate(e.target.value)}
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
                        disabled={!!selectedItem}
                      />
                    </div>
                  </div>
                )}
            </div>
            </div>

            {/* Footer với buttons */}
            <div className="px-6 py-4 flex-shrink-0 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setSelectedItem(null);
                }}
                className="px-5 py-2.5 border-2 border-gray-300 rounded-lg hover:bg-gray-100 font-medium text-gray-700 transition-colors"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={actionLoading || formUserIds.length === 0 || !formPeriod || !formType || !formAmount}
                className={`px-5 py-2.5 rounded-lg font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  createType === 'bonus' ? 'bg-green-600 hover:bg-green-700' :
                  createType === 'penalty' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {actionLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Processing...
                  </span>
                ) : selectedItem ? (
                  'Update'
                ) : (
                  'Create'
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Export Report Modal */}
      {showExportModal &&
        createPortal(
          <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/40 px-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Export Rewards & Penalties
                  </h3>
                  <p className="text-sm text-slate-500">
                    Chọn phạm vi dữ liệu và điều kiện lọc trước khi xuất file Excel (CSV)
                  </p>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-2 rounded-lg hover:bg-slate-100"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Mode chọn */}
                <div>
                  <p className="text-sm font-semibold text-slate-800 mb-2">
                    Phạm vi dữ liệu
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm text-slate-800">
                      <input
                        type="radio"
                        name="exportMode"
                        value="ALL"
                        checked={exportMode === 'ALL'}
                        onChange={() => setExportMode('ALL')}
                        className="text-amber-600 border-slate-300"
                      />
                      <span>Tất cả giao dịch (theo bộ lọc hiện tại)</span>
                    </label>

                    <label className="flex items-center gap-2 text-sm text-slate-800">
                      <input
                        type="radio"
                        name="exportMode"
                        value="BY_STAFF"
                        checked={exportMode === 'BY_STAFF'}
                        onChange={() => {
                          setExportMode('BY_STAFF');
                          setExportType('');
                        }}
                        className="text-amber-600 border-slate-300"
                      />
                      <span>Theo nhân viên</span>
                    </label>

                    {exportMode === 'BY_STAFF' && (
                      <div className="mt-2 ml-6">
                        <select
                          value={exportStaffId || ''}
                          onChange={(e) =>
                            setExportStaffId(
                              e.target.value ? Number(e.target.value) : ''
                            )
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="">Chọn nhân viên</option>
                          {staffList.map((staff) => (
                            <option key={staff.userId} value={staff.userId}>
                              {staff.fullname ||
                                staff.email ||
                                `Staff #${staff.userId}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <label className="flex items-center gap-2 text-sm text-slate-800">
                      <input
                        type="radio"
                        name="exportMode"
                        value="BY_TYPE"
                        checked={exportMode === 'BY_TYPE'}
                        onChange={() => {
                          setExportMode('BY_TYPE');
                          setExportStaffId('');
                        }}
                        className="text-amber-600 border-slate-300"
                      />
                      <span>Theo loại giao dịch</span>
                    </label>

                    {exportMode === 'BY_TYPE' && (
                      <div className="mt-2 ml-6 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setExportType('bonus')}
                          className={`px-3 py-1.5 rounded-lg text-xs border ${
                            exportType === 'bonus'
                              ? 'bg-green-50 border-green-300 text-green-700'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          Bonus
                        </button>
                        <button
                          type="button"
                          onClick={() => setExportType('penalty')}
                          className={`px-3 py-1.5 rounded-lg text-xs border ${
                            exportType === 'penalty'
                              ? 'bg-red-50 border-red-300 text-red-700'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          Penalty
                        </button>
                        <button
                          type="button"
                          onClick={() => setExportType('allowance')}
                          className={`px-3 py-1.5 rounded-lg text-xs border ${
                            exportType === 'allowance'
                              ? 'bg-orange-50 border-orange-300 text-orange-700'
                              : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                          }`}
                        >
                          Allowance
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
                  File sẽ được xuất dạng CSV (Excel mở được), áp dụng thêm các
                  filter đang có ở phía trên (ngày, status, type...).
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-100"
                  disabled={exporting}
                >
                  Hủy
                </button>
                <button
                  onClick={handleExport}
                  disabled={
                    exporting ||
                    (exportMode === 'BY_STAFF' && !exportStaffId) ||
                    (exportMode === 'BY_TYPE' && !exportType)
                  }
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {exporting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Đang xuất...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Xuất file
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Delete Modal */}
      <ConfirmModal
        open={showDeleteModal}
        title={`Delete ${selectedItem?.type === 'bonus' ? 'Bonus' : selectedItem?.type === 'penalty' ? 'Penalty' : 'Allowance'}`}
        description={`Are you sure you want to delete this ${selectedItem?.type === 'bonus' ? 'bonus' : selectedItem?.type === 'penalty' ? 'penalty' : 'allowance'}?`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => {
          setShowDeleteModal(false);
          setSelectedItem(null);
        }}
        loading={actionLoading}
      />

      {/* Bulk Delete Modal */}
      <ConfirmModal
        open={showBulkDeleteModal}
        title="Delete Selected Items"
        description={`Are you sure you want to delete ${bulkDeleteItems.length} selected item(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleBulkDelete}
        onCancel={() => {
          setShowBulkDeleteModal(false);
          setBulkDeleteItems([]);
        }}
        loading={actionLoading}
      />

      {/* Bulk Reject Modal */}
      {showBulkRejectModal && createPortal(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1300]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Reject Selected Items</h3>
              <button 
                onClick={() => {
                  setShowBulkRejectModal(false);
                  setBulkRejectItems([]);
                  setBulkRejectNotes('');
                }} 
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                You are about to reject {bulkRejectItems.length} selected item(s). Please provide a reason (optional):
              </p>
              <textarea
                value={bulkRejectNotes}
                onChange={(e) => setBulkRejectNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                rows={4}
                placeholder="Enter rejection reason (optional)"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowBulkRejectModal(false);
                  setBulkRejectItems([]);
                  setBulkRejectNotes('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkReject}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Rejecting...' : 'Reject Selected'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmModal
        open={showDeleteModal}
        title={`Delete ${selectedItem?.type === 'bonus' ? 'Bonus' : selectedItem?.type === 'penalty' ? 'Penalty' : 'Allowance'}`}
        description={`Are you sure you want to delete this ${selectedItem?.type === 'bonus' ? 'bonus' : selectedItem?.type === 'penalty' ? 'penalty' : 'allowance'}?`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => {
          setShowDeleteModal(false);
          setSelectedItem(null);
        }}
        loading={actionLoading}
      />

      {/* Status Change Modal (Reject) */}
      <ConfirmModal
        open={showStatusModal}
        title={statusModalAction === 'reject' ? 'Reject transaction' : 'Change status'}
        description={
          statusModalAction === 'reject'
            ? 'Are you sure you want to reject this bonus/penalty? This action cannot be undone.'
            : 'Are you sure you want to change status for this transaction?'
        }
        confirmText="Yes, continue"
        cancelText="Cancel"
        onConfirm={async () => {
          if (!statusModalTx || !statusModalAction) {
            setShowStatusModal(false);
            return;
          }
          if (statusModalAction === 'reject') {
            await handleRejectTransaction(statusModalTx, '');
          }
          setShowStatusModal(false);
          setStatusModalTx(null);
          setStatusModalAction(null);
        }}
        onCancel={() => {
          setShowStatusModal(false);
          setStatusModalTx(null);
          setStatusModalAction(null);
        }}
        loading={actionLoading}
      />
    </div>
  );
};

export default ManagerBonusPenaltyAllowanceManagement;
