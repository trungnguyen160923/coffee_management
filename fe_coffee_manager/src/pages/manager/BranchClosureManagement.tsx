import React, { useEffect, useMemo, useState } from 'react';
import { branchClosureService, branchService } from '../../services';
import { Branch } from '../../types';
import { Pencil, Trash2, Plus, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import BranchClosureModal, { BranchClosureFormValues } from '../../components/common/modal/BranchClosureModal';
import ConfirmModal from '../../components/common/modal/ConfirmModal';
import type { BranchClosure } from '../../services/branchClosureService';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subWeeks, format, parseISO } from 'date-fns';
import { BranchClosuresSkeleton } from '../../components/manager/skeletons';

type FilterPeriod = 'week' | 'select-month' | 'select-year' | 'all';

const BranchClosureManagement: React.FC = () => {
  const { managerBranch, user } = useAuth();
  const [allClosures, setAllClosures] = useState<BranchClosure[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editClosure, setEditClosure] = useState<BranchClosure[] | null>(null);
  const [deleteGroup, setDeleteGroup] = useState<BranchClosure[] | null>(null);
  const [closureModalOpen, setClosureModalOpen] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [selectedYear, setSelectedYear] = useState<string>(format(new Date(), 'yyyy'));
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());

  const formatDateDisplay = (isoDate: string): string => {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return isoDate;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const getGroupKey = (group: BranchClosure[]): string => {
    const first = group[0];
    return `${first.startDate}|${first.endDate}|${first.reason || ''}`;
  };

  const getBranchName = (branchId: number | null): string => {
    if (branchId == null) return 'All branches';
    const branch = branches.find((b) => b.branchId === branchId);
    return branch ? branch.name : `Branch #${branchId}`;
  };

  // Check if a date is in the future (not past, not today)
  const isFutureDate = (dateStr: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    return date > today;
  };

  // Check if all closures in group can be deleted (all start dates must be in future)
  const canDeleteGroup = (group: BranchClosure[]): boolean => {
    return group.every((c) => isFutureDate(c.startDate));
  };

  // Check if manager can edit/delete this closure group
  // Manager can only edit/delete closures they created (userId matches) AND
  // the closure must be for their branch or global closures
  const canManageGroup = (group: BranchClosure[]): boolean => {
    if (!user?.id) {
      return false;
    }
    const currentUserId = Number(user.id);
    
    // Manager can only manage closures they created
    const allCreatedByManager = group.every((c) => c.userId === currentUserId);
    if (!allCreatedByManager) {
      return false;
    }
    
    // Additionally, closures must be for their branch or global
    if (!managerBranch?.branchId) {
      // Manager without branch can only manage global closures they created
      return group.every((c) => c.branchId === null);
    }
    // Manager can manage closures for their branch or global closures (that they created)
    return group.every((c) => c.branchId === null || c.branchId === managerBranch.branchId);
  };

  // Calculate date range based on filter period
  const getDateRange = (period: FilterPeriod): { start: Date; end: Date } | null => {
    switch (period) {
      case 'week': {
        const start = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
        const end = endOfWeek(currentWeek, { weekStartsOn: 1 });
        return { start, end };
      }
      case 'select-month': {
        const monthDate = parseISO(`${selectedMonth}-01`);
        const start = startOfMonth(monthDate);
        const end = endOfMonth(monthDate);
        return { start, end };
      }
      case 'select-year': {
        const yearDate = parseISO(`${selectedYear}-01-01`);
        const start = startOfYear(yearDate);
        const end = endOfYear(yearDate);
        return { start, end };
      }
      case 'all':
      default:
        return null;
    }
  };

  // Filter closures based on overlap with selected period
  const closures = useMemo(() => {
    if (filterPeriod === 'all') {
      return allClosures;
    }
    
    const dateRange = getDateRange(filterPeriod);
    if (!dateRange) {
      return allClosures;
    }

    return allClosures.filter((closure) => {
      const closureStart = parseISO(closure.startDate);
      const closureEnd = parseISO(closure.endDate);
      
      // Check if closure overlaps with the selected period
      // Closure overlaps if: closureStart <= rangeEnd && closureEnd >= rangeStart
      return closureStart <= dateRange.end && closureEnd >= dateRange.start;
    });
  }, [allClosures, filterPeriod, selectedMonth, selectedYear, currentWeek]);

  // Group closures by startDate, endDate, and reason
  // Note: Backend already filters closures for manager (their branch + global)
  const groupedClosures = useMemo(() => {
    const groups = new Map<string, BranchClosure[]>();
    
    closures.forEach((closure) => {
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
  }, [closures]);

  const fetchClosures = async () => {
    try {
      setLoading(true);
      const params: { branchId?: number } = {};
      
      if (managerBranch?.branchId) {
        params.branchId = managerBranch.branchId;
      }
      
      const result = await branchClosureService.list(params);
      
      setAllClosures(result || []);
    } catch (e) {
      console.error(e);
      const err: any = e as any;
      const msg = err?.response?.message || err?.message || 'Failed to load branch closures';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async () => {
    try {
      // Manager only needs their own branch and "All branches" option
      if (managerBranch) {
        setBranches([managerBranch]);
      } else {
        const result = await branchService.getBranches({ limit: 1000 });
        setBranches(result.branches || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchClosures();
  }, []);

  const handleDeleteGroup = async () => {
    if (!deleteGroup) return;

    try {
      await branchClosureService.removeGroup({
        closureIds: deleteGroup.map((c) => c.id),
      });
      toast.success(`${deleteGroup.length} closure(s) deleted`);
      setDeleteGroup(null);
      fetchClosures();
    } catch (e) {
      console.error(e);
      const err: any = e as any;
      const msg = err?.response?.data?.message || err?.response?.message || err?.message || 'Failed to delete closure';
      toast.error(msg);
    }
  };

  if (loading) {
    return <BranchClosuresSkeleton />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Branch Closures Management</h1>
              <p className="text-sm text-slate-500 mt-1">
                Manage branch closures ({groupedClosures.length} groups)
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filterPeriod}
                onChange={(e) => {
                  const newPeriod = e.target.value as FilterPeriod;
                  setFilterPeriod(newPeriod);
                  if (newPeriod === 'week') {
                    setCurrentWeek(new Date());
                  }
                }}
                className="text-sm border border-slate-300 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="all">All</option>
                <option value="week">Week</option>
                <option value="select-month">Select Month</option>
                <option value="select-year">Select Year</option>
              </select>
              {filterPeriod === 'week' && (() => {
                const weekRange = getDateRange(filterPeriod);
                if (!weekRange) return null;
                return (
                  <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
                      className="text-slate-700 hover:text-slate-900 transition-colors p-1 hover:bg-slate-200 rounded"
                      title="Previous week"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={format(weekRange.start, 'yyyy-MM-dd')}
                        onChange={(e) => {
                          if (e.target.value) {
                            setCurrentWeek(parseISO(e.target.value));
                          }
                        }}
                        className="text-sm border border-slate-300 text-slate-700 px-2 py-1 rounded bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                        title="From date"
                      />
                      <span className="text-slate-500">-</span>
                      <input
                        type="date"
                        value={format(weekRange.end, 'yyyy-MM-dd')}
                        onChange={(e) => {
                          if (e.target.value) {
                            // Calculate the week that contains this date
                            const selectedDate = parseISO(e.target.value);
                            setCurrentWeek(selectedDate);
                          }
                        }}
                        className="text-sm border border-slate-300 text-slate-700 px-2 py-1 rounded bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                        title="To date"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentWeek(subWeeks(currentWeek, -1))}
                      className="text-slate-700 hover:text-slate-900 transition-colors p-1 hover:bg-slate-200 rounded"
                      title="Next week"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })()}
              {filterPeriod === 'select-month' && (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="text-sm border border-slate-300 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              )}
              {filterPeriod === 'select-year' && (
                <input
                  type="number"
                  min="2020"
                  max="2100"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="text-sm border border-slate-300 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 w-24"
                  placeholder="Year"
                />
              )}
              <button
                type="button"
                onClick={fetchClosures}
                disabled={loading}
                className="flex items-center gap-1.5 text-sm border border-slate-300 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh closures list"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                type="button"
                onClick={() => setClosureModalOpen(true)}
                className="flex items-center gap-1.5 text-sm bg-sky-500 text-white px-4 py-2 rounded-lg hover:bg-sky-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Closure</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : groupedClosures.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p>No closures configured</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedClosures.map((group) => {
                  const first = group[0];
                  const isSingleDay = first.startDate === first.endDate;
                  const isAllBranches = first.branchId === null;
                  const branchCount = group.length;
                  const groupKey = getGroupKey(group);

                  return (
                    <div
                      key={groupKey}
                      className="bg-white rounded-lg border-2 border-slate-200 hover:border-slate-300 shadow-sm p-4 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-purple-700 text-base mb-2">
                            {isSingleDay
                              ? formatDateDisplay(first.startDate)
                              : `${formatDateDisplay(first.startDate)} → ${formatDateDisplay(first.endDate)}`}
                          </div>
                          
                          {/* Scope - Branch names */}
                          <div className="mb-2">
                            <div className="text-[11px] font-semibold text-slate-500 uppercase mb-1">
                              Scope {isAllBranches ? '(All branches)' : `(${branchCount} ${branchCount === 1 ? 'branch' : 'branches'})`}
                            </div>
                            <div 
                              className={`space-y-0.5 ${!isAllBranches && branchCount > 5 ? 'max-h-[120px] overflow-y-auto pr-0' : ''}`}
                              style={!isAllBranches && branchCount > 5 ? { marginRight: 'calc(-1rem - 55px)' } : {}}
                            >
                              {isAllBranches ? (
                                <div className="text-sm text-slate-700 font-medium">• All branches</div>
                              ) : (
                                group.map((c) => (
                                  <div key={c.id} className="text-sm text-slate-700">
                                    • {getBranchName(c.branchId)}
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Reason */}
                          {first.reason && (
                            <div className="mb-2">
                              <div className="text-[11px] font-semibold text-slate-500 uppercase mb-1">Reason</div>
                              <div className="text-sm text-slate-700">{first.reason}</div>
                            </div>
                          )}

                          {/* Timestamps */}
                          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                            <div>
                              <div className="uppercase mb-0.5">Created</div>
                              <div className="text-slate-700 text-xs">
                                {first.createAt ? new Date(first.createAt).toLocaleString('en-GB', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }) : '—'}
                              </div>
                            </div>
                            <div>
                              <div className="uppercase mb-0.5">Updated</div>
                              <div className="text-slate-700 text-xs">
                                {first.updateAt ? new Date(first.updateAt).toLocaleString('en-GB', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }) : '—'}
                              </div>
                            </div>
                          </div>
                         </div>
                         <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                           {canManageGroup(group) ? (
                             <>
                               <button
                                 type="button"
                                 className="inline-flex items-center justify-center h-8 w-8 rounded-full text-blue-600 hover:bg-blue-50 hover:text-blue-800"
                                 title="Edit closure"
                                 onClick={() => setEditClosure(group)}
                               >
                                 <Pencil className="w-4 h-4" />
                               </button>
                               <button
                                 type="button"
                                 className={`inline-flex items-center justify-center h-8 w-8 rounded-full ${
                                   canDeleteGroup(group)
                                     ? 'text-red-500 hover:bg-red-50 hover:text-red-700'
                                     : 'text-gray-400 cursor-not-allowed opacity-50'
                                 }`}
                                 title={
                                   canDeleteGroup(group)
                                     ? 'Remove closure'
                                     : 'Cannot delete closures that have already started or are starting today'
                                 }
                                 onClick={() => {
                                   if (canDeleteGroup(group)) {
                                     setDeleteGroup(group);
                                   } else {
                                     toast.error('Cannot delete closures that have already started or are starting today. Only future closures can be deleted.');
                                   }
                                 }}
                               >
                                 <Trash2 className="w-4 h-4" />
                               </button>
                             </>
                           ) : (
                             <span className="text-xs text-slate-400 italic" title="You can only edit/delete closures for your branch or global closures">
                               Read-only
                             </span>
                           )}
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <BranchClosureModal
        open={closureModalOpen}
        branches={branches}
        defaultBranchId={managerBranch?.branchId || null}
        mode="create"
        managerMode={true}
        onClose={() => setClosureModalOpen(false)}
        onSubmit={async (values: BranchClosureFormValues) => {
          try {
            // Manager always creates for their branch (managerMode = true)
            const branchId = managerBranch?.branchId || null;
            await branchClosureService.create({
              branchId,
              startDate: values.startDate,
              endDate: values.endDate || values.startDate,
              reason: values.reason || undefined,
            });
            toast.success('Closure(s) created successfully');
            setClosureModalOpen(false);
            fetchClosures();
          } catch (e) {
            console.error(e);
            const err: any = e as any;
            const msg = err?.response?.message || err?.message || 'Failed to create closure';
            toast.error(msg);
          }
        }}
      />

      <BranchClosureModal
        open={!!editClosure && editClosure.length > 0}
        branches={branches}
        defaultBranchId={managerBranch?.branchId || null}
        mode="edit"
        managerMode={true}
        initialValues={
          editClosure && editClosure.length > 0
            ? {
                isGlobal: editClosure[0].branchId == null,
                branchIds: editClosure.map((c) => c.branchId).filter((id) => id != null) as number[],
                startDate: editClosure[0].startDate,
                endDate: editClosure[0].endDate,
                reason: editClosure[0].reason || '',
                isMultiDay: editClosure[0].startDate !== editClosure[0].endDate,
              }
            : undefined
        }
        onClose={() => setEditClosure(null)}
        onSubmit={async (values: BranchClosureFormValues) => {
          if (!editClosure || editClosure.length === 0) return;
          
          try {
            // Manager always updates for their branch (managerMode = true)
            const branchId = managerBranch?.branchId || null;
            await branchClosureService.updateGroup({
              closureIds: editClosure.map((c) => c.id),
              branchIds: branchId != null ? [branchId] : null,
              startDate: values.startDate,
              endDate: values.endDate || values.startDate,
              reason: values.reason || undefined,
            });
            toast.success('Closure(s) updated successfully');
            setEditClosure(null);
            fetchClosures();
          } catch (e) {
            console.error(e);
            const err: any = e as any;
            const msg = err?.response?.data?.message || err?.response?.message || err?.message || 'Failed to update closure';
            toast.error(msg);
          }
        }}
      />

      <ConfirmModal
        open={!!deleteGroup}
        title="Delete Closures"
        description={`Are you sure you want to delete ${deleteGroup?.length || 0} closure(s)? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteGroup}
        onCancel={() => setDeleteGroup(null)}
      />
    </div>
  );
};

export default BranchClosureManagement;

