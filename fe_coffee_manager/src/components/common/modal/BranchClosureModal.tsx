import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Branch } from '../../../types';

export interface BranchClosureFormValues {
  isGlobal: boolean;
  isMultiDay: boolean;
  branchIds: number[]; // empty when isGlobal=true
  startDate: string;
  endDate: string;
  reason: string;
}

interface BranchClosureModalProps {
  open: boolean;
  branches: Branch[];
  defaultBranchId?: number | null;
  initialValues?: Partial<BranchClosureFormValues>;
  mode?: 'create' | 'edit';
  managerMode?: boolean; // If true, hide scope selection and use defaultBranchId
  onClose: () => void;
  onSubmit: (values: BranchClosureFormValues) => Promise<void> | void;
}

const BranchClosureModal: React.FC<BranchClosureModalProps> = ({
  open,
  branches,
  defaultBranchId = null,
  initialValues,
  mode = 'create',
  managerMode = false,
  onClose,
  onSubmit,
}) => {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [isGlobal, setIsGlobal] = useState<boolean>(true);
  const [isMultiDay, setIsMultiDay] = useState<boolean>(false);
  const [branchIds, setBranchIds] = useState<number[]>([]);
  const [startDate, setStartDate] = useState<string>(today);
  const [endDate, setEndDate] = useState<string>(today);
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const [dateTouched, setDateTouched] = useState(false);
  const [reasonTouched, setReasonTouched] = useState(false);

  const dateError = useMemo(() => {
    if (!startDate) return 'Date is required';
    if (startDate < today) return 'Start date cannot be in the past';
    if (isMultiDay) {
      if (!endDate) return 'End date is required for multi-day closure';
      if (endDate < today) return 'End date cannot be in the past';
      if (endDate < startDate) return 'End date must be on or after start date';
    }
    return '';
  }, [startDate, endDate, today, isMultiDay]);

  const reasonError = useMemo(() => {
    if (reason && reason.length > 255) {
      return 'Reason must not exceed 255 characters';
    }
    return '';
  }, [reason]);

  useEffect(() => {
    if (open) {
      if (managerMode) {
        // Manager mode: always use defaultBranchId, no global option
        setIsGlobal(false);
        setIsMultiDay(initialValues?.isMultiDay ?? false);
        const initBranchIds = defaultBranchId != null ? [defaultBranchId] : [];
        setBranchIds(initBranchIds);
      } else {
        // Admin mode: allow global and multiple branches
        const initIsGlobal = initialValues?.isGlobal ?? (defaultBranchId == null);
        setIsGlobal(initIsGlobal);
        const initBranchIds =
          initialValues?.branchIds && initialValues.branchIds.length > 0
            ? initialValues.branchIds
            : defaultBranchId != null && !initIsGlobal
            ? [defaultBranchId]
            : [];
        setBranchIds(initBranchIds);
      }
      const initStart = initialValues?.startDate ?? today;
      const initEnd = initialValues?.endDate ?? initialValues?.startDate ?? today;
      const initIsMultiDay = initialValues?.isMultiDay ?? (initEnd !== initStart);
      setIsMultiDay(initIsMultiDay);
      setStartDate(initStart);
      setEndDate(initEnd);
      setReason(initialValues?.reason ?? '');
      setSubmitting(false);
      setDateTouched(false);
      setReasonTouched(false);
    }
  }, [open, initialValues, defaultBranchId, today, managerMode]);

  if (!open) return null;

  const handleSave = async () => {
    if (submitting) return;
    if (dateError || reasonError) {
      setDateTouched(true);
      setReasonTouched(true);
      return;
    }
    setSubmitting(true);
    try {
      const effectiveEnd = isMultiDay && endDate ? endDate : startDate;
      await onSubmit({
        isGlobal,
        isMultiDay,
        branchIds: isGlobal ? [] : branchIds,
        startDate,
        endDate: effectiveEnd,
        reason: reason.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1200]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {mode === 'edit' ? 'Update branch closure' : 'Add branch closure'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Configure special closed days for a branch or for all branches.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {managerMode ? (
            // Manager mode: show scope as read-only
            <div>
              <label className="block text-sm text-gray-600 mb-1">Scope</label>
              <div className="border rounded px-3 py-2 bg-slate-50/60">
                {defaultBranchId != null ? (
                  (() => {
                    const branch = branches.find((b) => b.branchId === defaultBranchId);
                    return (
                      <p className="text-sm text-slate-700">
                        {branch ? `${branch.name} #${branch.branchId}` : `Branch #${defaultBranchId}`}
                      </p>
                    );
                  })()
                ) : (
                  <p className="text-sm text-slate-500 italic">No branch assigned</p>
                )}
              </div>
            </div>
          ) : (
            // Admin mode: show scope selection
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Scope
                <span className="ml-1 text-[11px] text-slate-400">
                  (select multiple branches or keep "All branches" for global)
                </span>
              </label>
              <div className="space-y-2 border rounded px-3 py-2 bg-slate-50/60">
                <label className="inline-flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300"
                    checked={isGlobal}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsGlobal(checked);
                      if (checked) {
                        setBranchIds([]);
                      }
                    }}
                  />
                  <span>All branches (apply to the whole chain)</span>
                </label>
                <div className="mt-2 border-t border-slate-200 pt-2 max-h-40 overflow-y-auto">
                  <p className="text-[11px] text-slate-500 mb-1">
                    Or select specific branches:
                  </p>
                  <div className="space-y-1 pr-2">
                    {branches.map((b) => {
                      const checked = branchIds.includes(b.branchId);
                      return (
                        <label
                          key={b.branchId}
                          className="flex items-center justify-between text-xs text-slate-700"
                        >
                          <span>
                            {b.name} <span className="text-slate-400">#{b.branchId}</span>
                          </span>
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 mr-1"
                            checked={checked}
                            onChange={(e) => {
                              const on = e.target.checked;
                              // khi chọn bất kỳ chi nhánh nào -> bỏ chọn global
                              if (on) {
                                setIsGlobal(false);
                                setBranchIds((prev) =>
                                  prev.includes(b.branchId) ? prev : [...prev, b.branchId]
                                );
                              } else {
                                setBranchIds((prev) => prev.filter((id) => id !== b.branchId));
                                // nếu bỏ hết chi nhánh => quay lại global
                                setIsGlobal((prevGlobal) =>
                                  prevGlobal ? prevGlobal : false
                                );
                              }
                            }}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                className="rounded border-slate-300"
                checked={isMultiDay}
                onChange={(e) => {
                  const on = e.target.checked;
                  setIsMultiDay(on);
                  if (!on) {
                    // single-day mode: keep endDate in sync with startDate
                    setEndDate(startDate);
                  }
                }}
              />
              <span>Multi-day closure</span>
            </label>
            <span className="text-[11px] text-slate-400">
              Off = single day (closed date only)
            </span>
          </div>

          <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4`}>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {isMultiDay ? 'Start date' : 'Closed date'}
              </label>
              <input
                type="date"
                min={today}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                onBlur={() => setDateTouched(true)}
                className={`w-full border rounded px-3 py-2 text-sm ${
                  dateTouched && dateError ? 'border-red-400 focus:border-red-500' : ''
                }`}
              />
            </div>

            {isMultiDay && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">End date</label>
                <input
                  type="date"
                  min={startDate || today}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  onBlur={() => setDateTouched(true)}
                  className={`w-full border rounded px-3 py-2 text-sm ${
                    dateTouched && dateError ? 'border-red-400 focus:border-red-500' : ''
                  }`}
                />
              </div>
            )}
          </div>

          {dateTouched && dateError && (
            <p className="mt-1 text-xs text-red-600">{dateError}</p>
          )}

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Reason <span className="text-xs text-slate-400">(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onBlur={() => setReasonTouched(true)}
              rows={3}
              className={`w-full border rounded px-3 py-2 text-sm resize-none ${
                reasonTouched && reasonError ? 'border-red-400 focus:border-red-500' : ''
              }`}
              placeholder="e.g., Maintenance, inventory count, public holiday..."
            />
            {reasonTouched && reasonError && (
              <p className="mt-1 text-xs text-red-600">{reasonError}</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded border border-gray-300 text-gray-700"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
            disabled={submitting || !!(dateError || reasonError)}
          >
            {submitting ? 'Saving...' : mode === 'edit' ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BranchClosureModal;


