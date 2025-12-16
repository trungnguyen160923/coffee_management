import { format, parseISO } from 'date-fns';
import { X, Clock4, User, Briefcase, Users, CheckCircle2, XCircle, Trash2, Gift, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { ShiftAssignment } from '../../services/shiftAssignmentService';
import { Shift } from '../../services/shiftService';
import { bonusService, penaltyService, payrollTemplateService } from '../../services';
import { BonusType, PenaltyType } from '../../types/payroll';
import { useEffect, useState } from 'react';
import { BonusTemplate, PenaltyConfig } from '../../services/payrollTemplateService';

interface AssignmentDetailModalProps {
  isOpen: boolean;
  selectedDate: string | null;
  selectedAssignments: ShiftAssignment[];
  shifts: Map<number, Shift>;
  staffNames: Map<number, string>;
  staffEmploymentTypes: Map<number, string | null>;
  detailModalStatusFilter: string;
  detailModalShiftFilter: string;
  detailModalEmploymentTypeFilter: string;
  detailModalStaffNameFilter: string;
  detailModalAssignmentTypeFilter: string;
  setDetailModalStatusFilter: (value: string) => void;
  setDetailModalShiftFilter: (value: string) => void;
  setDetailModalEmploymentTypeFilter: (value: string) => void;
  setDetailModalStaffNameFilter: (value: string) => void;
  setDetailModalAssignmentTypeFilter: (value: string) => void;
  onClose: () => void;
  formatTimeRange: (shift: Shift) => string;
  getAssignmentTypeLabel: (type: string) => string;
  getStatusBadge: (status: string, notes?: string | null) => React.ReactNode;
  canDeleteAssignment: (assignment: ShiftAssignment) => { canDelete: boolean; reason?: string };
  onApprove: (assignment: ShiftAssignment) => void;
  onReject: (assignment: ShiftAssignment) => void;
  onDelete: (assignment: ShiftAssignment) => void;
  processing: number | null;
}

export default function AssignmentDetailModal({
  isOpen,
  selectedDate,
  selectedAssignments,
  shifts,
  staffNames,
  staffEmploymentTypes,
  detailModalStatusFilter,
  detailModalShiftFilter,
  detailModalEmploymentTypeFilter,
  detailModalStaffNameFilter,
  detailModalAssignmentTypeFilter,
  setDetailModalStatusFilter,
  setDetailModalShiftFilter,
  setDetailModalEmploymentTypeFilter,
  setDetailModalStaffNameFilter,
  setDetailModalAssignmentTypeFilter,
  onClose,
  formatTimeRange,
  getAssignmentTypeLabel,
  getStatusBadge,
  canDeleteAssignment,
  onApprove,
  onReject,
  onDelete,
  processing,
}: AssignmentDetailModalProps) {
  const [bonusTemplates, setBonusTemplates] = useState<BonusTemplate[]>([]);
  const [penaltyTemplates, setPenaltyTemplates] = useState<PenaltyConfig[]>([]);

  // Quick create bonus/penalty modal state
  const [quickCreateModal, setQuickCreateModal] = useState<{
    open: boolean;
    type: 'bonus' | 'penalty' | null;
    staffUserIds: number[];
    staffNames: string[];
    shiftId: number | null;
    shiftDate: string;
  }>({
    open: false,
    type: null,
    staffUserIds: [],
    staffNames: [],
    shiftId: null,
    shiftDate: '',
  });
  const [quickCreateForm, setQuickCreateForm] = useState({
    type: '',
    amount: '',
    description: '',
    incidentDate: '',
    templateId: '',
  });
  const [quickCreateLoading, setQuickCreateLoading] = useState(false);
  const [quickCreateTemplateDefaults, setQuickCreateTemplateDefaults] = useState<{
    type?: string;
    amount?: string;
    description?: string;
  } | null>(null);
  const [selectedAssignmentStaffIds, setSelectedAssignmentStaffIds] = useState<number[]>([]);

  // Load templates once (manager scope)
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const [bonus, penalty] = await Promise.all([
          payrollTemplateService.getBonusTemplatesForManager(),
          payrollTemplateService.getPenaltyConfigsForManager(),
        ]);
        setBonusTemplates(bonus || []);
        setPenaltyTemplates(penalty || []);
      } catch (err) {
        console.error('Failed to load templates', err);
      }
    };
    fetchTemplates();
  }, []);

  // Clear selection when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedAssignmentStaffIds([]);
    }
  }, [isOpen]);

  // Helper function to get period from date (YYYY-MM format)
  const getPeriodFromDate = (dateStr: string): string => {
    const date = parseISO(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  // Check if bonus/penalty can be added for this assignment
  const canAddBonusPenalty = (assignment: ShiftAssignment, shift: Shift | undefined): { canAdd: boolean; reason?: string } => {
    if (!shift) {
      return { canAdd: false, reason: 'Shift not found' };
    }
    
    // Condition 1: Shift must be PUBLISHED
    if (shift.status !== 'PUBLISHED') {
      return { canAdd: false, reason: 'Shift must be PUBLISHED' };
    }
    
    // Condition 2: Assignment must be CONFIRMED, CHECKED_IN, or CHECKED_OUT
    const allowedStatuses = ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'];
    if (!allowedStatuses.includes(assignment.status)) {
      return { canAdd: false, reason: 'Assignment must be CONFIRMED, CHECKED_IN, or CHECKED_OUT' };
    }
    
    // Condition 3: Shift must have started (current time >= shift start time)
    const now = new Date();
    const shiftDate = parseISO(shift.shiftDate);
    const [hours, minutes, seconds] = shift.startTime.split(':').map(Number);
    const shiftStartDateTime = new Date(shiftDate);
    shiftStartDateTime.setHours(hours, minutes, seconds || 0, 0);
    
    if (now < shiftStartDateTime) {
      return { canAdd: false, reason: 'Cannot add bonus/penalty before shift starts' };
    }
    
    return { canAdd: true };
  };

  // Handle quick create bonus/penalty
  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCreateModal.staffUserIds.length || !quickCreateModal.type) return;

    // Validation
    if (!quickCreateForm.type) {
      toast.error(`Please select a ${quickCreateModal.type === 'bonus' ? 'bonus' : 'penalty'} type`);
      return;
    }
    if (!quickCreateForm.amount || Number(quickCreateForm.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!quickCreateForm.description) {
      toast.error('Please enter a description');
      return;
    }

    try {
      setQuickCreateLoading(true);
      const period = getPeriodFromDate(quickCreateModal.shiftDate);

      if (quickCreateModal.type === 'bonus') {
        if (quickCreateForm.templateId) {
          const templateId = Number(quickCreateForm.templateId);
          await Promise.all(
            quickCreateModal.staffUserIds.map((staffId) =>
              bonusService.applyTemplate({
                userId: staffId,
                period,
                templateId,
                overrideAmount: Number(quickCreateForm.amount),
                overrideDescription: quickCreateForm.description,
                shiftId: quickCreateModal.shiftId ?? undefined,
              })
            )
          );
        } else {
          await Promise.all(
            quickCreateModal.staffUserIds.map((staffId) =>
              bonusService.createBonus({
                userId: staffId,
                period,
                bonusType: quickCreateForm.type as BonusType,
                amount: Number(quickCreateForm.amount),
                description: quickCreateForm.description,
                shiftId: quickCreateModal.shiftId ?? undefined,
              })
            )
          );
        }
        toast.success('Bonus created successfully');
      } else {
        if (quickCreateForm.templateId) {
          const templateId = Number(quickCreateForm.templateId);
          await Promise.all(
            quickCreateModal.staffUserIds.map((staffId) =>
              penaltyService.applyTemplate({
                userId: staffId,
                period,
                templateId,
                overrideAmount: Number(quickCreateForm.amount),
                overrideDescription: quickCreateForm.description,
                shiftId: quickCreateModal.shiftId ?? undefined,
                incidentDate: quickCreateForm.incidentDate || quickCreateModal.shiftDate,
              })
            )
          );
        } else {
          await Promise.all(
            quickCreateModal.staffUserIds.map((staffId) =>
              penaltyService.createPenalty({
                userId: staffId,
                period,
                penaltyType: quickCreateForm.type as PenaltyType,
                amount: Number(quickCreateForm.amount),
                description: quickCreateForm.description,
                shiftId: quickCreateModal.shiftId,
                incidentDate: quickCreateForm.incidentDate || quickCreateModal.shiftDate,
              })
            )
          );
        }
        toast.success('Penalty created successfully');
      }

      // Reset and close modal
      setQuickCreateModal({
        open: false,
        type: null,
        staffUserIds: [],
        staffNames: [],
        shiftId: null,
        shiftDate: '',
      });
      setQuickCreateForm({
        type: '',
        amount: '',
        description: '',
        incidentDate: '',
        templateId: '',
      });
      setSelectedAssignmentStaffIds([]);
    } catch (e: any) {
      console.error(`Failed to create ${quickCreateModal.type}`, e);
      const errorMessage = e.response?.data?.message || e.message || `Failed to create ${quickCreateModal.type}`;
      toast.error(errorMessage);
    } finally {
      setQuickCreateLoading(false);
    }
  };

  // Helper to update form fields and clear template selection if user edits
  const updateQuickCreateField = (key: 'type' | 'amount' | 'description' | 'incidentDate', value: string) => {
    setQuickCreateForm((prev) => {
      const next = { ...prev, [key]: value };
      let clearTemplate = false;
      if (prev.templateId && quickCreateTemplateDefaults) {
        if (key === 'type' && value !== quickCreateTemplateDefaults.type) clearTemplate = true;
        if (key === 'amount' && value !== quickCreateTemplateDefaults.amount) clearTemplate = true;
        if (key === 'description' && value !== quickCreateTemplateDefaults.description) clearTemplate = true;
        if (key === 'incidentDate') clearTemplate = true; // not part of template; editing means custom
      }
      if (clearTemplate) {
        next.templateId = '';
        setQuickCreateTemplateDefaults(null);
      }
      return next;
    });
  };

  if (!isOpen || selectedAssignments.length === 0) return null;

  const filteredAssignments = selectedAssignments.filter((assignment) => {
    // Status filter
    if (detailModalStatusFilter !== 'ALL' && assignment.status !== detailModalStatusFilter) {
      return false;
    }

    // Shift filter
    if (detailModalShiftFilter !== 'ALL' && assignment.shiftId.toString() !== detailModalShiftFilter) {
      return false;
    }

    // Assignment type filter
    if (detailModalAssignmentTypeFilter !== 'ALL' && assignment.assignmentType !== detailModalAssignmentTypeFilter) {
      return false;
    }

    // Staff name filter
    if (detailModalStaffNameFilter.trim()) {
      const staffName = staffNames.get(assignment.staffUserId) || '';
      const searchTerm = detailModalStaffNameFilter.toLowerCase().trim();
      if (!staffName.toLowerCase().includes(searchTerm)) {
        return false;
      }
    }

    // Employment type filter
    if (detailModalEmploymentTypeFilter !== 'ALL') {
      const staffEmploymentType = staffEmploymentTypes.get(assignment.staffUserId);
      if (staffEmploymentType !== detailModalEmploymentTypeFilter) {
        return false;
      }
    }

    return true;
  });

  // Sort assignments: PENDING first (oldest createAt, then shift start time), then others
  const sortedAssignments = [...filteredAssignments].sort((a, b) => {
    const aShift = shifts.get(a.shiftId);
    const bShift = shifts.get(b.shiftId);
    
    // Separate PENDING and non-PENDING
    const aIsPending = a.status === 'PENDING';
    const bIsPending = b.status === 'PENDING';
    
    if (aIsPending && !bIsPending) return -1; // PENDING comes first
    if (!aIsPending && bIsPending) return 1;
    
    // Both are PENDING: sort by createAt (oldest first), then by shift start time
    if (aIsPending && bIsPending) {
      // Sort by createAt (oldest first)
      if (a.createAt && b.createAt) {
        const aCreateAt = new Date(a.createAt).getTime();
        const bCreateAt = new Date(b.createAt).getTime();
        if (aCreateAt !== bCreateAt) {
          return aCreateAt - bCreateAt;
        }
      } else if (a.createAt && !b.createAt) return -1;
      else if (!a.createAt && b.createAt) return 1;
      
      // If createAt is same or both missing, sort by shift start time
      if (aShift && bShift) {
        const aStartTime = aShift.startTime;
        const bStartTime = bShift.startTime;
        if (aStartTime !== bStartTime) {
          return aStartTime.localeCompare(bStartTime);
        }
      }
      
      return 0;
    }
    
    // Both are non-PENDING: sort by shift start time
    if (aShift && bShift) {
      return aShift.startTime.localeCompare(bShift.startTime);
    }
    
    return 0;
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900">Shift Assignment Details</h2>
            <p className="text-sm text-slate-500 mt-1">
              {selectedDate && format(new Date(selectedDate), 'dd/MM/yyyy')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Status Filter */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
              <select
                value={detailModalStatusFilter}
                onChange={(e) => setDetailModalStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CHECKED_IN">Checked In</option>
                <option value="CHECKED_OUT">Checked Out</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Shift Filter */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Shift</label>
              <select
                value={detailModalShiftFilter}
                onChange={(e) => setDetailModalShiftFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="ALL">All Shifts</option>
                {Array.from(new Set(selectedAssignments.map(a => a.shiftId)))
                  .map(shiftId => {
                    const shift = shifts.get(shiftId);
                    if (!shift) return null;
                    return (
                      <option key={shiftId} value={shiftId.toString()}>
                        {formatTimeRange(shift)} ({shift.durationHours.toFixed(1)}h)
                      </option>
                    );
                  })
                  .filter(Boolean)}
              </select>
            </div>

            {/* Employment Type Filter */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Employment Type</label>
              <select
                value={detailModalEmploymentTypeFilter}
                onChange={(e) => setDetailModalEmploymentTypeFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="ALL">All Types</option>
                <option value="FULL_TIME">Full-time</option>
                <option value="PART_TIME">Part-time</option>
                <option value="CASUAL">Casual</option>
              </select>
            </div>

            {/* Assignment Type Filter */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Assignment Type</label>
              <select
                value={detailModalAssignmentTypeFilter}
                onChange={(e) => setDetailModalAssignmentTypeFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="ALL">All Types</option>
                <option value="SELF_REGISTERED">Self-Registered</option>
                <option value="MANUAL">Manual Assignment</option>
              </select>
            </div>
          </div>

          {/* Staff Name Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Staff Name</label>
            <input
              type="text"
              placeholder="Search by staff name..."
              value={detailModalStaffNameFilter}
              onChange={(e) => setDetailModalStaffNameFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
          </div>
        </div>

        {/* Controls (outside scroll) */}
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const allIds = sortedAssignments.map(a => a.staffUserId);
                const selectedCount = allIds.filter(id => selectedAssignmentStaffIds.includes(id)).length;
                if (selectedCount === allIds.length) {
                  setSelectedAssignmentStaffIds([]);
                } else {
                  setSelectedAssignmentStaffIds(allIds);
                }
              }}
              className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-100"
            >
              Select all ({sortedAssignments.filter(a => selectedAssignmentStaffIds.includes(a.staffUserId)).length}/{sortedAssignments.length})
            </button>
            <span className="text-xs text-slate-500">
              Selected {sortedAssignments.filter(a => selectedAssignmentStaffIds.includes(a.staffUserId)).length}/{sortedAssignments.length}
            </span>
          </div>
          {(() => {
            const selectedCount = sortedAssignments.filter(a => selectedAssignmentStaffIds.includes(a.staffUserId)).length;
            return selectedCount >= 2 ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const names = sortedAssignments
                      .filter(a => selectedAssignmentStaffIds.includes(a.staffUserId))
                      .map(a => staffNames.get(a.staffUserId) || `Staff ${a.staffUserId}`);
                    setQuickCreateModal({
                      open: true,
                      type: 'bonus',
                      staffUserIds: selectedAssignmentStaffIds,
                      staffNames: names,
                      shiftId: sortedAssignments[0]?.shiftId || null,
                      shiftDate: sortedAssignments[0] ? shifts.get(sortedAssignments[0].shiftId)?.shiftDate || '' : '',
                    });
                    setQuickCreateForm({
                      type: '',
                      amount: '',
                      description: '',
                      incidentDate: sortedAssignments[0] ? shifts.get(sortedAssignments[0].shiftId)?.shiftDate || '' : '',
                      templateId: '',
                    });
                  }}
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100"
                  title="Add bonus for selected staff"
                >
                  <Gift className="w-3 h-3" />
                  Bonus (selected)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const names = sortedAssignments
                      .filter(a => selectedAssignmentStaffIds.includes(a.staffUserId))
                      .map(a => staffNames.get(a.staffUserId) || `Staff ${a.staffUserId}`);
                    setQuickCreateModal({
                      open: true,
                      type: 'penalty',
                      staffUserIds: selectedAssignmentStaffIds,
                      staffNames: names,
                      shiftId: sortedAssignments[0]?.shiftId || null,
                      shiftDate: sortedAssignments[0] ? shifts.get(sortedAssignments[0].shiftId)?.shiftDate || '' : '',
                    });
                    setQuickCreateForm({
                      type: '',
                      amount: '',
                      description: '',
                      incidentDate: sortedAssignments[0] ? shifts.get(sortedAssignments[0].shiftId)?.shiftDate || '' : '',
                      templateId: '',
                    });
                  }}
                  className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100"
                  title="Add penalty for selected staff"
                >
                  <AlertTriangle className="w-3 h-3" />
                  Penalty (selected)
                </button>
              </div>
            ) : null;
          })()}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {sortedAssignments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 text-sm">
                No assignments found with the selected filters
              </p>
            </div>
          ) : (
            <div className="space-y-4">

              {sortedAssignments.map((assignment) => {
                const shift = shifts.get(assignment.shiftId);
                if (!shift) return null;
                const isSelected = selectedAssignmentStaffIds.includes(assignment.staffUserId);

                return (
                  <div
                    key={assignment.assignmentId}
                    onClick={() => {
                      setSelectedAssignmentStaffIds((prev) =>
                        prev.includes(assignment.staffUserId)
                          ? prev.filter(id => id !== assignment.staffUserId)
                          : [...prev, assignment.staffUserId]
                      );
                    }}
                    className={`p-4 rounded-lg border bg-slate-50 cursor-pointer ${
                      isSelected ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock4 className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-semibold text-slate-900">
                            {formatTimeRange(shift)} ({shift.durationHours.toFixed(1)} hours)
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            <span>Staff: {staffNames.get(assignment.staffUserId) || `ID: ${assignment.staffUserId}`}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-slate-400" />
                            <span>Type: {getAssignmentTypeLabel(assignment.assignmentType || '')}</span>
                          </div>
                          {shift.maxStaffAllowed && (
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-slate-400" />
                              <span>Max: {shift.maxStaffAllowed} staff</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(assignment.status, assignment.notes)}
                    </div>

                    {assignment.checkedInAt && (
                      <div className="text-sm text-slate-600 mb-2">
                        <span className="font-medium">Check-in:</span> {format(new Date(assignment.checkedInAt), 'dd/MM/yyyy HH:mm')}
                      </div>
                    )}

                    {assignment.checkedOutAt && (
                      <div className="text-sm text-slate-600 mb-2">
                        <span className="font-medium">Check-out:</span> {format(new Date(assignment.checkedOutAt), 'dd/MM/yyyy HH:mm')}
                      </div>
                    )}

                    {assignment.actualHours && (
                      <div className="text-sm text-slate-600 mb-2">
                        <span className="font-medium">Actual Hours:</span> {assignment.actualHours.toFixed(1)} hours
                      </div>
                    )}

                    {assignment.notes && (
                      <div className="text-sm text-slate-600 mb-4 p-2 bg-white rounded border border-slate-200">
                        <span className="font-medium">Notes:</span> {assignment.notes}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200">
                      {assignment.status === 'PENDING' && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onApprove(assignment);
                            }}
                            disabled={processing === assignment.assignmentId}
                            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onReject(assignment);
                            }}
                            disabled={processing === assignment.assignmentId}
                            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </>
                      )}
                      {(() => {
                        const bonusPenaltyValidation = canAddBonusPenalty(assignment, shift);
                        return (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuickCreateModal({
                                  open: true,
                                  type: 'bonus',
                                  staffUserIds: [assignment.staffUserId],
                                  staffNames: [staffNames.get(assignment.staffUserId) || `Staff ${assignment.staffUserId}`],
                                  shiftId: assignment.shiftId,
                                  shiftDate: shift.shiftDate,
                                });
                                setQuickCreateForm({
                                  type: '',
                                  amount: '',
                                  description: '',
                                  incidentDate: shift.shiftDate,
                                  templateId: '',
                                });
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors"
                              title={bonusPenaltyValidation.reason || 'Add bonus for this staff'}
                            >
                              <Gift className="w-3.5 h-3.5" />
                              Bonus
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setQuickCreateModal({
                                  open: true,
                                  type: 'penalty',
                                  staffUserIds: [assignment.staffUserId],
                                  staffNames: [staffNames.get(assignment.staffUserId) || `Staff ${assignment.staffUserId}`],
                                  shiftId: assignment.shiftId,
                                  shiftDate: shift.shiftDate,
                                });
                                setQuickCreateForm({
                                  type: '',
                                  amount: '',
                                  description: '',
                                  incidentDate: shift.shiftDate,
                                  templateId: '',
                                });
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 transition-colors"
                              title={bonusPenaltyValidation.reason || 'Add penalty for this staff'}
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Penalty
                            </button>
                          </>
                        );
                      })()}
                      {(() => {
                        const deleteValidation = canDeleteAssignment(assignment);
                        return (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (deleteValidation.canDelete) {
                                onDelete(assignment);
                              } else {
                                toast.error(deleteValidation.reason || 'Cannot delete this assignment');
                              }
                            }}
                            disabled={processing === assignment.assignmentId || !deleteValidation.canDelete}
                            className={`px-4 py-2 text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 ${
                              deleteValidation.canDelete
                                ? 'text-red-600 bg-red-50 hover:bg-red-100 border border-red-200'
                                : 'text-slate-400 bg-slate-100 border border-slate-200'
                            }`}
                            title={deleteValidation.canDelete ? 'Delete Assignment' : deleteValidation.reason || 'Cannot delete this assignment'}
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Delete</span>
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Quick Create Bonus/Penalty Modal */}
      {quickCreateModal.open && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black bg-opacity-50"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                Add {quickCreateModal.type === 'bonus' ? 'Bonus' : 'Penalty'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setQuickCreateModal({
                    open: false,
                    type: null,
                    staffUserIds: [],
                    staffNames: [],
                    shiftId: null,
                    shiftDate: '',
                  });
                  setQuickCreateForm({
                    type: '',
                    amount: '',
                    description: '',
                    incidentDate: '',
                    templateId: '',
                  });
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleQuickCreate} className="px-6 py-4 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Staff</label>
                <div className="text-sm font-medium text-slate-900 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                  {quickCreateModal.staffNames.length > 0
                    ? quickCreateModal.staffNames.join(', ')
                    : 'No staff selected'}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">Shift Date</label>
                <div className="text-sm font-medium text-slate-900 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                  {format(parseISO(quickCreateModal.shiftDate), 'EEEE, dd/MM/yyyy')}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  {quickCreateModal.type === 'bonus' ? 'Bonus' : 'Penalty'} Type <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  <select
                    value={quickCreateForm.templateId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setQuickCreateForm((prev) => ({ ...prev, templateId: val }));
                      if (quickCreateModal.type === 'bonus' && val) {
                        const tpl = bonusTemplates.find(t => t.templateId === Number(val));
                        if (tpl) {
                          setQuickCreateForm({
                            templateId: val,
                            type: tpl.bonusType,
                            amount: String(tpl.amount),
                            description: tpl.description || tpl.name,
                            incidentDate: quickCreateForm.incidentDate,
                          });
                          setQuickCreateTemplateDefaults({
                            type: tpl.bonusType,
                            amount: String(tpl.amount),
                            description: tpl.description || tpl.name,
                          });
                        }
                      }
                      if (quickCreateModal.type === 'penalty' && val) {
                        const tpl = penaltyTemplates.find(t => t.configId === Number(val));
                        if (tpl) {
                          setQuickCreateForm({
                            templateId: val,
                            type: tpl.penaltyType,
                            amount: String(tpl.amount),
                            description: tpl.description || tpl.name,
                            incidentDate: quickCreateForm.incidentDate,
                          });
                          setQuickCreateTemplateDefaults({
                            type: tpl.penaltyType,
                            amount: String(tpl.amount),
                            description: tpl.description || tpl.name,
                          });
                        }
                      }
                      if (!val) {
                        setQuickCreateForm(prev => ({
                          ...prev,
                          templateId: '',
                          type: '',
                          amount: '',
                          description: '',
                        }));
                        setQuickCreateTemplateDefaults(null);
                      }
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  >
                    <option value="">-- Select template (optional) --</option>
                    {quickCreateModal.type === 'bonus'
                      ? bonusTemplates.filter(t => t.isActive !== false).map(t => (
                          <option key={t.templateId} value={t.templateId}>
                            {t.name} · {t.bonusType} · {t.amount}
                          </option>
                        ))
                      : penaltyTemplates.filter(t => t.isActive !== false).map(t => (
                          <option key={t.configId} value={t.configId}>
                            {t.name} · {t.penaltyType} · {t.amount}
                          </option>
                        ))}
                  </select>
                </div>
                <select
                  value={quickCreateForm.type}
                  onChange={(e) => updateQuickCreateField('type', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  required
                >
                  <option value="">Select type...</option>
                  {quickCreateModal.type === 'bonus' ? (
                    <>
                      <option value="PERFORMANCE">Performance</option>
                      <option value="ATTENDANCE">Attendance</option>
                      <option value="SPECIAL">Special</option>
                      <option value="HOLIDAY">Holiday</option>
                      <option value="OTHER">Other</option>
                    </>
                  ) : (
                    <>
                      <option value="NO_SHOW">No Show</option>
                      <option value="LATE">Late</option>
                      <option value="EARLY_LEAVE">Early Leave</option>
                      <option value="MISTAKE">Mistake</option>
                      <option value="VIOLATION">Violation</option>
                      <option value="OTHER">Other</option>
                    </>
                  )}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={quickCreateForm.amount}
                  onChange={(e) => updateQuickCreateField('amount', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="Enter amount"
                  required
                />
              </div>
              {quickCreateModal.type === 'penalty' && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Incident Date</label>
                  <input
                    type="date"
                    value={quickCreateForm.incidentDate}
                    onChange={(e) => updateQuickCreateField('incidentDate', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={quickCreateForm.description}
                  onChange={(e) => updateQuickCreateField('description', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  rows={3}
                  placeholder="Enter description"
                  required
                />
              </div>
              <div className="flex items-center gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setQuickCreateModal({
                      open: false,
                      type: null,
                    staffUserIds: [],
                    staffNames: [],
                      shiftId: null,
                      shiftDate: '',
                    });
                    setQuickCreateForm({
                      type: '',
                      amount: '',
                      description: '',
                      incidentDate: '',
                    templateId: '',
                    });
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50"
                  disabled={quickCreateLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sky-600 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={quickCreateLoading}
                >
                  {quickCreateLoading ? 'Creating...' : `Create ${quickCreateModal.type === 'bonus' ? 'Bonus' : 'Penalty'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

