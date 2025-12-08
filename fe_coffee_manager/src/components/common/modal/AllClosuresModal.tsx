import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Trash2, X, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import type { BranchClosure } from '../../../services/branchClosureService';
import { branchClosureService } from '../../../services';
import type { Branch } from '../../../types';
import BranchClosureModal, { BranchClosureFormValues } from './BranchClosureModal';
import ConfirmModal from './ConfirmModal';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subWeeks, format, parseISO } from 'date-fns';

type FilterPeriod = 'this-week' | 'last-week' | 'select-month' | 'select-year' | 'all';

interface AllClosuresModalProps {
  open: boolean;
  groupedClosures: BranchClosure[][];
  branches: Branch[];
  highlightedGroupKey?: string | null;
  onClose: () => void;
  onRefresh: () => void;
  fetchClosuresWithFilter?: (from?: string, to?: string) => Promise<void>; // Kept for backward compatibility but not used for filtering
}

const AllClosuresModal: React.FC<AllClosuresModalProps> = ({
  open,
  groupedClosures,
  branches,
  highlightedGroupKey,
  onClose,
  onRefresh,
  fetchClosuresWithFilter: _fetchClosuresWithFilter, // Not used - filtering is done locally
}) => {
  const [editClosure, setEditClosure] = useState<BranchClosure[] | null>(null); // Store entire group
  const [deleteGroup, setDeleteGroup] = useState<BranchClosure[] | null>(null);
  const [closureModalOpen, setClosureModalOpen] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [selectedYear, setSelectedYear] = useState<string>(format(new Date(), 'yyyy'));
  const [currentWeek, setCurrentWeek] = useState<Date>(new Date());
  const highlightedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (highlightedGroupKey && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedGroupKey, open]);

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

  // Calculate date range based on filter period
  const getDateRange = (period: FilterPeriod): { start: Date; end: Date } | null => {
    switch (period) {
      case 'this-week': {
        const start = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
        const end = endOfWeek(currentWeek, { weekStartsOn: 1 });
        return { start, end };
      }
      case 'last-week': {
        const lastWeek = subWeeks(currentWeek, 1);
        const start = startOfWeek(lastWeek, { weekStartsOn: 1 });
        const end = endOfWeek(lastWeek, { weekStartsOn: 1 });
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

  // Filter closures locally without updating parent state
  const filteredGroupedClosures = useMemo(() => {
    if (filterPeriod === 'all') {
      return groupedClosures;
    }
    
    const dateRange = getDateRange(filterPeriod);
    if (!dateRange) {
      return groupedClosures;
    }

    // Filter groups that overlap with the selected period
    return groupedClosures.filter((group) => {
      const first = group[0];
      const closureStart = parseISO(first.startDate);
      const closureEnd = parseISO(first.endDate);
      
      // Check if closure overlaps with the selected period
      // Closure overlaps if: closureStart <= rangeEnd && closureEnd >= rangeStart
      return closureStart <= dateRange.end && closureEnd >= dateRange.start;
    });
  }, [groupedClosures, filterPeriod, selectedMonth, selectedYear, currentWeek]);

  const handleDeleteGroup = async () => {
    if (!deleteGroup) return;

    try {
      await branchClosureService.removeGroup({
        closureIds: deleteGroup.map((c) => c.id),
      });
      toast.success(`${deleteGroup.length} closure(s) deleted`);
      setDeleteGroup(null);
      onRefresh();
    } catch (e) {
      console.error(e);
      const err: any = e as any;
      const msg = err?.response?.data?.message || err?.response?.message || err?.message || 'Failed to delete closure';
      toast.error(msg);
    }
  };

  if (!open) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[900]">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Branch Closures Management</h2>
              <p className="text-xs text-slate-500 mt-1">
                Manage all branch closures ({filteredGroupedClosures.length} groups{filterPeriod !== 'all' ? ` (filtered)` : ''})
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={filterPeriod}
                onChange={(e) => {
                  const newPeriod = e.target.value as FilterPeriod;
                  setFilterPeriod(newPeriod);
                  if (newPeriod === 'this-week' || newPeriod === 'last-week') {
                    setCurrentWeek(new Date());
                  }
                }}
                className="text-sm border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              >
                <option value="all">All</option>
                <option value="this-week">Week</option>
                <option value="select-month">Select Month</option>
                <option value="select-year">Select Year</option>
              </select>
              {(filterPeriod === 'this-week' || filterPeriod === 'last-week') && (() => {
                const weekRange = getDateRange(filterPeriod);
                if (!weekRange) return null;
                return (
                  <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5">
                    <button
                      type="button"
                      onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
                      className="text-slate-700 hover:text-slate-900 transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-medium text-slate-700 min-w-[140px] text-center">
                      {format(weekRange.start, 'dd MMM')} - {format(weekRange.end, 'dd MMM yyyy')}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentWeek(subWeeks(currentWeek, -1))}
                      className="text-slate-700 hover:text-slate-900 transition-colors"
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
                  className="text-sm border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                />
              )}
              {filterPeriod === 'select-year' && (
                <input
                  type="number"
                  min="2020"
                  max="2100"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="text-sm border border-slate-300 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 w-24"
                  placeholder="Year"
                />
              )}
              <button
                type="button"
                onClick={() => setClosureModalOpen(true)}
                className="flex items-center gap-1.5 text-sm bg-sky-500 text-white px-3 py-1.5 rounded-lg hover:bg-sky-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Closure</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {filteredGroupedClosures.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <p>No closures found for the selected period</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredGroupedClosures.map((group) => {
                  const first = group[0];
                  const isSingleDay = first.startDate === first.endDate;
                  const isAllBranches = first.branchId === null;
                  const branchCount = group.length;
                  const groupKey = getGroupKey(group);
                  const isHighlighted = highlightedGroupKey === groupKey;

                  return (
                    <div
                      key={groupKey}
                      ref={isHighlighted ? highlightedRef : null}
                      className={`bg-white rounded-lg border-2 p-4 transition-all ${
                        isHighlighted
                          ? 'border-sky-500 shadow-lg ring-2 ring-sky-200'
                          : 'border-slate-200 hover:border-slate-300 shadow-sm'
                      }`}
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
        defaultBranchId={null}
        mode="create"
        onClose={() => setClosureModalOpen(false)}
        onSubmit={async (values: BranchClosureFormValues) => {
          try {
            if (values.isGlobal || !values.branchIds.length) {
              await branchClosureService.create({
                branchId: null,
                startDate: values.startDate,
                endDate: values.endDate || values.startDate,
                reason: values.reason || undefined,
              });
            } else {
              for (const id of values.branchIds) {
                await branchClosureService.create({
                  branchId: id,
                  startDate: values.startDate,
                  endDate: values.endDate || values.startDate,
                  reason: values.reason || undefined,
                });
              }
            }
            toast.success('Closure(s) created successfully');
            setClosureModalOpen(false);
            onRefresh();
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
        defaultBranchId={editClosure?.[0]?.branchId || null}
        mode="edit"
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
            await branchClosureService.updateGroup({
              closureIds: editClosure.map((c) => c.id),
              branchIds: values.isGlobal || !values.branchIds.length ? null : values.branchIds,
              startDate: values.startDate,
              endDate: values.endDate || values.startDate,
              reason: values.reason || undefined,
            });
            toast.success('Closure(s) updated successfully');
            setEditClosure(null);
            onRefresh();
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
    </>,
    document.body
  );
};

export default AllClosuresModal;

