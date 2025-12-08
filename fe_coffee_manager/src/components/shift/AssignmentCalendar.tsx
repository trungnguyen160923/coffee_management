import { format, isSameDay, isBefore, startOfDay } from 'date-fns';
import { Plus } from 'lucide-react';
import { ShiftAssignment } from '../../services/shiftAssignmentService';
import { Shift } from '../../services/shiftService';
import { BranchClosure } from '../../services/branchClosureService';
import AssignmentCard from './AssignmentCard';

interface AssignmentCalendarProps {
  weekDays: Date[];
  assignmentsByDate: Record<string, ShiftAssignment[]>;
  shifts: Map<number, Shift>;
  staffNames: Map<number, string>;
  isDateClosed: (day: Date) => BranchClosure | null;
  formatTimeRange: (shift: Shift) => string;
  getAssignmentTypeLabel: (type: string) => string;
  getStatusBadge: (status: string, notes?: string | null) => React.ReactNode;
  getStatusColor: (status: string, notes?: string | null) => string;
  onAssignClick: (dateKey: string) => void;
  onCardClick: (dayAssignments: ShiftAssignment[], dateKey: string, shiftId: number) => void;
}

export default function AssignmentCalendar({
  weekDays,
  assignmentsByDate,
  shifts,
  staffNames,
  isDateClosed,
  formatTimeRange,
  getAssignmentTypeLabel,
  getStatusBadge,
  getStatusColor,
  onAssignClick,
  onCardClick,
}: AssignmentCalendarProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="grid grid-cols-7 gap-px bg-slate-200">
        {/* Day Headers */}
        {weekDays.map((day, idx) => {
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={idx}
              className={`p-3 text-center ${
                isToday 
                  ? 'bg-sky-50 border-b-2 border-sky-500' 
                  : 'bg-slate-50'
              }`}
            >
              <div className={`text-xs font-semibold mb-1 ${
                isToday ? 'text-sky-700' : 'text-slate-600'
              }`}>
                {format(day, 'EEE')}
              </div>
              <div className={`text-lg font-bold ${
                isToday
                  ? 'text-sky-600'
                  : 'text-slate-900'
              }`}>
                {format(day, 'dd')}
              </div>
              <div className={`text-xs mt-0.5 ${
                isToday ? 'text-sky-500' : 'text-slate-400'
              }`}>
                {format(day, 'MMM')}
              </div>
            </div>
          );
        })}

        {/* Day Content */}
        {weekDays.map((day, dayIdx) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          let dayAssignments = assignmentsByDate[dateKey] || [];
          
          // Sort assignments: PENDING first (oldest createAt, then shift start time), then others
          dayAssignments = [...dayAssignments].sort((a, b) => {
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
            
            // Both are non-PENDING: keep original order (or sort by shift start time)
            if (aShift && bShift) {
              return aShift.startTime.localeCompare(bShift.startTime);
            }
            
            return 0;
          });
          
          const isToday = isSameDay(day, new Date());
          const today = startOfDay(new Date());
          const isPast = isBefore(startOfDay(day), today);
          const closure = isDateClosed(day);
          const isClosed = closure !== null;

          return (
            <div
              key={dayIdx}
              className={`bg-white min-h-[300px] max-h-[500px] p-2 flex flex-col ${
                isToday ? 'ring-2 ring-sky-500' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  if (!isPast && !isClosed) {
                    onAssignClick(dateKey);
                  }
                }}
                disabled={isPast || isClosed}
                title={
                  isPast
                    ? 'Past day'
                    : isClosed
                    ? `Branch is closed: ${closure?.reason || 'No reason provided'}`
                    : 'Assign Staff'
                }
                className={`mx-2 mt-2 mb-1 inline-flex items-center justify-center rounded-lg border border-dashed px-2 py-1 text-xs flex-shrink-0 ${
                  isPast || isClosed
                    ? 'border-slate-100 text-slate-200 cursor-not-allowed'
                    : 'border-slate-200 text-slate-400 hover:border-sky-300 hover:text-sky-600'
                }`}
              >
                <Plus className="w-3 h-3 mr-1" />
                {isPast ? 'Past day' : isClosed ? 'Branch closed' : 'Assign Staff'}
              </button>
              <div className="flex-1 space-y-2 px-1 pb-2 overflow-y-auto min-h-0">
                {isClosed ? (
                  <div className="text-center text-xs text-red-500 py-4 px-2">
                    <div className="font-medium">Branch closed</div>
                    {closure?.reason && (
                      <div className="text-xs text-red-400 mt-1">{closure.reason}</div>
                    )}
                  </div>
                ) : dayAssignments.length === 0 ? (
                  <div className="text-center text-xs text-slate-400 py-8">
                    No assignments
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(() => {
                      // Group assignments by shift_id AND status
                      // Each group (shift_id + status) will be one card
                      const shiftStatusGroups: Record<string, ShiftAssignment[]> = {};
                      dayAssignments.forEach(assignment => {
                        const groupKey = `${assignment.shiftId}-${assignment.status}`;
                        if (!shiftStatusGroups[groupKey]) {
                          shiftStatusGroups[groupKey] = [];
                        }
                        shiftStatusGroups[groupKey].push(assignment);
                      });

                      // Count total shifts for "more shifts" indicator
                      const uniqueShiftIds = new Set(dayAssignments.map(a => a.shiftId));
                      const totalShifts = uniqueShiftIds.size;

                      // Sort groups to maintain order: PENDING first (by createAt, then shift start time), then others
                      const sortedGroups = Object.entries(shiftStatusGroups).sort(([, aAssignments], [, bAssignments]) => {
                        const aAssignment = aAssignments[0];
                        const bAssignment = bAssignments[0];
                        const aShift = shifts.get(aAssignment.shiftId);
                        const bShift = shifts.get(bAssignment.shiftId);
                        
                        // Separate PENDING and non-PENDING
                        const aIsPending = aAssignment.status === 'PENDING';
                        const bIsPending = bAssignment.status === 'PENDING';
                        
                        if (aIsPending && !bIsPending) return -1; // PENDING comes first
                        if (!aIsPending && bIsPending) return 1;
                        
                        // Both are PENDING: sort by createAt (oldest first), then by shift start time
                        if (aIsPending && bIsPending) {
                          // Sort by createAt (oldest first)
                          if (aAssignment.createAt && bAssignment.createAt) {
                            const aCreateAt = new Date(aAssignment.createAt).getTime();
                            const bCreateAt = new Date(bAssignment.createAt).getTime();
                            if (aCreateAt !== bCreateAt) {
                              return aCreateAt - bCreateAt;
                            }
                          } else if (aAssignment.createAt && !bAssignment.createAt) return -1;
                          else if (!aAssignment.createAt && bAssignment.createAt) return 1;
                          
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

                      return sortedGroups.map(([groupKey, groupAssignments]) => {
                        const [shiftIdStr] = groupKey.split('-');
                        const shiftId = Number(shiftIdStr);
                        const shift = shifts.get(shiftId);
                        if (!shift || groupAssignments.length === 0) return null;

                        return (
                          <AssignmentCard
                            key={groupKey}
                            shift={shift}
                            groupAssignments={groupAssignments}
                            staffNames={staffNames}
                            totalShifts={totalShifts}
                            formatTimeRange={formatTimeRange}
                            getAssignmentTypeLabel={getAssignmentTypeLabel}
                            getStatusBadge={getStatusBadge}
                            getStatusColor={getStatusColor}
                            onClick={() => onCardClick(dayAssignments, dateKey, shiftId)}
                          />
                        );
                      });
                    })()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

