import React, { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2, X, Check, Users, UserCheck, UserX } from 'lucide-react';
import { staffService } from '../../services';
import CreateStaffModal from '../../components/manager/staff/CreateStaffModal';
import { UserResponseDto } from '../../types';
import ConfirmModal from '../../components/common/modal/ConfirmModal';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const StaffManagement: React.FC = () => {
  const { managerBranch } = useAuth();
  const [staff, setStaff] = useState<UserResponseDto[]>([]);
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
  const [deletingStaff, setDeletingStaff] = useState<UserResponseDto | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const bottomScrollRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const topInnerRef = useRef<HTMLDivElement | null>(null);
  const syncingRef = useRef(false);
  const [editing, setEditing] = useState<{ id: number; field: 'email' | 'identityCard' | 'hireDate' | 'phoneNumber' | 'position' | 'salary' } | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    fetchStaff();
  }, [page, size, managerBranch]);

  useEffect(() => {
    fetchStaffStats();
  }, [managerBranch]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (managerBranch?.branchId) {
        // Fetch staff by branch for manager
        const staffList = await staffService.getStaffProfilesByBranch(managerBranch.branchId);
        const sorted = sortStaffNewestFirst(staffList);
        setStaff(sorted);
        setTotal(staffList.length);
        setTotalPages(1);
      } else {
        // Fallback to paged API if no branch info
        const resp = await staffService.getStaffProfilesPaged(page, size);
        const sorted = sortStaffNewestFirst(resp.data);
        setStaff(sorted);
        setTotal(resp.total);
        setTotalPages(resp.totalPages);
      }
    } catch (err) {
      setError('Failed to load staff list');
      console.error('Error fetching staff:', err);
    } finally {
      setLoading(false);
    }
  };

  const sortStaffNewestFirst = (list: UserResponseDto[]): UserResponseDto[] => {
    const getTs = (u: any): number => {
      const t = u?.updateAt || u?.createAt || u?.hireDate;
      const ts = t ? Date.parse(t) : 0;
      return Number.isNaN(ts) ? 0 : ts;
    };
    return [...list].sort((a: any, b: any) => {
      const bt = getTs(b);
      const at = getTs(a);
      if (bt !== at) return bt - at; // newest first
      const bid = Number(b.user_id || b.id || 0);
      const aid = Number(a.user_id || a.id || 0);
      return bid - aid;
    });
  };

  const fetchStaffStats = async () => {
    try {
      if (managerBranch?.branchId) {
        // Get stats for current branch only
        const branchStaff = await staffService.getStaffProfilesByBranch(managerBranch.branchId);
        setTotalStaff(branchStaff.length);
        const active = branchStaff.length; // Assume all staff are active for now
        setActiveStaff(active);
        setInactiveStaff(branchStaff.length - active);
      } else {
        // Fallback to all staff if no branch info
        const all = await staffService.getStaffProfiles();
        setTotalStaff(all.length);
        const active = all.length; // Assume all staff are active for now
        setActiveStaff(active);
        setInactiveStaff(all.length - active);
      }
    } catch (err) {
      console.error('Error fetching staff stats:', err);
    }
  };

  const openCreateModal = async () => {
    setIsCreating(true);
  };

  const startInlineEdit = (s: UserResponseDto, field: 'email' | 'identityCard' | 'hireDate' | 'phoneNumber' | 'position' | 'salary') => {
    setEditing({ id: s.user_id, field });
    setEditValue(String((s as any)[field] ?? ''));
  };

  const cancelInlineEdit = () => {
    setEditing(null);
    setEditValue('');
  };

  const saveInlineEdit = async (s: UserResponseDto) => {
    if (!editing) return;
    try {
      if (editing.field === 'email') {
        // Gọi Auth Service API
        await staffService.updateStaffProfile(s.user_id, { email: editValue });
        toast.success('Email updated successfully');
      } else if (editing.field === 'phoneNumber') {
        await staffService.updateStaffProfile(s.user_id, { phone: editValue });
        toast.success('Phone updated successfully');
      } else if (editing.field === 'identityCard') {
        // Gọi Profile Service API
        await staffService.updateStaffProfile(s.user_id, { identityCard: editValue });
        toast.success('Identity card updated successfully');
      } else if (editing.field === 'hireDate') {
        // Gọi Profile Service API
        await staffService.updateStaffProfile(s.user_id, { hireDate: editValue });
        toast.success('Hire date updated successfully');
      } else if (editing.field === 'position') {
        await staffService.updateStaffProfile(s.user_id, { position: editValue });
        toast.success('Position updated successfully');
      } else if (editing.field === 'salary') {
        const salaryNum = Number(editValue);
        if (Number.isNaN(salaryNum)) {
          toast.error('Salary must be a number');
          return;
        }
        await staffService.updateStaffProfile(s.user_id, { salary: salaryNum });
        toast.success('Salary updated successfully');
      }
      
      // Cập nhật local state thay vì reload toàn bộ
      setStaff(prevStaff => 
        prevStaff.map(staff => 
          staff.user_id === s.user_id 
            ? { 
                ...staff, 
                [editing.field]: editValue,
                // Cập nhật thời gian update nếu có
                updateAt: new Date().toISOString()
              }
            : staff
        )
      );
      
      setEditing(null);
      setEditValue('');
      
      // Cập nhật stats
      await fetchStaffStats();
    } catch (e: any) {
      const msg = e?.response?.message || e?.message || 'Update failed';
      toast.error(msg);
    }
  };

  const refreshStaffLight = async () => {
    try {
      await fetchStaff();
      await fetchStaffStats();
    } catch {}
  };

  const handleDeleteStaff = async (staff: UserResponseDto) => {
    try {
      setDeletingLoading(true);
      const resp = await staffService.deleteStaff(staff.user_id);
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

      setStaff(prevStaff => prevStaff.filter(s => s.user_id !== staff.user_id));
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
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
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

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <UserX className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Inactive Staff</dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {inactiveStaff}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Staff List */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Staff</h2>
                
                {/* Top horizontal scrollbar */}
                <div ref={topScrollRef} className="overflow-x-auto overflow-y-hidden h-5 mb-2">
                  <div ref={topInnerRef} style={{ height: 1 }} />
                </div>
                <div ref={bottomScrollRef} className="overflow-x-auto">
                  <table ref={tableRef} className="min-w-max divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Card</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Salary</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hire date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {staff.map((staffMember) => (
                        <tr key={staffMember.user_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {staffMember.user_id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {staffMember.fullname}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {editing && editing.id === staffMember.user_id && editing.field === 'email' ? (
                              <div className="flex items-center gap-2">
                                <input className="border rounded px-2 py-1 text-sm" value={editValue} onChange={(e) => setEditValue(e.target.value)} />
                                <button onClick={() => saveInlineEdit(staffMember)} className="text-emerald-600 hover:text-emerald-700" title="Save"><Check className="w-4 h-4" /></button>
                                <button onClick={cancelInlineEdit} className="text-gray-500 hover:text-gray-700" title="Cancel"><X className="w-4 h-4" /></button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span>{staffMember.email}</span>
                                <button onClick={() => startInlineEdit(staffMember, 'email')} className="text-blue-600 hover:text-blue-700" title="Edit email"><Pencil className="w-4 h-4" /></button>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {editing && editing.id === staffMember.user_id && editing.field === 'phoneNumber' ? (
                              <div className="flex items-center gap-2">
                                <input className="border rounded px-2 py-1 text-sm" value={editValue} onChange={(e) => setEditValue(e.target.value.replace(/[^0-9+]/g, ''))} />
                                <button onClick={() => saveInlineEdit(staffMember)} className="text-emerald-600 hover:text-emerald-700" title="Save"><Check className="w-4 h-4" /></button>
                                <button onClick={cancelInlineEdit} className="text-gray-500 hover:text-gray-700" title="Cancel"><X className="w-4 h-4" /></button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span>{staffMember.phoneNumber}</span>
                                <button onClick={() => startInlineEdit(staffMember, 'phoneNumber')} className="text-blue-600 hover:text-blue-700" title="Edit phone"><Pencil className="w-4 h-4" /></button>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {editing && editing.id === staffMember.user_id && editing.field === 'identityCard' ? (
                              <div className="flex items-center gap-2">
                                <input className="border rounded px-2 py-1 text-sm" value={editValue} onChange={(e) => setEditValue(e.target.value.replace(/\D/g, ''))} />
                                <button onClick={() => saveInlineEdit(staffMember)} className="text-emerald-600 hover:text-emerald-700" title="Save"><Check className="w-4 h-4" /></button>
                                <button onClick={cancelInlineEdit} className="text-gray-500 hover:text-gray-700" title="Cancel"><X className="w-4 h-4" /></button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span>{staffMember.identityCard ?? '-'}</span>
                                <button onClick={() => startInlineEdit(staffMember, 'identityCard')} className="text-blue-600 hover:text-blue-700" title="Edit ID card"><Pencil className="w-4 h-4" /></button>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {editing && editing.id === staffMember.user_id && editing.field === 'position' ? (
                              <div className="flex items-center gap-2">
                                <select className="border rounded px-2 py-1 text-sm" value={editValue} onChange={(e) => setEditValue(e.target.value)}>
                                  <option value="Pha Chế">Pha Chế</option>
                                  <option value="Thu Ngân">Thu Ngân</option>
                                  <option value="Phục Vụ">Phục Vụ</option>
                                </select>
                                <button onClick={() => saveInlineEdit(staffMember)} className="text-emerald-600 hover:text-emerald-700" title="Save"><Check className="w-4 h-4" /></button>
                                <button onClick={cancelInlineEdit} className="text-gray-500 hover:text-gray-700" title="Cancel"><X className="w-4 h-4" /></button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">{staffMember.position ?? '-'}</span>
                                <button onClick={() => startInlineEdit(staffMember, 'position')} className="text-blue-600 hover:text-blue-700" title="Edit position"><Pencil className="w-4 h-4" /></button>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {editing && editing.id === staffMember.user_id && editing.field === 'salary' ? (
                              <div className="flex items-center gap-2">
                                <input className="border rounded px-2 py-1 text-sm" type="number" value={editValue} onChange={(e) => setEditValue(e.target.value)} />
                                <button onClick={() => saveInlineEdit(staffMember)} className="text-emerald-600 hover:text-emerald-700" title="Save"><Check className="w-4 h-4" /></button>
                                <button onClick={cancelInlineEdit} className="text-gray-500 hover:text-gray-700" title="Cancel"><X className="w-4 h-4" /></button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">{staffMember.salary}</span>
                                <button onClick={() => startInlineEdit(staffMember, 'salary')} className="text-blue-600 hover:text-blue-700" title="Edit salary"><Pencil className="w-4 h-4" /></button>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {editing && editing.id === staffMember.user_id && editing.field === 'hireDate' ? (
                              <div className="flex items-center gap-2">
                                <input type="date" className="border rounded px-2 py-1 text-sm" value={editValue} onChange={(e) => setEditValue(e.target.value)} />
                                <button onClick={() => saveInlineEdit(staffMember)} className="text-emerald-600 hover:text-emerald-700" title="Save"><Check className="w-4 h-4" /></button>
                                <button onClick={cancelInlineEdit} className="text-gray-500 hover:text-gray-700" title="Cancel"><X className="w-4 h-4" /></button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span>{staffMember.hireDate ? new Date(staffMember.hireDate).toLocaleDateString('en-GB') : '-'}</span>
                                <button onClick={() => startInlineEdit(staffMember, 'hireDate')} className="text-blue-600 hover:text-blue-700" title="Edit hire date"><Pencil className="w-4 h-4" /></button>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => { setDeletingStaff(staffMember); setIsDeleting(true); }}
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

                {staff.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No staff</h3>
                    <p className="mt-1 text-sm text-gray-500">There are no staff in the system.</p>
                  </div>
                )}

                {/* Pagination Controls */}
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-600">Total: {total} • Page {page + 1} / {Math.max(totalPages, 1)}</div>
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
            onClose={() => setIsCreating(false)}
            onCreated={async (created) => {
              setStaff(prev => [created, ...prev]);
              setTotal(prev => prev + 1);
              setTotalStaff(prev => prev + 1);
              setActiveStaff(prev => prev + 1);
              if (page > 0) setPage(0);
              await fetchStaffStats();
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
        </div>
      </div>
    </div>
  );
};

export default StaffManagement;
