import { useEffect, useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, LogOut, Clock, CheckCircle2, XCircle, AlertCircle, X, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { shiftRequestService, ShiftRequest } from '../../services/shiftRequestService';
import staffService from '../../services/staffService';
import ConfirmModal from '../../components/common/ConfirmModal';
import Pagination from '../../components/product/Pagination';

type FilterType = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';
type TabType = 'MY_REQUESTS' | 'PENDING_REQUESTS';

export default function StaffMyRequests() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab: TabType = tabParam === 'pending' ? 'PENDING_REQUESTS' : 'MY_REQUESTS';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [myRequests, setMyRequests] = useState<ShiftRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<ShiftRequest[]>([]);
  const [allIncomingRequests, setAllIncomingRequests] = useState<ShiftRequest[]>([]);
  const [loadingMyRequests, setLoadingMyRequests] = useState(true);
  const [loadingPendingRequests, setLoadingPendingRequests] = useState(true);
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [incomingFilter, setIncomingFilter] = useState<FilterType>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageIncoming, setCurrentPageIncoming] = useState(1);
  const [itemsPerPage] = useState(9);
  const [requestToCancel, setRequestToCancel] = useState<ShiftRequest | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [respondingTo, setRespondingTo] = useState<number | null>(null);
  const [responseNotes, setResponseNotes] = useState<Record<number, string>>({});
  const [staffNameMap, setStaffNameMap] = useState<Record<number, string>>({});

  const loadMyRequests = async () => {
    const userId = user?.user_id || (user?.id ? Number(user.id) : null);
    if (!userId) {
      setLoadingMyRequests(false);
      return;
    }

    try {
      setLoadingMyRequests(true);
      // Use getMyRequests() instead of getRequestsByStaff() to avoid authentication issues
      const requests = await shiftRequestService.getMyRequests();
      setMyRequests(requests);
    } catch (error: any) {
      console.error('Failed to load my requests', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to load requests');
      setMyRequests([]);
    } finally {
      setLoadingMyRequests(false);
    }
  };

  const loadPendingRequests = async () => {
    try {
      setLoadingPendingRequests(true);
      const userId = user?.user_id || (user?.id ? Number(user.id) : null);
      if (!userId) {
        setPendingRequests([]);
        setAllIncomingRequests([]);
        return;
      }

      // Load pending requests sent to current user (for badge count)
      const pendingRequests = await shiftRequestService.getPendingResponseRequests();
      setPendingRequests(pendingRequests);
      
      // Load all incoming requests (all statuses including REJECTED_BY_TARGET, APPROVED, etc.)
      try {
        const allIncoming = await shiftRequestService.getIncomingRequests();
        setAllIncomingRequests(allIncoming);
      } catch (error: any) {
        console.error('Failed to load all incoming requests, falling back to pending only', error);
        // Fallback: only use pending requests if getIncomingRequests fails
        setAllIncomingRequests(pendingRequests);
      }
    } catch (error: any) {
      console.error('Failed to load incoming requests', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to load incoming requests');
      setPendingRequests([]);
      setAllIncomingRequests([]);
    } finally {
      setLoadingPendingRequests(false);
    }
  };

  const loadStaffNames = async () => {
    if (!user?.branchId && !user?.branch?.branchId) return;
    
    const branchId = user.branch?.branchId || (user.branchId ? Number(user.branchId) : null);
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
      // Không hiển thị error toast vì đây chỉ là thông tin bổ sung
    }
  };

  useEffect(() => {
    // Đợi auth loading hoàn thành trước khi gọi API
    if (authLoading) {
      return;
    }

    // Kiểm tra token có tồn tại không
    const token = localStorage.getItem('coffee-token');
    if (!token || token === 'undefined' || token === 'null') {
      setLoadingMyRequests(false);
      setLoadingPendingRequests(false);
      return;
    }

    // Chỉ gọi API khi có user
    const userId = user?.user_id || (user?.id ? Number(user.id) : null);
    if (!userId) {
      setLoadingMyRequests(false);
      return;
    }

    // Đợi một chút để đảm bảo token đã được set vào apiClient
    // (AuthContext có thể đang trong quá trình set token)
    const timer = setTimeout(() => {
      loadMyRequests();
      loadPendingRequests();
      
      // Load staff names chỉ khi có branchId
      if (user?.branchId || user?.branch?.branchId) {
        loadStaffNames();
      }
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [authLoading, user?.user_id, user?.id]);

  // Sync tab with URL params
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'pending' && activeTab !== 'PENDING_REQUESTS') {
      setActiveTab('PENDING_REQUESTS');
    } else if (tabParam !== 'pending' && activeTab !== 'MY_REQUESTS') {
      setActiveTab('MY_REQUESTS');
    }
  }, [searchParams]);

  const filteredMyRequests = useMemo(() => {
    let filtered = myRequests.filter(request => {
      if (filter === 'ALL') return true;
      if (filter === 'PENDING') {
        return request.status === 'PENDING' || 
               request.status === 'PENDING_TARGET_APPROVAL' || 
               request.status === 'PENDING_MANAGER_APPROVAL';
      }
      if (filter === 'APPROVED') {
        return request.status === 'APPROVED';
      }
      if (filter === 'REJECTED') {
        return request.status === 'REJECTED' || request.status === 'REJECTED_BY_TARGET';
      }
      return request.status === filter;
    });
    
    // Sort by updateAt (newest first), fallback to requestedAt
    return filtered.sort((a, b) => {
      const aTime = a.updateAt ? new Date(a.updateAt).getTime() : new Date(a.requestedAt).getTime();
      const bTime = b.updateAt ? new Date(b.updateAt).getTime() : new Date(b.requestedAt).getTime();
      return bTime - aTime; // newest first
    });
  }, [myRequests, filter]);

  // Paginated data for My Requests
  const paginatedMyRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredMyRequests.slice(startIndex, endIndex);
  }, [filteredMyRequests, currentPage, itemsPerPage]);

  const totalPagesMyRequests = useMemo(() => {
    return Math.ceil(filteredMyRequests.length / itemsPerPage);
  }, [filteredMyRequests.length, itemsPerPage]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  // Filter incoming requests based on status and sort by updateAt
  const filteredIncomingRequests = useMemo(() => {
    let filtered = allIncomingRequests;
    
    if (incomingFilter !== 'ALL') {
      filtered = allIncomingRequests.filter(request => {
        if (incomingFilter === 'PENDING') {
          return request.status === 'PENDING_TARGET_APPROVAL' || request.status === 'PENDING';
        }
        if (incomingFilter === 'APPROVED') {
          return request.status === 'APPROVED';
        }
        if (incomingFilter === 'REJECTED') {
          return request.status === 'REJECTED' || request.status === 'REJECTED_BY_TARGET';
        }
        return true;
      });
    }
    
    // Sort by updateAt (newest first), fallback to requestedAt
    return filtered.sort((a, b) => {
      const aTime = a.updateAt ? new Date(a.updateAt).getTime() : new Date(a.requestedAt).getTime();
      const bTime = b.updateAt ? new Date(b.updateAt).getTime() : new Date(b.requestedAt).getTime();
      return bTime - aTime; // newest first
    });
  }, [allIncomingRequests, incomingFilter]);

  // Paginated data for Incoming Requests
  const paginatedIncomingRequests = useMemo(() => {
    const startIndex = (currentPageIncoming - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredIncomingRequests.slice(startIndex, endIndex);
  }, [filteredIncomingRequests, currentPageIncoming, itemsPerPage]);

  const totalPagesIncomingRequests = useMemo(() => {
    return Math.ceil(filteredIncomingRequests.length / itemsPerPage);
  }, [filteredIncomingRequests.length, itemsPerPage]);

  // Reset to page 1 when incoming filter changes
  useEffect(() => {
    setCurrentPageIncoming(1);
  }, [incomingFilter]);

  const incomingStats = {
    total: allIncomingRequests.length,
    pending: allIncomingRequests.filter(r => r.status === 'PENDING_TARGET_APPROVAL' || r.status === 'PENDING').length,
    approved: allIncomingRequests.filter(r => r.status === 'APPROVED').length,
    rejected: allIncomingRequests.filter(r => r.status === 'REJECTED' || r.status === 'REJECTED_BY_TARGET').length,
  };

  const handleRespond = async (requestId: number, accept: boolean) => {
    try {
      setRespondingTo(requestId);
      const notes = responseNotes[requestId] || undefined;
      await shiftRequestService.respondToRequest(requestId, accept, notes);
      toast.success(`Request ${accept ? 'accepted' : 'rejected'} successfully`);
      // Remove notes for this request
      const newNotes = { ...responseNotes };
      delete newNotes[requestId];
      setResponseNotes(newNotes);
      // Reload both pending requests and all incoming requests
      await loadPendingRequests();
    } catch (error: any) {
      console.error('Failed to respond to request', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to respond to request');
    } finally {
      setRespondingTo(null);
    }
  };

  const updateResponseNotes = (requestId: number, notes: string) => {
    setResponseNotes(prev => ({ ...prev, [requestId]: notes }));
  };

  const getRequestTypeLabel = (type: string) => {
    switch (type) {
      case 'SWAP':
        return 'Swap Shift';
      case 'PICK_UP':
        return 'Pick Up Shift';
      case 'TWO_WAY_SWAP':
        return 'Two-Way Swap';
      case 'LEAVE':
        return 'Request Leave';
      case 'OVERTIME':
        return 'Request Overtime';
      default:
        return type;
    }
  };

  const getRequestTypeIcon = (type: string) => {
    switch (type) {
      case 'SWAP':
        return <RefreshCw className="w-4 h-4" />;
      case 'PICK_UP':
        return <User className="w-4 h-4" />;
      case 'TWO_WAY_SWAP':
        return <RefreshCw className="w-4 h-4" />;
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

  const handleCancelRequest = async () => {
    if (!requestToCancel) return;

    try {
      setCancelling(true);
      await shiftRequestService.cancelRequest(requestToCancel.requestId);
      toast.success('Request cancelled successfully');
      setRequestToCancel(null);
      loadMyRequests();
    } catch (error: any) {
      console.error('Failed to cancel request', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to cancel request');
    } finally {
      setCancelling(false);
    }
  };

  const stats = {
    total: myRequests.length,
    pending: myRequests.filter(r => r.status === 'PENDING' || r.status === 'PENDING_TARGET_APPROVAL' || r.status === 'PENDING_MANAGER_APPROVAL').length,
    approved: myRequests.filter(r => r.status === 'APPROVED').length,
    rejected: myRequests.filter(r => r.status === 'REJECTED' || r.status === 'REJECTED_BY_TARGET').length,
  };

  const loading = activeTab === 'MY_REQUESTS' ? loadingMyRequests : loadingPendingRequests;

  const handleRefresh = async () => {
    if (activeTab === 'MY_REQUESTS') {
      await loadMyRequests();
    } else {
      await loadPendingRequests();
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Shift Requests</h1>
          <p className="text-sm text-slate-600">
            View and manage your shift requests and respond to pending requests
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-slate-200 p-1 mb-6 inline-flex">
        <button
          onClick={() => {
            setActiveTab('MY_REQUESTS');
            setSearchParams({}, { replace: true });
          }}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'MY_REQUESTS'
              ? 'bg-sky-100 text-sky-700'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          My Requests
        </button>
        <button
          onClick={() => {
            setActiveTab('PENDING_REQUESTS');
            setSearchParams({ tab: 'pending' }, { replace: true });
          }}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors relative ${
            activeTab === 'PENDING_REQUESTS'
              ? 'bg-sky-100 text-sky-700'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Incoming Requests
          {incomingStats.pending > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
              {incomingStats.pending}
            </span>
          )}
        </button>
      </div>

      {/* My Requests Tab Content */}
      {activeTab === 'MY_REQUESTS' && (
        <>
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
            <div className="flex items-center justify-between">
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
              <div className="text-sm text-slate-600">
                Showing {paginatedMyRequests.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, filteredMyRequests.length)} of {filteredMyRequests.length}
              </div>
            </div>
          </div>

          {/* Requests List */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {[...Array(6)].map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-lg border border-slate-200 p-4 animate-pulse"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
                        <div className="flex-1 min-w-0">
                          <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
                          <div className="h-3 bg-slate-200 rounded w-24"></div>
                        </div>
                      </div>
                      <div className="h-6 bg-slate-200 rounded-full w-24"></div>
                    </div>
                    <div className="space-y-1.5 mb-3">
                      <div className="h-3 bg-slate-200 rounded w-full"></div>
                      <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                    </div>
                    {idx % 3 === 0 && (
                      <div className="h-8 bg-slate-200 rounded w-full"></div>
                    )}
                  </div>
                ))}
              </div>
            ) : filteredMyRequests.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500 text-sm">
                  {filter === 'ALL' ? 'No requests found' : `No ${filter.toLowerCase()} requests`}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {paginatedMyRequests.map((request) => (
                  <div
                    key={request.requestId}
                    className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-shadow"
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
                            ID: {request.requestId}
                            {request.targetStaffUserId && (
                              <span> • To: {staffNameMap[request.targetStaffUserId] || `Staff ${request.targetStaffUserId}`}</span>
                            )}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(request.status)}
                    </div>

                    <div className="space-y-1.5 text-sm text-slate-600 mb-3">
                      {request.reason && (
                        <p className="text-xs text-slate-700 line-clamp-2">
                          <span className="font-medium">Reason:</span> {request.reason}
                        </p>
                      )}
                      <p className="text-xs text-slate-500">
                        {format(new Date(request.requestedAt), 'dd/MM/yyyy HH:mm')}
                        {request.reviewedAt && (
                          <span className="ml-1">• Reviewed: {format(new Date(request.reviewedAt), 'dd/MM/yyyy HH:mm')}</span>
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

                    {request.status === 'PENDING' && (
                      <button
                        onClick={() => setRequestToCancel(request)}
                        className="w-full px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                ))}
                </div>
                {totalPagesMyRequests > 1 && (
                  <div className="border-t border-slate-200 p-4">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPagesMyRequests}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Incoming Requests Tab Content */}
      {activeTab === 'PENDING_REQUESTS' && (
        <>
          {/* Statistics */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="text-xs text-slate-500 mb-1">Total Requests</div>
              <div className="text-2xl font-bold text-slate-900">{incomingStats.total}</div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="text-xs text-slate-500 mb-1">Pending</div>
              <div className="text-2xl font-bold text-amber-600">{incomingStats.pending}</div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="text-xs text-slate-500 mb-1">Approved</div>
              <div className="text-2xl font-bold text-green-600">{incomingStats.approved}</div>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="text-xs text-slate-500 mb-1">Rejected</div>
              <div className="text-2xl font-bold text-red-600">{incomingStats.rejected}</div>
            </div>
          </div>

          {/* Filter */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-700">Filter:</span>
                {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as FilterType[]).map((filterType) => (
                  <button
                    key={filterType}
                    onClick={() => setIncomingFilter(filterType)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      incomingFilter === filterType
                        ? 'bg-sky-100 text-sky-700'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {filterType}
                  </button>
                ))}
              </div>
              <div className="text-sm text-slate-600">
                Showing {paginatedIncomingRequests.length > 0 ? (currentPageIncoming - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPageIncoming * itemsPerPage, filteredIncomingRequests.length)} of {filteredIncomingRequests.length}
              </div>
            </div>
          </div>

          {/* Requests List */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {[...Array(6)].map((_, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col animate-pulse"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-8 h-8 bg-slate-200 rounded-lg"></div>
                        <div className="flex-1 min-w-0">
                          <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
                          <div className="h-3 bg-slate-200 rounded w-24"></div>
                        </div>
                      </div>
                      <div className="h-6 bg-slate-200 rounded-full w-28"></div>
                    </div>
                    <div className="space-y-1.5 mb-3 flex-1">
                      <div className="h-3 bg-slate-200 rounded w-full"></div>
                      <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                    </div>
                    {idx % 2 === 0 && (
                      <>
                        <div className="mb-3">
                          <div className="h-16 bg-slate-200 rounded border border-slate-200"></div>
                        </div>
                        <div className="flex gap-2 mt-auto">
                          <div className="flex-1 h-8 bg-green-200 rounded"></div>
                          <div className="flex-1 h-8 bg-red-200 rounded"></div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : filteredIncomingRequests.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  {incomingFilter === 'ALL' ? 'No Incoming Requests' : `No ${incomingFilter.toLowerCase()} requests`}
                </h3>
                <p className="text-sm text-slate-500">
                  {incomingFilter === 'ALL' 
                    ? "You don't have any requests sent to you."
                    : `You don't have any ${incomingFilter.toLowerCase()} requests.`}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {paginatedIncomingRequests.map((request) => (
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
                    </p>
                  </div>

                  {/* Response Notes Input - Only show for pending requests */}
                  {(request.status === 'PENDING_TARGET_APPROVAL' || request.status === 'PENDING') && (
                    <div className="mb-3">
                      <textarea
                        value={responseNotes[request.requestId] || ''}
                        onChange={(e) => updateResponseNotes(request.requestId, e.target.value)}
                        placeholder="Response notes (optional)..."
                        className="w-full rounded border border-slate-200 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none"
                        rows={2}
                      />
                    </div>
                  )}

                  {/* Action Buttons - Only show for pending requests */}
                  {(request.status === 'PENDING_TARGET_APPROVAL' || request.status === 'PENDING') && (
                    <div className="flex gap-2 mt-auto">
                      <button
                        onClick={() => handleRespond(request.requestId, true)}
                        disabled={respondingTo === request.requestId}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Accept
                      </button>
                      <button
                        onClick={() => handleRespond(request.requestId, false)}
                        disabled={respondingTo === request.requestId}
                        className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
                  ))}
                </div>
                {totalPagesIncomingRequests > 1 && (
                  <div className="border-t border-slate-200 p-4">
                    <Pagination
                      currentPage={currentPageIncoming}
                      totalPages={totalPagesIncomingRequests}
                      onPageChange={setCurrentPageIncoming}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Cancel Confirmation Modal */}
      {requestToCancel && (
        <ConfirmModal
          open={!!requestToCancel}
          onCancel={() => setRequestToCancel(null)}
          onConfirm={handleCancelRequest}
          title="Cancel Request"
          description={`Are you sure you want to cancel this ${getRequestTypeLabel(requestToCancel.requestType).toLowerCase()} request?`}
          confirmText="Cancel Request"
          cancelText="Keep Request"
          isLoading={cancelling}
        />
      )}
    </div>
  );
}

