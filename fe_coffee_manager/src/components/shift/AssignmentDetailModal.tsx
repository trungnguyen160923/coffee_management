import { format } from 'date-fns';
import { X, Clock4, User, Briefcase, Users, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ShiftAssignment } from '../../services/shiftAssignmentService';
import { Shift } from '../../services/shiftService';

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

        {/* Content */}
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

                return (
                  <div
                    key={assignment.assignmentId}
                    className="p-4 rounded-lg border border-slate-200 bg-slate-50"
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
                    <div className="flex gap-2 pt-4 border-t border-slate-200">
                      {assignment.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => onApprove(assignment)}
                            disabled={processing === assignment.assignmentId}
                            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Approve
                          </button>
                          <button
                            onClick={() => onReject(assignment)}
                            disabled={processing === assignment.assignmentId}
                            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </>
                      )}
                      {(() => {
                        const deleteValidation = canDeleteAssignment(assignment);
                        return (
                          <button
                            onClick={() => {
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
    </div>
  );
}

