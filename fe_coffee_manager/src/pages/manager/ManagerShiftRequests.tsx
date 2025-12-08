import { useEffect, useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { RefreshCw, Clock, CheckCircle2, XCircle, AlertCircle, X, User, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { shiftRequestService, ShiftRequest } from '../../services/shiftRequestService';
import staffService from '../../services/staffService';
import { ShiftRequestsSkeleton } from '../../components/manager/skeletons';
import ConfirmModal from '../../components/common/ConfirmModal';

type FilterType = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

export default function ManagerShiftRequests() {
  const { user, managerBranch } = useAuth();
  const [requests, setRequests] = useState<ShiftRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [requestToApprove, setRequestToApprove] = useState<ShiftRequest | null>(null);
  const [requestToReject, setRequestToReject] = useState<ShiftRequest | null>(null);
  const [processing, setProcessing] = useState<number | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  const [staffNameMap, setStaffNameMap] = useState<Record<number, string>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 9;

  const branchId = useMemo(() => {
    if (managerBranch?.branchId) return managerBranch.branchId;
    if (user?.branch?.branchId) return user.branch.branchId;
    if (user?.branchId) return Number(user.branchId);
    return null;
  }, [user, managerBranch]);

  const loadRequests = async () => {
    if (!branchId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Load all requests (for statistics and filtering)
      // Manager can see all requests but default filter shows only pending manager approval
      const allRequests = await shiftRequestService.getRequestsByBranch(branchId);
      
      setRequests(allRequests);
    } catch (error: any) {
      console.error('Failed to load requests', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to load requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStaffNames = async () => {
    if (!branchId) return;
    try {
      const staffList = await staffService.getStaffsWithUserInfoByBranch(branchId);
      const namesMap: Record<number, string> = {};
      staffList.forEach(staff => {
        namesMap[staff.userId] = staff.fullname;
      });
      setStaffNameMap(namesMap);
    } catch (error: any) {
      console.error('Failed to load staff names', error);
    }
  };

  useEffect(() => {
    if (branchId) {
      loadRequests();
      loadStaffNames();
    }
  }, [branchId]);

  const getRequestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      SWAP: 'Swap Shift',
      PICK_UP: 'Pick Up Shift',
      TWO_WAY_SWAP: 'Two Way Swap',
      LEAVE: 'Leave Request',
      OVERTIME: 'Overtime Request',
    };
    return labels[type] || type;
  };

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'SWAP':
      case 'TWO_WAY_SWAP':
        return <RefreshCw className="w-4 h-4" />;
      case 'PICK_UP':
        return <User className="w-4 h-4" />;
      case 'LEAVE':
        return <LogOut className="w-4 h-4" />;
      case 'OVERTIME':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
            <AlertCircle className="w-3 h-3 mr-1" />
            Pending Manager
          </span>
        );
      case 'PENDING_TARGET_APPROVAL':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
            <AlertCircle className="w-3 h-3 mr-1" />
            Waiting for Response
          </span>
        );
      case 'PENDING_MANAGER_APPROVAL':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
            <Clock className="w-3 h-3 mr-1" />
            Pending Manager
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected by Manager
          </span>
        );
      case 'REJECTED_BY_TARGET':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected by Target
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
            <X className="w-3 h-3 mr-1" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const handleApprove = async () => {
    if (!requestToApprove) return;

    try {
      setProcessing(requestToApprove.requestId);
      const notes = reviewNotes[requestToApprove.requestId] || '';
      await shiftRequestService.approveRequest(requestToApprove.requestId, notes || undefined);
      toast.success('Request approved successfully');
      setRequestToApprove(null);
      setReviewNotes(prev => {
        const next = { ...prev };
        delete next[requestToApprove.requestId];
        return next;
      });
      await loadRequests();
    } catch (error: any) {
      console.error('Failed to approve request', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to approve request');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!requestToReject) return;

    try {
      setProcessing(requestToReject.requestId);
      const notes = reviewNotes[requestToReject.requestId] || '';
      await shiftRequestService.rejectRequest(requestToReject.requestId, notes || undefined);
      toast.success('Request rejected successfully');
      setRequestToReject(null);
      setReviewNotes(prev => {
        const next = { ...prev };
        delete next[requestToReject.requestId];
        return next;
      });
      await loadRequests();
    } catch (error: any) {
      console.error('Failed to reject request', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to reject request');
    } finally {
      setProcessing(null);
    }
  };

  const filteredRequests = useMemo(() => {
    let filtered = requests.filter(request => {
      if (filter === 'ALL') {
        // For ALL filter, only show requests that need manager action or have been processed by manager
        // This includes: PENDING, PENDING_MANAGER_APPROVAL, APPROVED, REJECTED
        return request.status === 'PENDING' || 
               request.status === 'PENDING_MANAGER_APPROVAL' ||
               request.status === 'APPROVED' ||
               request.status === 'REJECTED';
      }
      if (filter === 'PENDING') {
        // Only show requests that need manager approval
        return request.status === 'PENDING' || request.status === 'PENDING_MANAGER_APPROVAL';
      }
      if (filter === 'APPROVED') {
        return request.status === 'APPROVED';
      }
      if (filter === 'REJECTED') {
        return request.status === 'REJECTED';
      }
      return request.status === filter;
    });
    
    // Sort by updateAt (newest first), fallback to requestedAt
    return filtered.sort((a, b) => {
      const aTime = a.updateAt ? new Date(a.updateAt).getTime() : new Date(a.requestedAt).getTime();
      const bTime = b.updateAt ? new Date(b.updateAt).getTime() : new Date(b.requestedAt).getTime();
      return bTime - aTime; // newest first
    });
  }, [requests, filter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRequests = filteredRequests.slice(startIndex, endIndex);

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(0);
  }, [filter]);

  const stats = useMemo(() => {
    // Only count requests that manager needs to handle or has handled
    const managerRelevantRequests = requests.filter(r => 
      r.status === 'PENDING' || 
      r.status === 'PENDING_MANAGER_APPROVAL' ||
      r.status === 'APPROVED' ||
      r.status === 'REJECTED'
    );
    const total = managerRelevantRequests.length;
    const pending = managerRelevantRequests.filter(r => 
      r.status === 'PENDING' || r.status === 'PENDING_MANAGER_APPROVAL'
    ).length;
    const approved = managerRelevantRequests.filter(r => r.status === 'APPROVED').length;
    const rejected = managerRelevantRequests.filter(r => r.status === 'REJECTED').length;
    return { total, pending, approved, rejected };
  }, [requests]);

  const canApprove = (request: ShiftRequest) => {
    if (['SWAP', 'PICK_UP', 'TWO_WAY_SWAP'].includes(request.requestType)) {
      return request.status === 'PENDING_MANAGER_APPROVAL';
    }
    return request.status === 'PENDING';
  };

  const canReject = (request: ShiftRequest) => {
    if (['SWAP', 'PICK_UP', 'TWO_WAY_SWAP'].includes(request.requestType)) {
      return request.status === 'PENDING_TARGET_APPROVAL' || request.status === 'PENDING_MANAGER_APPROVAL';
    }
    return request.status === 'PENDING';
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shift Requests</h1>
          <p className="text-sm text-slate-600 mt-1">Manage all shift requests in your branch</p>
        </div>
        <button
          onClick={() => {
            loadRequests();
            loadStaffNames();
          }}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-1">Total Requests</div>
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-1">Pending</div>
          <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-1">Approved</div>
          <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-1">Rejected</div>
          <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">Filter:</span>
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as FilterType[]).map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filter === filterType
                  ? 'bg-sky-100 text-sky-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filterType}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-6">
            <ShiftRequestsSkeleton />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 text-sm">
              {filter === 'ALL' ? 'No requests found' : `No ${filter.toLowerCase()} requests`}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {paginatedRequests.map((request) => (
              <div
                key={request.requestId}
                className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow flex flex-col"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`p-1.5 rounded-lg flex-shrink-0 ${
                      request.requestType === 'SWAP' ? 'bg-blue-100 text-blue-600' :
                      request.requestType === 'LEAVE' ? 'bg-red-100 text-red-600' :
                      'bg-amber-100 text-amber-600'
                    }`}>
                      {getRequestTypeIcon(request.requestType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 truncate">
                        {getRequestTypeLabel(request.requestType)}
                      </h3>
                      <p className="text-xs text-slate-500 truncate">
                        By: {staffNameMap[request.staffUserId] || `Staff ${request.staffUserId}`}
                        {request.targetStaffUserId && (
                          <span> • To: {staffNameMap[request.targetStaffUserId] || `Staff ${request.targetStaffUserId}`}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(request.status)}
                </div>

                <div className="space-y-1.5 text-sm text-slate-600 mb-3 flex-1">
                  {request.reason && (
                    <p className="text-xs text-slate-700 line-clamp-2">
                      <span className="font-medium">Reason:</span> {request.reason}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">
                    {format(parseISO(request.requestedAt), 'dd/MM/yyyy HH:mm')}
                    {request.shiftDate && (
                      <span className="ml-1">
                        • {format(parseISO(request.shiftDate), 'dd/MM/yyyy')}
                        {request.startTime && request.endTime && (
                          <span> ({request.startTime.substring(0, 5)}-{request.endTime.substring(0, 5)})</span>
                        )}
                      </span>
                    )}
                    {request.requestType === 'OVERTIME' && request.overtimeHours && (
                      <span className="ml-1">• {request.overtimeHours}h</span>
                    )}
                  </p>
                  {request.reviewNotes && (
                    <p className="text-xs text-slate-500 line-clamp-1">
                      <span className="font-medium">Notes:</span> {request.reviewNotes}
                    </p>
                  )}
                </div>

                {/* Review Notes Input - Only show for pending requests that can be approved/rejected */}
                {(canApprove(request) || canReject(request)) && (
                  <div className="mb-3">
                    <textarea
                      value={reviewNotes[request.requestId] || ''}
                      onChange={(e) => setReviewNotes(prev => ({
                        ...prev,
                        [request.requestId]: e.target.value
                      }))}
                      placeholder="Review notes (optional)..."
                      className="w-full rounded border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none"
                      rows={2}
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 mt-auto">
                  {canApprove(request) && (
                    <button
                      onClick={() => setRequestToApprove(request)}
                      disabled={processing === request.requestId}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve
                    </button>
                  )}
                  {canReject(request) && (
                    <button
                      onClick={() => setRequestToReject(request)}
                      disabled={processing === request.requestId}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  )}
                </div>
              </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-4 border-t border-slate-200">
                <div className="text-sm text-slate-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredRequests.length)} of {filteredRequests.length} requests
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(0)}
                    disabled={currentPage === 0}
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                    disabled={currentPage === 0}
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Prev
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, Math.max(1, totalPages)) }).map((_, idx) => {
                      const half = 2;
                      let start = Math.max(0, Math.min(currentPage - half, (totalPages - 1) - (5 - 1)));
                      if (totalPages <= 5) start = 0;
                      const pageNum = start + idx;
                      if (pageNum >= totalPages) return null;
                      const active = pageNum === currentPage;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                            active
                              ? 'bg-sky-500 text-white border border-sky-500'
                              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {pageNum + 1}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    disabled={currentPage >= totalPages - 1}
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages - 1)}
                    disabled={currentPage >= totalPages - 1}
                    className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Last
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Approve Confirmation Modal */}
      {requestToApprove && (
        <ConfirmModal
          open={!!requestToApprove}
          onCancel={() => setRequestToApprove(null)}
          onConfirm={handleApprove}
          title="Approve Request"
          description={`Are you sure you want to approve this ${getRequestTypeLabel(requestToApprove.requestType).toLowerCase()} request?`}
          confirmText="Approve"
          cancelText="Cancel"
          isLoading={processing === requestToApprove.requestId}
        />
      )}

      {/* Reject Confirmation Modal */}
      {requestToReject && (
        <ConfirmModal
          open={!!requestToReject}
          onCancel={() => setRequestToReject(null)}
          onConfirm={handleReject}
          title="Reject Request"
          description={`Are you sure you want to reject this ${getRequestTypeLabel(requestToReject.requestType).toLowerCase()} request?`}
          confirmText="Reject"
          cancelText="Cancel"
          isLoading={processing === requestToReject.requestId}
        />
      )}
    </div>
  );
}

