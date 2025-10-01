import React, { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { managerService } from '../../services';
import { UserResponseDto } from '../../types';
import CreateManagerModal from '../../components/common/modal/CreateManagerModal';
import AssignBranchModal from '../../components/common/modal/AssignBranchModal';
import ConfirmModal from '../../components/common/modal/ConfirmModal';
import { branchService } from '../../services';
import { toast } from 'react-hot-toast';

const ManagerManagement: React.FC = () => {
  const [managers, setManagers] = useState<UserResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalManagers, setTotalManagers] = useState(0);
  const [withBranchCount, setWithBranchCount] = useState(0);
  const [withoutBranchCount, setWithoutBranchCount] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [assigningManager, setAssigningManager] = useState<UserResponseDto | null>(null);
  const [isUnassigning, setIsUnassigning] = useState(false);
  const [unassigningManager, setUnassigningManager] = useState<UserResponseDto | null>(null);
  const [unassignedBranches, setUnassignedBranches] = useState<import('../../types').Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const bottomScrollRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const topInnerRef = useRef<HTMLDivElement | null>(null);
  const syncingRef = useRef(false);
  const [editing, setEditing] = useState<{ id: number; field: 'email' | 'identityCard' | 'hireDate' } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingManager, setDeletingManager] = useState<UserResponseDto | null>(null);
  const [deletingLoading, setDeletingLoading] = useState(false);

  useEffect(() => {
    fetchManagers();
  }, [page, size]);

  useEffect(() => {
    fetchManagerStats();
  }, []);

  const fetchManagers = async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await managerService.getManagerProfilesPaged(page, size);
      setManagers(resp.data);
      setTotal(resp.total);
      setTotalPages(resp.totalPages);
    } catch (err) {
      setError('Failed to load managers list');
      console.error('Error fetching managers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchManagerStats = async () => {
    try {
      const all = await managerService.getManagerProfiles();
      setTotalManagers(all.length);
      const withBranch = all.filter(m => m.branch !== null).length;
      setWithBranchCount(withBranch);
      setWithoutBranchCount(all.length - withBranch);
    } catch (err) {
      console.error('Error fetching manager stats:', err);
    }
  };

  const openCreateModal = async () => {
    setIsCreating(true);
    setLoadingBranches(true);
    try {
      const branches = await branchService.getUnassignedBranches();
      setUnassignedBranches(branches);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load branches');
    } finally {
      setLoadingBranches(false);
    }
  };

  const openAssignModal = async (manager: UserResponseDto) => {
    setAssigningManager(manager);
    setIsAssigning(true);
    setLoadingBranches(true);
    try {
      const branches = await branchService.getUnassignedBranches();
      setUnassignedBranches(branches);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load branches');
    } finally {
      setLoadingBranches(false);
    }
  };

  const openUnassignModal = (manager: UserResponseDto) => {
    setUnassigningManager(manager);
    setIsUnassigning(true);
  };

  const handleUnassignManager = async () => {
    if (!unassigningManager) return;
    try {
      await managerService.unassignManager(unassigningManager.user_id);
      toast.success('Unassigned branch');
      
      // Optimistic update - cập nhật local state
      setManagers(prevManagers => 
        prevManagers.map(m => 
          m.user_id === unassigningManager.user_id 
            ? { ...m, branch: null }
            : m
        )
      );
      
      // Cập nhật stats
      setWithBranchCount(prev => prev - 1);
      setWithoutBranchCount(prev => prev + 1);
      
      setIsUnassigning(false);
      setUnassigningManager(null);
    } catch (e: any) {
      const msg = e?.response?.message || e?.message || 'Failed to unassign';
      toast.error(msg);
      // Rollback nếu có lỗi
      await fetchManagers();
      await fetchManagerStats();
      setIsUnassigning(false);
      setUnassigningManager(null);
    }
  };

  const handleCancelUnassign = () => {
    setIsUnassigning(false);
    setUnassigningManager(null);
  };

  const startInlineEdit = (m: UserResponseDto, field: 'email' | 'identityCard' | 'hireDate') => {
    setEditing({ id: m.user_id, field });
    setEditValue(String((m as any)[field] ?? ''));
  };

  const cancelInlineEdit = () => {
    setEditing(null);
    setEditValue('');
  };

  const saveInlineEdit = async (m: UserResponseDto) => {
    if (!editing) return;
    try {
      if (editing.field === 'email') {
        // Gọi Auth Service API
        await managerService.updateUser(m.user_id, { email: editValue });
        toast.success('Email updated successfully');
      } else if (editing.field === 'identityCard') {
        // Gọi Profile Service API
        await managerService.updateManagerProfile(m.user_id, { identityCard: editValue });
        toast.success('Identity card updated successfully');
      } else if (editing.field === 'hireDate') {
        // Gọi Profile Service API
        await managerService.updateManagerProfile(m.user_id, { hireDate: editValue });
        toast.success('Hire date updated successfully');
      }
      
      // Cập nhật local state thay vì reload toàn bộ
      setManagers(prevManagers => 
        prevManagers.map(manager => 
          manager.user_id === m.user_id 
            ? { 
                ...manager, 
                [editing.field]: editValue,
                // Cập nhật thời gian update nếu có
                updateAt: new Date().toISOString()
              }
            : manager
        )
      );
      
      setEditing(null);
      setEditValue('');
      
      // Chỉ cập nhật stats nếu cần thiết (không reload toàn bộ)
      if (editing.field === 'email') {
        // Email không ảnh hưởng đến stats, không cần fetch lại
      } else {
        // Identity card và hire date có thể ảnh hưởng đến stats
        await fetchManagerStats();
      }
    } catch (e: any) {
      const msg = e?.response?.message || e?.message || 'Update failed';
      toast.error(msg);
    }
  };

  const refreshManagersLight = async () => {
    try {
      await fetchManagers();
      await fetchManagerStats();
    } catch {}
  };

  const handleDeleteManager = async (manager: UserResponseDto) => {
    try {
      setDeletingLoading(true);
      const resp = await managerService.deleteManager(manager.user_id);
      if ((resp as any)?.code === 202) {
        toast.success('Delete requested. Saga in progress...');
        setTimeout(refreshManagersLight, 3000);
        setTimeout(refreshManagersLight, 8000);
        setDeletingLoading(false);
        setIsDeleting(false);
        setDeletingManager(null);
        return;
      }
      if ((resp as any)?.code && (resp as any).code !== 1000 && (resp as any).code !== 200) {
        throw new Error((resp as any).message || 'Delete manager failed');
      }

      setManagers(prevManagers => prevManagers.filter(m => m.user_id !== manager.user_id));
      setTotal(prevTotal => prevTotal - 1);
      setTotalManagers(prevTotal => prevTotal - 1);
      if (manager.branch) {
        setWithBranchCount(prev => prev - 1);
      } else {
        setWithoutBranchCount(prev => prev - 1);
      }
      toast.success('Manager deleted successfully');
      setDeletingLoading(false);
      setIsDeleting(false);
      setDeletingManager(null);
    } catch (e: any) {
      const msg = e?.response?.message || e?.message || 'Failed to delete manager';
      toast.error(msg);
      await refreshManagersLight();
      setDeletingLoading(false);
      setIsDeleting(false);
      setDeletingManager(null);
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
  }, [managers, size, page]);

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
  }, [managers, size, page]);


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
                onClick={fetchManagers}
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
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Manager Management</h1>
              <p className="mt-1 text-sm text-gray-500">Manage branch managers information</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={fetchManagers}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                Refresh
              </button>
              <button
                onClick={openCreateModal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Manager
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total managers</dt>
                  <dd className="text-lg font-medium text-gray-900">{totalManagers}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">With branch</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {withBranchCount}
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
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Without branch</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {withoutBranchCount}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Manager List */}
      <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Managers</h2>
          
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hire date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {managers.map((manager) => (
                  <tr key={manager.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {manager.user_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {manager.fullname}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editing && editing.id === manager.user_id && editing.field === 'email' ? (
                        <div className="flex items-center gap-2">
                          <input className="border rounded px-2 py-1 text-sm" value={editValue} onChange={(e) => setEditValue(e.target.value)} />
                          <button onClick={() => saveInlineEdit(manager)} className="text-emerald-600 hover:text-emerald-700" title="Save"><Check className="w-4 h-4" /></button>
                          <button onClick={cancelInlineEdit} className="text-gray-500 hover:text-gray-700" title="Cancel"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>{manager.email}</span>
                          <button onClick={() => startInlineEdit(manager, 'email')} className="text-blue-600 hover:text-blue-700" title="Edit email"><Pencil className="w-4 h-4" /></button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {manager.phoneNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editing && editing.id === manager.user_id && editing.field === 'identityCard' ? (
                        <div className="flex items-center gap-2">
                          <input className="border rounded px-2 py-1 text-sm" value={editValue} onChange={(e) => setEditValue(e.target.value.replace(/\D/g, ''))} />
                          <button onClick={() => saveInlineEdit(manager)} className="text-emerald-600 hover:text-emerald-700" title="Save"><Check className="w-4 h-4" /></button>
                          <button onClick={cancelInlineEdit} className="text-gray-500 hover:text-gray-700" title="Cancel"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>{manager.identityCard ?? '-'}</span>
                          <button onClick={() => startInlineEdit(manager, 'identityCard')} className="text-blue-600 hover:text-blue-700" title="Edit ID card"><Pencil className="w-4 h-4" /></button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {manager.branch ? (
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium text-gray-900">{manager.branch.name}</div>
                            <div className="text-gray-500">{manager.branch.address}</div>
                            <div className="text-gray-500">{manager.branch.phone}</div>
                          </div>
                          <button
                            className="p-2 rounded hover:bg-gray-100 text-red-600"
                            title="Unassign branch from this manager"
                            onClick={() => openUnassignModal(manager)}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-600 font-medium">No branch</span>
                          <button
                            className="p-2 rounded hover:bg-gray-100 text-emerald-600"
                            title="Assign this manager to a branch"
                            onClick={() => openAssignModal(manager)}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editing && editing.id === manager.user_id && editing.field === 'hireDate' ? (
                        <div className="flex items-center gap-2">
                          <input type="date" className="border rounded px-2 py-1 text-sm" value={editValue} onChange={(e) => setEditValue(e.target.value)} />
                          <button onClick={() => saveInlineEdit(manager)} className="text-emerald-600 hover:text-emerald-700" title="Save"><Check className="w-4 h-4" /></button>
                          <button onClick={cancelInlineEdit} className="text-gray-500 hover:text-gray-700" title="Cancel"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>{manager.hireDate ? new Date(manager.hireDate).toLocaleDateString('en-GB') : '-'}</span>
                          <button onClick={() => startInlineEdit(manager, 'hireDate')} className="text-blue-600 hover:text-blue-700" title="Edit hire date"><Pencil className="w-4 h-4" /></button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setDeletingManager(manager); setIsDeleting(true); }}
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

          {managers.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No managers</h3>
              <p className="mt-1 text-sm text-gray-500">There are no managers in the system.</p>
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
      <CreateManagerModal
        open={isCreating}
        branches={unassignedBranches}
        loadingBranches={loadingBranches}
        onClose={() => setIsCreating(false)}
        onSubmit={async (payload) => {
          try {
            const resp = await managerService.createManager(payload);
            if ((resp as any).code === 400) {
              toast.error((resp as any).message || 'Failed to create manager');
              return;
            }
            toast.success('Manager created successfully');
            setIsCreating(false);
            
            // Lấy thông tin đầy đủ của manager mới tạo
            const userId = resp.result?.userId || resp.result?.user_id || resp.userId || resp.user_id;
            if (userId) {
              try {
                const fullManagerInfo = await managerService.getManagerProfile(userId);
                setManagers(prevManagers => [fullManagerInfo, ...prevManagers]);
                setTotal(prevTotal => prevTotal + 1);
                setTotalManagers(prevTotal => prevTotal + 1);
                
                // Cập nhật stats dựa trên branch assignment
                if (payload.branchId && payload.branchId !== -1) {
                  setWithBranchCount(prev => prev + 1);
                } else {
                  setWithoutBranchCount(prev => prev + 1);
                }
              } catch (fetchError) {
                console.error('Failed to fetch manager details:', fetchError);
                // Fallback: reload toàn bộ danh sách nếu không lấy được thông tin
                await fetchManagers();
                await fetchManagerStats();
              }
            } else {
              // Fallback nếu không có userId
              await fetchManagers();
              await fetchManagerStats();
            }
          } catch (e: any) {
            const msg = e?.response?.message || e?.message || 'Failed to create manager';
            toast.error(msg);
          }
        }}
      />
      <AssignBranchModal
        open={isAssigning}
        managerName={assigningManager?.fullname || ''}
        branches={unassignedBranches}
        loadingBranches={loadingBranches}
        onClose={() => {
          setIsAssigning(false);
          setAssigningManager(null);
        }}
        onSubmit={async (branchId) => {
          if (!assigningManager) return;
          try {
            await managerService.assignManagerToBranch(assigningManager.user_id, branchId);
            
            // Optimistic update - cập nhật local state
            const selectedBranch = unassignedBranches.find(b => b.branchId === branchId);
            if (selectedBranch) {
              setManagers(prevManagers => 
                prevManagers.map(m => 
                  m.user_id === assigningManager.user_id 
                    ? { ...m, branch: selectedBranch }
                    : m
                )
              );
              
              // Cập nhật stats
              setWithBranchCount(prev => prev + 1);
              setWithoutBranchCount(prev => prev - 1);
            }
            
            toast.success('Branch assigned successfully');
            setIsAssigning(false);
            setAssigningManager(null);
          } catch (e: any) {
            const msg = e?.response?.message || e?.message || 'Failed to assign branch';
            toast.error(msg);
            // Rollback nếu có lỗi
            await fetchManagers();
            await fetchManagerStats();
          }
        }}
      />
      <ConfirmModal
        open={isUnassigning}
        title="Unassign Branch"
        description={`Are you sure you want to unassign ${unassigningManager?.branch?.name} from ${unassigningManager?.fullname}?`}
        confirmText="Unassign"
        cancelText="Cancel"
        onConfirm={handleUnassignManager}
        onCancel={handleCancelUnassign}
      />
      <ConfirmModal
        open={isDeleting}
        title="Delete Manager"
        description={`Are you sure you want to delete manager ${deletingManager?.fullname}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => { if (deletingManager) { void handleDeleteManager(deletingManager); } }}
        onCancel={() => { setIsDeleting(false); setDeletingManager(null); }}
        loading={deletingLoading}
      />
    </div>
  );
};

export default ManagerManagement;
