import { useEffect, useState, useMemo } from 'react';
import { format, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, parseISO, isWithinInterval, startOfWeek } from 'date-fns';
import { Calendar, Clock4, ChevronLeft, ChevronRight, Users, Hand, Gift, Info, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { shiftAssignmentService, BranchPublicScheduleItem } from '../../services/shiftAssignmentService';
import { shiftRequestService, ShiftRequest } from '../../services/shiftRequestService';
import { shiftAssignmentService as shiftAssignmentServiceFull } from '../../services/shiftAssignmentService';
import { shiftService } from '../../services/shiftService';
import staffService from '../../services/staffService';
import branchClosureService, { BranchClosure } from '../../services/branchClosureService';
import GiveShiftModal from './GiveShiftModal';
import { BranchScheduleSkeleton } from './skeletons';

interface BranchScheduleProps {
  currentWeekStart: Date;
  onWeekChange: (weekStart: Date) => void;
  refreshTrigger?: number;
}

interface ScheduleByDate {
  [dateKey: string]: BranchPublicScheduleItem[];
}

export default function BranchSchedule({ currentWeekStart, onWeekChange, refreshTrigger }: BranchScheduleProps) {
  const { user } = useAuth();
  const [scheduleItems, setScheduleItems] = useState<BranchPublicScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickUpModalOpen, setPickUpModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BranchPublicScheduleItem | null>(null);
  const [pickUpReason, setPickUpReason] = useState('');
  const [submittingPickUp, setSubmittingPickUp] = useState(false);
  const [giveShiftModalOpen, setGiveShiftModalOpen] = useState(false);
  const [selectedGiveShiftItem, setSelectedGiveShiftItem] = useState<BranchPublicScheduleItem | null>(null);
  const [pickUpModalTab, setPickUpModalTab] = useState<'pickup' | 'swap'>('pickup');
  const [targetStaffId, setTargetStaffId] = useState<number | null>(null);
  const [targetAssignmentId, setTargetAssignmentId] = useState<number | null>(null);
  const [myAssignmentsForSwap, setMyAssignmentsForSwap] = useState<Array<{assignmentId: number, shiftDate: string, startTime: string, endTime: string, shiftId: number}>>([]);
  const [loadingMyAssignments, setLoadingMyAssignments] = useState(false);
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [hoveredItem, setHoveredItem] = useState<BranchPublicScheduleItem | null>(null);
  const [staffNameMap, setStaffNameMap] = useState<Record<number, string>>({});
  const [closures, setClosures] = useState<BranchClosure[]>([]);

  const branchId = useMemo(() => {
    if (user?.branch?.branchId) return user.branch.branchId;
    if (user?.branchId) return Number(user.branchId);
    return null;
  }, [user]);

  const weekDays = useMemo(() => {
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: currentWeekStart, end: weekEnd });
  }, [currentWeekStart]);

  const scheduleByDate = useMemo(() => {
    const grouped: ScheduleByDate = {};
    scheduleItems.forEach(item => {
      const dateKey = item.shiftDate;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(item);
    });
    // Sort by time within each date
    Object.keys(grouped).forEach(dateKey => {
      grouped[dateKey].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    return grouped;
  }, [scheduleItems]);

  // Check if a date is within any closure period
  const isDateClosed = useMemo(() => {
    return (date: Date): BranchClosure | null => {
      return closures.find(closure => {
        const start = parseISO(closure.startDate);
        const end = parseISO(closure.endDate);
        return isWithinInterval(date, { start, end });
      }) || null;
    };
  }, [closures]);

  const loadBranchSchedule = async () => {
    if (!branchId) {
      toast.error('Branch not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
      const startDateStr = format(currentWeekStart, 'yyyy-MM-dd');
      const endDateStr = format(weekEnd, 'yyyy-MM-dd');
      
      const [items, branchClosures] = await Promise.all([
        shiftAssignmentService.getPublicBranchSchedule({
        branchId,
        startDate: startDateStr,
        endDate: endDateStr,
        }),
        branchClosureService.list({
          branchId,
          from: startDateStr,
          to: endDateStr,
        }),
      ]);
      
      setScheduleItems(items);
      setClosures(branchClosures);
    } catch (error: any) {
      console.error('Failed to load branch schedule', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to load branch schedule');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranchSchedule();
  }, [branchId, currentWeekStart, refreshTrigger]);

  // Load staff names for request tooltips
  useEffect(() => {
    const loadStaffNames = async () => {
      if (!branchId) return;
      try {
        const staffList = await staffService.getStaffsWithUserInfoByBranch(branchId);
        const nameMap: Record<number, string> = {};
        staffList.forEach(staff => {
          if (staff.userId && staff.fullname) {
            nameMap[staff.userId] = staff.fullname;
          }
        });
        setStaffNameMap(nameMap);
      } catch (error: any) {
        console.error('Failed to load staff names', error);
      }
    };
    loadStaffNames();
  }, [branchId]);

  // Load requests for assignments in schedule
  useEffect(() => {
    const loadRequests = async () => {
      if (!user?.user_id || scheduleItems.length === 0) {
        setRequests([]);
        return;
      }

      try {
        // Load all requests for current user
        const myRequests = await shiftRequestService.getMyRequests();
        // Filter requests that match assignments in current schedule
        const assignmentIds = new Set(scheduleItems.map(item => item.assignmentId));
        const relevantRequests = myRequests.filter(req => 
          assignmentIds.has(req.assignmentId) && 
          ['PENDING', 'PENDING_TARGET_APPROVAL', 'PENDING_MANAGER_APPROVAL', 'APPROVED'].includes(req.status)
        );
        setRequests(relevantRequests);
      } catch (error: any) {
        console.error('Failed to load requests', error);
        setRequests([]);
      }
    };

    loadRequests();
  }, [scheduleItems, user?.user_id]);

  // Create map for quick lookup: assignmentId -> request
  const requestMap = useMemo(() => {
    const map = new Map<number, ShiftRequest>();
    requests.forEach(req => {
      map.set(req.assignmentId, req);
    });
    return map;
  }, [requests]);

  // Get request for an assignment
  const getRequestForAssignment = (assignmentId: number): ShiftRequest | null => {
    return requestMap.get(assignmentId) || null;
  };

  // Get request type label
  const getRequestTypeLabel = (type: string): string => {
    switch (type) {
      case 'SWAP': return 'Swap';
      case 'PICK_UP': return 'Pick Up';
      case 'TWO_WAY_SWAP': return 'Two-Way Swap';
      case 'LEAVE': return 'Leave';
      case 'OVERTIME': return 'Overtime';
      default: return type;
    }
  };

  // Get request status label
  const getRequestStatusLabel = (status: string): string => {
    switch (status) {
      case 'PENDING': return 'Pending';
      case 'PENDING_TARGET_APPROVAL': return 'Waiting for Response';
      case 'PENDING_MANAGER_APPROVAL': return 'Waiting for Manager Approval';
      case 'APPROVED': return 'Approved';
      case 'REJECTED': return 'Rejected';
      case 'REJECTED_BY_TARGET': return 'Rejected by Staff';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  };

  // Calculate week for swap calendar
  const swapWeekStart = useMemo(() => {
    if (!selectedItem) return startOfWeek(new Date(), { weekStartsOn: 1 });
    const shiftDate = new Date(selectedItem.shiftDate);
    return startOfWeek(shiftDate, { weekStartsOn: 1 });
  }, [selectedItem]);

  const swapWeekDays = useMemo(() => {
    const weekEnd = endOfWeek(swapWeekStart, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: swapWeekStart, end: weekEnd });
  }, [swapWeekStart]);

  // Group my assignments by date for swap calendar
  const myAssignmentsByDate = useMemo(() => {
    const grouped: Record<string, Array<{assignmentId: number, shiftDate: string, startTime: string, endTime: string, shiftId: number}>> = {};
    myAssignmentsForSwap.forEach(item => {
      const dateKey = item.shiftDate;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(item);
    });
    // Sort by time within each date
    Object.keys(grouped).forEach(dateKey => {
      grouped[dateKey].sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    return grouped;
  }, [myAssignmentsForSwap]);

  const loadMyAssignmentsForSwap = async () => {
    if (!selectedItem || !user?.user_id) return;
    
    try {
      setLoadingMyAssignments(true);
      const shiftDate = new Date(selectedItem.shiftDate);
      const weekStart = startOfWeek(shiftDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(shiftDate, { weekStartsOn: 1 });

      const assignments = await shiftAssignmentServiceFull.getMyAssignments({
        startDate: format(weekStart, 'yyyy-MM-dd'),
        endDate: format(weekEnd, 'yyyy-MM-dd'),
      });

      // Load shift details for each assignment
      const assignmentsWithShifts = await Promise.all(
        assignments
          .filter(a => (a.status === 'CONFIRMED' || a.status === 'PENDING') && a.assignmentId !== selectedItem.assignmentId)
          .map(async (a) => {
            try {
              const s = await shiftService.getById(a.shiftId);
              return {
                assignmentId: a.assignmentId,
                shiftId: a.shiftId,
                shiftDate: s.shiftDate,
                startTime: s.startTime.substring(0, 5),
                endTime: s.endTime.substring(0, 5),
              };
            } catch {
              return null;
            }
          })
      );

      setMyAssignmentsForSwap(assignmentsWithShifts.filter((a): a is {assignmentId: number, shiftDate: string, startTime: string, endTime: string, shiftId: number} => a !== null));
    } catch (error: any) {
      console.error('Failed to load my assignments', error);
      setMyAssignmentsForSwap([]);
      toast.error('Failed to load your shifts');
    } finally {
      setLoadingMyAssignments(false);
    }
  };

  useEffect(() => {
    if (pickUpModalOpen && selectedItem && pickUpModalTab === 'swap') {
      setTargetStaffId(selectedItem.staffUserId);
      loadMyAssignmentsForSwap();
    }
  }, [pickUpModalOpen, selectedItem, pickUpModalTab]);


  const handlePickUpShift = async () => {
    if (!selectedItem || !pickUpReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    if (!user?.user_id) {
      toast.error('User not found');
      return;
    }

    try {
      setSubmittingPickUp(true);
      await shiftRequestService.createRequest({
        assignmentId: selectedItem.assignmentId,
        requestType: 'PICK_UP',
        targetStaffUserId: selectedItem.staffUserId,
        reason: pickUpReason.trim(),
      });
      toast.success('Pick up request submitted successfully! The staff member will be notified.');
      setPickUpModalOpen(false);
      setSelectedItem(null);
      setPickUpReason('');
      setTargetStaffId(null);
      setTargetAssignmentId(null);
      loadBranchSchedule();
    } catch (error: any) {
      console.error('Failed to create pick up request', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to submit request');
    } finally {
      setSubmittingPickUp(false);
    }
  };

  const handleSwapShift = async () => {
    if (!selectedItem || !pickUpReason.trim() || !targetAssignmentId) {
      toast.error('Please select your shift to swap');
      return;
    }

    if (!user?.user_id) {
      toast.error('User not found');
      return;
    }

    try {
      setSubmittingPickUp(true);
      // For swap: user's assignment (targetAssignmentId) will be swapped with selectedItem (selectedItem.assignmentId)
      // So assignmentId = user's assignment, targetStaffUserId = selectedItem's staff, targetAssignmentId = selectedItem's assignment
      await shiftRequestService.createRequest({
        assignmentId: targetAssignmentId, // User's assignment
        requestType: 'TWO_WAY_SWAP',
        targetStaffUserId: selectedItem.staffUserId, // Staff who owns the selected shift
        targetAssignmentId: selectedItem.assignmentId, // The selected shift to swap with
        reason: pickUpReason.trim(),
      });
      toast.success('Swap request submitted successfully! The staff member will be notified.');
      setPickUpModalOpen(false);
      setSelectedItem(null);
      setPickUpReason('');
      setTargetStaffId(null);
      setTargetAssignmentId(null);
      loadBranchSchedule();
    } catch (error: any) {
      console.error('Failed to create swap request', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to submit request');
    } finally {
      setSubmittingPickUp(false);
    }
  };


  const formatTimeRange = (startTime: string, endTime: string) => {
    return `${startTime} - ${endTime}`;
  };

  const goToPreviousWeek = () => {
    onWeekChange(subWeeks(currentWeekStart, 1));
  };

  const goToNextWeek = () => {
    onWeekChange(addWeeks(currentWeekStart, 1));
  };

  if (loading && scheduleItems.length === 0) {
    return <BranchScheduleSkeleton />;
  }

  return (
    <>

        {/* Week Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousWeek}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div className="flex items-center gap-4">
              <Calendar className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-900">
                {format(currentWeekStart, 'dd/MM/yyyy')} - {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'dd/MM/yyyy')}
              </span>
            </div>
            <button
              onClick={goToNextWeek}
              className="p-2 hover:bg-slate-100 rounded-lg"
            >
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Schedule Calendar */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-7 gap-px bg-slate-200">
            {/* Day Headers */}
            {weekDays.map((day, idx) => (
              <div
                key={idx}
                className={`p-3 text-center ${
                  isSameDay(day, new Date())
                    ? 'bg-sky-50 border-b-2 border-sky-500'
                    : 'bg-slate-50'
                }`}
              >
                <div className="text-xs font-medium text-slate-500 uppercase">
                  {format(day, 'EEE')}
                </div>
                <div className={`text-sm font-semibold mt-1 ${
                  isSameDay(day, new Date())
                    ? 'text-sky-600'
                    : 'text-slate-900'
                }`}>
                  {format(day, 'dd')}
                </div>
              </div>
            ))}

            {/* Day Content */}
            {weekDays.map((day, dayIdx) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayItems = scheduleByDate[dateKey] || [];
              const isToday = isSameDay(day, new Date());
              const closure = isDateClosed(day);

              // Group by time slot
              const itemsByTimeSlot: { [timeSlot: string]: BranchPublicScheduleItem[] } = {};
              dayItems.forEach(item => {
                const timeSlot = `${item.startTime}-${item.endTime}`;
                if (!itemsByTimeSlot[timeSlot]) {
                  itemsByTimeSlot[timeSlot] = [];
                }
                itemsByTimeSlot[timeSlot].push(item);
              });

              return (
                <div
                  key={dayIdx}
                  className={`bg-white min-h-[200px] p-2 ${
                    isToday ? 'ring-2 ring-sky-500' : ''
                  } ${closure ? 'bg-red-50' : ''}`}
                >
                  {/* Closure Banner */}
                  {closure && (
                    <div className="mb-2 p-2 bg-red-100 border border-red-300 rounded-lg">
                      <div className="flex items-start gap-2">
                        <X className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-red-800">Branch Closed</div>
                          {closure.reason && (
                            <div className="text-xs text-red-700 mt-0.5 line-clamp-2">{closure.reason}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {dayItems.length === 0 ? (
                    <div className="text-center text-xs text-slate-400 py-8">
                      No shifts
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(itemsByTimeSlot).map(([timeSlot, items]) => {
                        // Check if any item in this time slot has a request
                        const hasRequestInSlot = items.some(item => {
                          const request = getRequestForAssignment(item.assignmentId);
                          return !!request;
                        });
                        
                        return (
                          <div
                            key={timeSlot}
                            className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors relative"
                          >
                            {/* Info icon in top right corner */}
                            {hasRequestInSlot && (
                              <div className="absolute top-2 right-2">
                                <Info className="w-3.5 h-3.5 text-amber-500" />
                              </div>
                            )}
                            
                            <div className="flex items-center gap-1.5 mb-2">
                              <Clock4 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span className="text-xs font-semibold text-slate-900">
                                {formatTimeRange(items[0].startTime, items[0].endTime)}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {items.map((item, itemIdx) => {
                                const isCurrentUser = user?.user_id && item.staffUserId === user.user_id;
                                const canPickUp = !isCurrentUser && user?.user_id;
                                const request = getRequestForAssignment(item.assignmentId);
                                const hasPendingRequest = !!request && ['PENDING', 'PENDING_TARGET_APPROVAL', 'PENDING_MANAGER_APPROVAL'].includes(request.status);
                                const isRequestCreator = request && request.staffUserId === user?.user_id;
                                
                                return (
                                  <div
                                    key={itemIdx}
                                    className={`flex items-center justify-between gap-1.5 text-xs relative ${
                                      canPickUp && !hasPendingRequest ? 'group cursor-pointer hover:bg-slate-200 rounded px-1 py-0.5' : ''
                                    } ${request ? 'cursor-pointer' : ''}`}
                                    onClick={request ? () => setHoveredItem(item) : canPickUp && !hasPendingRequest ? () => {
                                      setSelectedItem(item);
                                      setPickUpModalTab('pickup');
                                      setPickUpModalOpen(true);
                                    } : undefined}
                                    onMouseEnter={request ? () => setHoveredItem(item) : undefined}
                                    onMouseLeave={request ? () => setHoveredItem(null) : undefined}
                                    title={
                                      request 
                                        ? `${getRequestTypeLabel(request.requestType)}: ${getRequestStatusLabel(request.status)}`
                                        : canPickUp && !hasPendingRequest 
                                          ? 'Click to request this shift' 
                                          : hasPendingRequest 
                                            ? 'This shift has a pending request'
                                            : ''
                                    }
                                  >
                                    <div className="flex items-center gap-1.5 text-slate-700 flex-1 min-w-0">
                                      <Users className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                      <span className="font-medium truncate">
                                        {item.staffName}
                                        {isCurrentUser && <span className="text-sky-600 ml-1">(You)</span>}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {isCurrentUser && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (!hasPendingRequest) {
                                              setSelectedGiveShiftItem(item);
                                              setGiveShiftModalOpen(true);
                                            }
                                          }}
                                          disabled={hasPendingRequest}
                                          className={`p-1 rounded-full transition-colors ${
                                            hasPendingRequest
                                              ? 'text-slate-300 cursor-not-allowed'
                                              : 'hover:bg-slate-200 text-slate-500 hover:text-purple-600'
                                          }`}
                                          title={hasPendingRequest ? 'Cannot give shift: request pending' : 'Give this shift to someone'}
                                        >
                                          <Gift className="w-3 h-3" />
                                        </button>
                                      )}
                                      {canPickUp && !hasPendingRequest && (
                                        <Hand className="w-3 h-3 text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                      )}
                                    </div>
                                    
                                    {/* Request Info Tooltip */}
                                    {request && hoveredItem?.assignmentId === item.assignmentId && (
                                      <div className="absolute left-0 top-full mt-1 z-50 w-64 p-3 bg-white border border-slate-200 rounded-lg shadow-lg">
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-slate-900">
                                              {getRequestTypeLabel(request.requestType)}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded ${
                                              request.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                              request.status === 'REJECTED' || request.status === 'REJECTED_BY_TARGET' ? 'bg-red-100 text-red-700' :
                                              request.status === 'CANCELLED' ? 'bg-gray-100 text-gray-700' :
                                              'bg-amber-100 text-amber-700'
                                            }`}>
                                              {getRequestStatusLabel(request.status)}
                                            </span>
                                          </div>
                                          
                                          {/* Request creator info */}
                                          <div className="text-xs text-slate-700">
                                            {isRequestCreator ? (
                                              <p>
                                                <span className="font-medium text-sky-600">You</span> requested to{' '}
                                                {request.requestType === 'SWAP' ? 'swap' :
                                                 request.requestType === 'PICK_UP' ? 'pick up' :
                                                 request.requestType === 'TWO_WAY_SWAP' ? 'swap' :
                                                 request.requestType === 'LEAVE' ? 'leave' :
                                                 'request'} this shift
                                              </p>
                                            ) : (
                                              <p>
                                                <span className="font-medium">{staffNameMap[request.staffUserId] || `Staff ${request.staffUserId}`}</span> requested{' '}
                                                {item.staffUserId === user?.user_id ? 'you to ' : ''}
                                                {request.requestType === 'SWAP' ? 'to swap' :
                                                 request.requestType === 'PICK_UP' ? 'you to pick up' :
                                                 request.requestType === 'TWO_WAY_SWAP' ? 'to swap' :
                                                 request.requestType === 'LEAVE' ? 'to leave' :
                                                 'for'} this shift
                                              </p>
                                            )}
                                          </div>
                                          
                                          {request.reason && (
                                            <p className="text-xs text-slate-600 line-clamp-2">
                                              <span className="font-medium">Reason:</span> {request.reason}
                                            </p>
                                          )}
                                          {request.targetStaffUserId && (
                                            <p className="text-xs text-slate-600">
                                              <span className="font-medium">Target Staff:</span> {staffNameMap[request.targetStaffUserId] || `Staff ${request.targetStaffUserId}`}
                                            </p>
                                          )}
                                          <p className="text-xs text-slate-500">
                                            Requested: {format(new Date(request.requestedAt), 'dd/MM/yyyy HH:mm')}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
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

        {/* Pick Up / Swap Modal */}
        {pickUpModalOpen && selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col relative">
              {/* Loading Overlay */}
              {submittingPickUp && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-slate-200 border-t-sky-600 rounded-full animate-spin"></div>
                    <p className="text-sm font-medium text-slate-700">Submitting request...</p>
                  </div>
                </div>
              )}
              <div className="flex-1 min-h-0 overflow-y-auto p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Request Shift</h3>
                
                {/* Tabs */}
                <div className="flex gap-2 mb-4 border-b border-slate-200">
                  <button
                    onClick={() => {
                      setPickUpModalTab('pickup');
                      setTargetStaffId(null);
                      setTargetAssignmentId(null);
                    }}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                      pickUpModalTab === 'pickup'
                        ? 'border-sky-600 text-sky-600'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Yêu cầu ca
                  </button>
                  <button
                    onClick={() => {
                      setPickUpModalTab('swap');
                    }}
                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                      pickUpModalTab === 'swap'
                        ? 'border-sky-600 text-sky-600'
                        : 'border-transparent text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Swap ca
                  </button>
                </div>

                <div className="mb-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-sm text-slate-600 mb-1">
                    <span className="font-medium">Staff:</span> {selectedItem.staffName}
                  </div>
                  <div className="text-sm text-slate-600 mb-1">
                    <span className="font-medium">Date:</span> {format(new Date(selectedItem.shiftDate), 'dd/MM/yyyy')}
                  </div>
                  <div className="text-sm text-slate-600">
                    <span className="font-medium">Time:</span> {selectedItem.startTime} - {selectedItem.endTime}
                  </div>
                </div>

                {/* Tab Content: Pick Up */}
                {pickUpModalTab === 'pickup' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Reason <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={pickUpReason}
                      onChange={(e) => setPickUpReason(e.target.value)}
                      placeholder="Why do you want to pick up this shift?"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      rows={3}
                    />
                  </div>
                )}

                {/* Tab Content: Swap */}
                {pickUpModalTab === 'swap' && (
                  <div className="space-y-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Select Your Shift to Swap <span className="text-red-500">*</span>
                      </label>
                      {loadingMyAssignments ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-6 h-6 border-2 border-slate-200 border-t-sky-600 rounded-full animate-spin"></div>
                        </div>
                      ) : (
                        <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                          {/* Week Header */}
                          <div className="bg-slate-50 border-b border-slate-200 p-2 sticky top-0 z-10">
                            <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-700">
                              <Calendar className="w-3.5 h-3.5" />
                              <span>
                                {format(swapWeekStart, 'dd/MM')} - {format(endOfWeek(swapWeekStart, { weekStartsOn: 1 }), 'dd/MM/yyyy')}
                              </span>
                            </div>
                          </div>
                          
                          {/* Calendar Grid */}
                          <div className="grid grid-cols-7 gap-px bg-slate-200">
                            {/* Day Headers */}
                            {swapWeekDays.map((day, idx) => (
                              <div
                                key={idx}
                                className="bg-slate-50 p-2 text-center"
                              >
                                <div className="text-xs font-medium text-slate-500 uppercase">
                                  {format(day, 'EEE')}
                                </div>
                                <div className={`text-sm font-semibold mt-0.5 ${
                                  isSameDay(day, new Date())
                                    ? 'text-sky-600'
                                    : 'text-slate-900'
                                }`}>
                                  {format(day, 'dd')}
                                </div>
                              </div>
                            ))}

                            {/* Day Content */}
                            {swapWeekDays.map((day, dayIdx) => {
                              const dateKey = format(day, 'yyyy-MM-dd');
                              const dayShifts = myAssignmentsByDate[dateKey] || [];
                              const isToday = isSameDay(day, new Date());
                              const isSelectedShiftDate = selectedItem && dateKey === selectedItem.shiftDate;
                              const targetShiftTime = selectedItem && isSelectedShiftDate 
                                ? `${selectedItem.startTime}-${selectedItem.endTime}` 
                                : null;

                              return (
                                <div
                                  key={dayIdx}
                                  className={`min-h-[80px] max-h-[150px] overflow-y-auto p-2 ${
                                    isSelectedShiftDate 
                                      ? 'bg-green-50' 
                                      : 'bg-white'
                                  } ${isToday && !isSelectedShiftDate ? 'ring-1 ring-sky-500' : ''}`}
                                >
                                  <div className="space-y-1.5">
                                    {/* Show target shift (the one you want to swap with) */}
                                    {targetShiftTime && (
                                      <div className="w-full p-2 rounded text-left text-sm bg-green-500 text-white border-2 border-green-600">
                                        <div className="font-medium whitespace-nowrap">{targetShiftTime}</div>
                    </div>
                                    )}
                                    
                                    {/* Show your shifts */}
                                    {dayShifts.length === 0 && !targetShiftTime ? (
                                      <div className="text-center text-xs text-slate-400 py-4">
                                        —
                          </div>
                        ) : (
                                      dayShifts.map((item) => {
                                        const isSelected = targetAssignmentId === item.assignmentId;
                                        const timeStr = `${item.startTime}-${item.endTime}`;
                                        
                                        return (
                                  <button
                                            key={item.assignmentId}
                                            type="button"
                                            onClick={() => {
                                              // Toggle selection: if already selected, deselect it
                                              if (isSelected) {
                                                setTargetAssignmentId(null);
                                                setTargetStaffId(null);
                                              } else {
                                                setTargetAssignmentId(item.assignmentId);
                                                // For swap, we need to set targetStaffUserId to the staff who owns the selectedItem
                                                if (selectedItem) {
                                                  setTargetStaffId(selectedItem.staffUserId);
                                                }
                                              }
                                            }}
                                            className={`w-full p-2 rounded text-left text-sm transition-colors ${
                                              isSelected
                                                ? 'bg-sky-600 text-white border-2 border-sky-700'
                                                : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300'
                                            }`}
                                          >
                                            <div className="font-medium whitespace-nowrap">{timeStr}</div>
                                          </button>
                                        );
                                      })
                                    )}
                                    </div>
                                    </div>
                              );
                            })}
                              </div>
                          </div>
                        )}
                      {myAssignmentsForSwap.length === 0 && !loadingMyAssignments && (
                        <p className="text-xs text-slate-500 text-center py-2">
                          No available shifts found for swap
                        </p>
                      )}
                      {targetAssignmentId && selectedItem && (
                        <div className="p-2 bg-sky-50 border border-sky-200 rounded-lg mt-2">
                          <div className="text-xs font-medium text-sky-900">
                            Selected: Your shift on {format(new Date(myAssignmentsForSwap.find(a => a.assignmentId === targetAssignmentId)?.shiftDate || ''), 'dd/MM/yyyy')}
                          </div>
                          <div className="text-xs text-sky-700 mt-0.5">
                            Will swap with: {selectedItem.staffName}'s shift on {format(new Date(selectedItem.shiftDate), 'dd/MM/yyyy')} ({selectedItem.startTime} - {selectedItem.endTime})
                          </div>
                      </div>
                    )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Reason <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={pickUpReason}
                        onChange={(e) => setPickUpReason(e.target.value)}
                        placeholder="Why do you want to swap this shift?"
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setPickUpModalOpen(false);
                      setSelectedItem(null);
                      setPickUpReason('');
                      setTargetStaffId(null);
                      setTargetAssignmentId(null);
                      setPickUpModalTab('pickup');
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={pickUpModalTab === 'pickup' ? handlePickUpShift : handleSwapShift}
                    disabled={
                      submittingPickUp ||
                      !pickUpReason.trim() ||
                      (pickUpModalTab === 'swap' && !targetAssignmentId)
                    }
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submittingPickUp ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Give Shift Modal */}
        {giveShiftModalOpen && selectedGiveShiftItem && (
          <GiveShiftModal
            isOpen={giveShiftModalOpen}
            onClose={() => {
              setGiveShiftModalOpen(false);
              setSelectedGiveShiftItem(null);
            }}
            onSuccess={() => {
              setGiveShiftModalOpen(false);
              setSelectedGiveShiftItem(null);
              loadBranchSchedule();
            }}
            assignmentId={selectedGiveShiftItem.assignmentId}
            shiftId={selectedGiveShiftItem.shiftId}
            shiftDate={selectedGiveShiftItem.shiftDate}
            startTime={selectedGiveShiftItem.startTime}
            endTime={selectedGiveShiftItem.endTime}
            branchId={branchId!}
            currentStaffUserId={user?.user_id!}
          />
        )}

        {/* Statistics */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-xs text-slate-500 mb-1">Total Shifts</div>
            <div className="text-2xl font-bold text-slate-900">{scheduleItems.length}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-xs text-slate-500 mb-1">Unique Staff</div>
            <div className="text-2xl font-bold text-blue-600">
              {new Set(scheduleItems.map(item => item.staffUserId)).size}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="text-xs text-slate-500 mb-1">Days with Shifts</div>
            <div className="text-2xl font-bold text-green-600">
              {Object.keys(scheduleByDate).length}
            </div>
          </div>
        </div>
    </>
  );
}

