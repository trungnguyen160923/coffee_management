import { RefreshCw, Plus } from 'lucide-react';

interface AssignmentHeaderProps {
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  onGoToCurrentWeek: () => void;
  onRefresh: () => void;
  onAssignStaff: () => void;
  loading: boolean;
}

export default function AssignmentHeader({
  statusFilter,
  onStatusFilterChange,
  onGoToCurrentWeek,
  onRefresh,
  onAssignStaff,
  loading,
}: AssignmentHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Shift Assignment Management</h1>
        <p className="text-sm text-slate-500 mt-1">
          View and manage staff shift registrations
        </p>
      </div>
      <div className="flex items-center gap-4">
        {/* Status Color Legend */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-slate-200">
          <span className="text-xs font-medium text-slate-600 mr-1">Status:</span>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-amber-50 border border-amber-200"></div>
              <span className="text-xs text-slate-600">Pending</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-50 border border-blue-200"></div>
              <span className="text-xs text-slate-600">Confirmed</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-50 border border-green-200"></div>
              <span className="text-xs text-slate-600">Checked In</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-slate-50 border border-slate-200"></div>
              <span className="text-xs text-slate-600">Checked Out</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-50 border border-red-200"></div>
              <span className="text-xs text-slate-600">Cancelled</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-orange-50 border border-orange-200"></div>
              <span className="text-xs text-slate-600">Rejected</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ALL">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CHECKED_IN">Checked In</option>
            <option value="CHECKED_OUT">Checked Out</option>
          </select>
          <button
            onClick={onGoToCurrentWeek}
            className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200"
          >
            This Week
          </button>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={onAssignStaff}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" />
            Assign Staff
          </button>
        </div>
      </div>
    </div>
  );
}

