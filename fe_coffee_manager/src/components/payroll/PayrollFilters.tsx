import React from 'react';
import { Filter, X } from 'lucide-react';
import { PayrollFilters as PayrollFiltersType, PayrollStatus, Branch } from '../../types';

interface PayrollFiltersProps {
  filters: PayrollFiltersType;
  onFiltersChange: (filters: PayrollFiltersType) => void;
  branches?: Branch[];
  showBranchFilter?: boolean;
  showUserFilter?: boolean;
  className?: string;
}

const PayrollFiltersComponent: React.FC<PayrollFiltersProps> = ({
  filters,
  onFiltersChange,
  branches = [],
  showBranchFilter = true,
  showUserFilter = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [localFilters, setLocalFilters] = React.useState<PayrollFiltersType>(filters);

  React.useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    const resetFilters: PayrollFiltersType = {};
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
    setIsOpen(false);
  };

  const hasActiveFilters = Boolean(
    filters.branchId || filters.period || filters.status || filters.userId
  );

  const getCurrentMonthPeriod = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
          hasActiveFilters
            ? 'bg-amber-50 border-amber-300 text-amber-700'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Filter className="w-4 h-4" />
        <span>Filters</span>
        {hasActiveFilters && (
          <span className="ml-1 px-1.5 py-0.5 bg-amber-500 text-white text-xs rounded-full">
            {[
              filters.branchId,
              filters.period,
              filters.status,
              filters.userId,
            ].filter(Boolean).length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-20 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {showBranchFilter && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch
                  </label>
                  <select
                    value={localFilters.branchId || ''}
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        branchId: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">All</option>
                    {branches.map((branch) => (
                      <option key={branch.branchId} value={branch.branchId}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pay Period
                </label>
                <input
                  type="month"
                  value={localFilters.period || getCurrentMonthPeriod()}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      period: e.target.value || undefined,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={localFilters.status || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      status: (e.target.value as PayrollStatus) || undefined,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value="">All</option>
                  <option value="DRAFT">Draft</option>
                  <option value="REVIEW">Pending Review</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PAID">Paid</option>
                </select>
              </div>

              {showUserFilter && localFilters.userId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User ID
                  </label>
                  <input
                    type="number"
                    value={localFilters.userId || ''}
                    onChange={(e) =>
                      setLocalFilters({
                        ...localFilters,
                        userId: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="Enter User ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Đặt lại
              </button>
              <button
                onClick={handleApply}
                className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PayrollFiltersComponent;

