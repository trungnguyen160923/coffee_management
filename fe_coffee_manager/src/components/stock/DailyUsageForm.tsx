import { useEffect, useMemo, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { stockService, StockResponse, DailyStockReconciliationResponse } from '../../services/stockService';
import { useAuth } from '../../context/AuthContext';
import { Search, X } from 'lucide-react';
import { useActiveShift } from '../../hooks/useActiveShift';

interface DailyUsageFormProps {
  compact?: boolean;
  allowDateChange?: boolean;
  defaultDate?: string;
  onSuccess?: (response: DailyStockReconciliationResponse) => void;
}

const todayISO = () => new Date().toISOString().split('T')[0];

export const DailyUsageForm = ({
  compact = false,
  allowDateChange = false,
  defaultDate = todayISO(),
  onSuccess,
}: DailyUsageFormProps) => {
  const { user } = useAuth();
  const { hasActiveShift, loading: shiftLoading } = useActiveShift();
  const branchId = useMemo(() => {
    if (user?.branch?.branchId) return user.branch.branchId;
    if (user?.branchId) return Number(user.branchId);
    return undefined;
  }, [user]);

  // Only managers/admins can log previous dates
  const isManager = useMemo(() => {
    const roleData = (user as any)?.roles ?? user?.role;
    if (Array.isArray(roleData)) {
      return roleData.some((r: string) => r === 'MANAGER' || r === 'ADMIN');
    }
    return roleData === 'MANAGER' || roleData === 'ADMIN';
  }, [user]);

  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [ingredientOptions, setIngredientOptions] = useState<StockResponse[]>([]);
  const [ingredientId, setIngredientId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [displayCount, setDisplayCount] = useState(10); // Số lượng items hiển thị ban đầu
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!branchId) return;
    const loadOptions = async () => {
      try {
        setIsLoadingOptions(true);
        const stocks = await stockService.searchStocks({
          branchId,
          size: 100,
        });
        setIngredientOptions(stocks.content || []);
      } catch (error) {
        console.error(error);
        toast.error('Unable to load ingredient list');
      } finally {
        setIsLoadingOptions(false);
      }
    };

    loadOptions();
  }, [branchId]);

  // Filter ingredients based on search term
  const filteredIngredients = useMemo(() => {
    if (!searchTerm.trim()) {
      // Show items based on displayCount when no search
      return ingredientOptions.slice(0, displayCount);
    }
    const term = searchTerm.toLowerCase();
    return ingredientOptions.filter(
      (option) =>
        option.ingredientName?.toLowerCase().includes(term) ||
        option.unitName?.toLowerCase().includes(term)
    );
  }, [ingredientOptions, searchTerm, displayCount]);

  // Handle scroll to load more
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isNearBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
    
    if (isNearBottom && !searchTerm && displayCount < ingredientOptions.length) {
      // Load 10 more items
      setDisplayCount(prev => Math.min(prev + 10, ingredientOptions.length));
    }
  };

  // Reset display count when search changes
  useEffect(() => {
    if (searchTerm) {
      setDisplayCount(10); // Reset khi có search
    } else {
      setDisplayCount(10); // Reset về 10 khi clear search
    }
  }, [searchTerm]);

  // Get selected ingredient name
  const selectedIngredient = useMemo(() => {
    if (!ingredientId) return '';
    return ingredientOptions.find((opt) => opt.ingredientId === ingredientId);
  }, [ingredientId, ingredientOptions]);

  // Reset form state function
  const resetFormState = () => {
    setSearchTerm('');
    setDisplayCount(10);
    setIngredientId('');
    setQuantity('');
    setNotes('');
    setShowDropdown(false);
  };

  // Reset when component unmounts or form closes
  useEffect(() => {
    return () => {
      // Reset when component unmounts
      resetFormState();
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        // Reset search and display count when closing dropdown
        if (searchTerm) {
          setSearchTerm('');
          setDisplayCount(10);
        }
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown, searchTerm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) {
      toast.error('Branch information not found for this account');
      return;
    }
    if (!ingredientId) {
      toast.error('Please select an ingredient');
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await stockService.reconcileDailyUsage({
        branchId,
        adjustmentDate: selectedDate,
        userId: user?.user_id ? Number(user.user_id) : undefined,
        adjustedBy: user?.name || user?.fullname,
        commitImmediately: false,
        items: [
          {
            ingredientId: Number(ingredientId),
            actualUsedQuantity: Number(quantity),
            notes: notes || undefined,
          },
        ],
      });
      toast.success('Usage recorded successfully');
      setQuantity('');
      setNotes('');
      setIngredientId('');
      setSearchTerm('');
      setDisplayCount(10);
      setShowDropdown(false);
      onSuccess?.(response);
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message || 'Failed to record ingredient usage');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!branchId) {
    return (
      <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
        Cannot determine branch for this account. Please contact your manager.
      </div>
    );
  }

  if (!shiftLoading && !hasActiveShift) {
    return (
      <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
        You must be checked in to an active shift to record daily stock usage.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {allowDateChange && (
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">
            Usage date
            {!isManager && (
              <span className="ml-2 text-xs text-gray-400">(Only today can be selected)</span>
            )}
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={todayISO()}
            min={isManager ? undefined : todayISO()}
            disabled={!isManager && selectedDate !== todayISO()}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-amber-500 focus:ring-amber-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          {!isManager && selectedDate !== todayISO() && (
            <p className="text-xs text-orange-600 mt-1">
              ⚠️ Staff can only log usage for today. Please contact a manager for past days.
            </p>
          )}
        </div>
      )}

      <div>
        <label className="text-xs font-medium text-gray-500 block mb-1">Ingredient</label>
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={selectedIngredient ? `${selectedIngredient.ingredientName} (${selectedIngredient.unitName})` : searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowDropdown(true);
                if (ingredientId) {
                  setIngredientId('');
                }
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search ingredient..."
              disabled={isLoadingOptions}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-8 text-sm focus:border-amber-500 focus:ring-amber-200 disabled:bg-gray-50"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              {searchTerm ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchTerm('');
                    setIngredientId('');
                    inputRef.current?.focus();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <Search className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </div>

          {/* Dropdown */}
          {showDropdown && !isLoadingOptions && (
            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
            >
              {filteredIngredients.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500 text-center">
                  {searchTerm ? 'No ingredients found' : 'Loading...'}
                </div>
              ) : (
                <>
                  {filteredIngredients.map((option) => (
                    <button
                      key={option.ingredientId}
                      type="button"
                      onClick={() => {
                        setIngredientId(option.ingredientId);
                        setSearchTerm('');
                        setDisplayCount(10);
                        setShowDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-amber-50 transition ${
                        ingredientId === option.ingredientId ? 'bg-amber-100 font-semibold' : ''
                      }`}
                    >
                      <div className="font-medium text-gray-900">{option.ingredientName}</div>
                      <div className="text-xs text-gray-500">{option.unitName}</div>
                    </button>
                  ))}
                  {!searchTerm && displayCount < ingredientOptions.length && (
                    <div className="px-3 py-2 text-xs text-gray-500 text-center border-t border-gray-100 bg-gray-50">
                      Loading more... ({displayCount}/{ingredientOptions.length})
                    </div>
                  )}
                  {!searchTerm && displayCount >= ingredientOptions.length && ingredientOptions.length > 10 && (
                    <div className="px-3 py-2 text-xs text-gray-500 text-center border-t border-gray-100">
                      Showing all {ingredientOptions.length} ingredients
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Quantity used</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Example: 0.5"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-amber-500 focus:ring-amber-200"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Notes (optional)</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Spillage, damage..."
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-amber-500 focus:ring-amber-200"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || isLoadingOptions}
        className={`w-full rounded-xl bg-sky-500 text-white font-semibold shadow-lg shadow-sky-500/30 hover:bg-sky-600 transition-all focus:ring-2 focus:ring-offset-2 focus:ring-sky-400 disabled:opacity-60 disabled:cursor-not-allowed ${compact ? 'py-2 text-sm' : 'py-3 text-base'
          }`}
      >
        {isSubmitting ? 'Saving...' : 'Save entry'}
      </button>
    </form>
  );
};