import { useEffect, useState, useMemo } from 'react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isSameDay, parseISO, isWithinInterval } from 'date-fns';
import { Calendar, Clock4, Users, ChevronLeft, ChevronRight, RefreshCw, CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { shiftService, Shift } from '../../services/shiftService';
import { shiftAssignmentService, ShiftAssignment, BranchPublicScheduleItem } from '../../services/shiftAssignmentService';
import branchClosureService, { BranchClosure } from '../../services/branchClosureService';
import ConfirmModal from '../../components/common/ConfirmModal';
import ShiftRequestModal from '../../components/shift/ShiftRequestModal';
import { ShiftRegistrationSkeleton } from '../../components/shift/skeletons';
import { useShiftWebSocket, ShiftUpdatePayload } from '../../hooks/useShiftWebSocket';

export default function StaffShiftRegistration() {
  const { user } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [publicSchedule, setPublicSchedule] = useState<BranchPublicScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<number | null>(null);
  const [unregistering, setUnregistering] = useState<number | null>(null);
  const [assignmentToUnregister, setAssignmentToUnregister] = useState<{ assignmentId: number; shiftId: number } | null>(null);
  const [closures, setClosures] = useState<BranchClosure[]>([]);
  const [validationError, setValidationError] = useState<{ shift: Shift; errorMessage: string } | null>(null);
  const [overtimeRequestModalOpen, setOvertimeRequestModalOpen] = useState(false);
  const [selectedShiftForOvertime, setSelectedShiftForOvertime] = useState<Shift | null>(null);

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const branchId = useMemo(() => {
    if (user?.branch?.branchId) return user.branch.branchId;
    if (user?.branchId) return Number(user.branchId);
    return null;
  }, [user]);

  const weekDays = useMemo(() => {
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: currentWeekStart, end: weekEnd });
  }, [currentWeekStart]);

  const shiftsByDate = useMemo(() => {
    const grouped: Record<string, Shift[]> = {};
    shifts.forEach(shift => {
      const dateKey = shift.shiftDate;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(shift);
    });
    return grouped;
  }, [shifts]);

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

  const loadShifts = async () => {
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
      
      // Load shifts, assignments, public schedule, and closures in parallel
      const [availableShifts, myAssignments, publicScheduleData, branchClosures] = await Promise.all([
        shiftService.getAvailableShifts({
          branchId,
          startDate: startDateStr,
          endDate: endDateStr,
        }),
        shiftAssignmentService.getMyAssignments({
          startDate: startDateStr,
          endDate: endDateStr,
        }),
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
      
      setShifts(availableShifts);
      setAssignments(myAssignments);
      setPublicSchedule(publicScheduleData);
      setClosures(branchClosures);
    } catch (error: any) {
      console.error('Failed to load shifts and assignments', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, [branchId, currentWeekStart]);

  // Real-time updates via WebSocket - simplified: all changes trigger reload
  useShiftWebSocket({
    onDraftCreated: (payload: ShiftUpdatePayload) => {
      const metadata = payload.metadata;
      if (metadata?.branchId && metadata.branchId === branchId) {
        loadShifts();
      }
    },
    onDraftUpdated: (payload: ShiftUpdatePayload) => {
      const metadata = payload.metadata;
      if (metadata?.branchId && metadata.branchId === branchId) {
        loadShifts();
      }
    },
    onDraftDeleted: (payload: ShiftUpdatePayload) => {
      const metadata = payload.metadata;
      if (metadata?.branchId && metadata.branchId === branchId) {
        loadShifts();
      }
    },
    onShiftPublished: (payload: ShiftUpdatePayload) => {
      const metadata = payload.metadata;
      if (metadata?.branchId && metadata.branchId === branchId) {
        loadShifts();
        toast.success('New shifts have been published');
      }
    },
    onAssignmentCreated: (payload: ShiftUpdatePayload) => {
      const metadata = payload.metadata;
      if (metadata?.branchId && metadata.branchId === branchId) {
        loadShifts();
      }
    },
    onAssignmentApproved: (payload: ShiftUpdatePayload) => {
      const metadata = payload.metadata;
      if (metadata?.branchId && metadata.branchId === branchId) {
        loadShifts();
      }
    },
    onAssignmentRejected: (payload: ShiftUpdatePayload) => {
      const metadata = payload.metadata;
      if (metadata?.branchId && metadata.branchId === branchId) {
        loadShifts();
      }
    },
    onAssignmentDeleted: (payload: ShiftUpdatePayload) => {
      const metadata = payload.metadata;
      if (metadata?.branchId && metadata.branchId === branchId) {
        loadShifts();
      }
    },
  });

  // Check if error is a labor law violation (can be resolved with OVERTIME request)
  const isLaborLawViolation = (errorCode: number | undefined, errorMessage: string): boolean => {
    // Check by error code first
    if (errorCode) {
      const laborLawErrorCodes = [
        4023, // SHIFT_TIME_CONFLICT
        4024, // SHIFT_EXCEEDS_DAILY_HOURS
        4025, // SHIFT_EXCEEDS_WEEKLY_HOURS
        4026, // SHIFT_INSUFFICIENT_REST
        4032, // SHIFT_EXCEEDS_DAILY_SHIFTS
        4033, // SHIFT_EXCEEDS_WEEKLY_SHIFTS
        4034, // SHIFT_EXCEEDS_CONSECUTIVE_DAYS
        4039, // SHIFT_EXCEEDS_OVERTIME_LIMIT
        4040, // SHIFT_EXCEEDS_DAILY_OVERTIME
        4041, // SHIFT_EXCEEDS_WEEKEND_LIMIT
        4038, // SHIFT_PATTERN_RESTRICTED
      ];
      if (laborLawErrorCodes.includes(errorCode)) {
        return true;
      }
    }
    
    // Fallback: Check by error message keywords
    const laborLawKeywords = [
      'exceed',
      'limit',
      'rest period',
      'rest requirement',
      'insufficient rest',
      'time conflict',
      'conflicts with',
      'weekend',
      'consecutive days',
      'pattern restricted',
      'hours per day',
      'hours per week',
      'shifts per day',
      'shifts per week',
    ];
    const messageLower = errorMessage.toLowerCase();
    return laborLawKeywords.some(keyword => messageLower.includes(keyword));
  };

  const handleRegister = async (shiftId: number) => {
    try {
      setRegistering(shiftId);
      await shiftService.registerForShift(shiftId);
      toast.success('Shift registration successful! Waiting for manager approval.');
      await loadShifts();
    } catch (error: any) {
      console.error('Failed to register for shift', error);
      // Error code can be in error.code or error.response.code
      const errorCode = error?.code || error?.response?.code;
      const errorMessage = error?.response?.message || error?.message || 'Failed to register for shift';
      // Check if it's a labor law violation (by code or message)
      if (isLaborLawViolation(errorCode, errorMessage)) {
        // Find the shift
        const shift = shifts.find(s => s.shiftId === shiftId);
        if (shift) {
          setValidationError({ shift, errorMessage });
          return;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setRegistering(null);
    }
  };

  const handleRequestOvertime = () => {
    if (validationError) {
      setSelectedShiftForOvertime(validationError.shift);
      setValidationError(null);
      setOvertimeRequestModalOpen(true);
    }
  };

  const handleCloseOvertimeModal = async () => {
    setOvertimeRequestModalOpen(false);
    setSelectedShiftForOvertime(null);
    await loadShifts();
  };

  const handleUnregister = async () => {
    if (!assignmentToUnregister) return;

    try {
      setUnregistering(assignmentToUnregister.assignmentId);
      await shiftService.unregisterFromShift(assignmentToUnregister.assignmentId);
      toast.success('Shift unregistration successful!');
      setAssignmentToUnregister(null);
      await loadShifts();
    } catch (error: any) {
      console.error('Failed to unregister from shift', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to unregister from shift';
      toast.error(errorMessage);
    } finally {
      setUnregistering(null);
    }
  };

  const formatTime = (timeStr: string) => {
    return timeStr.substring(0, 5); // HH:mm
  };

  const formatTimeRange = (shift: Shift) => {
    return `${formatTime(shift.startTime)} - ${formatTime(shift.endTime)}`;
  };

  const getEmploymentTypeLabel = (type?: string | null) => {
    switch (type) {
      case 'FULL_TIME':
        return 'Full-time';
      case 'PART_TIME':
        return 'Part-time';
      case 'CASUAL':
        return 'Casual';
      case 'ANY':
        return 'All';
      default:
        return '—';
    }
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  if (loading && shifts.length === 0) {
    return <ShiftRegistrationSkeleton />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Shift Registration</h1>
            <p className="text-sm text-slate-500 mt-1">
              View and register for available shifts this week
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={goToCurrentWeek}
              className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200"
            >
              This week
            </button>
            <button
              onClick={loadShifts}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

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

        {/* Shifts Calendar */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-7 gap-px bg-slate-200">
            {/* Day Headers */}
            {weekDays.map((day, idx) => (
              <div
                key={idx}
                className="bg-slate-50 p-3 text-center"
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
              const dayShifts = shiftsByDate[dateKey] || [];
              const isToday = isSameDay(day, new Date());
              const closure = isDateClosed(day);

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
                          <div className="text-xs font-semibold text-red-800">Branch closed</div>
                          {closure.reason && (
                            <div className="text-xs text-red-700 mt-0.5 line-clamp-2">{closure.reason}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {dayShifts.length === 0 ? (
                    <div className="text-center text-xs text-slate-400 py-8">
                      No empty shifts
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dayShifts.map((shift) => {
                        const isExpired = shift.isExpired ?? false;
                        const isFull = shift.isFull ?? false;
                        const isRegistered = shift.isRegistered ?? false;
                        const isAvailable = shift.isAvailable ?? false;
                        
                        // Find assignment for this shift to get status
                        const assignment = assignments.find(a => a.shiftId === shift.shiftId);
                        const assignmentStatus = assignment?.status;
                        const assignmentId = assignment?.assignmentId || shift.assignmentId;
                        const isRejected = assignmentStatus === 'CANCELLED' && assignment?.notes?.includes('Rejected by manager');
                        
                        let statusBadge = null;
                        let statusMessage = '';
                        if (isExpired) {
                          statusBadge = (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                              Expired
                            </span>
                          );
                          statusMessage = 'This shift has expired';
                        } else if (isRejected) {
                          statusBadge = (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                              Rejected
                            </span>
                          );
                          statusMessage = 'The manager has rejected this registration';
                        } else if (isRegistered && assignmentStatus === 'CONFIRMED') {
                          statusBadge = (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                              Confirmed
                            </span>
                          );
                          statusMessage = 'The manager has confirmed this registration';
                        } else if (isRegistered && assignmentStatus === 'PENDING') {
                          statusBadge = (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                              Pending approval
                            </span>
                          );
                          statusMessage = 'Waiting for manager approval';
                        } else if (isRegistered) {
                          statusBadge = (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                              Registered
                            </span>
                          );
                          statusMessage = 'You have registered for this shift';
                        } else if (isFull) {
                          statusBadge = (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                              Full
                            </span>
                          );
                          statusMessage = 'This shift is full';
                        }
                        
                        return (
                          <div
                            key={shift.shiftId}
                            className={`relative p-2.5 rounded-lg border transition-colors min-h-[140px] flex flex-col ${
                              isAvailable
                                ? 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                                : 'border-slate-200 bg-slate-50 opacity-75'
                            }`}
                          >
                            {/* Content */}
                            <div className="flex-1 flex flex-col">
                              <div className="flex items-start gap-2 mb-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <Clock4 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                    <span className="text-xs font-semibold text-slate-900">
                                      {formatTimeRange(shift)}
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-600">
                                    {shift.durationHours.toFixed(1)} hours
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-1.5 flex-1">
                                {shift.maxStaffAllowed && (() => {
                                  // Count registered staff from public schedule (only shows confirmed assignments)
                                  const registeredCount = publicSchedule.filter(
                                    item => item.shiftId === shift.shiftId
                                  ).length;
                                  return (
                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                      <Users className="w-3 h-3 flex-shrink-0" />
                                      <span>Maximum {shift.maxStaffAllowed} staff ({registeredCount}/{shift.maxStaffAllowed})</span>
                                    </div>
                                  );
                                })()}

                                {shift.employmentType && shift.employmentType !== 'ANY' && (
                                  <div className="text-xs text-slate-500">
                                    Type: {getEmploymentTypeLabel(shift.employmentType)}
                                  </div>
                                )}

                                {shift.roleRequirements && shift.roleRequirements.length > 0 && (
                                  <div className="text-xs text-slate-500">
                                    {shift.roleRequirements.length} role requirements
                                  </div>
                                )}

                                {shift.notes && (
                                  <div className="text-xs text-slate-500 italic line-clamp-2">
                                    {shift.notes}
                                  </div>
                                )}

                                {statusMessage && (
                                  <div className="text-xs text-slate-500 italic">
                                    {statusMessage}
                                  </div>
                                )}
                              </div>

                              {/* Button - Always at bottom */}
                              <div className="mt-auto pt-2">
                                {isRegistered && assignmentId && assignmentStatus === 'PENDING' ? (
                                  <button
                                    onClick={() => setAssignmentToUnregister({ assignmentId: assignmentId, shiftId: shift.shiftId })}
                                    disabled={unregistering === assignmentId}
                                    className="w-full px-2 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 transition-colors"
                                  >
                                    {unregistering === assignmentId ? (
                                      <>
                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                        Cancelling...
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="w-3 h-3" />
                                        Cancel registration
                                      </>
                                    )}
                                  </button>
                                ) : (!isRegistered || isRejected) ? (
                                  <button
                                    onClick={() => handleRegister(shift.shiftId)}
                                    disabled={registering === shift.shiftId || !isAvailable}
                                    className={`w-full px-2 py-1.5 text-xs font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 transition-colors ${
                                      isAvailable
                                        ? 'text-white bg-sky-600 hover:bg-sky-700'
                                        : 'text-slate-500 bg-slate-200 cursor-not-allowed'
                                    }`}
                                  >
                                    {registering === shift.shiftId ? (
                                      <>
                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                        Registering...
                                      </>
                                    ) : isAvailable ? (
                                      <>
                                        <CheckCircle2 className="w-3 h-3" />
                                        Register
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="w-3 h-3" />
                                        Cannot register
                                      </>
                                    )}
                                  </button>
                                ) : null}
                              </div>
                            </div>
                            
                            {/* Status Badge - At bottom */}
                            {statusBadge && (
                              <div className="mt-2 pt-2 border-t border-slate-200 flex justify-center">
                                {statusBadge}
                              </div>
                            )}
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

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Note:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-700">
                <li>Registration will be in "Pending approval" status and needs manager approval</li>
                <li>You can cancel the registration before the shift is confirmed</li>
                <li>Maximum 8 hours per day</li>
                <li>Maximum 40 hours per week</li>
                <li>Need at least 11 hours break between shifts</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Unregister Confirmation Modal */}
      {assignmentToUnregister && (
        <ConfirmModal
          open={!!assignmentToUnregister}
          onCancel={() => setAssignmentToUnregister(null)}
          onConfirm={handleUnregister}
          title="Cancel registration"
          description="Are you sure you want to cancel this registration?"
          confirmText="Cancel registration"
          cancelText="No"
          isLoading={unregistering === assignmentToUnregister.assignmentId}
        />
      )}

      {/* Validation Error Modal - Ask if want to request OVERTIME */}
      {validationError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Cannot Register for This Shift
                  </h3>
                  <div className="space-y-2">
                    <div className="text-sm text-slate-600">
                      <p className="font-medium mb-1">Reason:</p>
                      <p className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800">
                        {validationError.errorMessage}
                      </p>
                    </div>
                    <div className="text-sm text-slate-600 mt-3">
                      <p className="font-medium mb-1">Shift Information:</p>
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Clock4 className="w-4 h-4 text-slate-400" />
                          <span className="font-medium">
                            {formatTimeRange(validationError.shift)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {validationError.shift.durationHours.toFixed(1)} hours
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Would you like to request this shift as overtime (OT)?</strong>
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  If approved, you will work this shift under overtime rules (rest period requirements waived, maximum 52 hours per week).
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setValidationError(null)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestOvertime}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
                >
                  Request Overtime (OT)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OVERTIME Request Modal */}
      {selectedShiftForOvertime && (
        <ShiftRequestModal
          isOpen={overtimeRequestModalOpen}
          onClose={handleCloseOvertimeModal}
          onSuccess={handleCloseOvertimeModal}
          assignment={{
            assignmentId: 0, // Not needed for OVERTIME
            shiftId: selectedShiftForOvertime.shiftId,
          } as any}
          shift={selectedShiftForOvertime}
          requestType="OVERTIME"
        />
      )}
    </div>
  );
}


