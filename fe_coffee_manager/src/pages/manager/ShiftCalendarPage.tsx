import { useEffect, useMemo, useState } from 'react';
import { addDays, eachDayOfInterval, endOfWeek, format, startOfWeek, isBefore, startOfDay, parseISO } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock4, Plus, ChevronLeft, ChevronRight, X, RefreshCw, Send, XCircle, Trash2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { shiftService, Shift, ShiftStatus, BatchOperationResult, ShiftRoleRequirement, EmploymentType } from '../../services/shiftService';
import { shiftTemplateService, ShiftTemplate } from '../../services/shiftTemplateService';
import { branchClosureService, BranchClosure } from '../../services/branchClosureService';
import { ShiftCalendarSkeleton } from '../../components/manager/skeletons';
import ConfirmModal from '../../components/common/ConfirmModal';
import authService, { StaffBusinessRole } from '../../services/authService';
import staffService from '../../services/staffService';
import { shiftAssignmentService, ShiftAssignment } from '../../services/shiftAssignmentService';
import { Users } from 'lucide-react';
import { StaffWithUserDto, Branch } from '../../types';
import { useShiftWebSocket, ShiftUpdatePayload } from '../../hooks/useShiftWebSocket';
import { branchService } from '../../services/branchService';

type Mode = 'create' | 'edit' | 'view';

interface ShiftFormState {
  shiftId?: number;
  date: string; // yyyy-MM-dd
  templateId?: number | null;
  startTime: string;
  endTime: string;
  maxStaffAllowed?: number | null;
  employmentType?: EmploymentType | null; // NULL = inherit from template
  status: ShiftStatus;
  notes: string;
  roleRequirements?: ShiftRoleRequirement[];
}

interface ShiftFormErrors {
  date?: string;
  startTime?: string;
  endTime?: string;
}

interface BatchFormState {
  templateId?: number | null;
  startDate: string;
  endDate: string;
  maxStaffAllowed?: number | null;
  employmentType?: EmploymentType | null; // NULL = inherit from template
  notes: string;
  roleRequirements?: ShiftRoleRequirement[];
}

interface BatchFormErrors {
  templateId?: string;
  startDate?: string;
  endDate?: string;
}

const timeToInput = (time: string | null | undefined) =>
  time ? time.slice(0, 5) : '';

const addMinutesToTime = (time: string, minutesToAdd: number): string => {
  const [h, m] = time.split(':').map((v) => parseInt(v, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const base = new Date(0, 0, 0, h, m, 0);
  const added = new Date(base.getTime() + minutesToAdd * 60_000);
  const hh = String(added.getHours()).padStart(2, '0');
  const mm = String(added.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

const buildInitialShiftForm = (date: string): ShiftFormState => ({
  date,
  templateId: undefined,
  startTime: '08:00',
  endTime: '14:00',
  maxStaffAllowed: undefined,
  employmentType: undefined, // NULL = will inherit from template if available
  status: 'DRAFT',
  notes: '',
  roleRequirements: [],
});

export default function ShiftCalendarPage() {
  const { user, managerBranch } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [closures, setClosures] = useState<BranchClosure[]>([]);
  const [branchInfo, setBranchInfo] = useState<Branch | null>(null);
  const [assignments, setAssignments] = useState<Map<number, ShiftAssignment[]>>(new Map());
  const [staffNames, setStaffNames] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [statusFilter, setStatusFilter] = useState<'ALL' | ShiftStatus>('ALL');

  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [shiftMode, setShiftMode] = useState<Mode>('create');
  const [shiftForm, setShiftForm] = useState<ShiftFormState>(() =>
    buildInitialShiftForm(format(new Date(), 'yyyy-MM-dd'))
  );

  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchForm, setBatchForm] = useState<BatchFormState>(() => {
    const todayDate = new Date();
    const start = format(todayDate, 'yyyy-MM-dd');
    const end = format(
      endOfWeek(todayDate, { weekStartsOn: 1 }),
      'yyyy-MM-dd'
    );
    return {
      templateId: undefined,
      startDate: start,
      endDate: end,
      maxStaffAllowed: undefined,
      employmentType: undefined, // NULL = will inherit from template if available
      notes: '',
      roleRequirements: [],
    };
  });

  const [shiftToDelete, setShiftToDelete] = useState<Shift | null>(null);
  const [saving, setSaving] = useState(false);
  const [batchErrors, setBatchErrors] = useState<BatchFormErrors>({});
  const [shiftErrors, setShiftErrors] = useState<ShiftFormErrors>({});
  const [availableRoles, setAvailableRoles] = useState<StaffBusinessRole[]>([]);
  const [newRoleRequirement, setNewRoleRequirement] = useState<{
    roleId: number | '';
    quantity: number;
    required: boolean;
    notes: string;
  }>({
    roleId: '',
    quantity: 1,
    required: true,
    notes: '',
  });
  const [batchSkipConfirm, setBatchSkipConfirm] = useState<{
    open: boolean;
    closedDates: Array<{ date: string; reason: string }>;
    onConfirm: () => void;
  }>({ open: false, closedDates: [], onConfirm: () => {} });


  const branchId = useMemo(() => {
    if (managerBranch?.branchId) return managerBranch.branchId;
    if (user?.branch?.branchId) return user.branch.branchId;
    if (user?.branchId) return Number(user.branchId);
    return null;
  }, [user, managerBranch]);

  const today = useMemo(() => startOfDay(new Date()), []);

  const weekDays = useMemo(
    () =>
      eachDayOfInterval({
        start: currentWeekStart,
        end: endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
      }),
    [currentWeekStart]
  );

  const loadData = async () => {
    if (!branchId) {
      toast.error('Branch not found');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

      const startDate = format(currentWeekStart, 'yyyy-MM-dd');
      const endDate = format(
        endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
        'yyyy-MM-dd'
      );
      const [shiftList, templateList, closureList, assignmentsList, staffList, branch] = await Promise.all([
        shiftService.getByBranch({
          branchId,
          startDate,
          endDate,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
        }),
        shiftTemplateService.getByBranch(branchId),
        branchClosureService.list({ branchId }),
        shiftAssignmentService.getByBranch({
          branchId,
          startDate,
          endDate,
        }),
        staffService.getStaffsWithUserInfoByBranch(branchId),
        branchService.getBranch(String(branchId)),
      ]);

      setShifts(shiftList || []);
      setTemplates(templateList || []);
      setClosures(closureList || []);
      setBranchInfo(branch || null);

      // Group assignments by shift_id
      const assignmentsMap = new Map<number, ShiftAssignment[]>();
      assignmentsList.forEach(assignment => {
        if (!assignmentsMap.has(assignment.shiftId)) {
          assignmentsMap.set(assignment.shiftId, []);
        }
        assignmentsMap.get(assignment.shiftId)!.push(assignment);
      });
      setAssignments(assignmentsMap);

      // Create staff names map
      const namesMap = new Map<number, string>();
      staffList.forEach(staff => {
        namesMap.set(staff.userId, staff.fullname);
      });
      setStaffNames(namesMap);
    } catch (e: any) {
      console.error('Failed to load shifts', e);
      const errorMessage = e.response?.data?.message || e.message || 'Failed to load shifts';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, currentWeekStart, statusFilter]);

  // Real-time updates via WebSocket - simplified: all draft/assignment/request changes trigger reload
  useShiftWebSocket({
    onDraftCreated: (payload: ShiftUpdatePayload) => {
      const metadata = payload.metadata;
      if (metadata?.branchId && metadata.branchId === branchId) {
        loadData();
      }
    },
    onDraftUpdated: (payload: ShiftUpdatePayload) => {
      const metadata = payload.metadata;
      if (metadata?.branchId && metadata.branchId === branchId) {
        loadData();
      }
    },
    onDraftDeleted: (payload: ShiftUpdatePayload) => {
      const metadata = payload.metadata;
      if (metadata?.branchId && metadata.branchId === branchId) {
        loadData();
      }
    },
    onShiftPublished: (payload: ShiftUpdatePayload) => {
      const metadata = payload.metadata;
      if (metadata?.branchId && metadata.branchId === branchId) {
        loadData();
      }
    },
    onAssignmentCreated: (payload: ShiftUpdatePayload) => {
      const metadata = payload.metadata;
      if (metadata?.branchId && metadata.branchId === branchId) {
        loadData();
      }
    },
    onAssignmentApproved: (payload: ShiftUpdatePayload) => {
      const metadata = payload.metadata;
      if (metadata?.branchId && metadata.branchId === branchId) {
        loadData();
      }
    },
    onAssignmentRejected: (payload: ShiftUpdatePayload) => {
      const metadata = payload.metadata;
      if (metadata?.branchId && metadata.branchId === branchId) {
        loadData();
      }
    },
    onAssignmentDeleted: (payload: ShiftUpdatePayload) => {
      const metadata = payload.metadata;
      if (metadata?.branchId && metadata.branchId === branchId) {
        loadData();
      }
    },
    onAssignmentCheckedIn: (payload: ShiftUpdatePayload) => {
      const metadata = payload.metadata;
      if (metadata?.branchId && metadata.branchId === branchId) {
        loadData();
      }
    },
    onAssignmentCheckedOut: (payload: ShiftUpdatePayload) => {
      const metadata = payload.metadata;
      if (metadata?.branchId && metadata.branchId === branchId) {
        loadData();
      }
    },
  });

  useEffect(() => {
    // Load available staff business roles
    authService
      .getStaffBusinessRoles()
      .then((roles) => {
        setAvailableRoles(roles || []);
      })
      .catch((e) => {
        console.error('Failed to load staff business roles', e);
        setAvailableRoles([]);
      });
  }, []);

  // Parse openDays string to array of numbers (1=Monday, 7=Sunday)
  const parseOpenDays = (openDays?: string | null): number[] => {
    if (!openDays || !openDays.trim()) return [1, 2, 3, 4, 5, 6, 7]; // Default: all days
    const parts = openDays.split(',').map((p) => parseInt(p.trim(), 10));
    return Array.from(new Set(parts.filter((d) => d >= 1 && d <= 7))).sort((a, b) => a - b);
  };

  // Check if a date is a working day (within openDays)
  const isWorkingDay = (date: Date): boolean => {
    if (!branchInfo?.openDays) return true; // If no openDays info, allow all days
    const openDaysList = parseOpenDays(branchInfo.openDays);
    // Get day of week: 0=Sunday, 1=Monday, ..., 6=Saturday
    // Convert to our format: 1=Monday, 7=Sunday
    const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const dayNumber = dayOfWeek === 0 ? 7 : dayOfWeek; // Convert to 1-7 format
    return openDaysList.includes(dayNumber);
  };

  // Check if a date is within any branch closure
  const isDateClosed = (date: Date): BranchClosure | null => {
    const isoDate = format(date, 'yyyy-MM-dd');
    const dateObj = new Date(isoDate);
    
    for (const closure of closures) {
      const start = new Date(closure.startDate);
      const end = new Date(closure.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      dateObj.setHours(0, 0, 0, 0);
      
      // Check if closure applies to this branch (null = global, or matches branchId)
      const appliesToBranch = closure.branchId === null || closure.branchId === branchId;
      
      if (appliesToBranch && dateObj >= start && dateObj <= end) {
        return closure;
      }
    }
    return null;
  };

  const openCreateModal = (date: Date) => {
    if (isBefore(startOfDay(date), today)) {
      return;
    }
    // Check if date is a working day
    if (!isWorkingDay(date)) {
      toast.error('Cannot create shift: Branch is not open on this day of the week');
      return;
    }
    // Check if date is closed (branch closure)
    const closure = isDateClosed(date);
    if (closure) {
      const reason = closure.reason || 'Branch is closed on this date';
      toast.error(`Cannot create shift: ${reason}`);
      return;
    }
    setShiftMode('create');
    const isoDate = format(date, 'yyyy-MM-dd');

    // Suggest times: if there are existing shifts in this day,
    // use the previous shift's end time as new start time and keep a default duration,
    // also reuse previous max staff as a hint.
    const existingShifts = shifts
      .filter((s) => s.shiftDate === isoDate)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    let startTime = '08:00';
    let endTime = '14:00';
    let maxStaffAllowed: number | undefined = undefined;

    if (existingShifts.length > 0) {
      const last = existingShifts[existingShifts.length - 1];
      const lastEnd = timeToInput(last.endTime); // "HH:mm"
      startTime = lastEnd;
      // keep default duration (6h = 360 minutes) from new start
      endTime = addMinutesToTime(lastEnd, 360);
      if (last.maxStaffAllowed != null) {
        maxStaffAllowed = last.maxStaffAllowed;
      }
    }

    setShiftForm({
      ...buildInitialShiftForm(isoDate),
      startTime,
      endTime,
      maxStaffAllowed,
      roleRequirements: [],
    });
    setNewRoleRequirement({
      roleId: '',
      quantity: 1,
      required: true,
      notes: '',
    });
    setIsShiftModalOpen(true);
  };

  const openViewModal = async (shift: Shift) => {
    setShiftMode('view');
    
    // Load full shift data including roleRequirements
    let fullShift = shift;
    try {
      fullShift = await shiftService.getById(shift.shiftId);
    } catch (e) {
      console.error('Failed to load shift details', e);
      // Fallback to the shift data we already have
    }
    
    setShiftForm({
      shiftId: fullShift.shiftId,
      date: fullShift.shiftDate,
      templateId: fullShift.templateId ?? undefined,
      startTime: timeToInput(fullShift.startTime),
      endTime: timeToInput(fullShift.endTime),
      maxStaffAllowed: fullShift.maxStaffAllowed ?? undefined,
      employmentType: fullShift.employmentType ?? undefined,
      status: fullShift.status,
      notes: fullShift.notes || '',
      roleRequirements: (fullShift.roleRequirements || []).map(req => ({
        roleId: req.roleId,
        quantity: req.quantity,
        required: req.required ?? true,
        notes: req.notes ?? undefined,
      })),
    });
    setIsShiftModalOpen(true);
  };

  const openEditModal = async (shift: Shift) => {
    setShiftMode('edit');
    
    // Load full shift data including roleRequirements
    let fullShift = shift;
    try {
      fullShift = await shiftService.getById(shift.shiftId);
    } catch (e) {
      console.error('Failed to load shift details', e);
      // Fallback to the shift data we already have
    }
    
    setShiftForm({
      shiftId: fullShift.shiftId,
      date: fullShift.shiftDate,
      templateId: fullShift.templateId ?? undefined,
      startTime: timeToInput(fullShift.startTime),
      endTime: timeToInput(fullShift.endTime),
      maxStaffAllowed: fullShift.maxStaffAllowed ?? undefined,
      employmentType: fullShift.employmentType ?? undefined,
      status: fullShift.status,
      notes: fullShift.notes || '',
      roleRequirements: (fullShift.roleRequirements || []).map(req => ({
        roleId: req.roleId,
        quantity: req.quantity,
        required: req.required ?? true,
        notes: req.notes ?? undefined,
      })),
    });
    setNewRoleRequirement({
      roleId: '',
      quantity: 1,
      required: true,
      notes: '',
    });
    setIsShiftModalOpen(true);
  };


  const applyTemplateToForm = (templateId: number | null | undefined) => {
    if (!templateId) {
      setShiftForm((prev) => ({ ...prev, templateId: undefined, roleRequirements: [] }));
      return;
    }
    const tpl = templates.find((t) => t.templateId === templateId);
    if (!tpl) return;
    
    // Copy role requirements from template
    const roleRequirements: ShiftRoleRequirement[] = (tpl.roleRequirements || []).map(req => ({
      roleId: req.roleId,
      quantity: req.quantity,
      required: req.required ?? true,
      notes: req.notes ?? undefined,
    }));
    
    setShiftForm((prev) => ({
      ...prev,
      templateId,
      startTime: timeToInput(tpl.startTime),
      endTime: timeToInput(tpl.endTime),
      maxStaffAllowed: tpl.maxStaffAllowed ?? prev.maxStaffAllowed,
      employmentType: prev.employmentType ?? tpl.employmentType ?? undefined, // Keep current value or get from template
      roleRequirements,
    }));
  };

  const getRoleName = (roleId: number) => {
    const role = availableRoles.find((r) => r.roleId === roleId);
    return role?.roleName || role?.name || `Role #${roleId}`;
  };

  const addRoleRequirement = () => {
    if (!newRoleRequirement.roleId || newRoleRequirement.quantity < 1) {
      toast.error('Please select a role and set quantity (at least 1)');
      return;
    }

    // Check if role already exists
    const existing = shiftForm.roleRequirements?.find(
      (req) => req.roleId === newRoleRequirement.roleId
    );
    if (existing) {
      toast.error('This role is already added. Please remove it first or update the quantity.');
      return;
    }

    const newReq: ShiftRoleRequirement = {
      roleId: Number(newRoleRequirement.roleId),
      quantity: newRoleRequirement.quantity,
      required: newRoleRequirement.required,
      notes: newRoleRequirement.notes || undefined,
    };

    setShiftForm((prev) => ({
      ...prev,
      roleRequirements: [...(prev.roleRequirements || []), newReq],
    }));

    // Reset new role requirement form
    setNewRoleRequirement({
      roleId: '',
      quantity: 1,
      required: true,
      notes: '',
    });
  };

  const removeRoleRequirement = (roleId: number) => {
    setShiftForm((prev) => ({
      ...prev,
      roleRequirements: prev.roleRequirements?.filter((req) => req.roleId !== roleId) || [],
    }));
  };

  const updateRoleRequirement = (roleId: number, field: keyof ShiftRoleRequirement, value: any) => {
    setShiftForm((prev) => ({
      ...prev,
      roleRequirements: prev.roleRequirements?.map((req) =>
        req.roleId === roleId ? { ...req, [field]: value } : req
      ) || [],
    }));
  };

  const totalRoleQuantity = useMemo(() => {
    return shiftForm.roleRequirements?.reduce((sum, req) => sum + req.quantity, 0) || 0;
  }, [shiftForm.roleRequirements]);

  const handleShiftFormChange = (field: keyof ShiftFormState, value: any) => {
    setShiftForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'date' || field === 'startTime' || field === 'endTime') {
      setShiftErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBatchFormChange = (field: keyof BatchFormState, value: any) => {
    setBatchForm((prev) => ({ ...prev, [field]: value }));
    setBatchErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) return;

    const newErrors: ShiftFormErrors = {};
    if (!shiftForm.date) {
      newErrors.date = 'Date is required';
    } else {
      const dateObj = new Date(shiftForm.date);
      // Check if date is a working day
      if (!isWorkingDay(dateObj)) {
        newErrors.date = 'Cannot create shift: Branch is not open on this day of the week';
      } else {
        // Check if date is closed (branch closure)
        const closure = isDateClosed(dateObj);
        if (closure) {
          const reason = closure.reason || 'Branch is closed on this date';
          newErrors.date = `Cannot create shift: ${reason}`;
        }
      }
    }
    if (!shiftForm.startTime) {
      newErrors.startTime = 'Start time is required';
    }
    if (!shiftForm.endTime) {
      newErrors.endTime = 'End time is required';
    } else if (
      shiftForm.startTime &&
      shiftForm.startTime >= shiftForm.endTime
    ) {
      newErrors.endTime = 'End time must be after start time';
    }

    if (newErrors.date || newErrors.startTime || newErrors.endTime) {
      setShiftErrors(newErrors);
      return;
    }

    try {
      setSaving(true);

      const payload: any = {
        branchId,
        templateId: shiftForm.templateId ?? null,
        shiftDate: shiftForm.date,
        startTime: `${shiftForm.startTime}:00`,
        endTime: `${shiftForm.endTime}:00`,
        maxStaffAllowed: shiftForm.maxStaffAllowed ?? null,
        employmentType: shiftForm.employmentType ?? null,
        notes: shiftForm.notes || null,
      };
      
      // Add role requirements if any
      if (shiftForm.roleRequirements && shiftForm.roleRequirements.length > 0) {
        payload.roleRequirements = shiftForm.roleRequirements.map(req => ({
          roleId: req.roleId,
          quantity: req.quantity,
          required: req.required ?? true,
          notes: req.notes ?? null,
        }));
      }

      if (shiftMode === 'create') {
        await shiftService.createShift(payload);
        toast.success('Shift created successfully');
      } else if (shiftMode === 'edit' && shiftForm.shiftId) {
        await shiftService.updateShift(shiftForm.shiftId, {
          ...payload,
          status: shiftForm.status,
        });
        toast.success('Shift updated successfully');
      }

      setIsShiftModalOpen(false);
      await loadData();
    } catch (e: any) {
      console.error('Failed to save shift', e);
      const errorMessage = e.response?.data?.message || e.message || 'Failed to save shift';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handlePublishShift = async () => {
    if (!shiftForm.shiftId) return;
    try {
      setSaving(true);
      await shiftService.publishShift(shiftForm.shiftId);
      toast.success('Shift published successfully');
      setIsShiftModalOpen(false);
      await loadData();
    } catch (e: any) {
      console.error('Failed to publish shift', e);
      const errorMessage = e.response?.data?.message || e.message || 'Failed to publish shift';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleRevertToDraft = async () => {
    if (!shiftForm.shiftId) return;
    try {
      setSaving(true);
      await shiftService.revertToDraft(shiftForm.shiftId);
      // Update form status to DRAFT without closing modal
      setShiftForm((prev) => ({ ...prev, status: 'DRAFT' }));
      toast.success('Shift reverted to draft successfully. You can now edit the shift.');
      await loadData();
    } catch (e: any) {
      console.error('Failed to revert shift to draft', e);
      const errorMessage = e.response?.data?.message || e.message || 'Failed to revert shift to draft';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteShift = async () => {
    if (!shiftToDelete) return;
    try {
      await shiftService.deleteShift(shiftToDelete.shiftId);
      toast.success(
        shiftToDelete.status === 'DRAFT'
          ? 'Shift deleted successfully'
          : 'Shift cancelled successfully'
      );
      setShiftToDelete(null);
      setIsShiftModalOpen(false);
      await loadData();
    } catch (e: any) {
      console.error('Failed to delete shift', e);
      const errorMessage = e.response?.data?.message || e.message || 'Failed to delete shift';
      toast.error(errorMessage);
    }
  };

  const handleBatchCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) return;

    const newErrors: BatchFormErrors = {};
    if (!batchForm.templateId) {
      newErrors.templateId = 'Template is required';
    }
    if (!batchForm.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    if (!batchForm.endDate) {
      newErrors.endDate = 'End date is required';
    } else if (batchForm.startDate && batchForm.startDate > batchForm.endDate) {
      newErrors.endDate = 'End date must be after or equal to start date';
    }

    if (newErrors.templateId || newErrors.startDate || newErrors.endDate) {
      setBatchErrors(newErrors);
      return;
    }

    // Check all dates in the range for closures
    const startDateObj = parseISO(batchForm.startDate);
    const endDateObj = parseISO(batchForm.endDate);
    const allDates = eachDayOfInterval({ start: startDateObj, end: endDateObj });
    
    const closedDates: Array<{ date: string; reason: string }> = [];
    allDates.forEach((date) => {
      const closure = isDateClosed(date);
      if (closure) {
        const dateStr = format(date, 'yyyy-MM-dd');
        const reason = closure.reason || 'Branch is closed';
        closedDates.push({ date: dateStr, reason });
      }
    });

    // If there are closed dates, show confirmation modal
    if (closedDates.length > 0) {
      setBatchSkipConfirm({
        open: true,
        closedDates,
          onConfirm: async () => {
            setBatchSkipConfirm({ open: false, closedDates: [], onConfirm: () => {} });
            try {
              setSaving(true);
              const result = await shiftService.batchCreate({
                branchId,
                templateId: batchForm.templateId as number,
                startDate: batchForm.startDate,
                endDate: batchForm.endDate,
                maxStaffAllowed: batchForm.maxStaffAllowed ?? null,
                employmentType: batchForm.employmentType ?? null,
                notes: batchForm.notes || null,
                roleRequirements: batchForm.roleRequirements && batchForm.roleRequirements.length > 0
                  ? batchForm.roleRequirements.map(req => ({
                      roleId: req.roleId,
                      quantity: req.quantity,
                      required: req.required ?? true,
                      notes: req.notes ?? null,
                    }))
                  : undefined,
              });
              setIsBatchModalOpen(false);
              if (result && result.length > 0) {
                toast.success(`Shifts created successfully (${result.length} shift(s) created, ${closedDates.length} date(s) skipped due to branch closure)`);
              } else {
                toast.error('No shifts were created. All dates may be closed or overlap with existing shifts.');
              }
              await loadData();
            } catch (e: any) {
              console.error('Failed to batch create shifts', e);
              const errorMessage = e.response?.data?.message || e.message || 'Failed to batch create shifts';
              toast.error(errorMessage);
            } finally {
              setSaving(false);
            }
          },
      });
      return;
    }

    // No closed dates, proceed normally
    try {
      setSaving(true);
      const result = await shiftService.batchCreate({
        branchId,
        templateId: batchForm.templateId as number,
        startDate: batchForm.startDate,
        endDate: batchForm.endDate,
        maxStaffAllowed: batchForm.maxStaffAllowed ?? null,
        employmentType: batchForm.employmentType ?? null,
        notes: batchForm.notes || null,
        roleRequirements: batchForm.roleRequirements && batchForm.roleRequirements.length > 0
          ? batchForm.roleRequirements.map(req => ({
              roleId: req.roleId,
              quantity: req.quantity,
              required: req.required ?? true,
              notes: req.notes ?? null,
            }))
          : undefined,
      });
      setIsBatchModalOpen(false);
      if (result && result.length > 0) {
        toast.success(`Shifts created successfully (${result.length} shift(s) created)`);
      } else {
        toast.error('No shifts were created. All shifts may overlap with existing shifts.');
      }
      await loadData();
    } catch (e: any) {
      console.error('Failed to batch create shifts', e);
      const errorMessage = e.response?.data?.message || e.message || 'Failed to batch create shifts';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleBatchPublish = async () => {
    if (!branchId) return;
    
    const startDate = format(currentWeekStart, 'yyyy-MM-dd');
    const endDate = format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    
    try {
      setSaving(true);
      const result: BatchOperationResult = await shiftService.batchPublish({
        branchId,
        startDate,
        endDate,
      });
      
      if (result.successCount > 0) {
        const message = result.skippedCount > 0
          ? `Published ${result.successCount} shift(s) successfully. ${result.skippedCount} shift(s) skipped (not DRAFT).`
          : `Published ${result.successCount} shift(s) successfully.`;
        toast.success(message);
      } else {
        toast.error(`No shifts were published. ${result.skippedCount} shift(s) skipped (not DRAFT).`);
      }
      await loadData();
    } catch (e: any) {
      console.error('Failed to batch publish shifts', e);
      const errorMessage = e.response?.data?.message || e.message || 'Failed to batch publish shifts';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleBatchCancel = async () => {
    if (!branchId) return;
    
    const startDate = format(currentWeekStart, 'yyyy-MM-dd');
    const endDate = format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'yyyy-MM-dd');
    
    try {
      setSaving(true);
      const result: BatchOperationResult = await shiftService.batchCancel({
        branchId,
        startDate,
        endDate,
      });
      
      if (result.successCount > 0) {
        const message = result.skippedCount > 0
          ? `Cancelled ${result.successCount} shift(s) successfully. ${result.skippedCount} shift(s) skipped (not future shifts).`
          : `Cancelled ${result.successCount} shift(s) successfully.`;
        toast.success(message);
      } else {
        toast.error(`No shifts were cancelled. ${result.skippedCount} shift(s) skipped (not future shifts).`);
      }
      await loadData();
    } catch (e: any) {
      console.error('Failed to batch cancel shifts', e);
      const errorMessage = e.response?.data?.message || e.message || 'Failed to batch cancel shifts';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const shiftsByDate = useMemo(() => {
    const map: Record<string, Shift[]> = {};
    for (const s of shifts) {
      if (!map[s.shiftDate]) map[s.shiftDate] = [];
      map[s.shiftDate].push(s);
    }
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => a.startTime.localeCompare(b.startTime))
    );
    return map;
  }, [shifts]);

  const branchName = managerBranch?.name || user?.branch?.name || 'Branch';

  if (loading && shifts.length === 0) {
    return <ShiftCalendarSkeleton />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Shift schedule</h1>
            <p className="text-sm text-slate-500">
              {branchName} – Weekly view of planned shifts
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentWeekStart((prev) => addDays(prev, -7))
                  }
                  className="p-1 rounded-full hover:bg-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-medium text-slate-700 px-2">
                  {format(weekDays[0], 'dd MMM')} -{' '}
                  {format(weekDays[weekDays.length - 1], 'dd MMM yyyy')}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentWeekStart((prev) => addDays(prev, 7))
                  }
                  className="p-1 rounded-full hover:bg-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as 'ALL' | ShiftStatus)
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="ALL">All statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <button
                type="button"
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                title="Refresh shifts"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                type="button"
                onClick={() => openCreateModal(new Date())}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4" />
                New shift
              </button>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsBatchModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <CalendarIcon className="w-4 h-4" />
                Batch create
              </button>
              <button
                type="button"
                onClick={handleBatchPublish}
                disabled={saving || loading}
                className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700 hover:bg-sky-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                title="Publish all DRAFT shifts in current week"
              >
                <Send className="w-4 h-4" />
                Batch publish
              </button>
              <button
                type="button"
                onClick={handleBatchCancel}
                disabled={saving || loading}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                title="Cancel all future shifts in current week"
              >
                <XCircle className="w-4 h-4" />
                Batch cancel
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mt-6">
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="px-3 py-2 border-l border-slate-100 first:border-l-0">
                <div className="text-xs font-medium text-slate-500 uppercase">
                  {format(day, 'EEE', { locale: enUS })}
                </div>
                <div className="text-sm font-semibold text-slate-800">
                  {format(day, 'dd')}
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 min-h-[260px]">
            {weekDays.map((day) => {
              const iso = format(day, 'yyyy-MM-dd');
              const dayShifts = shiftsByDate[iso] || [];
              const isPast = isBefore(startOfDay(day), today);
              const closure = isDateClosed(day);
              const isClosed = closure !== null;
              return (
                <div
                  key={iso}
                  className="border-l border-t border-slate-100 first:border-l-0 flex flex-col"
                >
                  <button
                    type="button"
                    onClick={() => !isPast && !isClosed && openCreateModal(day)}
                    disabled={isPast || isClosed}
                    title={
                      isPast
                        ? 'Past day'
                        : isClosed
                        ? `Branch is closed: ${closure?.reason || 'No reason provided'}`
                        : 'Add shift'
                    }
                    className={`mx-2 mt-2 mb-1 inline-flex items-center justify-center rounded-lg border border-dashed px-2 py-1 text-xs ${
                      isPast || isClosed
                        ? 'border-slate-100 text-slate-200 cursor-not-allowed'
                        : 'border-slate-200 text-slate-400 hover:border-sky-300 hover:text-sky-600'
                    }`}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {isPast ? 'Past day' : isClosed ? 'Branch closed' : 'Add shift'}
                  </button>
                  <div className="flex-1 max-h-[calc(100vh-280px)] space-y-2 px-1 pb-2 overflow-y-auto">
                    {dayShifts.map((s) => (
                      <div
                        key={s.shiftId}
                        className={`w-full rounded-lg px-2 py-1.5 text-left text-xs border ${
                          s.status === 'PUBLISHED'
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                            : s.status === 'CANCELLED'
                            ? 'bg-red-50 border-red-100 text-red-800 line-through'
                            : 'bg-sky-50 border-sky-100 text-sky-800'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => openViewModal(s)}
                          className="w-full text-left"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">
                              {timeToInput(s.startTime)} - {timeToInput(s.endTime)}
                            </span>
                            <span className="text-[10px] uppercase tracking-wide">
                              {s.status.toLowerCase()}
                            </span>
                          </div>
                          <div className="mt-0.5 space-y-0.5">
                            <div className="flex items-center justify-between text-[11px] text-slate-600">
                              <span>
                                {s.maxStaffAllowed != null
                                  ? `Max ${s.maxStaffAllowed} staff`
                                  : 'No limit'}
                              </span>
                              {s.notes && <span className="truncate max-w-[90px]">{s.notes}</span>}
                            </div>
                            {(() => {
                              const shiftAssignments = assignments.get(s.shiftId) || [];
                              // Only show confirmed assignments (CONFIRMED, CHECKED_IN, CHECKED_OUT)
                              const confirmedAssignments = shiftAssignments.filter(
                                a => a.status === 'CONFIRMED' || 
                                     a.status === 'CHECKED_IN' || 
                                     a.status === 'CHECKED_OUT'
                              );
                              if (confirmedAssignments.length > 0) {
                                const staffNamesList = confirmedAssignments
                                  .map(a => staffNames.get(a.staffUserId) || `Staff ${a.staffUserId}`)
                                  .filter((name, index, arr) => arr.indexOf(name) === index); // Remove duplicates
                                return (
                                  <div className="text-[10px] text-slate-500 mt-1 pt-1 border-t border-slate-200">
                                    <span className="font-medium">Staff: </span>
                                    <span>{staffNamesList.join(', ')}</span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </button>
                      </div>
                    ))}
                    {dayShifts.length === 0 && (
                      <div className="mt-4 text-center text-[11px]">
                        {isClosed ? (
                          <span className="text-red-600 font-medium">
                            {closure?.reason || 'Branch is closed'}
                          </span>
                        ) : (
                          <span className="text-slate-300">No shifts</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Shift modal */}
        {isShiftModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-slate-100 bg-white shadow-xl flex flex-col max-h-[90vh] relative">
              {/* Loading Overlay */}
              {saving && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-slate-200 border-t-sky-600 rounded-full animate-spin"></div>
                    <p className="text-sm font-medium text-slate-700">Saving shift...</p>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 flex-shrink-0">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {shiftMode === 'create' ? 'Create shift' : shiftMode === 'view' ? 'View shift' : 'Edit shift'}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {shiftMode === 'view' 
                      ? 'View shift details and role requirements.'
                      : 'Configure time, capacity and status for this shift.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsShiftModalOpen(false)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                {shiftMode === 'view' ? (
                  <div className="space-y-4 px-6 py-4">
                    {/* View Mode - Read-only display */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Date</label>
                        <div className="text-sm font-medium text-slate-900">
                          {format(parseISO(shiftForm.date), 'EEEE, dd/MM/yyyy')}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Template</label>
                        <div className="text-sm font-medium text-slate-900">
                          {shiftForm.templateId 
                            ? templates.find(t => t.templateId === shiftForm.templateId)?.name || 'Unknown'
                            : 'Custom time'}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Start time</label>
                        <div className="text-sm font-medium text-slate-900">{shiftForm.startTime}</div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">End time</label>
                        <div className="text-sm font-medium text-slate-900">{shiftForm.endTime}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Max staff</label>
                        <div className="text-sm font-medium text-slate-900">
                          {shiftForm.maxStaffAllowed != null ? shiftForm.maxStaffAllowed : 'No limit'}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Employment Type</label>
                        <div className="text-sm font-medium text-slate-900">
                          {shiftForm.employmentType 
                            ? shiftForm.employmentType.replace('_', '-')
                            : 'Inherit from template'}
                        </div>
                      </div>
                    </div>
                    {shiftMode === 'view' && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Status</label>
                        <div>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            shiftForm.status === 'PUBLISHED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : shiftForm.status === 'CANCELLED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}>
                            {shiftForm.status}
                          </span>
                        </div>
                      </div>
                    )}
                    {shiftForm.notes && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-500">Notes</label>
                        <div className="text-sm text-slate-900 whitespace-pre-wrap">{shiftForm.notes}</div>
                      </div>
                    )}

                    {/* Role Requirements Section - View Mode */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-slate-700">
                          Role Requirements
                        </label>
                        <span className="text-xs text-slate-500">
                          {shiftForm.roleRequirements?.length || 0} role(s), {shiftForm.roleRequirements?.reduce((sum, req) => sum + req.quantity, 0) || 0} position(s)
                        </span>
                      </div>
                      {shiftForm.roleRequirements && shiftForm.roleRequirements.length > 0 ? (
                        <div className="space-y-2 mt-3">
                          {shiftForm.roleRequirements.map((req) => (
                            <div
                              key={req.roleId}
                              className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-slate-900">
                                    {getRoleName(req.roleId)}
                                  </span>
                                  <span className="text-xs text-slate-500">×</span>
                                  <span className="text-sm text-slate-700">{req.quantity}</span>
                                  <span className="text-xs text-slate-500">staff</span>
                                  {req.required !== false && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                                      Required
                                    </span>
                                  )}
                                </div>
                                {req.notes && (
                                  <p className="text-xs text-slate-500 mt-1">{req.notes}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 mt-2">No role requirements defined.</p>
                      )}
                    </div>
                  </div>
                ) : (
                <form onSubmit={handleSaveShift} className="space-y-4 px-6 py-4">
                {shiftMode === 'edit' && shiftForm.status === 'PUBLISHED' && (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                    This shift is published and cannot be edited. Revert to draft to make changes.
                  </div>
                )}
                {shiftMode === 'edit' && shiftForm.status === 'CANCELLED' && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
                    This shift is cancelled and cannot be edited.
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      Date
                    </label>
                    <input
                      type="date"
                      value={shiftForm.date}
                      min={format(today, 'yyyy-MM-dd')}
                      onChange={(e) =>
                        handleShiftFormChange('date', e.target.value)
                      }
                      disabled={shiftMode === 'edit' && (shiftForm.status === 'PUBLISHED' || shiftForm.status === 'CANCELLED')}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                        shiftErrors.date
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500'
                      } ${shiftMode === 'edit' && (shiftForm.status === 'PUBLISHED' || shiftForm.status === 'CANCELLED') ? 'bg-slate-50 cursor-not-allowed' : ''}`}
                    />
                    {shiftErrors.date && (
                      <p className="mt-0.5 text-xs text-red-600">
                        {shiftErrors.date}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      Template
                    </label>
                    <select
                      value={shiftForm.templateId ?? ''}
                      onChange={(e) =>
                        applyTemplateToForm(
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                      disabled={shiftMode === 'edit' && (shiftForm.status === 'PUBLISHED' || shiftForm.status === 'CANCELLED')}
                      className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                        shiftMode === 'edit' && (shiftForm.status === 'PUBLISHED' || shiftForm.status === 'CANCELLED') ? 'bg-slate-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <option value="">Custom time</option>
                      {templates.map((tpl) => (
                        <option key={tpl.templateId} value={tpl.templateId}>
                          {tpl.name} ({timeToInput(tpl.startTime)}-
                          {timeToInput(tpl.endTime)})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      Start time
                    </label>
                    <input
                      type="time"
                      value={shiftForm.startTime}
                      onChange={(e) =>
                        handleShiftFormChange('startTime', e.target.value)
                      }
                      disabled={shiftMode === 'edit' && (shiftForm.status === 'PUBLISHED' || shiftForm.status === 'CANCELLED')}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                        shiftErrors.startTime
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500'
                      } ${shiftMode === 'edit' && (shiftForm.status === 'PUBLISHED' || shiftForm.status === 'CANCELLED') ? 'bg-slate-50 cursor-not-allowed' : ''}`}
                    />
                    {shiftErrors.startTime && (
                      <p className="mt-0.5 text-xs text-red-600">
                        {shiftErrors.startTime}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      End time
                    </label>
                    <input
                      type="time"
                      value={shiftForm.endTime}
                      onChange={(e) =>
                        handleShiftFormChange('endTime', e.target.value)
                      }
                      disabled={shiftMode === 'edit' && (shiftForm.status === 'PUBLISHED' || shiftForm.status === 'CANCELLED')}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                        shiftErrors.endTime
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500'
                      } ${shiftMode === 'edit' && (shiftForm.status === 'PUBLISHED' || shiftForm.status === 'CANCELLED') ? 'bg-slate-50 cursor-not-allowed' : ''}`}
                    />
                    {shiftErrors.endTime && (
                      <p className="mt-0.5 text-xs text-red-600">
                        {shiftErrors.endTime}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      Max staff
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={shiftForm.maxStaffAllowed ?? ''}
                      onChange={(e) =>
                        handleShiftFormChange(
                          'maxStaffAllowed',
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                      disabled={shiftMode === 'edit' && (shiftForm.status === 'PUBLISHED' || shiftForm.status === 'CANCELLED')}
                      className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                        shiftMode === 'edit' && (shiftForm.status === 'PUBLISHED' || shiftForm.status === 'CANCELLED') ? 'bg-slate-50 cursor-not-allowed' : ''
                      }`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      Employment Type
                    </label>
                    <select
                      value={shiftForm.employmentType ?? ''}
                      onChange={(e) =>
                        handleShiftFormChange(
                          'employmentType',
                          e.target.value ? (e.target.value as EmploymentType) : null
                        )
                      }
                      disabled={shiftMode === 'edit' && (shiftForm.status === 'PUBLISHED' || shiftForm.status === 'CANCELLED')}
                      className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                        shiftMode === 'edit' && (shiftForm.status === 'PUBLISHED' || shiftForm.status === 'CANCELLED') ? 'bg-slate-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <option value="">Inherit from template</option>
                      <option value="ANY">Any (All types)</option>
                      <option value="FULL_TIME">Full-time only</option>
                      <option value="PART_TIME">Part-time only</option>
                      <option value="CASUAL">Casual only</option>
                    </select>
                    <p className="text-xs text-slate-400">
                      Leave empty to inherit from template
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {shiftMode === 'edit' && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700">
                        Status
                      </label>
                      <select
                        value={shiftForm.status}
                        onChange={(e) =>
                          handleShiftFormChange(
                            'status',
                            e.target.value as ShiftStatus
                          )
                        }
                        disabled={shiftMode === 'edit' && (shiftForm.status === 'PUBLISHED' || shiftForm.status === 'CANCELLED')}
                        className={`w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                          shiftMode === 'edit' && (shiftForm.status === 'PUBLISHED' || shiftForm.status === 'CANCELLED') ? 'bg-slate-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="PUBLISHED">Published</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    Notes
                  </label>
                  <textarea
                    value={shiftForm.notes}
                    onChange={(e) =>
                      handleShiftFormChange('notes', e.target.value)
                    }
                    rows={3}
                    disabled={shiftMode === 'edit' && (shiftForm.status === 'PUBLISHED' || shiftForm.status === 'CANCELLED')}
                    className={`w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
                      shiftMode === 'edit' && (shiftForm.status === 'PUBLISHED' || shiftForm.status === 'CANCELLED') ? 'bg-slate-50 cursor-not-allowed' : ''
                    }`}
                    placeholder="Optional notes about this shift..."
                  />
                </div>

                {/* Role Requirements Section */}
                {shiftMode === 'create' || (shiftMode === 'edit' && shiftForm.status !== 'PUBLISHED' && shiftForm.status !== 'CANCELLED') ? (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-700">
                        Role Requirements
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">
                          {shiftForm.roleRequirements?.length || 0} role(s), {totalRoleQuantity} position(s)
                        </span>
                        {shiftForm.maxStaffAllowed && (
                          <span className={`text-xs font-medium ${
                            totalRoleQuantity > shiftForm.maxStaffAllowed
                              ? 'text-amber-600'
                              : totalRoleQuantity === shiftForm.maxStaffAllowed
                              ? 'text-blue-600'
                              : 'text-slate-500'
                          }`}>
                            / {shiftForm.maxStaffAllowed} max staff
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">
                      Define how many staff of each role are needed for this shift.
                      <span className="block mt-0.5 text-slate-400">
                        Note: One person can have multiple roles, so total positions may exceed max staff.
                      </span>
                    </p>

                    {/* Warning/Info message */}
                    {shiftForm.maxStaffAllowed && shiftForm.roleRequirements && shiftForm.roleRequirements.length > 0 && (
                      <div className={`rounded-lg border px-3 py-2 text-xs ${
                        totalRoleQuantity > shiftForm.maxStaffAllowed
                          ? 'border-amber-200 bg-amber-50 text-amber-800'
                          : totalRoleQuantity === shiftForm.maxStaffAllowed
                          ? 'border-blue-200 bg-blue-50 text-blue-800'
                          : ''
                      }`}>
                        <div className="flex items-start gap-2">
                          <span className="font-semibold">
                            {totalRoleQuantity > shiftForm.maxStaffAllowed ? '⚠️ Warning:' : 'ℹ️ Info:'}
                          </span>
                          <span>
                            {totalRoleQuantity > shiftForm.maxStaffAllowed
                              ? `Total role requirements (${totalRoleQuantity}) exceeds max staff allowed (${shiftForm.maxStaffAllowed}). Note: One person can have multiple roles, so this might still be valid if staff can cover multiple positions.`
                              : totalRoleQuantity === shiftForm.maxStaffAllowed
                              ? `Total role requirements (${totalRoleQuantity}) equals max staff allowed. Each staff member would need to cover exactly one role.`
                              : ''}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* List of added role requirements */}
                    {shiftForm.roleRequirements && shiftForm.roleRequirements.length > 0 && (
                      <div className="space-y-2 mt-3">
                        {shiftForm.roleRequirements.map((req) => (
                          <div
                            key={req.roleId}
                            className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-900">
                                  {getRoleName(req.roleId)}
                                </span>
                                <span className="text-xs text-slate-500">×</span>
                                <input
                                  type="number"
                                  min={1}
                                  value={req.quantity}
                                  onChange={(e) =>
                                    updateRoleRequirement(
                                      req.roleId,
                                      'quantity',
                                      Number(e.target.value)
                                    )
                                  }
                                  className="w-16 rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                                />
                                <span className="text-xs text-slate-500">staff</span>
                                <label className="flex items-center gap-1 ml-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={req.required ?? true}
                                    onChange={(e) =>
                                      updateRoleRequirement(
                                        req.roleId,
                                        'required',
                                        e.target.checked
                                      )
                                    }
                                    className="h-3 w-3 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                  />
                                  <span className="text-xs text-slate-600">Required</span>
                                </label>
                              </div>
                              {req.notes && (
                                <p className="text-xs text-slate-500 mt-1">{req.notes}</p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeRoleRequirement(req.roleId)}
                              className="flex-shrink-0 p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50"
                              title="Remove role requirement"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add new role requirement form */}
                    <div className="mt-3 p-3 rounded-lg border border-slate-200 bg-white">
                      <div className="grid grid-cols-1 gap-2">
                        <div>
                          <label className="text-xs font-medium text-slate-700 mb-1 block">
                            Role
                          </label>
                          <select
                            value={newRoleRequirement.roleId}
                            onChange={(e) =>
                              setNewRoleRequirement((prev) => ({
                                ...prev,
                                roleId: e.target.value ? Number(e.target.value) : '',
                              }))
                            }
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                          >
                            <option value="">Select a role...</option>
                            {availableRoles
                              .filter(
                                (role) =>
                                  !shiftForm.roleRequirements?.some(
                                    (req) => req.roleId === role.roleId
                                  )
                              )
                              .map((role) => (
                                <option key={role.roleId} value={role.roleId}>
                                  {role.roleName || role.name}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs font-medium text-slate-700 mb-1 block">
                              Quantity
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={newRoleRequirement.quantity}
                              onChange={(e) =>
                                setNewRoleRequirement((prev) => ({
                                  ...prev,
                                  quantity: Number(e.target.value) || 1,
                                }))
                              }
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                            />
                          </div>
                          <div className="flex items-end">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newRoleRequirement.required}
                                onChange={(e) =>
                                  setNewRoleRequirement((prev) => ({
                                    ...prev,
                                    required: e.target.checked,
                                  }))
                                }
                                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                              />
                              <span className="text-xs text-slate-700">Required</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-slate-700 mb-1 block">
                            Notes (optional)
                          </label>
                          <input
                            type="text"
                            value={newRoleRequirement.notes}
                            onChange={(e) =>
                              setNewRoleRequirement((prev) => ({
                                ...prev,
                                notes: e.target.value,
                              }))
                            }
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                            placeholder="e.g. Must have experience..."
                          />
                        </div>
                        <button
                          type="button"
                          onClick={addRoleRequirement}
                          disabled={!newRoleRequirement.roleId || newRoleRequirement.quantity < 1}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4" />
                          Add Role Requirement
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
                </form>
                )}
              </div>
              <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-3 sm:flex-row sm:items-center sm:justify-between flex-shrink-0 bg-white">
                {shiftMode === 'view' ? (
                  <div className="flex items-center gap-2 justify-end w-full">
                    <button
                      type="button"
                      onClick={() => setIsShiftModalOpen(false)}
                      className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Close
                    </button>
                    {shiftForm.status === 'PUBLISHED' && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (shiftForm.shiftId) {
                            try {
                              setSaving(true);
                              await shiftService.revertToDraft(shiftForm.shiftId);
                              toast.success('Shift reverted to draft successfully. You can now edit the shift.');
                              // Reload shift data from API and switch to edit mode
                              const updatedShift = await shiftService.getById(shiftForm.shiftId);
                              await loadData();
                              if (updatedShift) {
                                openEditModal(updatedShift);
                              }
                            } catch (e: any) {
                              console.error('Failed to revert shift to draft', e);
                              const errorMessage = e.response?.data?.message || e.message || 'Failed to revert shift to draft';
                              toast.error(errorMessage);
                            } finally {
                              setSaving(false);
                            }
                          }
                        }}
                        disabled={saving}
                        className="px-4 py-2 rounded-lg border border-amber-200 text-sm text-amber-700 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Reverting...' : 'Back to Draft'}
                      </button>
                    )}
                    {shiftForm.status !== 'PUBLISHED' && shiftForm.status !== 'CANCELLED' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (shiftForm.shiftId) {
                            const shift = shifts.find(s => s.shiftId === shiftForm.shiftId);
                            if (shift) {
                              openEditModal(shift);
                            }
                          }
                        }}
                        className="px-4 py-2 rounded-lg bg-sky-600 text-sm font-medium text-white hover:bg-sky-700"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-400">
                      <span className="font-semibold">Note:</span> Staff
                      assignments will be managed separately.
                    </p>
                    <div className="flex items-center gap-2 justify-end whitespace-nowrap">
                  {shiftMode === 'edit' && shiftForm.status === 'DRAFT' && (
                    <button
                      type="button"
                      onClick={() =>
                        shiftForm.shiftId &&
                        setShiftToDelete(
                          shifts.find(
                            (s) => s.shiftId === shiftForm.shiftId
                          ) || null
                        )
                      }
                      className="px-3 py-1.5 rounded-lg border border-red-200 text-sm text-red-600 hover:bg-red-50"
                      disabled={saving}
                    >
                      Delete shift
                    </button>
                  )}
                  {shiftMode === 'edit' && shiftForm.status === 'CANCELLED' && 
                    shiftForm.date && 
                    !isBefore(parseISO(shiftForm.date), startOfDay(today)) && (
                    <button
                      type="button"
                      onClick={() =>
                        shiftForm.shiftId &&
                        setShiftToDelete(
                          shifts.find(
                            (s) => s.shiftId === shiftForm.shiftId
                          ) || null
                        )
                      }
                      className="px-3 py-1.5 rounded-lg border border-red-200 text-sm text-red-600 hover:bg-red-50"
                      disabled={saving}
                    >
                      Delete shift
                    </button>
                  )}
                  {shiftMode === 'edit' && shiftForm.status === 'PUBLISHED' && (
                    <button
                      type="button"
                      onClick={handleRevertToDraft}
                      className="px-3 py-1.5 rounded-lg border border-amber-200 text-sm text-amber-700 hover:bg-amber-50"
                      disabled={saving}
                    >
                      Back to Draft
                    </button>
                  )}
                  {shiftMode === 'edit' && shiftForm.status !== 'PUBLISHED' && shiftForm.status !== 'CANCELLED' && (
                    <button
                      type="button"
                      onClick={handlePublishShift}
                      className="px-3 py-1.5 rounded-lg border border-sky-200 text-sm text-sky-700 hover:bg-sky-50"
                      disabled={saving}
                    >
                      Publish
                    </button>
                  )}
                  {shiftMode === 'edit' && shiftForm.status !== 'PUBLISHED' && shiftForm.status !== 'CANCELLED' && (
                    <button
                      type="button"
                      onClick={handleSaveShift}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60 min-w-[130px] justify-center"
                    >
                      {saving && <Clock4 className="w-4 h-4 animate-spin" />}
                      Save changes
                    </button>
                  )}
                  {shiftMode === 'create' && (
                    <button
                      type="button"
                      onClick={handleSaveShift}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60 min-w-[130px] justify-center"
                    >
                      {saving && <Clock4 className="w-4 h-4 animate-spin" />}
                      Create shift
                    </button>
                  )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Batch modal */}
        {isBatchModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
            <div className="w-full max-w-lg max-h-[90vh] rounded-2xl border border-slate-100 bg-white shadow-xl flex flex-col relative">
              {/* Loading Overlay */}
              {saving && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="text-sm font-medium text-slate-700">Creating shifts...</p>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 flex-shrink-0">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Batch create shifts from template
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Create shifts for multiple days using a single template.
                  </p>
                </div>
              </div>
              <form onSubmit={handleBatchCreate} className={`flex-1 min-h-0 overflow-y-auto space-y-4 px-6 py-4 ${saving ? 'pointer-events-none opacity-60' : ''}`}>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    Template
                  </label>
                  <select
                    value={batchForm.templateId ?? ''}
                    onChange={(e) =>
                      (() => {
                        const value = e.target.value
                          ? Number(e.target.value)
                          : undefined;
                        handleBatchFormChange('templateId', value);
                        if (value) {
                          const tpl = templates.find(
                            (t) => t.templateId === value
                          );
                          if (tpl) {
                            if (tpl.maxStaffAllowed != null) {
                              handleBatchFormChange(
                                'maxStaffAllowed',
                                tpl.maxStaffAllowed
                              );
                            }
                            // Copy employmentType from template if not already set
                            if (batchForm.employmentType === undefined && tpl.employmentType) {
                              handleBatchFormChange('employmentType', tpl.employmentType);
                            }
                            // Copy role requirements from template
                            const roleRequirements: ShiftRoleRequirement[] = (tpl.roleRequirements || []).map(req => ({
                              roleId: req.roleId,
                              quantity: req.quantity,
                              required: req.required ?? true,
                              notes: req.notes ?? undefined,
                            }));
                            handleBatchFormChange('roleRequirements', roleRequirements);
                          }
                        } else {
                          handleBatchFormChange('roleRequirements', []);
                        }
                      })()
                    }
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                      batchErrors.templateId
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500'
                    }`}
                  >
                    <option value="">Select template</option>
                    {templates.map((tpl) => (
                      <option key={tpl.templateId} value={tpl.templateId}>
                        {tpl.name} ({timeToInput(tpl.startTime)}-
                        {timeToInput(tpl.endTime)})
                      </option>
                    ))}
                  </select>
                  {batchErrors.templateId && (
                    <p className="text-xs text-red-600 mt-0.5">{batchErrors.templateId}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      Start date
                    </label>
                    <input
                      type="date"
                      value={batchForm.startDate}
                      min={format(today, 'yyyy-MM-dd')}
                      onChange={(e) =>
                        handleBatchFormChange('startDate', e.target.value)
                      }
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                        batchErrors.startDate
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                          : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500'
                      }`}
                    />
                    {batchErrors.startDate && (
                      <p className="text-xs text-red-600 mt-0.5">{batchErrors.startDate}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      End date
                    </label>
                    <input
                      type="date"
                      value={batchForm.endDate}
                      min={format(today, 'yyyy-MM-dd')}
                      onChange={(e) =>
                        handleBatchFormChange('endDate', e.target.value)
                      }
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                        batchErrors.endDate
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                          : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500'
                      }`}
                    />
                    {batchErrors.endDate && (
                      <p className="text-xs text-red-600 mt-0.5">{batchErrors.endDate}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      Max staff (optional override)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={batchForm.maxStaffAllowed ?? ''}
                      onChange={(e) =>
                        handleBatchFormChange(
                          'maxStaffAllowed',
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      Employment Type
                    </label>
                    <select
                      value={batchForm.employmentType ?? ''}
                      onChange={(e) =>
                        handleBatchFormChange(
                          'employmentType',
                          e.target.value ? (e.target.value as EmploymentType) : null
                        )
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="">Inherit from template</option>
                      <option value="ANY">Any (All types)</option>
                      <option value="FULL_TIME">Full-time only</option>
                      <option value="PART_TIME">Part-time only</option>
                      <option value="CASUAL">Casual only</option>
                    </select>
                    <p className="text-xs text-slate-400">
                      Leave empty to inherit from template
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    Notes
                  </label>
                  <textarea
                    value={batchForm.notes}
                    onChange={(e) =>
                      handleBatchFormChange('notes', e.target.value)
                    }
                    rows={3}
                    className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="Optional notes for all created shifts..."
                  />
                </div>

                {/* Role Requirements Section */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-700">
                      Role Requirements (Optional)
                    </label>
                    <span className="text-xs text-slate-500">
                      {batchForm.roleRequirements?.length || 0} role(s), {batchForm.roleRequirements?.reduce((sum, req) => sum + req.quantity, 0) || 0} position(s)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Define role requirements for all created shifts. If not specified, role requirements will be copied from the selected template.
                  </p>

                  {/* List of added role requirements */}
                  {batchForm.roleRequirements && batchForm.roleRequirements.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {batchForm.roleRequirements.map((req) => (
                        <div
                          key={req.roleId}
                          className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-900">
                                {getRoleName(req.roleId)}
                              </span>
                              <span className="text-xs text-slate-500">×</span>
                              <input
                                type="number"
                                min={1}
                                value={req.quantity}
                                onChange={(e) => {
                                  const updated = batchForm.roleRequirements?.map(r =>
                                    r.roleId === req.roleId
                                      ? { ...r, quantity: Number(e.target.value) }
                                      : r
                                  ) || [];
                                  handleBatchFormChange('roleRequirements', updated);
                                }}
                                className="w-16 rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                              />
                              <span className="text-xs text-slate-500">staff</span>
                              <label className="flex items-center gap-1 ml-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={req.required ?? true}
                                  onChange={(e) => {
                                    const updated = batchForm.roleRequirements?.map(r =>
                                      r.roleId === req.roleId
                                        ? { ...r, required: e.target.checked }
                                        : r
                                    ) || [];
                                    handleBatchFormChange('roleRequirements', updated);
                                  }}
                                  className="h-3 w-3 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                />
                                <span className="text-xs text-slate-600">Required</span>
                              </label>
                            </div>
                            {req.notes && (
                              <p className="text-xs text-slate-500 mt-1">{req.notes}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = batchForm.roleRequirements?.filter(r => r.roleId !== req.roleId) || [];
                              handleBatchFormChange('roleRequirements', updated);
                            }}
                            className="flex-shrink-0 p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50"
                            title="Remove role requirement"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new role requirement form */}
                  <div className="mt-3 p-3 rounded-lg border border-slate-200 bg-white">
                    <div className="grid grid-cols-1 gap-2">
                      <select
                        value={newRoleRequirement.roleId || ''}
                        onChange={(e) =>
                          setNewRoleRequirement((prev) => ({
                            ...prev,
                            roleId: e.target.value ? Number(e.target.value) : '',
                          }))
                        }
                        className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="">Select role...</option>
                        {availableRoles
                          .filter(
                            (role) =>
                              !batchForm.roleRequirements?.some(
                                (req) => req.roleId === role.roleId
                              )
                          )
                          .map((role) => (
                            <option key={role.roleId} value={role.roleId}>
                              {role.roleName || role.name}
                            </option>
                          ))}
                      </select>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          value={newRoleRequirement.quantity}
                          onChange={(e) =>
                            setNewRoleRequirement((prev) => ({
                              ...prev,
                              quantity: Number(e.target.value),
                            }))
                          }
                          placeholder="Quantity"
                          className="flex-1 rounded border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newRoleRequirement.required}
                            onChange={(e) =>
                              setNewRoleRequirement((prev) => ({
                                ...prev,
                                required: e.target.checked,
                              }))
                            }
                            className="h-3 w-3 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                          />
                          <span className="text-xs text-slate-600">Required</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            if (!newRoleRequirement.roleId || newRoleRequirement.quantity < 1) {
                              toast.error('Please select a role and set quantity (at least 1)');
                              return;
                            }
                            const newReq: ShiftRoleRequirement = {
                              roleId: newRoleRequirement.roleId as number,
                              quantity: newRoleRequirement.quantity,
                              required: newRoleRequirement.required,
                              notes: newRoleRequirement.notes || undefined,
                            };
                            const updated = [...(batchForm.roleRequirements || []), newReq];
                            handleBatchFormChange('roleRequirements', updated);
                            setNewRoleRequirement({
                              roleId: '',
                              quantity: 1,
                              required: true,
                              notes: '',
                            });
                          }}
                          className="px-3 py-1.5 rounded bg-sky-600 text-white text-xs font-medium hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        >
                          Add
                        </button>
                      </div>
                      <input
                        type="text"
                        value={newRoleRequirement.notes}
                        onChange={(e) =>
                          setNewRoleRequirement((prev) => ({
                            ...prev,
                            notes: e.target.value,
                          }))
                        }
                        placeholder="Optional notes..."
                        className="w-full rounded border border-slate-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    </div>
                  </div>
                </div>
              </form>
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
                  disabled={saving}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleBatchCreate}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
                >
                  {saving && <Clock4 className="w-4 h-4 animate-spin" />}
                  Create shifts
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Batch create skip confirmation modal */}
        <ConfirmModal
          open={batchSkipConfirm.open}
          title="Branch Closures Detected"
          description={
            <div className="space-y-2">
              <p>
                The following {batchSkipConfirm.closedDates.length} date(s) will be skipped because the branch is closed:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 max-h-40 overflow-y-auto">
                {batchSkipConfirm.closedDates.map((item, idx) => (
                  <li key={idx}>
                    <span className="font-medium">{format(parseISO(item.date), 'dd/MM/yyyy')}</span>
                    {item.reason && <span className="ml-2">- {item.reason}</span>}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-slate-700 mt-2">
                Shifts will be created for the remaining dates. Continue?
              </p>
            </div>
          }
          confirmText="Continue"
          cancelText="Cancel"
          onConfirm={batchSkipConfirm.onConfirm}
          onCancel={() => setBatchSkipConfirm({ open: false, closedDates: [], onConfirm: () => {} })}
        />

        <ConfirmModal
          open={!!shiftToDelete}
          title={shiftToDelete?.status === 'DRAFT' ? 'Delete shift' : 'Cancel shift'}
          description={
            shiftToDelete
              ? `Are you sure you want to ${shiftToDelete.status === 'DRAFT' ? 'delete' : 'cancel'} the shift on ${shiftToDelete.shiftDate} from ${timeToInput(
                  shiftToDelete.startTime
                )} to ${timeToInput(
                  shiftToDelete.endTime
                )}? Assignments will be handled separately.`
              : undefined
          }
          confirmText={shiftToDelete?.status === 'DRAFT' ? 'Delete' : 'Cancel shift'}
          cancelText="Keep shift"
          onConfirm={handleDeleteShift}
          onCancel={() => setShiftToDelete(null)}
        />

        </div>
      </div>
    </div>
  );
}



