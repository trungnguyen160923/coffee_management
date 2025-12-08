import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Pencil, Trash2, Users, UserCheck, Eye, X } from 'lucide-react';
import { staffService } from '../../services';
import authService, { StaffBusinessRole } from '../../services/authService';
import CreateStaffModal from '../../components/manager/staff/CreateStaffModal';
import StaffDetailModal from '../../components/manager/staff/StaffDetailModal';
import { StaffWithUserDto } from '../../types';
import ConfirmModal from '../../components/common/modal/ConfirmModal';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { StaffManagementSkeleton } from '../../components/manager/skeletons';

const StaffManagement: React.FC = () => {
  const { managerBranch } = useAuth();
  const [staff, setStaff] = useState<StaffWithUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalStaff, setTotalStaff] = useState(0);
  const [activeStaff, setActiveStaff] = useState(0);
  const [inactiveStaff, setInactiveStaff] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingStaff, setDeletingStaff] = useState<StaffWithUserDto | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffWithUserDto | null>(null);
  const [viewingStaff, setViewingStaff] = useState<StaffWithUserDto | null>(null);
  
  // Filter states
  const [selectedEmploymentType, setSelectedEmploymentType] = useState<'ALL' | 'FULL_TIME' | 'PART_TIME' | 'CASUAL'>('ALL');
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [availableRoles, setAvailableRoles] = useState<StaffBusinessRole[]>([]);
  
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const bottomScrollRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const topInnerRef = useRef<HTMLDivElement | null>(null);
  const syncingRef = useRef(false);

  useEffect(() => {
    fetchStaff();
  }, [page, size, managerBranch]);

  useEffect(() => {
    fetchStaffStats();
  }, [managerBranch]);

  useEffect(() => {
    // Load available staff business roles
    authService
      .getStaffBusinessRoles()
      .then((roles) => {
        setAvailableRoles(roles || []);
      })
      .catch((err) => {
        console.error('Failed to load staff business roles:', err);
      });
  }, []);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (managerBranch?.branchId) {
        // Fetch staff by branch for manager (full info from profile-service)
        const staffList = await staffService.getStaffsWithUserInfoByBranch(managerBranch.branchId);
        
        const sorted = sortStaffNewestFirst(staffList);
        setStaff(sorted);
        setTotal(staffList.length);
        setTotalPages(1);
      } else {
        // Fallback: keep empty list if không xác định branch
        setStaff([]);
        setTotal(0);
        setTotalPages(1);
      }
    } catch (err) {
      setError('Failed to load staff list');
      console.error('Error fetching staff:', err);
    } finally {
      setLoading(false);
    }
  };

  const sortStaffNewestFirst = (list: StaffWithUserDto[]): StaffWithUserDto[] => {
    const getTs = (u: any): number => {
      const t = u?.updateAt || u?.createAt || u?.hireDate;
      const ts = t ? Date.parse(t) : 0;
      return Number.isNaN(ts) ? 0 : ts;
    };
    return [...list].sort((a: any, b: any) => {
      const bt = getTs(b);
      const at = getTs(a);
      if (bt !== at) return bt - at; // newest first
      const bid = Number(b.userId || (b as any).user_id || b.id || 0);
      const aid = Number(a.userId || (a as any).user_id || a.id || 0);
      return bid - aid;
    });
  };

  // Filter staff based on employment type and roles
  const filteredStaff = useMemo(() => {
    let filtered = [...staff];

    // Filter by employment type
    if (selectedEmploymentType !== 'ALL') {
      filtered = filtered.filter((s) => s.employmentType === selectedEmploymentType);
    }

    // Filter by roles
    if (selectedRoleIds.length > 0) {
      filtered = filtered.filter((s) => {
        const staffRoleIds = s.staffBusinessRoleIds || [];
        // Check if staff has at least one of the selected roles
        return selectedRoleIds.some((roleId) => staffRoleIds.includes(roleId));
      });
    }

    return filtered;
  }, [staff, selectedEmploymentType, selectedRoleIds]);

  // Paginated staff
  const paginatedStaff = useMemo(() => {
    const start = page * size;
    const end = start + size;
    return filteredStaff.slice(start, end);
  }, [filteredStaff, page, size]);

  // Update total pages based on filtered staff
  useEffect(() => {
    const newTotalPages = Math.ceil(filteredStaff.length / size);
    setTotalPages(newTotalPages);
    setTotal(filteredStaff.length);
    // Reset to first page if current page is out of bounds
    if (page >= newTotalPages && newTotalPages > 0) {
      setPage(0);
    }
  }, [filteredStaff.length, size, page]);

  const fetchStaffStats = async () => {
    try {
      if (managerBranch?.branchId) {
        // Get stats for current branch only (full info)
        const branchStaff = await staffService.getStaffsWithUserInfoByBranch(managerBranch.branchId);
        setTotalStaff(branchStaff.length);
        const active = branchStaff.length; // Assume all staff are active for now
        setActiveStaff(active);
        setInactiveStaff(branchStaff.length - active);
      } else {
        // Fallback: nếu không có branch, không tính stats
        setTotalStaff(0);
        setActiveStaff(0);
        setInactiveStaff(0);
      }
    } catch (err) {
      console.error('Error fetching staff stats:', err);
    }
  };

  const openCreateModal = async () => {
    setIsCreating(true);
  };

  const refreshStaffLight = async () => {
    try {
      await fetchStaff();
      await fetchStaffStats();
    } catch {}
  };

  const handleDeleteStaff = async (staff: StaffWithUserDto) => {
    try {
      setDeletingLoading(true);
      const resp = await staffService.deleteStaff(staff.userId);
      if ((resp as any)?.code === 202) {
        toast.success('Delete requested. Saga in progress...');
        setTimeout(refreshStaffLight, 3000);
        setTimeout(refreshStaffLight, 8000);
        setDeletingLoading(false);
        setIsDeleting(false);
        setDeletingStaff(null);
        return;
      }
      if ((resp as any)?.code && (resp as any).code !== 1000 && (resp as any).code !== 200) {
        throw new Error((resp as any).message || 'Delete staff failed');
      }

      setStaff(prevStaff => prevStaff.filter(s => s.userId !== staff.userId));
      setTotal(prevTotal => prevTotal - 1);
      setTotalStaff(prevTotal => prevTotal - 1);
      // Assume all staff are active for now
      setActiveStaff(prev => prev - 1);
      toast.success('Staff deleted successfully');
      setDeletingLoading(false);
      setIsDeleting(false);
      setDeletingStaff(null);
    } catch (e: any) {
      const msg = e?.response?.message || e?.message || 'Failed to delete staff';
      toast.error(msg);
      await refreshStaffLight();
      setDeletingLoading(false);
      setIsDeleting(false);
      setDeletingStaff(null);
    }
  };

  // Sync top/bottom horizontal scrollbars
  useEffect(() => {
    const top = topScrollRef.current;
    const bottom = bottomScrollRef.current;
    if (!top || !bottom) return;

    const handleTop = () => {
      if (!bottom) return;
      if (syncingRef.current) return;
      syncingRef.current = true;
      bottom.scrollLeft = top.scrollLeft;
      requestAnimationFrame(() => { syncingRef.current = false; });
    };
    const handleBottom = () => {
      if (!top) return;
      if (syncingRef.current) return;
      syncingRef.current = true;
      top.scrollLeft = bottom.scrollLeft;
      requestAnimationFrame(() => { syncingRef.current = false; });
    };

    top.addEventListener('scroll', handleTop, { passive: true });
    bottom.addEventListener('scroll', handleBottom, { passive: true });
    return () => {
      top.removeEventListener('scroll', handleTop as any);
      bottom.removeEventListener('scroll', handleBottom as any);
    };
  }, [staff, size, page]);

  // Keep top scrollbar width in sync with table width
  useEffect(() => {
    const syncWidth = () => {
      if (topInnerRef.current && tableRef.current) {
        topInnerRef.current.style.width = tableRef.current.scrollWidth + 'px';
      }
    };
    const raf = requestAnimationFrame(syncWidth);
    let ro: ResizeObserver | null = null;
    if ('ResizeObserver' in window && tableRef.current) {
      ro = new ResizeObserver(syncWidth);
      ro.observe(tableRef.current);
    }
    window.addEventListener('resize', syncWidth);
    return () => {
      cancelAnimationFrame(raf);
      if (ro && tableRef.current) ro.unobserve(tableRef.current);
      window.removeEventListener('resize', syncWidth);
    };
  }, [staff, size, page]);

  if (loading) {
    return <StaffManagementSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                onClick={fetchStaff}
                className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-2 py-4 sm:px-4 lg:px-4">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-8 pt-6 pb-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Staff Management</h1>
              <p className="text-sm text-slate-500">Manage staff information and schedules</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={fetchStaff}
                className="flex items-center space-x-2 rounded-lg bg-slate-100 text-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-200"
                title="Refresh data"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="font-medium">Refresh</span>
              </button>
              <button
                onClick={openCreateModal}
                className="flex items-center space-x-2 rounded-lg bg-amber-500 text-white px-4 py-2 text-sm font-medium hover:bg-amber-600"
              >
                <Plus className="w-4 h-4" />
                <span className="font-medium">Create Staff</span>
              </button>
            </div>
          </div>

          <div className="p-8 pt-4">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Staff</dt>
                        <dd className="text-lg font-medium text-gray-900">{totalStaff}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <UserCheck className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Active Staff</dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {activeStaff}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="space-y-4">
                    {/* Employment Type Filter */}
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                        Employment Type:
                      </label>
                      <select
                        value={selectedEmploymentType}
                        onChange={(e) => {
                          setSelectedEmploymentType(e.target.value as 'ALL' | 'FULL_TIME' | 'PART_TIME' | 'CASUAL');
                          setPage(0);
                        }}
                        className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      >
                        <option value="ALL">All</option>
                        <option value="FULL_TIME">Full Time</option>
                        <option value="PART_TIME">Part Time</option>
                        <option value="CASUAL">Casual</option>
                      </select>
                      {/* Clear filters button - positioned next to dropdown */}
                      {(selectedEmploymentType !== 'ALL' || selectedRoleIds.length > 0) && (
                        <button
                          onClick={() => {
                            setSelectedEmploymentType('ALL');
                            setSelectedRoleIds([]);
                            setPage(0);
                          }}
                          className="ml-auto text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1.5"
                        >
                          <X className="w-4 h-4" />
                          Clear Filters
                        </button>
                      )}
                    </div>

                    {/* Role Filter - Tag Style */}
                    <div className="flex items-start gap-3">
                      <label className="text-sm font-medium text-gray-700 whitespace-nowrap pt-1.5">
                        Role:
                      </label>
                      <div className="flex-1 flex flex-wrap gap-2">
                        {availableRoles.length === 0 ? (
                          <span className="text-sm text-gray-500">Loading...</span>
                        ) : (
                          availableRoles.map((role) => {
                            const isSelected = selectedRoleIds.includes(role.roleId);
                            const roleName = role.name || role.roleName || '';
                            // Map role name to English
                            const roleNameMap: Record<string, string> = {
                              'BARISTA_STAFF': 'Barista',
                              'CASHIER_STAFF': 'Cashier',
                              'SERVER_STAFF': 'Server',
                              'SECURITY_STAFF': 'Security',
                            };
                            const displayName = roleNameMap[roleName] || roleName;

                            return (
                              <button
                                key={role.roleId}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedRoleIds(selectedRoleIds.filter((id) => id !== role.roleId));
                                  } else {
                                    setSelectedRoleIds([...selectedRoleIds, role.roleId]);
                                  }
                                  setPage(0);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                  isSelected
                                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                                }`}
                              >
                                {displayName}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Staff List */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium text-gray-900">Staff</h2>
                </div>
                
                {/* Table */}
                <div className="overflow-x-auto">
                  <table ref={tableRef} className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phone
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID Card
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paginatedStaff.map((staffMember) => (
                        <tr key={staffMember.userId} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {staffMember.userId}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                            {staffMember.fullname}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {staffMember.email}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {staffMember.phoneNumber}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {staffMember.identityCard ?? '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setViewingStaff(staffMember)}
                                className="p-2 rounded hover:bg-gray-100 text-slate-600"
                                title="View details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditingStaff(staffMember)}
                                className="p-2 rounded hover:bg-gray-100 text-blue-600"
                                title="Edit staff"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setDeletingStaff(staffMember);
                                  setIsDeleting(true);
                                }}
                                className="p-2 rounded hover:bg-gray-100 text-red-600"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {paginatedStaff.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      {filteredStaff.length === 0 && staff.length > 0
                        ? 'No staff found matching the filters'
                        : 'No staff'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {filteredStaff.length === 0 && staff.length > 0
                        ? 'Please try again with different filters'
                        : 'There are no staff in the system.'}
                    </p>
                  </div>
                )}

                {/* Pagination Controls */}
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Hiển thị {paginatedStaff.length} / {filteredStaff.length} nhân viên
                    {filteredStaff.length !== staff.length && ` (tổng: ${staff.length})`}
                    {' • '}Trang {page + 1} / {Math.max(totalPages, 1)}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={page <= 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      className={`px-3 py-1 rounded border ${page <= 0 ? 'text-gray-400 border-gray-200' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    >
                      Prev
                    </button>
                    <button
                      disabled={page + 1 >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className={`px-3 py-1 rounded border ${(page + 1 >= totalPages) ? 'text-gray-400 border-gray-200' : 'text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    >
                      Next
                    </button>
                    <select
                      value={size}
                      onChange={(e) => { setPage(0); setSize(parseInt(e.target.value, 10)); }}
                      className="ml-2 border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      {[10, 20, 50, 100].map((s) => (
                        <option key={s} value={s}>{s} / page</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <CreateStaffModal
            open={isCreating}
            mode="create"
            staff={null}
            onClose={() => setIsCreating(false)}
            onSuccess={async () => {
              if (page > 0) setPage(0);
              await fetchStaff();
              await fetchStaffStats();
            }}
          />
          <CreateStaffModal
            open={!!editingStaff}
            mode="edit"
            staff={editingStaff}
            onClose={() => setEditingStaff(null)}
            onSuccess={async () => {
              await fetchStaff();
              await fetchStaffStats();
              setEditingStaff(null);
            }}
          />
          <ConfirmModal
            open={isDeleting}
            title="Delete Staff"
            description={`Are you sure you want to delete staff ${deletingStaff?.fullname}? This action cannot be undone.`}
            confirmText="Delete"
            cancelText="Cancel"
            onConfirm={() => { if (deletingStaff) { void handleDeleteStaff(deletingStaff); } }}
            onCancel={() => { setIsDeleting(false); setDeletingStaff(null); }}
            loading={deletingLoading}
          />
          <StaffDetailModal
            open={!!viewingStaff}
            staff={viewingStaff}
            onClose={() => setViewingStaff(null)}
          />
        </div>
      </div>
    </div>
  );
};

export default StaffManagement;
