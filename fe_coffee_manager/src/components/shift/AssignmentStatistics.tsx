import { ShiftAssignment } from '../../services/shiftAssignmentService';

interface AssignmentStatisticsProps {
  assignments: ShiftAssignment[];
}

export default function AssignmentStatistics({ assignments }: AssignmentStatisticsProps) {
  return (
    <div className="mt-6 grid grid-cols-4 gap-4">
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="text-xs text-slate-500 mb-1">Total Assignments</div>
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
        <div className="text-2xl font-bold text-blue-600">
          {assignments.filter(a => a.status === 'CONFIRMED').length}
        </div>
      </div>
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="text-xs text-slate-500 mb-1">Completed</div>
        <div className="text-2xl font-bold text-green-600">
          {assignments.filter(a => a.status === 'CHECKED_OUT').length}
        </div>
      </div>
    </div>
  );
}

