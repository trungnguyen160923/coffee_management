import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient, branchService, branchClosureService } from '../../services';
import { Branch } from '../../types';
import { API_ENDPOINTS } from '../../config/constants';
import { Eye, Pencil, Trash2, Settings } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ConfirmModal from '../../components/common/modal/ConfirmModal';
import CreateBranchModal from '../../components/common/modal/CreateBranchModal';
import BranchDetailModal from '../../components/common/modal/BranchDetailModal';
import BranchClosureModal, { BranchClosureFormValues } from '../../components/common/modal/BranchClosureModal';
import BranchClosureDetailModal from '../../components/common/modal/BranchClosureDetailModal';
import AllClosuresModal from '../../components/common/modal/AllClosuresModal';
import type { BranchClosure } from '../../services/branchClosureService';
import { BranchManagementSkeleton } from '../../components/admin/skeletons';

const BranchManagement: React.FC = () => {
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [viewBranch, setViewBranch] = useState<Branch | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Branch | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [allClosures, setAllClosures] = useState<BranchClosure[]>([]);
  const [loadingClosures, setLoadingClosures] = useState(false);
  const [closureModalOpen, setClosureModalOpen] = useState(false);
  const [editClosure, setEditClosure] = useState<BranchClosure | null>(null);
  const [viewClosure, setViewClosure] = useState<BranchClosure[] | null>(null);
  const [allClosuresModalOpen, setAllClosuresModalOpen] = useState(false);
  const [highlightedGroupKey, setHighlightedGroupKey] = useState<string | null>(null);
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
      // Delay to show skeleton (for demo purposes)
      await new Promise(resolve => setTimeout(resolve, 2500));
      
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

  const parseOpenDays = (openDays?: string | null): number[] => {
    if (!openDays || !openDays.trim()) return [1, 2, 3, 4, 5, 6, 7];
    const parts = openDays.split(',').map((p) => parseInt(p.trim(), 10));
    return Array.from(new Set(parts.filter((d) => d >= 1 && d <= 7))).sort((a, b) => a - b);
  };

  const dayLabels: Record<number, string> = {
    1: 'Mon',
    2: 'Tue',
    3: 'Wed',
    4: 'Thu',
    5: 'Fri',
    6: 'Sat',
    7: 'Sun',
  };

  const formatDateDisplay = (isoDate: string): string => {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return isoDate;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  // Group closures by startDate, endDate, and reason
  const groupedClosures = useMemo(() => {
    const groups = new Map<string, BranchClosure[]>();
    
    allClosures.forEach((closure) => {
      const key = `${closure.startDate}|${closure.endDate}|${closure.reason || ''}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(closure);
    });

    // Convert to array and sort by latest updateAt/createAt
    return Array.from(groups.values())
      .map((group) => {
        // Sort group by updateAt (newest first), then createAt
        group.sort((a, b) => {
          const aTime = new Date(b.updateAt || b.createAt).getTime();
          const bTime = new Date(a.updateAt || a.createAt).getTime();
          return aTime - bTime;
        });
        return group;
      })
      .sort((a, b) => {
        // Sort groups by latest updateAt/createAt (newest first)
        const aLatest = new Date(a[0].updateAt || a[0].createAt).getTime();
        const bLatest = new Date(b[0].updateAt || b[0].createAt).getTime();
        return bLatest - aLatest;
      });
  }, [allClosures]);


  const fetchClosures = useCallback(async () => {
    try {
      setLoadingClosures(true);
      const result = await branchClosureService.list();
      setAllClosures(result || []);
    } catch (e) {
      console.error(e);
      const err: any = e as any;
      const msg = err?.response?.message || err?.message || 'Failed to load branch closures';
      toast.error(msg);
    } finally {
      setLoadingClosures(false);
    }
  }, []);

  const fetchClosuresWithFilter = useCallback(async (from?: string, to?: string) => {
    try {
      setLoadingClosures(true);
      const params: { from?: string; to?: string } = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const result = await branchClosureService.list(params);
      setAllClosures(result || []);
    } catch (e) {
      console.error(e);
      const err: any = e as any;
      const msg = err?.response?.message || err?.message || 'Failed to load branch closures';
      toast.error(msg);
    } finally {
      setLoadingClosures(false);
    }
  }, []);

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
    fetchClosures();
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
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-2 py-4 sm:px-4 lg:px-4">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-8 pt-6 pb-2">
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Branch Management</h1>
              <p className="text-sm text-slate-500">Manage branch locations</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center space-x-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Add Branch</span>
              </button>
              <button
                onClick={() => {
                  fetchBranches();
                  fetchClosures();
                }}
                className="flex items-center space-x-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-sky-300 hover:text-sky-700 hover:bg-sky-50"
                title="Refresh data"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </button>
              <select
                value={limit}
                onChange={(e) => { setPage(0); setLimit(parseInt(e.target.value, 10)); }}
                className="rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-300"
              >
                {[10, 20, 50, 100].map((s) => (
                  <option key={s} value={s}>{s} / page</option>
                ))}
              </select>
            </div>
          </div>

          <div className="p-8 pt-4">
            {/* Statistics Cards */}
            <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900">Total Branches</h2>
                  </div>
                  {loading ? (
                    <div className="animate-pulse">
                      <div className="bg-slate-200 rounded-lg p-3 h-16"></div>
                    </div>
                  ) : (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-xl font-bold text-blue-600">{total}</div>
                      <div className="text-xs text-blue-800">Branches</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900">With Managers</h2>
                  </div>
                  {loading ? (
                    <div className="animate-pulse">
                      <div className="bg-slate-200 rounded-lg p-3 h-16"></div>
                    </div>
                  ) : (
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-xl font-bold text-green-600">
                        {branches.filter(b => (b as any).managerUserId).length}
                      </div>
                      <div className="text-xs text-green-800">Have managers</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-medium text-gray-900">Branch closures</h2>
                    <button
                      onClick={() => setClosureModalOpen(true)}
                      className="flex items-center space-x-1 text-sm bg-sky-500 text-white px-3 py-1.5 rounded-lg hover:bg-sky-600 transition-colors"
                      disabled={loadingClosures}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Add closure</span>
                    </button>
                  </div>
                  {loadingClosures ? (
                    <div className="animate-pulse">
                      <div className="bg-slate-200 rounded-lg p-3 h-16 mb-2"></div>
                      <div className="space-y-2">
                        {[...Array(2)].map((_, idx) => (
                          <div key={idx} className="h-8 bg-slate-200 rounded"></div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-purple-50 rounded-lg p-3">
                      {groupedClosures.length === 0 ? (
                      <div className="text-xs text-purple-500 py-2">No closures configured</div>
                    ) : (
                      <>
                        <ul className="space-y-2">
                          {groupedClosures.slice(0, 2).map((group, idx) => {
                            const first = group[0];
                            const isSingleDay = first.startDate === first.endDate;
                            const isAllBranches = first.branchId === null;
                            const branchCount = group.length;

                            return (
                              <li
                                key={`${first.startDate}-${first.endDate}-${first.reason || ''}-${idx}`}
                                className="flex items-center justify-between gap-2 bg-white rounded-lg px-3 py-2.5 shadow-sm"
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-purple-700 text-sm mb-1">
                                    {isSingleDay
                                      ? formatDateDisplay(first.startDate)
                                      : `${formatDateDisplay(first.startDate)} → ${formatDateDisplay(first.endDate)}`}
                                  </div>
                                  <div className="text-xs text-purple-600 mb-0.5">
                                    {isAllBranches ? 'All branches' : `${branchCount} ${branchCount === 1 ? 'branch' : 'branches'}`}
                                  </div>
                                  {first.reason && (
                                    <div className="text-xs text-purple-500 truncate" title={first.reason}>
                                      {first.reason}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button
                                    type="button"
                                    className="inline-flex items-center justify-center h-7 w-7 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                                    title="View details"
                                    onClick={() => setViewClosure(group)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    className="inline-flex items-center justify-center h-7 w-7 rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                    title="Manage closure"
                                    onClick={() => {
                                      const groupKey = `${first.startDate}|${first.endDate}|${first.reason || ''}`;
                                      setHighlightedGroupKey(groupKey);
                                      setAllClosuresModalOpen(true);
                                    }}
                                  >
                                    <Settings className="w-4 h-4" />
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                        {groupedClosures.length > 2 && (
                          <div className="mt-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setHighlightedGroupKey(null);
                                setAllClosuresModalOpen(true);
                              }}
                              className="text-xs text-purple-600 hover:text-purple-800 font-medium underline"
                            >
                              View all {groupedClosures.length} closure groups
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  )}
                </div>
              </div>
            </div>

            {loading ? (
              <BranchManagementSkeleton />
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
                          <th className="px-6 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" colSpan={2}>Business Hours</th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" rowSpan={2}>Open Days</th>
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
                              {b.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {b.openHours ? String(b.openHours).slice(0, 5) : '--:--'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {b.endHours ? String(b.endHours).slice(0, 5) : '--:--'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex flex-wrap gap-1 justify-center">
                                {[1, 2, 3, 4, 5, 6, 7].map((d) => {
                                  const active = parseOpenDays((b as any).openDays).includes(d);
                                  return (
                                    <span
                                      key={d}
                                      className={
                                        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border ' +
                                        (active
                                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                          : 'bg-slate-50 border-slate-200 text-slate-300 line-through')
                                      }
                                    >
                                      {dayLabels[d] ?? d}
                                    </span>
                                  );
                                })}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center justify-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => setViewBranch(b)}
                                  className="text-slate-500 hover:text-slate-800"
                                  title="View details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditBranch(b)}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="Edit branch"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  type= "button"
                                  onClick={() => setPendingDelete(b)}
                                  className="text-red-600 hover:text-red-700"
                                  title="Delete branch"
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
        mode="create"
        onClose={() => { setIsCreating(false); }}
        onSubmit={async (payload) => {
          try {
            await branchService.createBranch(payload);
            setIsCreating(false);
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

      <CreateBranchModal
        open={!!editBranch}
        mode="edit"
        initialData={
          editBranch
            ? {
                name: editBranch.name,
                address: editBranch.address,
                phone: editBranch.phone,
                openHours: editBranch.openHours ? String(editBranch.openHours).slice(0, 5) : '08:00',
                endHours: editBranch.endHours ? String(editBranch.endHours).slice(0, 5) : '22:00',
                openDays: (editBranch as any).openDays ?? '1,2,3,4,5,6,7',
              }
            : undefined
        }
        onClose={() => { setEditBranch(null); }}
        onSubmit={async (payload) => {
          if (!editBranch) return;
          try {
            await branchService.updateBranch(String(editBranch.branchId), {
              name: payload.name,
              address: payload.address,
              phone: payload.phone,
              openHours: toHHmmss(payload.openHours),
              endHours: toHHmmss(payload.endHours),
              openDays: payload.openDays,
            });
            setEditBranch(null);
            await fetchBranches();
            toast.success('Branch updated successfully');
          } catch (e) {
            console.error(e);
            const err: any = e as any;
            const msg = err?.response?.message || err?.message || 'Failed to update branch';
            toast.error(msg);
          }
        }}
      />

      <BranchDetailModal
        open={!!viewBranch}
        branch={viewBranch}
        onClose={() => setViewBranch(null)}
      />

      <BranchClosureModal
        open={closureModalOpen}
        branches={allBranches}
        defaultBranchId={null}
        mode="create"
        onClose={() => setClosureModalOpen(false)}
        onSubmit={async (values: BranchClosureFormValues) => {
          try {
            const created: BranchClosure[] = [];
            if (values.isGlobal || !values.branchIds.length) {
              const c = await branchClosureService.create({
                branchId: null,
                startDate: values.startDate,
                endDate: values.endDate || values.startDate,
                reason: values.reason || undefined,
              });
              created.push(c);
            } else {
              for (const id of values.branchIds) {
                const c = await branchClosureService.create({
                  branchId: id,
                  startDate: values.startDate,
                  endDate: values.endDate || values.startDate,
                  reason: values.reason || undefined,
                });
                created.push(c);
              }
            }
            setAllClosures((prev) => [...created, ...prev]);
            setClosureModalOpen(false);
            toast.success('Branch closure created');
          } catch (e) {
            console.error(e);
            const err: any = e as any;
            const msg =
              err?.response?.message || err?.message || 'Failed to create branch closure';
            toast.error(msg);
          }
        }}
      />

      <BranchClosureModal
        open={!!editClosure}
        branches={allBranches}
        defaultBranchId={null}
        mode="edit"
        initialValues={
          editClosure
            ? {
                isGlobal: editClosure.branchId == null,
                isMultiDay: editClosure.startDate !== editClosure.endDate,
                branchIds: editClosure.branchId != null ? [editClosure.branchId] : [],
                startDate: editClosure.startDate,
                endDate: editClosure.endDate,
                reason: editClosure.reason || '',
              }
            : undefined
        }
        onClose={() => setEditClosure(null)}
        onSubmit={async (values: BranchClosureFormValues) => {
          if (!editClosure) return;
          try {
            const updated = await branchClosureService.update(editClosure.id, {
              branchId:
                values.isGlobal || !values.branchIds.length
                  ? null
                  : values.branchIds[0],
              startDate: values.startDate,
              endDate: values.endDate || values.startDate,
              reason: values.reason || undefined,
            });
            setAllClosures((prev) =>
              prev.map((c: BranchClosure) => (c.id === updated.id ? updated : c))
            );
            setEditClosure(null);
            toast.success('Branch closure updated');
          } catch (e) {
            console.error(e);
            const err: any = e as any;
            const msg =
              err?.response?.message || err?.message || 'Failed to update branch closure';
            toast.error(msg);
          }
        }}
      />

      <BranchClosureDetailModal
        open={!!viewClosure}
        closures={viewClosure}
        branches={allBranches}
        onClose={() => setViewClosure(null)}
      />

      <AllClosuresModal
        open={allClosuresModalOpen}
        groupedClosures={groupedClosures}
        branches={allBranches}
        highlightedGroupKey={highlightedGroupKey}
        onClose={() => {
          setAllClosuresModalOpen(false);
          setHighlightedGroupKey(null);
        }}
        onRefresh={fetchClosures}
        fetchClosuresWithFilter={fetchClosuresWithFilter}
      />
    </div>
  );
};

export default BranchManagement;