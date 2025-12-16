import { useEffect, useState, useMemo, useCallback } from 'react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, isSameDay, isSameMonth } from 'date-fns';
import { Calendar, Clock4, ChevronLeft, ChevronRight, RefreshCw, User, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { shiftService, Shift } from '../../services/shiftService';
import { shiftAssignmentService, ShiftAssignment } from '../../services/shiftAssignmentService';
import { authService } from '../../services/authService';
import staffService from '../../services/staffService';
import { StaffScheduleSkeleton } from '../../components/manager/skeletons';
import { StaffWithUserDto } from '../../types';

interface AssignmentWithShift extends ShiftAssignment {
  shift?: Shift;
}

export default function ManagerStaffSchedule() {
  const { user, managerBranch } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentWithShift[]>([]);
  const [staffList, setStaffList] = useState<StaffWithUserDto[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [currentMonth, setCurrentMonth] = useState<Date>(() =>
    startOfMonth(new Date())
  );
  const [businessRoleMap, setBusinessRoleMap] = useState<Record<number, string>>({});

  const branchId = useMemo(() => {
    if (managerBranch?.branchId) return managerBranch.branchId;
    if (user?.branch?.branchId) return user.branch.branchId;
    if (user?.branchId) return Number(user.branchId);
    return null;
  }, [user, managerBranch]);

  // Calculate all days in the month view (including days from previous/next month to fill the grid)
  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Fetch business role names once
  useEffect(() => {
    const loadBusinessRoles = async () => {
      try {
        const roles = await authService.getStaffBusinessRoles();
        const map: Record<number, string> = {};
        roles?.forEach((role) => {
          // Prefer backend-provided roleName; fallback to name if missing
          map[role.roleId] = role.roleName || role.name;
        });
        setBusinessRoleMap(map);
      } catch (error) {
        console.error('Failed to load staff business roles', error);
      }
    };

    loadBusinessRoles();
  }, []);

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

  const selectedStaff = useMemo(() => {
    return staffList.find(s => s.userId === selectedStaffId);
  }, [staffList, selectedStaffId]);

  // Load staff list
  useEffect(() => {
    const loadStaffList = async () => {
      if (!branchId) {
        setLoadingStaff(false);
        return;
      }

      try {
        setLoadingStaff(true);
        const staffs = await staffService.getStaffsWithUserInfoByBranch(branchId);
        
        setStaffList(staffs || []);
        
        // Auto-select first staff if available
        if (staffs && staffs.length > 0 && !selectedStaffId) {
          setSelectedStaffId(staffs[0].userId);
        }
      } catch (error: any) {
        toast.error(error?.response?.data?.message || error?.message || 'Failed to load staff list');
      } finally {
        setLoadingStaff(false);
      }
    };

    loadStaffList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  // Load assignments for selected staff
  const loadStaffShifts = useCallback(async () => {
    if (!selectedStaffId) {
      setAssignments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const startDateStr = format(monthStart, 'yyyy-MM-dd');
      const endDateStr = format(monthEnd, 'yyyy-MM-dd');
      
      // Load assignments for selected staff
      const staffAssignments = await shiftAssignmentService.getByStaff({
        staffId: selectedStaffId,
        startDate: startDateStr,
        endDate: endDateStr,
      });

      if (!staffAssignments || staffAssignments.length === 0) {
        setAssignments([]);
        setLoading(false);
        return;
      }

      // Load shift details for each assignment
      const assignmentsWithShifts = await Promise.all(
        staffAssignments.map(async (assignment) => {
          try {
            const shift = await shiftService.getById(assignment.shiftId);
            return { ...assignment, shift } as AssignmentWithShift;
          } catch (error) {
            return null;
          }
        })
      );

      // Filter out null assignments (failed to load shift)
      const validAssignments = assignmentsWithShifts.filter((a): a is AssignmentWithShift => a !== null);
      setAssignments(validAssignments);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to load shifts');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [selectedStaffId, currentMonth]);

  useEffect(() => {
    if (selectedStaffId) {
      loadStaffShifts();
    }
  }, [selectedStaffId, currentMonth, loadStaffShifts]);

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

  const formatEmploymentType = (type: StaffWithUserDto['employmentType']) => {
    switch (type) {
      case 'FULL_TIME':
        return 'Full Time';
      case 'PART_TIME':
        return 'Part Time';
      case 'CASUAL':
        return 'Casual';
      default:
        return 'N/A';
    }
  };

  const formatPayType = (type: StaffWithUserDto['payType']) => {
    switch (type) {
      case 'MONTHLY':
        return 'Monthly';
      case 'HOURLY':
        return 'Hourly';
      default:
        return 'N/A';
    }
  };

  const formatBusinessRoles = (roleIds?: number[]) => {
    if (!roleIds || roleIds.length === 0) return null;
    return roleIds.map((id) => businessRoleMap[id] || `Role #${id}`);
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

  if (loadingStaff && staffList.length === 0) {
    return <StaffScheduleSkeleton />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Staff Schedule</h1>
            <p className="text-sm text-slate-500 mt-1">
              View work schedule for each staff member
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
              onClick={loadStaffShifts}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Staff Selector + Staff Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-5 h-5 text-slate-400" />
              <label className="text-sm font-medium text-slate-700">Select Staff:</label>
            </div>
            <div className="flex items-center">
              <select
                value={selectedStaffId ? String(selectedStaffId) : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedStaffId(value ? Number(value) : null);
                }}
                className="w-full max-w-sm px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option key="select-placeholder" value="">-- Select a staff member --</option>
                {staffList.map((staff, index) => (
                  <option key={`staff-${staff.userId || index}`} value={String(staff.userId)}>
                    {staff.fullname || staff.email || `Staff #${staff.userId}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            {selectedStaff ? (
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-sky-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      {selectedStaff.fullname || selectedStaff.email || 'Unknown'}
                    </h3>
                    {selectedStaff.roleName && (
                      <span className="px-2 py-0.5 text-[11px] rounded-full bg-slate-100 text-slate-700">
                        {selectedStaff.roleName}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{selectedStaff.email || ''}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div>
                      <span className="font-medium text-slate-700">Phone:</span>{' '}
                      {selectedStaff.phoneNumber || '—'}
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Role:</span>{' '}
                      {formatEmploymentType(selectedStaff.employmentType)}
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Pay Type:</span>{' '}
                      {formatPayType(selectedStaff.payType)}
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Branch:</span>{' '}
                      {selectedStaff.branch?.name || '—'}
                    </div>
                    {selectedStaff.staffBusinessRoleIds && selectedStaff.staffBusinessRoleIds.length > 0 && (
                      <div className="col-span-2 flex items-center flex-wrap gap-1">
                        <span className="font-medium text-slate-700">Business Roles:</span>
                        {formatBusinessRoles(selectedStaff.staffBusinessRoleIds)?.map((role, idx) => (
                          <span
                            key={`${role}-${idx}`}
                            className="px-2 py-0.5 text-[11px] rounded-full bg-slate-100 text-slate-700"
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">No staff selected</p>
                  <p className="text-xs text-slate-500">Choose a staff member to see details</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {!selectedStaffId ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">Please select a staff member to view their schedule</p>
          </div>
        ) : (
          <>
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

            {loading && assignments.length === 0 ? (
              <div className="p-6">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : (
              <>
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
                          } ${firstAssignmentStatus} ${
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
                              <div className="text-[10px] text-slate-400">
                                No shifts
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              {dayAssignments.map((assignment) => {
                                if (!assignment.shift) return null;

                                return (
                                  <div
                                    key={assignment.assignmentId}
                                    className={`w-full p-0.5 rounded border ${getStatusColor(assignment.status, assignment.notes)} transition-all relative group`}
                                  >
                                    <div className="flex items-center justify-between gap-0.5">
                                      <div className="flex items-center gap-1 flex-1 min-w-0">
                                        <Clock4 className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                                        <span className="text-xs font-semibold text-slate-900 truncate">
                                          {formatTimeRange(assignment.shift)}
                                        </span>
                                      </div>
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
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

