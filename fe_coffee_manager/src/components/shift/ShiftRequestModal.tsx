import { useState, useEffect, useMemo } from 'react';
import { X, Clock4, AlertCircle, Calendar } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import toast from 'react-hot-toast';
import { shiftRequestService, ShiftRequestCreationRequest } from '../../services/shiftRequestService';
import { ShiftAssignment, shiftAssignmentService, BranchPublicScheduleItem } from '../../services/shiftAssignmentService';
import { Shift, shiftService } from '../../services/shiftService';
import staffService from '../../services/staffService';
import { StaffWithUserDto } from '../../types';

interface ShiftRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  assignment: ShiftAssignment;
  shift: Shift;
  requestType: 'SWAP' | 'PICK_UP' | 'TWO_WAY_SWAP' | 'LEAVE' | 'OVERTIME';
}

export default function ShiftRequestModal({
  isOpen,
  onClose,
  onSuccess,
  assignment,
  shift,
  requestType,
}: ShiftRequestModalProps) {
  const [reason, setReason] = useState('');
  const [targetStaffId, setTargetStaffId] = useState<number | null>(null);
  const [targetAssignmentId, setTargetAssignmentId] = useState<number | null>(null);
  const [availableStaff, setAvailableStaff] = useState<StaffWithUserDto[]>([]);
  const [availableAssignments, setAvailableAssignments] = useState<Array<{assignmentId: number, shiftDate: string, startTime: string, endTime: string}>>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [publicSchedule, setPublicSchedule] = useState<BranchPublicScheduleItem[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [staffNameMap, setStaffNameMap] = useState<Record<number, string>>({});

  // Calculate week for the shift date
  const shiftWeekStart = useMemo(() => {
    const shiftDate = new Date(shift.shiftDate);
    return startOfWeek(shiftDate, { weekStartsOn: 1 });
  }, [shift.shiftDate]);

  const weekDays = useMemo(() => {
    const weekEnd = endOfWeek(shiftWeekStart, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: shiftWeekStart, end: weekEnd });
  }, [shiftWeekStart]);

  // Group schedule items by date
  const scheduleByDate = useMemo(() => {
    const grouped: Record<string, BranchPublicScheduleItem[]> = {};
    publicSchedule.forEach(item => {
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
  }, [publicSchedule]);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setTargetStaffId(null);
      setTargetAssignmentId(null);
      
      // Load public schedule for SWAP (to show mini calendar)
      if (requestType === 'SWAP' && shift.branchId) {
        loadPublicSchedule();
        loadStaffNames();
      } else if (requestType === 'TWO_WAY_SWAP' && shift.branchId) {
        // TWO_WAY_SWAP still uses staff selection
        loadAvailableStaff();
      }
    }
  }, [isOpen, requestType, shift.branchId, shift.shiftDate]);

  const loadPublicSchedule = async () => {
    if (!shift.branchId) return;
    
    try {
      setLoadingSchedule(true);
      const weekEnd = endOfWeek(shiftWeekStart, { weekStartsOn: 1 });
      const startDateStr = format(shiftWeekStart, 'yyyy-MM-dd');
      const endDateStr = format(weekEnd, 'yyyy-MM-dd');
      
      const schedule = await shiftAssignmentService.getPublicBranchSchedule({
        branchId: shift.branchId,
        startDate: startDateStr,
        endDate: endDateStr,
      });
      
      // Filter out assignments of current user (can't swap with yourself)
      const filtered = schedule.filter(item => item.staffUserId !== assignment.staffUserId);
      setPublicSchedule(filtered);
    } catch (error: any) {
      console.error('Failed to load public schedule', error);
      setPublicSchedule([]);
      toast.error('Failed to load schedule');
    } finally {
      setLoadingSchedule(false);
    }
  };

  const loadStaffNames = async () => {
    if (!shift.branchId) return;
    
    try {
      const staffList = await staffService.getStaffsWithUserInfoByBranch(shift.branchId);
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

  const loadAvailableStaff = async () => {
    try {
      setLoadingStaff(true);
      const staff = await staffService.getStaffsWithUserInfoByBranch(shift.branchId);
      
      // Get current user's employment type
      const currentStaff = staff.find(s => s.userId === assignment.staffUserId);
      const currentEmploymentType = currentStaff?.employmentType || null;
      
      // Filter: exclude current user and filter by employment type
      let filtered = staff.filter(s => s.userId !== assignment.staffUserId);
      
      // Only show staff with same employment type (if current user has employment type)
      if (currentEmploymentType && currentEmploymentType !== 'CASUAL') {
        filtered = filtered.filter(s => {
          // Show staff with same employment type or null (null means not set, allow it)
          return s.employmentType === currentEmploymentType || s.employmentType === null;
        });
      }
      
      setAvailableStaff(filtered);
    } catch (error: any) {
      console.error('Failed to load staff', error);
      setAvailableStaff([]); // Reset to empty array on error
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to load staff list';
      toast.error(errorMessage);
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleSelectShift = (item: BranchPublicScheduleItem) => {
    setTargetStaffId(item.staffUserId);
    setTargetAssignmentId(item.assignmentId);
  };

  const loadTargetStaffAssignments = async (targetStaffUserId: number) => {
    if (!targetStaffUserId) {
      setAvailableAssignments([]);
      return;
    }

    try {
      setLoadingAssignments(true);
      // Load assignments for target staff in the same week as current shift
      const shiftDate = new Date(shift.shiftDate);
      const weekStart = new Date(shiftDate);
      weekStart.setDate(shiftDate.getDate() - shiftDate.getDay() + 1); // Monday
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // Sunday

      const assignments = await shiftAssignmentService.getByStaff({
        staffId: targetStaffUserId,
        startDate: weekStart.toISOString().split('T')[0],
        endDate: weekEnd.toISOString().split('T')[0],
      });

      // Load shift details for each assignment
      const assignmentsWithShifts = await Promise.all(
        assignments
          .filter(a => a.status === 'CONFIRMED' || a.status === 'PENDING')
          .map(async (a) => {
            try {
              const s = await shiftService.getById(a.shiftId);
              return {
                assignmentId: a.assignmentId,
                shiftDate: s.shiftDate,
                startTime: s.startTime.substring(0, 5),
                endTime: s.endTime.substring(0, 5),
              };
            } catch {
              return null;
            }
          })
      );

      setAvailableAssignments(assignmentsWithShifts.filter((a): a is {assignmentId: number, shiftDate: string, startTime: string, endTime: string} => a !== null));
    } catch (error: any) {
      console.error('Failed to load target staff assignments', error);
      setAvailableAssignments([]);
      toast.error('Failed to load target staff shifts');
    } finally {
      setLoadingAssignments(false);
    }
  };

  useEffect(() => {
    if (requestType === 'TWO_WAY_SWAP' && targetStaffId) {
      loadTargetStaffAssignments(targetStaffId);
    } else {
      setAvailableAssignments([]);
      setTargetAssignmentId(null);
    }
  }, [targetStaffId, requestType]);

  const handleSubmit = async () => {
    // Validation
    if (!reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    if (requestType === 'SWAP' && !targetAssignmentId) {
      toast.error('Please select a shift to swap with');
      return;
    }
    
    if (requestType === 'TWO_WAY_SWAP' && !targetStaffId) {
      toast.error('Please select a staff member to swap with');
      return;
    }

    if (requestType === 'TWO_WAY_SWAP' && !targetAssignmentId) {
      toast.error('Please select the shift you want to swap');
      return;
    }

    try {
      setSubmitting(true);
      const request: ShiftRequestCreationRequest = {
        ...(requestType === 'OVERTIME' 
          ? { shiftId: shift.shiftId } // OVERTIME: use shiftId (xin làm ca mới)
          : { assignmentId: assignment.assignmentId }), // Other types: use assignmentId
        requestType,
        reason: reason.trim(),
        ...((requestType === 'SWAP' || requestType === 'TWO_WAY_SWAP') && { targetStaffUserId: targetStaffId! }),
        ...(requestType === 'TWO_WAY_SWAP' && { targetAssignmentId: targetAssignmentId! }),
      };

      await shiftRequestService.createRequest(request);
      const successMessages: Record<string, string> = {
        'SWAP': 'Swap',
        'PICK_UP': 'Pick up',
        'TWO_WAY_SWAP': 'Two-way swap',
        'LEAVE': 'Leave',
        'OVERTIME': 'Overtime',
      };
      toast.success(`${successMessages[requestType] || 'Request'} request submitted successfully!`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to create request', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const getTitle = () => {
    switch (requestType) {
      case 'SWAP':
        return 'Request Shift Swap';
      case 'PICK_UP':
        return 'Request to Pick Up Shift';
      case 'TWO_WAY_SWAP':
        return 'Request Two-Way Swap';
      case 'LEAVE':
        return 'Request Leave';
      case 'OVERTIME':
        return 'Request Overtime';
      default:
        return 'Request';
    }
  };

  const formatTimeRange = () => {
    const start = shift.startTime.substring(0, 5);
    const end = shift.endTime.substring(0, 5);
    return `${start} - ${end}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md max-h-[90vh] rounded-2xl border border-slate-100 bg-white shadow-xl relative flex flex-col">
        {/* Loading Overlay */}
        {submitting && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-sky-600 rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-slate-700">Submitting request...</p>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{getTitle()}</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {new Date(shift.shiftDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className={`flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4 ${submitting ? 'pointer-events-none opacity-60' : ''}`}>
          {/* Shift Info */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 text-sm">
              <Clock4 className="w-4 h-4 text-slate-400" />
              <span className="font-medium text-slate-900">{formatTimeRange()}</span>
              <span className="text-slate-500">({shift.durationHours.toFixed(1)} hours)</span>
            </div>
          </div>

          {/* SWAP: Mini Calendar to Select Shift */}
          {requestType === 'SWAP' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Select Shift to Swap With <span className="text-red-500">*</span>
              </label>
              {loadingSchedule ? (
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
                        {format(shiftWeekStart, 'dd/MM')} - {format(endOfWeek(shiftWeekStart, { weekStartsOn: 1 }), 'dd/MM/yyyy')}
                      </span>
                    </div>
                  </div>
                  
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-px bg-slate-200">
                    {/* Day Headers */}
                    {weekDays.map((day, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 p-1.5 text-center"
                      >
                        <div className="text-xs font-medium text-slate-500 uppercase">
                          {format(day, 'EEE')}
                        </div>
                        <div className={`text-xs font-semibold mt-0.5 ${
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
                      const dayShifts = scheduleByDate[dateKey] || [];
                      const isToday = isSameDay(day, new Date());
                      const isCurrentShiftDate = dateKey === shift.shiftDate;

                      return (
                        <div
                          key={dayIdx}
                          className={`bg-white min-h-[80px] max-h-[150px] overflow-y-auto p-1.5 ${
                            isToday ? 'ring-1 ring-sky-500' : ''
                          } ${isCurrentShiftDate ? 'bg-amber-50' : ''}`}
                        >
                          {dayShifts.length === 0 ? (
                            <div className="text-center text-xs text-slate-400 py-4">
                              —
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {dayShifts.map((item) => {
                                const isSelected = targetAssignmentId === item.assignmentId;
                                const timeStr = `${item.startTime.substring(0, 5)}-${item.endTime.substring(0, 5)}`;
                                
                                return (
                                  <button
                                    key={item.assignmentId}
                                    type="button"
                                    onClick={() => handleSelectShift(item)}
                                    className={`w-full p-1.5 rounded text-left text-xs transition-colors ${
                                      isSelected
                                        ? 'bg-sky-600 text-white border-2 border-sky-700'
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300'
                                    }`}
                                  >
                                    <div className="font-medium truncate">{timeStr}</div>
                                    <div className={`text-[10px] truncate mt-0.5 ${
                                      isSelected ? 'text-sky-100' : 'text-slate-600'
                                    }`}>
                                      {staffNameMap[item.staffUserId] || `Staff ${item.staffUserId}`}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {publicSchedule.length === 0 && !loadingSchedule && (
                <p className="text-xs text-slate-500 text-center py-2">
                  No available shifts found for swap
                </p>
              )}
              {targetAssignmentId && (
                <div className="p-2 bg-sky-50 border border-sky-200 rounded-lg">
                  <div className="text-xs font-medium text-sky-900">
                    Selected: {staffNameMap[targetStaffId || 0] || `Staff ${targetStaffId}`}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TWO_WAY_SWAP: Select Staff */}
          {requestType === 'TWO_WAY_SWAP' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Select Staff to Swap With <span className="text-red-500">*</span>
              </label>
              {loadingStaff ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-slate-200 border-t-sky-600 rounded-full animate-spin"></div>
                </div>
              ) : (
                <select
                  value={targetStaffId || ''}
                  onChange={(e) => setTargetStaffId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">-- Select staff --</option>
                  {availableStaff.map((staff) => (
                    <option key={staff.userId} value={staff.userId}>
                      {staff.fullname}
                    </option>
                  ))}
                </select>
              )}
              {availableStaff.length === 0 && !loadingStaff && (
                <p className="text-xs text-slate-500">No available staff found</p>
              )}
            </div>
          )}

          {/* TWO_WAY_SWAP: Select Target Assignment */}
          {requestType === 'TWO_WAY_SWAP' && targetStaffId && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Select Shift to Swap <span className="text-red-500">*</span>
              </label>
              {loadingAssignments ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-slate-200 border-t-sky-600 rounded-full animate-spin"></div>
                </div>
              ) : (
                <select
                  value={targetAssignmentId || ''}
                  onChange={(e) => setTargetAssignmentId(e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="">-- Select shift --</option>
                  {availableAssignments.map((a) => (
                    <option key={a.assignmentId} value={a.assignmentId}>
                      {new Date(a.shiftDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {a.startTime} to {a.endTime}
                    </option>
                  ))}
                </select>
              )}
              {availableAssignments.length === 0 && !loadingAssignments && targetStaffId && (
                <p className="text-xs text-slate-500">No available shifts found for this staff member</p>
              )}
            </div>
          )}

          {/* OVERTIME: Info about overtime request */}
          {requestType === 'OVERTIME' && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-800">
                <p className="font-medium mb-1">Overtime Request:</p>
                <p>
                  You are requesting to work this shift as overtime. Rest period requirements will be waived, 
                  but total weekly hours must not exceed 52 hours (40 base + 12 overtime).
                </p>
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={`Enter reason for ${requestType === 'SWAP' ? 'swap' : requestType === 'LEAVE' ? 'leave' : 'overtime'} request...`}
              rows={4}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            />
            <p className="text-xs text-slate-500">
              Please provide a clear reason for your request
            </p>
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800">
              <p className="font-medium mb-1">Note:</p>
              <p>
                {requestType === 'SWAP' && 'Your request will be sent to the selected staff member for approval. Once they approve, it will be reviewed by the manager.'}
                {requestType === 'PICK_UP' && 'Your request will be sent to the staff member for approval. Once they approve, it will be reviewed by the manager.'}
                {requestType === 'TWO_WAY_SWAP' && 'Your request will be sent to the selected staff member for approval. Once they approve, it will be reviewed by the manager.'}
                {requestType === 'LEAVE' && 'Your request will be reviewed by the manager. If approved, this shift will be cancelled.'}
                {requestType === 'OVERTIME' && 'Your request will be reviewed by the manager. If approved, you will be assigned to this shift as overtime (rest period requirements waived, max 52h/week).'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[140px] justify-center"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

