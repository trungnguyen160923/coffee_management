import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useFloating, autoUpdate, offset, flip, shift as shiftMiddleware, size } from '@floating-ui/react';
import { Clock4, Users } from 'lucide-react';
import { ShiftAssignment } from '../../services/shiftAssignmentService';
import { Shift } from '../../services/shiftService';

interface AssignmentCardProps {
  shift: Shift;
  groupAssignments: ShiftAssignment[];
  staffNames: Map<number, string>;
  totalShifts: number;
  formatTimeRange: (shift: Shift) => string;
  getAssignmentTypeLabel: (type: string) => string;
  getStatusBadge: (status: string, notes?: string | null) => React.ReactNode;
  getStatusColor: (status: string, notes?: string | null) => string;
  onClick: () => void;
}

export default function AssignmentCard({
  shift,
  groupAssignments,
  staffNames,
  totalShifts,
  formatTimeRange,
  getAssignmentTypeLabel,
  getStatusBadge,
  getStatusColor,
  onClick,
}: AssignmentCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const staffNamesList = groupAssignments
    .map(a => staffNames.get(a.staffUserId) || `ID: ${a.staffUserId}`)
    .join(', ');
  
  const assignmentTypes = [...new Set(groupAssignments.map(a => a.assignmentType))];
  const hasMultipleTypes = assignmentTypes.length > 1;
  const primaryType = groupAssignments[0].assignmentType;
  const displayStatus = groupAssignments[0].status;
  const displayNotes = groupAssignments[0].notes;
  const staffCount = groupAssignments.length;

  // Tooltip positioning
  const { refs, floatingStyles } = useFloating({
    open: isHovered,
    onOpenChange: setIsHovered,
    placement: 'top',
    middleware: [
      offset(8),
      flip(),
      shiftMiddleware({ padding: 10 }),
      size({
        apply({ availableWidth, availableHeight, elements }) {
          elements.floating.style.maxWidth = `${Math.min(320, availableWidth)}px`;
          elements.floating.style.maxHeight = `${Math.min(400, availableHeight)}px`;
        },
        padding: 10,
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const statusColor = getStatusColor(displayStatus, displayNotes);

  return (
    <>
      <div
        ref={refs.setReference}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`p-2 rounded-lg border transition-all cursor-pointer ${statusColor}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <Clock4 className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
            <span className="text-xs font-bold text-slate-900 truncate">
              {formatTimeRange(shift)}
            </span>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Users className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-xs font-semibold text-slate-900">
              {staffCount}
            </span>
          </div>
        </div>
      </div>
      
      {isHovered && typeof document !== 'undefined' && createPortal(
        <div
          ref={refs.setFloating}
          style={floatingStyles}
          className="z-[9999] bg-white rounded-lg border border-slate-200 shadow-lg p-3 max-w-xs"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock4 className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-900">
                {formatTimeRange(shift)}
              </span>
              <span className="text-xs text-slate-500">
                ({shift.durationHours.toFixed(1)}h)
              </span>
            </div>
            <div className="text-xs text-slate-600">
              <span className="font-medium">Staff ({staffCount}):</span> {staffNamesList}
            </div>
            {hasMultipleTypes ? (
              <div className="text-xs text-slate-500">
                <span className="font-medium">Type:</span> Mixed: {assignmentTypes.map(t => getAssignmentTypeLabel(t || '')).join(', ')}
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                <span className="font-medium">Type:</span> {getAssignmentTypeLabel(primaryType || '')}
              </div>
            )}
            <div className="pt-2 border-t border-slate-200">
              {getStatusBadge(displayStatus, displayNotes)}
            </div>
            {displayNotes && (
              <div className="text-xs text-slate-500 italic">
                {displayNotes}
              </div>
            )}
            {totalShifts > 1 && (
              <div className="text-xs text-slate-400">
                +{totalShifts - 1} more shift(s) on this day
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

