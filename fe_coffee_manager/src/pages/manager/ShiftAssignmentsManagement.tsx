import { useEffect, useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { shiftAssignmentService, ShiftAssignment } from '../../services/shiftAssignmentService';
import { shiftService, Shift } from '../../services/shiftService';
import { branchClosureService, BranchClosure } from '../../services/branchClosureService';
import staffService from '../../services/staffService';
import { ShiftAssignmentsSkeleton } from '../../components/manager/skeletons';
import ConfirmModal from '../../components/common/ConfirmModal';
import AssignStaffModal from '../../components/shift/AssignStaffModal';
import WeekNavigation from '../../components/shift/WeekNavigation';
import AssignmentCalendar from '../../components/shift/AssignmentCalendar';
import AssignmentStatistics from '../../components/shift/AssignmentStatistics';
import AssignmentHeader from '../../components/shift/AssignmentHeader';
import AssignmentDetailModal from '../../components/shift/AssignmentDetailModal';
import { useShiftWebSocket, ShiftUpdatePayload } from '../../hooks/useShiftWebSocket';

export default function ShiftAssignmentsManagement() {
  const { user, managerBranch } = useAuth();
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [shifts, setShifts] = useState<Map<number, Shift>>(new Map());
  const [closures, setClosures] = useState<BranchClosure[]>([]);
  const [staffNames, setStaffNames] = useState<Map<number, string>>(new Map());
  const [staffEmploymentTypes, setStaffEmploymentTypes] = useState<Map<number, string | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedAssignments, setSelectedAssignments] = useState<ShiftAssignment[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailModalStatusFilter, setDetailModalStatusFilter] = useState<string>('ALL');
  const [detailModalShiftFilter, setDetailModalShiftFilter] = useState<string>('ALL');
  const [detailModalEmploymentTypeFilter, setDetailModalEmploymentTypeFilter] = useState<string>('ALL');
  const [detailModalStaffNameFilter, setDetailModalStaffNameFilter] = useState<string>('');
  const [detailModalAssignmentTypeFilter, setDetailModalAssignmentTypeFilter] = useState<string>('ALL');
  const [assignmentToApprove, setAssignmentToApprove] = useState<ShiftAssignment | null>(null);
  const [assignmentToReject, setAssignmentToReject] = useState<ShiftAssignment | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<ShiftAssignment | null>(null);
  const [processing, setProcessing] = useState<number | null>(null);

  // Assign Staff Modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedDateForAssign, setSelectedDateForAssign] = useState<string | null>(null);

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const branchId = useMemo(() => {
    if (managerBranch?.branchId) return managerBranch.branchId;
    if (user?.branch?.branchId) return user.branch.branchId;
    if (user?.branchId) return Number(user.branchId);
    return null;
  }, [user, managerBranch]);

  const weekDays = useMemo(() => {
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: currentWeekStart, end: weekEnd });
  }, [currentWeekStart]);

  const loadAssignments = async () => {
    if (!branchId) {
      toast.error('Branch not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
      const [assignmentsData, shiftsData, closureList, staffList] = await Promise.all([
        shiftAssignmentService.getByBranch({
          branchId,
          startDate: format(currentWeekStart, 'yyyy-MM-dd'),
          endDate: format(weekEnd, 'yyyy-MM-dd'),
          status: statusFilter === 'ALL' ? undefined : statusFilter,
        }),
        shiftService.getByBranch({
          branchId,
          startDate: format(currentWeekStart, 'yyyy-MM-dd'),
          endDate: format(weekEnd, 'yyyy-MM-dd'),
        }),
        branchClosureService.list({ branchId }),
        staffService.getStaffsWithUserInfoByBranch(branchId),
      ]);

      setAssignments(assignmentsData);
      
      // Create map of shifts by shiftId
      const shiftsMap = new Map<number, Shift>();
      shiftsData.forEach(shift => {
        shiftsMap.set(shift.shiftId, shift);
      });
      setShifts(shiftsMap);
      setClosures(closureList || []);

      // Create staff names map and employment types map
      const namesMap = new Map<number, string>();
      const employmentTypesMap = new Map<number, string | null>();
      staffList.forEach(staff => {
        namesMap.set(staff.userId, staff.fullname);
        employmentTypesMap.set(staff.userId, staff.employmentType || null);
      });
      setStaffNames(namesMap);
      setStaffEmploymentTypes(employmentTypesMap);
    } catch (error: any) {
      console.error('Failed to load assignments', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, [branchId, currentWeekStart, statusFilter]);

  // Real-time updates via WebSocket
  useShiftWebSocket({
    onAssignmentCreated: (payload: ShiftUpdatePayload) => {
      const metadata = payload.metadata;
      if (metadata?.branchId && metadata.branchId === branchId) {
        loadAssignments();
        if (metadata.assignmentType === 'SELF_REGISTERED') {
          toast.success('A staff member has registered for a new shift');
        }
      }
    },
    onAssignmentApproved: (payload: ShiftUpdatePayload) => {
      const metadata = payload.metadata;
      if (metadata?.branchId && metadata.branchId === branchId) {
        loadAssignments();
      }
    },
    onAssignmentRejected: (payload: ShiftUpdatePayload) => {
      const metadata = payload.metadata;
      if (metadata?.branchId && metadata.branchId === branchId) {
        loadAssignments();
      }
    },
    onAssignmentDeleted: (payload: ShiftUpdatePayload) => {
      const metadata = payload.metadata;
      if (metadata?.branchId && metadata.branchId === branchId) {
        loadAssignments();
      }
    },
    onAssignmentCheckedIn: (payload: ShiftUpdatePayload) => {
      const metadata = payload.metadata;
      if (metadata?.branchId && metadata.branchId === branchId) {
        loadAssignments();
      }
    },
    onAssignmentCheckedOut: (payload: ShiftUpdatePayload) => {
      const metadata = payload.metadata;
      if (metadata?.branchId && metadata.branchId === branchId) {
        loadAssignments();
      }
    },
  });

  const handleApprove = async () => {
    if (!assignmentToApprove) return;

    try {
      setProcessing(assignmentToApprove.assignmentId);
      await shiftAssignmentService.approveAssignment(assignmentToApprove.assignmentId);
      toast.success('Shift registration approved successfully!');
      setAssignmentToApprove(null);
      await loadAssignments();
    } catch (error: any) {
      console.error('Failed to approve assignment', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to approve assignment');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!assignmentToReject) return;

    try {
      setProcessing(assignmentToReject.assignmentId);
      await shiftAssignmentService.rejectAssignment(assignmentToReject.assignmentId);
      toast.success('Shift registration rejected!');
      setAssignmentToReject(null);
      await loadAssignments();
    } catch (error: any) {
      console.error('Failed to reject assignment', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to reject assignment');
    } finally {
      setProcessing(null);
    }
  };

  // Helper function to check if assignment can be deleted
  const canDeleteAssignment = (assignment: ShiftAssignment): { canDelete: boolean; reason?: string } => {
    // Cannot delete if already checked in or checked out
    if (assignment.status === 'CHECKED_IN' || assignment.status === 'CHECKED_OUT') {
      return {
        canDelete: false,
        reason: 'Cannot delete assignment that is already checked in or completed'
      };
    }

    // Check if shift has started
    const shift = shifts.get(assignment.shiftId);
    if (shift) {
      const shiftStart = parseISO(`${shift.shiftDate}T${shift.startTime}`);
      const now = new Date();
      if (shiftStart < now) {
        return {
          canDelete: false,
          reason: 'Cannot delete assignment for a shift that has already started'
        };
      }
    }

    // Only allow deleting PENDING or CONFIRMED assignments
    if (assignment.status !== 'PENDING' && assignment.status !== 'CONFIRMED') {
      return {
        canDelete: false,
        reason: 'Cannot delete assignment with current status'
      };
    }

    return { canDelete: true };
  };

  const handleDelete = async () => {
    if (!assignmentToDelete) return;

    try {
      setProcessing(assignmentToDelete.assignmentId);
      // Backend will validate and throw error if constraints are violated
      await shiftAssignmentService.deleteAssignment(assignmentToDelete.assignmentId);
      toast.success('Shift assignment deleted!');
      setAssignmentToDelete(null);
      await loadAssignments();
    } catch (error: any) {
      console.error('Failed to delete assignment', error);
      // Backend error message will contain the constraint violation reason
      toast.error(error?.response?.data?.message || error?.message || 'Failed to delete assignment');
    } finally {
      setProcessing(null);
    }
  };

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5); // HH:mm
  };

  const formatTimeRange = (shift: Shift) => {
    return `${formatTime(shift.startTime)} - ${formatTime(shift.endTime)}`;
  };

  const getStatusBadge = (status: string, notes?: string | null) => {
    // Check if CANCELLED is actually REJECTED (has "Rejected by manager" in notes)
    if (status === 'CANCELLED' && notes && notes.includes('Rejected by manager')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
          Rejected
        </span>
      );
    }
    
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
            Pending
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
            Confirmed
          </span>
        );
      case 'CHECKED_IN':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
            Checked In
          </span>
        );
      case 'CHECKED_OUT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
            Checked Out
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  const getAssignmentTypeLabel = (type: string) => {
    switch (type) {
      case 'SELF_REGISTERED':
        return 'Self-Registered';
      case 'MANUAL':
        return 'Manual Assignment';
      default:
        return type;
    }
  };

  // Get card background color based on status
  const getStatusColor = (status: string, notes?: string | null) => {
    // Check if CANCELLED is actually REJECTED
    if (status === 'CANCELLED' && notes && notes.includes('Rejected by manager')) {
      return 'bg-orange-50 border-orange-200 hover:bg-orange-100';
    }
    
    switch (status) {
      case 'PENDING':
        return 'bg-amber-50 border-amber-200 hover:bg-amber-100';
      case 'CONFIRMED':
        return 'bg-blue-50 border-blue-200 hover:bg-blue-100';
      case 'CHECKED_IN':
        return 'bg-green-50 border-green-200 hover:bg-green-100';
      case 'CHECKED_OUT':
        return 'bg-slate-50 border-slate-200 hover:bg-slate-100';
      case 'CANCELLED':
        return 'bg-red-50 border-red-200 hover:bg-red-100';
      default:
        return 'bg-slate-50 border-slate-200 hover:bg-slate-100';
    }
  };


  // Group assignments by shift date
  const assignmentsByDate = useMemo(() => {
    const grouped: Record<string, ShiftAssignment[]> = {};
    assignments.forEach(assignment => {
      const shift = shifts.get(assignment.shiftId);
      if (shift) {
        const dateKey = shift.shiftDate;
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(assignment);
      }
    });
    return grouped;
  }, [assignments, shifts]);

  const goToPreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  // Check if a date is within any branch closure
  const isDateClosed = (date: Date): BranchClosure | null => {
    if (!branchId || closures.length === 0) {
      return null;
    }

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


  if (loading && assignments.length === 0) {
    return <ShiftAssignmentsSkeleton />;
  }

  const handleCardClick = (dayAssignments: ShiftAssignment[], dateKey: string, shiftId: number) => {
    setSelectedAssignments(dayAssignments);
    setSelectedDate(dateKey);
    // Auto-filter by the clicked shift
    setDetailModalShiftFilter(shiftId.toString());
    // Reset other filters
    setDetailModalStatusFilter('ALL');
    setDetailModalEmploymentTypeFilter('ALL');
    setDetailModalStaffNameFilter('');
    setDetailModalAssignmentTypeFilter('ALL');
    setIsDetailModalOpen(true);
  };

  const handleModalClose = () => {
    setIsDetailModalOpen(false);
    setDetailModalStatusFilter('ALL');
    setDetailModalShiftFilter('ALL');
    setDetailModalEmploymentTypeFilter('ALL');
    setDetailModalStaffNameFilter('');
    setDetailModalAssignmentTypeFilter('ALL');
  };

  const handleApproveFromModal = (assignment: ShiftAssignment) => {
    setAssignmentToApprove(assignment);
    setIsDetailModalOpen(false);
  };

  const handleRejectFromModal = (assignment: ShiftAssignment) => {
    setAssignmentToReject(assignment);
    setIsDetailModalOpen(false);
  };

  const handleDeleteFromModal = (assignment: ShiftAssignment) => {
    setAssignmentToDelete(assignment);
    setIsDetailModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <AssignmentHeader
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onGoToCurrentWeek={goToCurrentWeek}
          onRefresh={loadAssignments}
          onAssignStaff={() => setIsAssignModalOpen(true)}
          loading={loading}
        />

        <WeekNavigation
          currentWeekStart={currentWeekStart}
          onPreviousWeek={goToPreviousWeek}
          onNextWeek={goToNextWeek}
        />

        <AssignmentCalendar
          weekDays={weekDays}
          assignmentsByDate={assignmentsByDate}
          shifts={shifts}
          staffNames={staffNames}
          isDateClosed={isDateClosed}
          formatTimeRange={formatTimeRange}
          getAssignmentTypeLabel={getAssignmentTypeLabel}
          getStatusBadge={getStatusBadge}
          getStatusColor={getStatusColor}
          onAssignClick={(dateKey) => {
            setSelectedDateForAssign(dateKey);
            setIsAssignModalOpen(true);
          }}
          onCardClick={handleCardClick}
        />

        <AssignmentStatistics assignments={assignments} />
      </div>

      {/* Approve Confirmation Modal */}
      {assignmentToApprove && (
        <ConfirmModal
          open={!!assignmentToApprove}
          onCancel={() => setAssignmentToApprove(null)}
          onConfirm={handleApprove}
          title="Approve Shift Registration"
          description="Are you sure you want to approve this shift registration?"
          confirmText="Approve"
          cancelText="Cancel"
          isLoading={processing === assignmentToApprove.assignmentId}
        />
      )}

      {/* Reject Confirmation Modal */}
      {assignmentToReject && (
        <ConfirmModal
          open={!!assignmentToReject}
          onCancel={() => setAssignmentToReject(null)}
          onConfirm={handleReject}
          title="Reject Shift Registration"
          description="Are you sure you want to reject this shift registration?"
          confirmText="Reject"
          cancelText="Cancel"
          isLoading={processing === assignmentToReject.assignmentId}
        />
      )}

      {/* Delete Confirmation Modal */}
      {assignmentToDelete && (
        <ConfirmModal
          open={!!assignmentToDelete}
          onCancel={() => setAssignmentToDelete(null)}
          onConfirm={handleDelete}
          title="Delete Shift Assignment"
          description="Are you sure you want to delete this shift assignment?"
          confirmText="Delete"
          cancelText="Cancel"
          isLoading={processing === assignmentToDelete.assignmentId}
        />
      )}

      <AssignmentDetailModal
        isOpen={isDetailModalOpen}
        selectedDate={selectedDate}
        selectedAssignments={selectedAssignments}
        shifts={shifts}
        staffNames={staffNames}
        staffEmploymentTypes={staffEmploymentTypes}
        detailModalStatusFilter={detailModalStatusFilter}
        detailModalShiftFilter={detailModalShiftFilter}
        detailModalEmploymentTypeFilter={detailModalEmploymentTypeFilter}
        detailModalStaffNameFilter={detailModalStaffNameFilter}
        detailModalAssignmentTypeFilter={detailModalAssignmentTypeFilter}
        setDetailModalStatusFilter={setDetailModalStatusFilter}
        setDetailModalShiftFilter={setDetailModalShiftFilter}
        setDetailModalEmploymentTypeFilter={setDetailModalEmploymentTypeFilter}
        setDetailModalStaffNameFilter={setDetailModalStaffNameFilter}
        setDetailModalAssignmentTypeFilter={setDetailModalAssignmentTypeFilter}
        onClose={handleModalClose}
        formatTimeRange={formatTimeRange}
        getAssignmentTypeLabel={getAssignmentTypeLabel}
        getStatusBadge={getStatusBadge}
        canDeleteAssignment={canDeleteAssignment}
        onApprove={handleApproveFromModal}
        onReject={handleRejectFromModal}
        onDelete={handleDeleteFromModal}
        processing={processing}
      />

      {/* Assign Staff Modal */}
      {branchId && (
        <AssignStaffModal
          isOpen={isAssignModalOpen}
          onClose={() => {
            setIsAssignModalOpen(false);
            setSelectedDateForAssign(null);
          }}
          branchId={branchId}
          onSuccess={loadAssignments}
          initialDate={selectedDateForAssign || undefined}
        />
      )}
    </div>
  );
}

