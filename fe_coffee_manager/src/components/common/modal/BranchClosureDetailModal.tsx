import React from 'react';
import { createPortal } from 'react-dom';
import type { BranchClosure } from '../../../services/branchClosureService';
import type { Branch } from '../../../types';

interface BranchClosureDetailModalProps {
  open: boolean;
  closures: BranchClosure[] | null;
  branches: Branch[];
  onClose: () => void;
}

const BranchClosureDetailModal: React.FC<BranchClosureDetailModalProps> = ({
  open,
  closures,
  branches,
  onClose,
}) => {
  if (!open || !closures || closures.length === 0) return null;

  const first = closures[0];
  const isSingleDay = first.startDate === first.endDate;
  const isAllBranches = first.branchId === null;

  const formatRange = () =>
    isSingleDay ? first.startDate : `${first.startDate} → ${first.endDate}`;

  const getBranchName = (branchId: number | null): string => {
    if (branchId == null) return 'All branches';
    const branch = branches.find((b) => b.branchId === branchId);
    return branch ? branch.name : `Branch #${branchId}`;
  };

  const branchNames = closures.map((c) => getBranchName(c.branchId));

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1200]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Closure details</h2>
            <p className="text-xs text-slate-500 mt-1">
              Detailed information about this branch closure period.
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

        <div className="space-y-3 text-sm">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase mb-1">
              {isSingleDay ? 'Closed date' : 'Period'}
            </p>
            <p className="text-slate-900">{formatRange()}</p>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Scope {isAllBranches ? '(All branches)' : `(${closures.length} ${closures.length === 1 ? 'branch' : 'branches'})`}
            </p>
            <div className="space-y-1">
              {isAllBranches ? (
                <p className="text-slate-900 font-medium">• All branches</p>
              ) : (
                branchNames.map((name, idx) => (
                  <p key={idx} className="text-slate-900">
                    • {name}
                  </p>
                ))
              )}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase mb-1">Reason</p>
            <p className="text-slate-900">{first.reason || '—'}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-500">
            <div>
              <p className="uppercase mb-0.5">Created at</p>
              <p className="text-slate-700 text-xs">
                {first.createAt ? new Date(first.createAt).toLocaleString('en-GB') : '—'}
              </p>
            </div>
            <div>
              <p className="uppercase mb-0.5">Updated at</p>
              <p className="text-slate-700 text-xs">
                {first.updateAt ? new Date(first.updateAt).toLocaleString('en-GB') : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BranchClosureDetailModal;


