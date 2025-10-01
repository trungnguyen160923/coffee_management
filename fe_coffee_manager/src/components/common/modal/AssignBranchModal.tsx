import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Branch } from '../../../types';

interface AssignBranchModalProps {
  open: boolean;
  managerName: string;
  branches: Branch[];
  loadingBranches?: boolean;
  onClose: () => void;
  onSubmit: (branchId: number) => Promise<void> | void;
}

const AssignBranchModal: React.FC<AssignBranchModalProps> = ({ 
  open, 
  managerName, 
  branches, 
  loadingBranches, 
  onClose, 
  onSubmit 
}) => {
  const [branchId, setBranchId] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setBranchId('');
    }
  }, [open]);

  if (!open) return null;

  const handleSave = async () => {
    if (!branchId) return;
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(Number(branchId));
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Assign Branch to {managerName}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Select branch</label>
            <select 
              className="w-full border rounded px-3 py-2" 
              value={branchId} 
              onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="" disabled>
                {loadingBranches ? 'Loading branches...' : 'Select a branch'}
              </option>
              {branches.map((branch) => (
                <option key={branch.branchId} value={branch.branchId}>
                  {branch.name} — {branch.address}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button 
            onClick={onClose} 
            className="px-4 py-2 rounded border border-gray-300 text-gray-700" 
            disabled={submitting}
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60" 
            disabled={submitting || !branchId}
          >
            {submitting ? 'Assigning...' : 'Assign Branch'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AssignBranchModal;
