import React, { useState, useEffect } from 'react';
import { X, Calculator, User } from 'lucide-react';
import { createPortal } from 'react-dom';
import { UserResponseDto } from '../../types';

interface PayrollCalculationFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (userIds: number[], period: string) => Promise<void>;
  users?: UserResponseDto[];
  loadingUsers?: boolean;
  loading?: boolean;
  userLabel?: string;
  defaultPeriod?: string;
}

const PayrollCalculationForm: React.FC<PayrollCalculationFormProps> = ({
  open,
  onClose,
  onSubmit,
  users = [],
  loadingUsers = false,
  loading = false,
  userLabel = 'Staff',
  defaultPeriod,
}) => {
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [period, setPeriod] = useState<string>('');

  useEffect(() => {
    if (open) {
      setSelectedUserIds(new Set());
      const currentPeriod = defaultPeriod || getCurrentMonthPeriod();
      setPeriod(currentPeriod);
    }
  }, [open, defaultPeriod]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(users.map(user => user.user_id));
      setSelectedUserIds(allIds);
    } else {
      setSelectedUserIds(new Set());
    }
  };

  const handleSelectUser = (userId: number, checked: boolean) => {
    const newSelected = new Set(selectedUserIds);
    if (checked) {
      newSelected.add(userId);
    } else {
      newSelected.delete(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const isAllSelected = users.length > 0 && users.every(user => selectedUserIds.has(user.user_id));
  const isIndeterminate = users.some(user => selectedUserIds.has(user.user_id)) && !isAllSelected;

  const getCurrentMonthPeriod = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.size === 0 || !period) {
      return;
    }
    await onSubmit(Array.from(selectedUserIds), period);
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1300]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-semibold">Calculate Payroll</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {userLabel} <span className="text-red-500">*</span>
              {selectedUserIds.size > 0 && (
                <span className="ml-2 text-sm text-gray-500 font-normal">
                  ({selectedUserIds.size} selected)
                </span>
              )}
            </label>
            
            {/* Select All Checkbox */}
            {users.length > 0 && (
              <div className="mb-2 pb-2 border-b border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = isIndeterminate;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={loadingUsers || loading}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Select All ({users.length} {userLabel.toLowerCase()})
                  </span>
                </label>
              </div>
            )}

            {/* User List with Checkboxes */}
            <div className="max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-2">
              {loadingUsers ? (
                <p className="text-sm text-gray-500 p-4 text-center">Loading list...</p>
              ) : users.length === 0 ? (
                <p className="text-sm text-gray-500 p-4 text-center">No data available</p>
              ) : (
                <div className="space-y-1">
                  {users.map((user) => (
                    <label
                      key={user.user_id}
                      className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.has(user.user_id)}
                        onChange={(e) => handleSelectUser(user.user_id, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={loading}
                      />
                      <span className="text-sm text-gray-700 flex-1">
                        {user.fullname || user.email}
                        {user.branch && (
                          <span className="text-gray-500 ml-2">- {user.branch.name}</span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Pay Period (YYYY-MM) <span className="text-red-500">*</span>
            </label>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              required
              disabled={loading}
            />
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedUserIds.size === 0 || !period || loading || loadingUsers}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : `Calculate Payroll${selectedUserIds.size > 0 ? ` (${selectedUserIds.size})` : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default PayrollCalculationForm;

