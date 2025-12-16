import React, { useState, useEffect, useMemo } from 'react';
import { stockService, StockSearchParams, StockPageResponse, StockResponse, ManagerStockAdjustPayload } from '../../services/stockService';
import { useAuth } from '../../context/AuthContext';
import { Package, AlertTriangle, RefreshCw, Search, Eye, Edit3 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { StockManagementSkeleton } from '../../components/manager/skeletons';

const adjustmentReasons = [
  { value: 'RECOUNT', label: 'Inventory recount' },
  { value: 'SPILLAGE', label: 'Spillage / damage' },
  { value: 'TRANSFER', label: 'Manual transfer' },
  { value: 'OTHER', label: 'Other' }
];

const DAY_MINUTES = 24 * 60;
const BUSINESS_BUFFER_MINUTES = 15;

const parseTimeToMinutes = (timeStr?: string | null): number | null => {
  if (!timeStr) return null;
  const [hourStr, minuteStr] = timeStr.split(':');
  const hours = parseInt(hourStr ?? '0', 10);
  const minutes = parseInt(minuteStr ?? '0', 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }
  return (hours * 60) + minutes;
};

const addMinutesToTimeLabel = (timeStr?: string | null, minutesToAdd: number = 0): string => {
  if (!timeStr) return '--:--';
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0] ?? '0', 10);
  const minutes = parseInt(parts[1] ?? '0', 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return '--:--';
  const totalMinutes = ((hours * 60) + minutes + minutesToAdd + DAY_MINUTES) % DAY_MINUTES;
  const newHours = Math.floor(totalMinutes / 60);
  const newMinutes = totalMinutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
};

const formatTimeLabel = (timeStr?: string | null): string => {
  if (!timeStr) return '--:--';
  return timeStr.slice(0, 5);
};

const isNowWithinBusinessWindow = (
  openMinutes: number | null,
  closeMinutes: number | null,
  nowMinutes: number
): boolean => {
  if (openMinutes === null || closeMinutes === null) return false;
  const windowStart = openMinutes;
  const windowEnd = (closeMinutes + BUSINESS_BUFFER_MINUTES) % DAY_MINUTES;
  const crossesMidnight = windowEnd <= windowStart;
  if (crossesMidnight) {
    return nowMinutes >= windowStart || nowMinutes < windowEnd;
  }
  return nowMinutes >= windowStart && nowMinutes < windowEnd;
};

const StockManagement: React.FC = () => {
  const { managerBranch, user } = useAuth();
  const [stockData, setStockData] = useState<StockPageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState<boolean | undefined>(undefined);
  const [viewingStock, setViewingStock] = useState<StockResponse | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustingStock, setAdjustingStock] = useState<StockResponse | null>(null);
  const [physicalQuantity, setPhysicalQuantity] = useState('');
  const [adjustReason, setAdjustReason] = useState('RECOUNT');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);
  const [forceAdjust, setForceAdjust] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  const openMinutes = useMemo(
    () => parseTimeToMinutes(managerBranch?.openHours),
    [managerBranch]
  );
  const closeMinutes = useMemo(
    () => parseTimeToMinutes(managerBranch?.endHours),
    [managerBranch]
  );

  const isWithinBusinessHours = useMemo(() => {
    return isNowWithinBusinessWindow(openMinutes, closeMinutes, nowMinutes);
  }, [openMinutes, closeMinutes, nowMinutes]);

  const openLabel = useMemo(
    () => formatTimeLabel(managerBranch?.openHours),
    [managerBranch]
  );
  const closeLabel = useMemo(
    () => formatTimeLabel(managerBranch?.endHours),
    [managerBranch]
  );
  const closeBufferLabel = useMemo(
    () => addMinutesToTimeLabel(managerBranch?.endHours, BUSINESS_BUFFER_MINUTES),
    [managerBranch]
  );

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword), 500);
    return () => clearTimeout(timer);
  }, [keyword]);

  // Load data when dependencies change
  useEffect(() => {
    loadStocks();
  }, [page, size, debouncedKeyword, lowStockFilter, managerBranch]);

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const loadStocks = async () => {
    if (!managerBranch?.branchId) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const params: StockSearchParams = {
        search: debouncedKeyword || undefined,
        branchId: managerBranch.branchId,
        lowStock: lowStockFilter,
        page,
        size,
        sortBy: 'lastUpdated',
        sortDirection: 'desc'
      };
      
      const data = await stockService.searchStocks(params);
      
      setStockData(data);
    } catch (err) {
      setError('Error loading stock data');
      console.error('Error loading stocks:', err);
      toast.error('Unable to load stock data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadStocks();
    toast.success('Data refreshed');
  };

  const handleViewStock = (stock: StockResponse) => {
    setViewingStock(stock);
    setShowDetail(true);
  };

  const openAdjustModal = (stock: StockResponse) => {
    setAdjustingStock(stock);
    setPhysicalQuantity(stock.quantity.toString());
    setAdjustReason('RECOUNT');
    setAdjustNotes('');
    setForceAdjust(false);
    setShowAdjustModal(true);
  };

  const closeAdjustModal = () => {
    setShowAdjustModal(false);
    setAdjustingStock(null);
    setForceAdjust(false);
  };

  const handleManagerAdjust = async () => {
    if (!managerBranch?.branchId || !adjustingStock) return;
    if (!physicalQuantity || Number(physicalQuantity) < 0) {
      toast.error('Please enter a valid physical quantity');
      return;
    }
    if (isWithinBusinessHours && !forceAdjust) {
      toast.error('Adjustments are locked during business hours. Enable force adjust to continue.');
      return;
    }

    const payload: ManagerStockAdjustPayload = {
      branchId: managerBranch.branchId,
      ingredientId: adjustingStock.ingredientId,
      physicalQuantity: Number(physicalQuantity),
      reason: adjustReason,
      notes: adjustNotes,
      adjustedBy: user?.name || user?.fullname,
      userId: user?.user_id ? Number(user.user_id) : undefined,
      forceAdjust,
    };

    setSubmittingAdjustment(true);
    try {
      await stockService.adjustStockQuantity(payload);
      toast.success('Stock quantity updated');
      closeAdjustModal();
      await loadStocks();
    } catch (error: any) {
      console.error('Failed to adjust stock', error);
      toast.error(error?.message || 'Unable to adjust stock');
    } finally {
      setSubmittingAdjustment(false);
    }
  };

  const getTotalStockValue = () => {
    // Use totalStockValue from API (calculated for all matching stocks, not just current page)
    return stockData?.totalStockValue || 0;
  };

  const getLowStockCount = () => {
    if (!stockData?.content) return 0;
    return stockData.content.filter(stock => stock.isLowStock).length;
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    }).format(num);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(num);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  if (loading && !stockData) {
    return <StockManagementSkeleton />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-2 py-4 sm:px-4 lg:px-4">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header actions */}
          <div className="flex items-center justify-between px-8 pt-6 pb-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Stock Management</h1>
              <p className="text-sm text-slate-500">Track and manage ingredient inventory</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center space-x-2 rounded-lg bg-slate-100 text-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              {managerBranch && (
                <span
                  className={`text-xs md:text-sm px-3 py-1 rounded-full font-medium ${
                    isWithinBusinessHours ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                  }`}
                  title={`Operating hours ${openLabel} - ${closeLabel} (buffer +${BUSINESS_BUFFER_MINUTES}m)`}
                >
                  {isWithinBusinessHours
                    ? `Adjustments locked until ${closeBufferLabel}`
                    : `Adjustment window open (after ${closeLabel} + ${BUSINESS_BUFFER_MINUTES}m)`}
                </span>
              )}
            </div>
          </div>

          <div className="p-8 pt-4">
            {/* Stats Cards */}
            {stockData && (
              <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-blue-800">Total Items</div>
                  <div className="text-2xl font-bold text-blue-700">{stockData.totalElements}</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="text-sm text-red-800">Low Stock</div>
                  <div className="text-2xl font-bold text-red-700">{getLowStockCount()}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm text-green-800">Total Stock Value</div>
                  <div className="text-2xl font-bold text-green-700">{formatCurrency(getTotalStockValue())}</div>
                </div>
              </div>
            )}

            {/* Search and Filters */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by ingredient name..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="w-full px-4 py-3 pl-10 pr-4 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                  {loading ? (
                    <div className="w-5 h-5 text-gray-400 animate-spin border-2 border-gray-300 border-t-sky-500 rounded-full"></div>
                  ) : (
                    <Search className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
              <div>
                <select
                  value={lowStockFilter === undefined ? '' : lowStockFilter.toString()}
                  onChange={(e) => setLowStockFilter(e.target.value === '' ? undefined : e.target.value === 'true')}
                  className="w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                >
                  <option value="">All Stock Status</option>
                  <option value="true">Low Stock</option>
                  <option value="false">Normal</option>
                </select>
              </div>
              <div>
                <select
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  className="w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                >
                  <option value={5}>5/page</option>
                  <option value={10}>10/page</option>
                  <option value={20}>20/page</option>
                  <option value={50}>50/page</option>
                </select>
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Data Loading Error</h3>
                    <div className="mt-1 text-sm text-red-700">{error}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Result info */}
            {stockData && (
              <div className="mb-4 flex items-center justify-between">
                <p className="text-gray-600">
                  Found <span className="font-semibold text-gray-900">{stockData.totalElements}</span> stock items
                </p>
              </div>
            )}

            {/* Stock Table */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="overflow-auto">
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
                  </div>
                ) : !stockData?.content || stockData.content.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Stock Data</h3>
                    <p className="text-gray-500">Try changing filters to search</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="text-left">
                        <th className="px-4 py-3 font-medium text-gray-700">Ingredient</th>
                        <th className="px-4 py-3 font-medium text-gray-700">Quantity</th>
                        <th className="px-4 py-3 font-medium text-gray-700">Unit</th>
                        <th className="px-4 py-3 font-medium text-gray-700">Threshold</th>
                        <th className="px-4 py-3 font-medium text-gray-700">Status</th>
                        <th className="px-4 py-3 font-medium text-gray-700">Avg Price</th>
                        <th className="px-4 py-3 font-medium text-gray-700">Updated</th>
                        <th className="px-4 py-3 font-medium text-gray-700 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockData.content.map((stock) => (
                        <tr key={stock.stockId} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-2">
                            <div className="text-sm font-medium text-gray-900">
                              {stock.ingredientName}
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="text-sm text-gray-900">{formatNumber(stock.quantity)}</div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="text-sm text-gray-500">{stock.unitName}</div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="text-sm text-gray-500">{formatNumber(stock.threshold)}</div>
                          </td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                              stock.isLowStock 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {stock.isLowStock ? 'Low Stock' : 'Normal'}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <div className="text-sm text-gray-900">{formatCurrency(stock.avgCost)}</div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="text-sm text-gray-500">{formatDate(stock.lastUpdated)}</div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex gap-2 justify-end">
                              <button
                                className="p-2 rounded hover:bg-gray-100"
                                title="View details"
                                onClick={() => handleViewStock(stock)}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                className="p-2 rounded hover:bg-sky-50"
                                title="Adjust stock quantity"
                                onClick={() => openAdjustModal(stock)}
                              >
                                <Edit3 className="w-4 h-4 text-sky-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {(!stockData || stockData.content.length === 0) && (
                        <tr>
                          <td colSpan={8} className="px-4 py-6 text-center text-gray-500">No data available</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">Page {page + 1}/{stockData?.totalPages || 1} • Total {stockData?.totalElements || 0} items</div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50" disabled={page === 0} onClick={() => setPage(0)}>First</button>
                <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Prev</button>
                <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, Math.max(1, stockData?.totalPages || 0)) }).map((_, idx) => {
                    const half = 2;
                    let start = Math.max(0, Math.min(page - half, ((stockData?.totalPages || 1) - 1) - (5 - 1)));
                    if ((stockData?.totalPages || 0) <= 5) start = 0;
                    const pageNum = start + idx;
                    if (pageNum >= (stockData?.totalPages || 0)) return null;
                    const active = pageNum === page;
                    return (
                      <button key={pageNum} className={`px-3 py-1 text-sm border rounded-lg ${active ? 'bg-sky-500 text-white border-sky-500' : 'border-gray-300 hover:bg-gray-50'}`} onClick={() => setPage(pageNum)}>
                        {pageNum + 1}
                      </button>
                    );
                  })}
                </div>
                <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50" disabled={(stockData?.totalPages || 0) === 0 || page >= (stockData?.totalPages || 1) - 1} onClick={() => setPage(p => p + 1)}>Next</button>
                <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50" disabled={(stockData?.totalPages || 0) === 0 || page >= (stockData?.totalPages || 1) - 1} onClick={() => setPage((stockData?.totalPages || 1) - 1)}>Last</button>
              </div>
            </div>
          </div>
        </div>

        {/* Stock Detail Modal */}
        {showDetail && viewingStock && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Stock Details</h3>
                  <button
                    onClick={() => setShowDetail(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ×
                  </button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Ingredient</label>
                    <p className="text-sm text-gray-900">{viewingStock.ingredientName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Quantity</label>
                    <p className="text-sm text-gray-900">{formatNumber(viewingStock.quantity)} {viewingStock.unitName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Threshold</label>
                    <p className="text-sm text-gray-900">{formatNumber(viewingStock.threshold)} {viewingStock.unitName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      viewingStock.isLowStock 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {viewingStock.isLowStock ? 'Low Stock' : 'Normal'}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Average Price</label>
                    <p className="text-sm text-gray-900">{formatCurrency(viewingStock.avgCost)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Updated</label>
                    <p className="text-sm text-gray-900">{formatDate(viewingStock.lastUpdated)}</p>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowDetail(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Adjust Stock Modal */}
        {showAdjustModal && adjustingStock && (
          <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Adjust Stock Quantity</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {adjustingStock.ingredientName} • Current system qty: {formatNumber(adjustingStock.quantity)} {adjustingStock.unitName}
                  </p>
                </div>
                <button
                  onClick={closeAdjustModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ×
                </button>
              </div>

              <div className="p-5 space-y-4">
                {managerBranch && (
                  <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                    Operating hours today: <span className="font-semibold">{openLabel}</span> – <span className="font-semibold">{closeLabel}</span>
                    <span className="block text-xs text-gray-500">Adjustments automatically unlock after {closeBufferLabel}</span>
                  </div>
                )}

                {isWithinBusinessHours && (
                  <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <AlertTriangle className="mt-1 h-5 w-5" />
                    <div>
                      <p className="font-semibold">Store is currently open.</p>
                      <p>Stock adjustments are temporarily locked to prevent conflicts with live orders. Enable the force adjust option below if an urgent recount is required and document the reason.</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Physical quantity</label>
                  <input
                    type="number"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
                    value={physicalQuantity}
                    onChange={(e) => setPhysicalQuantity(e.target.value)}
                    min="0"
                    step="0.0001"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Reason</label>
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                  >
                    {adjustmentReasons.map(reason => (
                      <option key={reason.value} value={reason.value}>{reason.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Notes (optional)</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-amber-500 focus:border-amber-500"
                    rows={3}
                    value={adjustNotes}
                    onChange={(e) => setAdjustNotes(e.target.value)}
                    placeholder="Reason for adjustment, observations..."
                  />
                </div>

                {isWithinBusinessHours && (
                  <label className="flex items-start gap-3 rounded-lg border border-amber-100 bg-white px-4 py-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                      checked={forceAdjust}
                      onChange={(e) => setForceAdjust(e.target.checked)}
                    />
                    <div className="text-sm">
                      <p className="font-semibold text-gray-800">Force adjust during business hours</p>
                      <p className="text-gray-500">Requires a documented reason. The action will be logged for audit.</p>
                    </div>
                  </label>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={closeAdjustModal}
                    className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                    disabled={submittingAdjustment}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleManagerAdjust}
                    disabled={submittingAdjustment || (isWithinBusinessHours && !forceAdjust)}
                    title={isWithinBusinessHours && !forceAdjust ? 'Enable force adjust to proceed while the store is open' : undefined}
                    className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
                  >
                    {submittingAdjustment ? 'Applying...' : 'Apply adjustment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockManagement;