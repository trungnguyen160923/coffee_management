import { useEffect, useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, isSameDay, parseISO, isBefore, isSameMonth } from 'date-fns';
import { useFloating, autoUpdate, offset, flip, shift, size } from '@floating-ui/react';
import { Calendar, Clock4, ChevronLeft, ChevronRight, RefreshCw, CheckCircle2, User, Briefcase, LogOut, Clock, Users, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { shiftService, Shift } from '../../services/shiftService';
import { shiftAssignmentService, ShiftAssignment } from '../../services/shiftAssignmentService';
import { shiftRequestService, ShiftRequest } from '../../services/shiftRequestService';
import branchClosureService, { BranchClosure } from '../../services/branchClosureService';
import ShiftRequestModal from '../../components/shift/ShiftRequestModal';
import BranchSchedule from '../../components/shift/BranchSchedule';
import { MyShiftsSkeleton } from '../../components/shift/skeletons';
import { useShiftWebSocket, ShiftUpdatePayload } from '../../hooks/useShiftWebSocket';

interface AssignmentWithShift extends ShiftAssignment {
  shift?: Shift;
}

type TabType = 'my-schedule' | 'branch-schedule';

export default function StaffMyShifts() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('my-schedule');
  const [assignments, setAssignments] = useState<AssignmentWithShift[]>([]);
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<Date>(() =>
    startOfMonth(new Date())
  );
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentWithShift | null>(null);
  const [selectedRequestType, setSelectedRequestType] = useState<'SWAP' | 'TWO_WAY_SWAP' | 'LEAVE' | 'OVERTIME' | null>(null);
  const [closures, setClosures] = useState<BranchClosure[]>([]);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const [hoveredAssignmentId, setHoveredAssignmentId] = useState<number | null>(null);
  const [hoveredAssignment, setHoveredAssignment] = useState<AssignmentWithShift | null>(null);
  
  // Floating UI for tooltip positioning
  const { refs, floatingStyles } = useFloating({
    placement: 'top',
    middleware: [
      offset(8),
      flip({
        fallbackAxisSideDirection: 'start',
      }),
      shift({ padding: 10 }),
      size({
        apply({ availableWidth, availableHeight, elements }) {
          elements.floating.style.maxWidth = `${Math.min(288, availableWidth)}px`;
          elements.floating.style.maxHeight = `${Math.min(400, availableHeight)}px`;
        },
        padding: 10,
      }),
    ],
    whileElementsMounted: autoUpdate,
  });
  
  // State for branch schedule
  const [branchScheduleWeekStart, setBranchScheduleWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [branchScheduleRefreshTrigger, setBranchScheduleRefreshTrigger] = useState(0);

  const branchId = useMemo(() => {
    if (user?.branch?.branchId) return user.branch.branchId;
    if (user?.branchId) return Number(user.branchId);
    return null;
  }, [user]);

  // Calculate all days in the month view (including days from previous/next month to fill the grid)
  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Week day headers (only 7 days)
  const weekDayHeaders = useMemo(() => {
    const firstDay = startOfWeek(new Date(), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: firstDay, end: endOfWeek(firstDay, { weekStartsOn: 1 }) });
  }, []);

  const assignmentsByDate = useMemo(() => {
    const grouped: Record<string, AssignmentWithShift[]> = {};
    assignments.forEach(assignment => {
      if (assignment.shift) {
        const dateKey = assignment.shift.shiftDate;
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(assignment);
      }
    });
    return grouped;
  }, [assignments]);

  const loadMyShifts = async () => {
    try {
      setLoading(true);
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const startDateStr = format(monthStart, 'yyyy-MM-dd');
      const endDateStr = format(monthEnd, 'yyyy-MM-dd');
      
      // Load assignments and closures in parallel
      const [myAssignments, branchClosures] = await Promise.all([
        shiftAssignmentService.getMyAssignments({
          startDate: startDateStr,
          endDate: endDateStr,
        }),
        branchId ? branchClosureService.list({
          branchId,
          from: startDateStr,
          to: endDateStr,
        }) : Promise.resolve([]),
      ]);

      setClosures(branchClosures);

      // Load shift details for each assignment
      const assignmentsWithShifts = await Promise.all(
        myAssignments.map(async (assignment) => {
          try {
            const shift = await shiftService.getById(assignment.shiftId);
            return { ...assignment, shift } as AssignmentWithShift;
          } catch (error) {
            console.error(`Failed to load shift ${assignment.shiftId}`, error);
            // Don't include assignments without shift details
            return null;
          }
        })
      );

      // Filter out null assignments (failed to load shift)
      const validAssignments = assignmentsWithShifts.filter((a): a is AssignmentWithShift => 
        a !== null && a !== undefined && a.shift !== undefined
      );
      setAssignments(validAssignments);

      // Load requests for current user
      try {
        const myRequests = await shiftRequestService.getMyRequests();
        setRequests(myRequests);
      } catch (error: any) {
        console.error('Failed to load requests', error);
        // Don't show error toast here, just log it
        setRequests([]);
      }
    } catch (error: any) {
      console.error('Failed to load my shifts', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to load shifts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyShifts();
  }, [currentMonth, branchId]);

  // Real-time updates via WebSocket
  const currentUserId = user?.user_id || (user?.id ? Number(user.id) : null);
  useShiftWebSocket({
    onAssignmentCreated: (payload: ShiftUpdatePayload) => {
      const metadata = payload.metadata;
      if (metadata?.staffUserId && currentUserId && Number(metadata.staffUserId) === currentUserId) {
        // Reload if it's for current user
        loadMyShifts();
        toast.success('You have a new shift');
      }
    },
    onAssignmentApproved: (payload: ShiftUpdatePayload) => {
      const metadata = payload.metadata;
      if (metadata?.staffUserId && currentUserId && Number(metadata.staffUserId) === currentUserId) {
        loadMyShifts();
        toast.success('Your shift has been approved');
      }
    },
    onAssignmentRejected: (payload: ShiftUpdatePayload) => {
      const metadata = payload.metadata;
      if (metadata?.staffUserId && currentUserId && Number(metadata.staffUserId) === currentUserId) {
        loadMyShifts();
        toast.error('Your shift has been rejected');
      }
    },
    onAssignmentDeleted: (payload: ShiftUpdatePayload) => {
      const metadata = payload.metadata;
      if (metadata?.staffUserId && currentUserId && Number(metadata.staffUserId) === currentUserId) {
        loadMyShifts();
        toast.error('Your shift has been deleted');
      }
    },
    onAssignmentCheckedIn: (payload: ShiftUpdatePayload) => {
      const metadata = payload.metadata;
      if (metadata?.staffUserId && currentUserId && Number(metadata.staffUserId) === currentUserId) {
        loadMyShifts();
      }
    },
    onAssignmentCheckedOut: (payload: ShiftUpdatePayload) => {
      const metadata = payload.metadata;
      if (metadata?.staffUserId && currentUserId && Number(metadata.staffUserId) === currentUserId) {
        loadMyShifts();
      }
    },
  });

  const formatTimeRange = (shift: Shift) => {
    const start = shift.startTime.substring(0, 5);
    const end = shift.endTime.substring(0, 5);
    return `${start} - ${end}`;
  };

  const getStatusColor = (status: string, notes?: string | null) => {
    if (status === 'CANCELLED' && notes && notes.includes("Rejected by manager")) {
      return 'bg-orange-100 border-orange-300';
    }
    switch (status) {
      case 'PENDING':
        return 'bg-amber-100 border-amber-300';
      case 'CONFIRMED':
        return 'bg-green-100 border-green-300';
      case 'CHECKED_IN':
        return 'bg-blue-100 border-blue-300';
      case 'CHECKED_OUT':
        return 'bg-slate-100 border-slate-300';
      case 'CANCELLED':
        return 'bg-red-100 border-red-300';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  const getStatusLabel = (status: string, notes?: string | null) => {
    if (status === 'CANCELLED' && notes && notes.includes("Rejected by manager")) {
      return 'Rejected';
    }
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case 'CONFIRMED':
        return 'Confirmed';
      case 'CHECKED_IN':
        return 'Checked In';
      case 'CHECKED_OUT':
        return 'Checked Out';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status;
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

  const getRequestForAssignment = (assignmentId: number): ShiftRequest | null => {
    return requests.find(r => r.assignmentId === assignmentId && r.status === 'PENDING') || null;
  };

  // Check if there's an active LEAVE request for this assignment
  // Active means: not CANCELLED, REJECTED, or REJECTED_BY_TARGET
  // This includes: PENDING, PENDING_TARGET_APPROVAL, PENDING_MANAGER_APPROVAL, APPROVED
  const hasActiveLeaveRequest = (assignmentId: number): boolean => {
    if (!requests || requests.length === 0) return false;
    
    const leaveRequest = requests.find(r => 
      r.assignmentId === assignmentId && 
      r.requestType === 'LEAVE' &&
      r.status !== 'CANCELLED' &&
      r.status !== 'REJECTED' &&
      r.status !== 'REJECTED_BY_TARGET'
    );
    
    return !!leaveRequest;
  };

  const getRequestStatusBadge = (request: ShiftRequest) => {
    switch (request.status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
            🟡 Pending {request.requestType}
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
            ✅ Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
            ❌ Rejected
          </span>
        );
      default:
        return null;
    }
  };

  const canRequestAction = (assignment: AssignmentWithShift): boolean => {
    if (!assignment.shift) return false;
    // Only allow requests for CONFIRMED assignments (not PENDING)
    if (assignment.status !== 'CONFIRMED') return false;
    // Check if shift is in the future
    const shiftDate = new Date(assignment.shift.shiftDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isBefore(shiftDate, today)) return false;
    // Check if there's already a pending request
    const existingRequest = getRequestForAssignment(assignment.assignmentId);
    return !existingRequest;
  };

  const canRequestLeave = (assignment: AssignmentWithShift): boolean => {
    if (!canRequestAction(assignment)) return false;
    if (!assignment.shift) return false;
    
    // Check if there's already an active LEAVE request for this assignment
    // Don't allow creating a new LEAVE request if one already exists (unless it's CANCELLED/REJECTED)
    if (hasActiveLeaveRequest(assignment.assignmentId)) {
      return false;
    }
    
    // Check if at least 12 hours before shift start
    const shiftDateStr = assignment.shift.shiftDate; // Format: "yyyy-MM-dd"
    const startTimeStr = assignment.shift.startTime; // Format: "HH:mm:ss" or "HH:mm"
    
    // Parse shift date and start time
    const [year, month, day] = shiftDateStr.split('-').map(Number);
    const [hours, minutes] = startTimeStr.split(':').map(Number);
    
    // Create shift start datetime (local time)
    const shiftStart = new Date(year, month - 1, day, hours, minutes, 0, 0);
    
    const now = new Date();
    const hoursUntilShift = (shiftStart.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Must be at least 12 hours before shift start
    return hoursUntilShift >= 12;
  };

  const canCheckIn = (assignment: AssignmentWithShift): boolean => {
    if (!assignment.shift) return false;
    
    // Can check in if status is CONFIRMED or PENDING
    if (assignment.status !== 'CONFIRMED' && assignment.status !== 'PENDING') {
      return false;
    }
    
    // Check time window: 15 minutes before shift start to 10 minutes before shift end
    const now = new Date();
    const shiftDate = new Date(assignment.shift.shiftDate);
    const [startHour, startMinute] = assignment.shift.startTime.split(':').map(Number);
    const [endHour, endMinute] = assignment.shift.endTime.split(':').map(Number);
    const shiftStartTime = new Date(shiftDate);
    shiftStartTime.setHours(startHour, startMinute, 0, 0);
    const shiftEndTime = new Date(shiftDate);
    shiftEndTime.setHours(endHour, endMinute, 0, 0);
    
    // Handle shift that spans midnight
    if (assignment.shift.endTime < assignment.shift.startTime) {
      shiftEndTime.setDate(shiftEndTime.getDate() + 1);
    }
    
    // Check-in window: 15 minutes before shift start to 10 minutes before shift end
    const fifteenMinutesBefore = new Date(shiftStartTime.getTime() - 15 * 60 * 1000);
    const tenMinutesBeforeEnd = new Date(shiftEndTime.getTime() - 10 * 60 * 1000);
    
    // Also check if shift date is today or past (not future)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const assignmentDate = new Date(shiftDate);
    assignmentDate.setHours(0, 0, 0, 0);
    
    return now >= fifteenMinutesBefore && 
           now <= tenMinutesBeforeEnd && 
           assignmentDate <= today;
  };

  const canCheckOut = (assignment: AssignmentWithShift): boolean => {
    if (!assignment.shift) return false;
    
    // Can check out if status is CHECKED_IN
    if (assignment.status !== 'CHECKED_IN') return false;
    
    // Check time window: 5 minutes before shift end, or after
    const now = new Date();
    const shiftDate = new Date(assignment.shift.shiftDate);
    const [endHour, endMinute] = assignment.shift.endTime.split(':').map(Number);
    const shiftEndTime = new Date(shiftDate);
    shiftEndTime.setHours(endHour, endMinute, 0, 0);
    
    // Handle shift that spans midnight
    if (assignment.shift.endTime < assignment.shift.startTime) {
      shiftEndTime.setDate(shiftEndTime.getDate() + 1);
    }
    
    // Check-out window: 5 minutes before shift end, or after
    const fiveMinutesBefore = new Date(shiftEndTime.getTime() - 5 * 60 * 1000);
    return now >= fiveMinutesBefore;
  };

  const handleCheckIn = async (assignment: AssignmentWithShift) => {
    try {
      if (!assignment.shift) return;
      await shiftAssignmentService.checkIn(assignment.assignmentId);
      toast.success('Checked in successfully');
      await loadMyShifts();
    } catch (error: any) {
      console.error('Failed to check in', error);
      const errorMessage = error?.response?.data?.message || error?.response?.message || error?.message || 'Failed to check in';
      toast.error(errorMessage);
    }
  };

  const handleCheckOut = async (assignment: AssignmentWithShift) => {
    try {
      if (!assignment.shift) return;
      await shiftAssignmentService.checkOut(assignment.assignmentId);
      toast.success('Checked out successfully');
      await loadMyShifts();
    } catch (error: any) {
      console.error('Failed to check out', error);
      const errorMessage = error?.response?.data?.message || error?.response?.message || error?.message || 'Failed to check out';
      toast.error(errorMessage);
    }
  };

  const handleOpenRequestModal = (assignment: AssignmentWithShift, type: 'SWAP' | 'TWO_WAY_SWAP' | 'LEAVE' | 'OVERTIME') => {
    setSelectedAssignment(assignment);
    setSelectedRequestType(type);
    setRequestModalOpen(true);
  };

  const handleCloseRequestModal = () => {
    setRequestModalOpen(false);
    setSelectedAssignment(null);
    setSelectedRequestType(null);
  };

  const handleRequestSuccess = () => {
    loadMyShifts(); // Reload to get updated requests
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const goToCurrentMonth = () => {
    setCurrentMonth(startOfMonth(new Date()));
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
    return <MyShiftsSkeleton />;
  }


  // Render branch schedule tab
  if (activeTab === 'branch-schedule') {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Branch Schedule</h1>
              <p className="text-sm text-slate-500 mt-1">
                View staff schedules (name and shift time only)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBranchScheduleWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200"
              >
                This Week
              </button>
              <button
                onClick={() => setBranchScheduleRefreshTrigger(prev => prev + 1)}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1 mb-6 inline-block">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('my-schedule')}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  (activeTab as TabType) === 'my-schedule'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  My Schedule
                </div>
              </button>
              <button
                onClick={() => setActiveTab('branch-schedule')}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  (activeTab as TabType) === 'branch-schedule'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Branch Schedule
                </div>
              </button>
            </div>
          </div>
          <BranchSchedule 
            currentWeekStart={branchScheduleWeekStart}
            onWeekChange={setBranchScheduleWeekStart}
            refreshTrigger={branchScheduleRefreshTrigger}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Work Schedule</h1>
            <p className="text-sm text-slate-500 mt-1">
              View assigned or registered shifts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToCurrentMonth}
              className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200"
            >
              This Month
            </button>
            <button
              onClick={loadMyShifts}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Status Legend */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-xs font-medium text-slate-600">Status:</span>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 bg-amber-100 border-amber-300"></div>
              <span className="text-xs text-slate-700">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 bg-green-100 border-green-300"></div>
              <span className="text-xs text-slate-700">Confirmed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 bg-blue-100 border-blue-300"></div>
              <span className="text-xs text-slate-700">Checked In</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 bg-slate-100 border-slate-300"></div>
              <span className="text-xs text-slate-700">Checked Out</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 bg-red-100 border-red-300"></div>
              <span className="text-xs text-slate-700">Cancelled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 bg-orange-100 border-orange-300"></div>
              <span className="text-xs text-slate-700">Rejected</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1 mb-6 inline-block">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('my-schedule')}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                (activeTab as TabType) === 'my-schedule'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                My Schedule
              </div>
            </button>
            <button
              onClick={() => setActiveTab('branch-schedule')}
              className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                (activeTab as TabType) === 'branch-schedule'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Branch Schedule
              </div>
            </button>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-4">
              <Calendar className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-900">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
            </div>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Shifts Calendar */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-7 gap-px bg-slate-200">
            {/* Day Headers - Only 7 headers for week days */}
            {weekDayHeaders.map((day, idx) => (
              <div
                key={idx}
                className="p-2 text-center bg-slate-50"
              >
                <div className="text-xs font-medium text-slate-500 uppercase">
                  {format(day, 'EEE')}
                </div>
              </div>
            ))}

            {/* Day Content */}
            {monthDays.map((day, dayIdx) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayAssignments = assignmentsByDate[dateKey] || [];
              const isToday = isSameDay(day, new Date());
              const closure = isDateClosed(day);
              const isCurrentMonth = isSameMonth(day, currentMonth);

              // Get the status color for the first assignment to color the entire cell
              const firstAssignmentStatus = dayAssignments.length > 0 && dayAssignments[0]?.shift 
                ? getStatusColor(dayAssignments[0].status, dayAssignments[0].notes)
                : 'bg-white border-slate-200';

              return (
                <div
                  key={dayIdx}
                  className={`min-h-[80px] p-1.5 ${
                    isToday ? 'ring-2 ring-sky-500' : ''
                  } ${closure ? 'bg-red-50 border-2 border-red-200' : firstAssignmentStatus} ${
                    !isCurrentMonth ? 'opacity-40' : ''
                  }`}
                >
                  {/* Date number */}
                  <div className={`text-xs font-semibold mb-1 ${
                    isToday ? 'text-sky-600' : isCurrentMonth ? 'text-slate-900' : 'text-slate-400'
                  }`}>
                    {format(day, 'd')}
                  </div>
                  
                  {dayAssignments.length === 0 ? (
                    <div className="text-center py-2">
                      {closure ? (
                        <div className="space-y-0.5">
                          <div className="text-xs font-semibold text-red-700">
                            Branch Closed
                          </div>
                          {closure.reason && (
                            <div className="text-[10px] text-red-600 mt-0.5 px-1 line-clamp-2">
                              {closure.reason}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400">
                          No shifts
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {dayAssignments.map((assignment) => {
                        if (!assignment.shift) return null;

                        return (
                          <div
                            key={assignment.assignmentId}
                            className={`w-full p-0.5 rounded border ${getStatusColor(assignment.status, assignment.notes)} transition-all relative group`}
                            onMouseEnter={(e) => {
                              setHoveredAssignmentId(assignment.assignmentId);
                              setHoveredAssignment(assignment);
                              refs.setReference(e.currentTarget);
                            }}
                            onMouseLeave={() => {
                              setHoveredAssignmentId(null);
                              setHoveredAssignment(null);
                              refs.setReference(null);
                            }}
                          >
                            <div className="flex items-center justify-between gap-0.5">
                              <div className="flex items-center gap-1 flex-1 min-w-0">
                                <Clock4 className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                                <span className="text-xs font-semibold text-slate-900 truncate">
                                  {formatTimeRange(assignment.shift)}
                                </span>
                              </div>
                              {/* Action Button - Top Right */}
                              {(canRequestLeave(assignment) || canCheckIn(assignment) || canCheckOut(assignment)) && (
                                <div className="relative flex-shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Close tooltip if it's open
                                      if (hoveredAssignmentId === assignment.assignmentId) {
                                        setHoveredAssignmentId(null);
                                        setHoveredAssignment(null);
                                        refs.setReference(null);
                                      }
                                      setOpenDropdownId(openDropdownId === assignment.assignmentId ? null : assignment.assignmentId);
                                    }}
                                    className="p-0.5 text-slate-600 hover:text-slate-800 hover:bg-white/50 rounded transition-all duration-200 flex items-center justify-center"
                                  >
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </button>
                                  {openDropdownId === assignment.assignmentId && (
                                    <>
                                      <div 
                                        className="fixed inset-0 z-10" 
                                        onClick={() => setOpenDropdownId(null)}
                                      />
                                      <div className="absolute top-full right-0 mt-1.5 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[150px] overflow-hidden transform transition-all duration-200 ease-out">
                                        {canRequestLeave(assignment) && (
                                          <>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenDropdownId(null);
                                                handleOpenRequestModal(assignment, 'LEAVE');
                                              }}
                                              className="w-full px-4 py-2.5 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center gap-2.5 border-b border-slate-200"
                                            >
                                              <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
                                              <span>Leave</span>
                                            </button>
                                          </>
                                        )}
                                        {canCheckIn(assignment) && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setOpenDropdownId(null);
                                              handleCheckIn(assignment);
                                            }}
                                            className="w-full px-4 py-2.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors flex items-center gap-2.5"
                                          >
                                            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                                            <span>Check In</span>
                                          </button>
                                        )}
                                        {canCheckOut(assignment) && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setOpenDropdownId(null);
                                              handleCheckOut(assignment);
                                            }}
                                            className="w-full px-4 py-2.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors flex items-center gap-2.5"
                                          >
                                            <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
                                            <span>Check Out</span>
                                          </button>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Request Modal */}
        {requestModalOpen && selectedAssignment && selectedAssignment.shift && selectedRequestType && (
          <ShiftRequestModal
            isOpen={requestModalOpen}
            onClose={handleCloseRequestModal}
            onSuccess={handleRequestSuccess}
            assignment={selectedAssignment}
            shift={selectedAssignment.shift}
            requestType={selectedRequestType}
          />
        )}

        {/* Tooltip with full information on hover - rendered outside grid to avoid clipping */}
        {hoveredAssignmentId && hoveredAssignment && hoveredAssignment.shift && (
          <div 
            ref={refs.setFloating}
            className="w-72 bg-white border border-slate-200 rounded-lg shadow-2xl z-[9999] p-3 space-y-2 pointer-events-none"
            style={floatingStyles}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-semibold text-slate-900">
                {formatTimeRange(hoveredAssignment.shift)}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {getStatusLabel(hoveredAssignment.status, hoveredAssignment.notes)}
              </span>
            </div>
            
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-slate-600">
                  <span className="font-medium">Type:</span> {getAssignmentTypeLabel(hoveredAssignment.assignmentType || '')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span className="text-slate-600">
                  <span className="font-medium">Duration:</span> {hoveredAssignment.shift.durationHours.toFixed(1)} hours
                </span>
              </div>
              
              {(hoveredAssignment.checkedInAt || hoveredAssignment.checkedOutAt) && (
                <div className="pt-1.5 border-t border-slate-200 space-y-1">
                  {hoveredAssignment.checkedInAt && (
                    <div className="text-slate-600">
                      <span className="font-medium">Check-in:</span> {format(parseISO(hoveredAssignment.checkedInAt), 'HH:mm')}
                    </div>
                  )}
                  {hoveredAssignment.checkedOutAt && (
                    <div className="text-slate-600">
                      <span className="font-medium">Check-out:</span> {format(parseISO(hoveredAssignment.checkedOutAt), 'HH:mm')}
                    </div>
                  )}
                  {hoveredAssignment.actualHours && (
                    <div className="text-slate-600">
                      <span className="font-medium">Actual Hours:</span> {hoveredAssignment.actualHours.toFixed(1)} hours
                    </div>
                  )}
                </div>
              )}

              {hoveredAssignment.shift.notes && (
                <div className="pt-1.5 border-t border-slate-200 text-slate-600 italic">
                  <span className="font-medium">Notes:</span> {hoveredAssignment.shift.notes}
                </div>
              )}

              {(() => {
                const request = getRequestForAssignment(hoveredAssignment.assignmentId);
                if (request) {
                  return (
                    <div className="pt-1.5 border-t border-slate-200">
                      {getRequestStatusBadge(request)}
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-xs text-slate-500 mb-1">Total Shifts</div>
            <div className="text-2xl font-bold text-slate-900">{assignments.length}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-xs text-slate-500 mb-1">Pending</div>
            <div className="text-2xl font-bold text-amber-600">
              {assignments.filter(a => a.status === 'PENDING').length}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-xs text-slate-500 mb-1">Confirmed</div>
            <div className="text-2xl font-bold text-green-600">
              {assignments.filter(a => a.status === 'CONFIRMED').length}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-xs text-slate-500 mb-1">Completed</div>
            <div className="text-2xl font-bold text-blue-600">
              {assignments.filter(a => a.status === 'CHECKED_OUT').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

