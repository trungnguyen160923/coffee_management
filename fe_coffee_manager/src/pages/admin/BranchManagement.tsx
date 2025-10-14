import React, { useEffect, useMemo, useRef, useState } from 'react';
import { apiClient, branchService } from '../../services';
import { Branch } from '../../types';
import { API_ENDPOINTS } from '../../config/constants';
import { Pencil, Check, X, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../../components/common/modal/ConfirmModal';
import CreateBranchModal from '../../components/common/modal/CreateBranchModal';

const BranchManagement: React.FC = () => {
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [editing, setEditing] = useState<{ id: number; field: 'name' | 'address' | 'phone' | 'openHours' | 'endHours' | 'businessHours' } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Branch | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const bottomScrollRef = useRef<HTMLDivElement | null>(null);
  const tableRef = useRef<HTMLTableElement | null>(null);
  const topInnerRef = useRef<HTMLDivElement | null>(null);
  const syncingRef = useRef(false);

  const branches = useMemo(() => {
    const start = page * limit;
    const end = start + limit;
    return allBranches.slice(start, end);
  }, [allBranches, page, limit]);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      setError(null);
      // Server-side pagination endpoint
      const qs = `?page=${page}&size=${limit}`;
      const resp = await apiClient.get<{ code: number; result: { data: Branch[]; total: number; page: number; size: number; totalPages: number } }>(`${API_ENDPOINTS.BRANCHES.BASE}/paged${qs}`);
      const payload = resp?.result;
      setAllBranches(payload?.data || []);
      setTotal(payload?.total || 0);
      setTotalPages(payload?.totalPages || 1);
    } catch (e) {
      console.error(e);
      const err: any = e as any;
      const msg = err?.response?.message || err?.message || 'Failed to load branches';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  function toHHmmss(value?: string | null): string | undefined {
    if (!value) return undefined;
    // normalize "09:00" -> "09:00:00"
    if (/^\d{2}:\d{2}$/.test(value)) return `${value}:00`;
    return value;
  }

  const startEdit = (b: Branch, field: 'name' | 'address' | 'phone' | 'businessHours' | 'openHours' | 'endHours') => {
    setEditing({ id: b.branchId, field });
    if (field === 'businessHours') {
      setEditValue(`${String(b.openHours).slice(0,5)} - ${String(b.endHours).slice(0,5)}`);
    } else {
      setEditValue(String((b as any)[field] ?? ''));
    }
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditValue('');
  };

  const saveEdit = async (b: Branch) => {
    if (!editing) return;
    
    let payload: any = {
      name: editing.field === 'name' ? editValue : b.name,
      address: editing.field === 'address' ? editValue : b.address,
      phone: editing.field === 'phone' ? editValue : b.phone,
      managerUserId: (b as any).managerUserId ?? undefined,
      openHours: toHHmmss((b as any).openHours),
      endHours: toHHmmss((b as any).endHours),
    };

    // Handle business hours editing
    if (editing.field === 'businessHours') {
      const [openTime, endTime] = editValue.split(' - ');
      if (openTime && endTime) {
        payload.openHours = toHHmmss(openTime);
        payload.endHours = toHHmmss(endTime);
      }
    } else if (editing.field === 'openHours') {
      payload.openHours = toHHmmss(editValue);
    } else if (editing.field === 'endHours') {
      payload.endHours = toHHmmss(editValue);
    }

    try {
      await branchService.updateBranch(String(b.branchId), payload);
      
      // Cập nhật local state thay vì reload toàn bộ
      setAllBranches(prevBranches => 
        prevBranches.map(branch => 
          branch.branchId === b.branchId 
            ? { 
                ...branch, 
                [editing.field]: editValue,
                // Cập nhật thời gian update
                updateAt: new Date().toISOString()
              }
            : branch
        )
      );
      
      cancelEdit();
      toast.success('Branch updated successfully');
    } catch (e) {
      console.error(e);
      const err: any = e as any;
      const msg = err?.response?.message || err?.message || 'Failed to update branch';
      toast.error(msg);
    }
  };

  const deleteBranch = async () => {
    if (!pendingDelete) return;
    try {
      setDeleteLoading(true);
      await branchService.deleteBranch(String(pendingDelete.branchId));
      
      // Cập nhật local state thay vì reload toàn bộ
      setAllBranches(prevBranches => 
        prevBranches.filter(branch => branch.branchId !== pendingDelete.branchId)
      );
      
      setPendingDelete(null);
      toast.success('Branch deleted');
    } catch (e) {
      console.error(e);
      const err: any = e as any;
      const msg = err?.response?.message || err?.message || 'Failed to delete branch';
      toast.error(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  // Keep page within bounds when data or limit changes
  useEffect(() => {
    if (page >= totalPages) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [totalPages]);

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
  }, [allBranches, limit, page]);

  // Keep top scrollbar width in sync with table width (handles reload and data changes)
  useEffect(() => {
    const syncWidth = () => {
      if (topInnerRef.current && tableRef.current) {
        topInnerRef.current.style.width = tableRef.current.scrollWidth + 'px';
      }
    };
    // Initial sync after layout
    const raf = requestAnimationFrame(syncWidth);
    // Observe table size changes
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
  }, [allBranches, limit, page]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className="max-w-7xl mx-auto px-2 py-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white p-2 rounded-lg">
                  <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Branch Management</h1>
                  <p className="text-amber-100 mt-1">Manage branch locations</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCreating(true)}
                  className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="font-medium">Add Branch</span>
                </button>
                <button
                  onClick={fetchBranches}
                  className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
                  title="Refresh data"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="font-medium">Refresh</span>
                </button>
                <select
                  value={limit}
                  onChange={(e) => { setPage(0); setLimit(parseInt(e.target.value, 10)); }}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 rounded px-3 py-2 text-sm"
                >
                  {[10, 20, 50, 100].map((s) => (
                    <option key={s} value={s} className="text-gray-900">{s} / page</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* Statistics Cards */}
            <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900">Total Branches</h2>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-xl font-bold text-blue-600">{total}</div>
                    <div className="text-xs text-blue-800">Branches</div>
                  </div>
                </div>
              </div>

              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900">With Managers</h2>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-xl font-bold text-green-600">
                      {branches.filter(b => (b as any).managerUserId).length}
                    </div>
                    <div className="text-xs text-green-800">Have managers</div>
                  </div>
                </div>
              </div>

              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900">Actions</h2>
                    <button
                      onClick={() => setIsCreating(true)}
                      className="flex items-center space-x-1 text-sm bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Add New</span>
                    </button>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="text-xl font-bold text-purple-600">
                      {branches.filter(b => b.createAt && new Date(b.createAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
                    </div>
                    <div className="text-xs text-purple-800">Added in 30 days</div>
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
            ) : (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                {/* Top horizontal scrollbar */}
                <div ref={topScrollRef} className="overflow-x-auto overflow-y-hidden h-5 mb-2">
                  <div ref={topInnerRef} style={{ height: 1 }} />
                </div>

                <div ref={bottomScrollRef} className="overflow-x-auto">
                  <table ref={tableRef} className="min-w-max divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" rowSpan={2}>ID</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" rowSpan={2}>Name</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" rowSpan={2}>Address</th>
                          <th className="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" colSpan={2}>Business Hours</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" rowSpan={2}>Phone</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" rowSpan={2}>Created At</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" rowSpan={2}>Updated At</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" rowSpan={2}>Actions</th>
                        </tr>
                        <tr>
                          <th className="px-6 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Open Hours</th>
                          <th className="px-6 py-1 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">End Hours</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {branches.map((b) => (
                          <tr key={b.branchId} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{b.branchId}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              {editing && editing.id === b.branchId && editing.field === 'name' ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    className="border rounded px-2 py-1 text-sm"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                  />
                                  <button onClick={() => saveEdit(b)} className="text-emerald-600 hover:text-emerald-700"><Check className="w-4 h-4" /></button>
                                  <button onClick={cancelEdit} className="text-gray-500 hover:text-gray-700"><X className="w-4 h-4" /></button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span>{b.name}</span>
                                  <button onClick={() => startEdit(b, 'name')} className="text-blue-600 hover:text-blue-700"><Pencil className="w-4 h-4" /></button>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {editing && editing.id === b.branchId && editing.field === 'address' ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    className="border rounded px-2 py-1 text-sm w-64"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                  />
                                  <button onClick={() => saveEdit(b)} className="text-emerald-600 hover:text-emerald-700"><Check className="w-4 h-4" /></button>
                                  <button onClick={cancelEdit} className="text-gray-500 hover:text-gray-700"><X className="w-4 h-4" /></button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span>{b.address}</span>
                                  <button onClick={() => startEdit(b, 'address')} className="text-blue-600 hover:text-blue-700"><Pencil className="w-4 h-4" /></button>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {editing && editing.id === b.branchId && editing.field === 'openHours' ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="time"
                                    className="border rounded px-2 py-1 text-sm"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                  />
                                  <button onClick={() => saveEdit(b)} className="text-emerald-600 hover:text-emerald-700"><Check className="w-4 h-4" /></button>
                                  <button onClick={cancelEdit} className="text-gray-500 hover:text-gray-700"><X className="w-4 h-4" /></button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span>{b.openHours ? String(b.openHours).slice(0,5) : '--:--'}</span>
                                  <button onClick={() => startEdit(b, 'openHours')} className="text-blue-600 hover:text-blue-700"><Pencil className="w-4 h-4" /></button>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {editing && editing.id === b.branchId && editing.field === 'endHours' ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="time"
                                    className="border rounded px-2 py-1 text-sm"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                  />
                                  <button onClick={() => saveEdit(b)} className="text-emerald-600 hover:text-emerald-700"><Check className="w-4 h-4" /></button>
                                  <button onClick={cancelEdit} className="text-gray-500 hover:text-gray-700"><X className="w-4 h-4" /></button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span>{b.endHours ? String(b.endHours).slice(0,5) : '--:--'}</span>
                                  <button onClick={() => startEdit(b, 'endHours')} className="text-blue-600 hover:text-blue-700"><Pencil className="w-4 h-4" /></button>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {editing && editing.id === b.branchId && editing.field === 'phone' ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    className="border rounded px-2 py-1 text-sm"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                  />
                                  <button onClick={() => saveEdit(b)} className="text-emerald-600 hover:text-emerald-700"><Check className="w-4 h-4" /></button>
                                  <button onClick={cancelEdit} className="text-gray-500 hover:text-gray-700"><X className="w-4 h-4" /></button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span>{b.phone}</span>
                                  <button onClick={() => startEdit(b, 'phone')} className="text-blue-600 hover:text-blue-700"><Pencil className="w-4 h-4" /></button>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{b.createAt ? new Date(b.createAt).toLocaleString('en-GB') : '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{b.updateAt ? new Date(b.updateAt).toLocaleString('en-GB') : '-'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <button onClick={() => setPendingDelete(b)} className="inline-flex items-center gap-1 text-red-600 hover:text-red-700">
                                <Trash2 className="w-4 h-4" />
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <ConfirmModal
                    open={!!pendingDelete}
                    title="Confirm deletion"
                    description={pendingDelete ? `Are you sure you want to delete branch "${pendingDelete.name}"? This action cannot be undone.` : ''}
                    confirmText="Delete"
                    cancelText="Cancel"
                    onCancel={() => setPendingDelete(null)}
                    onConfirm={deleteBranch}
                    loading={deleteLoading}
                  />

                  {/* Pagination */}
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
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateBranchModal
        open={isCreating}
        onClose={() => { setIsCreating(false); }}
        onSubmit={async (payload) => {
          try {
            await branchService.createBranch(payload);
            setIsCreating(false);
            
            // Refresh the data to get the latest state from server
            await fetchBranches();
            
            toast.success('Branch created successfully');
          } catch (e) {
            console.error(e);
            const err: any = e as any;
            const msg = err?.response?.message || err?.message || 'Failed to create branch';
            toast.error(msg);
          }
        }}
      />
    </div>
  );
};

export default BranchManagement;