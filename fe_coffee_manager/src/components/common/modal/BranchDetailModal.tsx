import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Branch } from '../../../types';
import { managerService } from '../../../services';

interface BranchDetailModalProps {
  open: boolean;
  branch: Branch | null;
  onClose: () => void;
}

const dayLabels: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
  7: 'Sun',
};

function parseOpenDays(openDays?: string | null): number[] {
  if (!openDays || !openDays.trim()) return [1, 2, 3, 4, 5, 6, 7];
  const parts = openDays.split(',').map((p) => parseInt(p.trim(), 10));
  return Array.from(new Set(parts.filter((d) => d >= 1 && d <= 7))).sort((a, b) => a - b);
}

const BranchDetailModal: React.FC<BranchDetailModalProps> = ({ open, branch, onClose }) => {
  const [managerName, setManagerName] = useState<string | null>(null);
  const [loadingManager, setLoadingManager] = useState(false);

  useEffect(() => {
    const managerUserId = branch ? (branch as any).managerUserId as number | undefined : undefined;
    if (!open || !branch || !managerUserId || managerUserId <= 0) {
      setManagerName(null);
      return;
    }
    let cancelled = false;
    setLoadingManager(true);
    managerService
      .getManagerProfile(managerUserId)
      .then((mgr) => {
        if (!cancelled) {
          setManagerName(mgr.fullname || mgr.email || String(managerUserId));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setManagerName(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingManager(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, branch]);

  if (!open || !branch) return null;

  const days = parseOpenDays((branch as any).openDays);

  const formatTime = (t?: string | null) => {
    if (!t) return '--:--';
    return String(t).slice(0, 5);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1100]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Branch details</h2>
            <p className="text-xs text-slate-500 mt-1">
              Detailed information about the branch configuration.
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">ID</p>
              <p className="text-sm text-slate-900">{branch.branchId}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Name</p>
              <p className="text-sm text-slate-900">{branch.name}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Address</p>
            <p className="text-sm text-slate-900">{branch.address || '-'}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Opening time</p>
              <p className="text-sm text-slate-900">{formatTime((branch as any).openHours)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Closing time</p>
              <p className="text-sm text-slate-900">{formatTime((branch as any).endHours)}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Open days</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {days.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                >
                  {dayLabels[d] ?? d}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb1">Phone</p>
              <p className="text-sm text-slate-900">{branch.phone || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase mb1">Manager</p>
              <p className="text-sm text-slate-900">
                {loadingManager
                  ? 'Loading...'
                  : managerName
                  ? `${managerName} (ID: ${(branch as any).managerUserId})`
                  : (branch as any).managerUserId
                  ? `ID: ${(branch as any).managerUserId}`
                  : '-'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BranchDetailModal;


