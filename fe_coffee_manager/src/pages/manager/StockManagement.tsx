import React, { useState, useEffect } from 'react';
import { stockService, StockSearchParams, StockPageResponse, StockResponse } from '../../services/stockService';
import { useAuth } from '../../context/AuthContext';
import { Package, AlertTriangle, RefreshCw, Search, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';

const StockManagement: React.FC = () => {
  const { managerBranch } = useAuth();
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

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword), 500);
    return () => clearTimeout(timer);
  }, [keyword]);

  // Load data when dependencies change
  useEffect(() => {
    loadStocks();
  }, [page, size, debouncedKeyword, lowStockFilter, managerBranch]);

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

  const getTotalStockValue = () => {
    if (!stockData?.content) return 0;
    return stockData.content.reduce((total, stock) => {
      return total + (stock.quantity * stock.avgCost);
    }, 0);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className="max-w-7xl mx-auto px-2 py-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white p-2 rounded-lg">
                  <Package className="w-8 h-8 text-amber-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Stock Management</h1>
                  <p className="text-amber-100 mt-1">Track and manage ingredient inventory</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Refresh data"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                  <span className="font-medium">Refresh</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-8">
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
                  className="w-full px-4 py-3 pl-10 pr-4 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                  {loading ? (
                    <div className="w-5 h-5 text-gray-400 animate-spin border-2 border-gray-300 border-t-amber-500 rounded-full"></div>
                  ) : (
                    <Search className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
              <div>
                <select
                  value={lowStockFilter === undefined ? '' : lowStockFilter.toString()}
                  onChange={(e) => setLowStockFilter(e.target.value === '' ? undefined : e.target.value === 'true')}
                  className="w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                  className="w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
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
                      <button key={pageNum} className={`px-3 py-1 text-sm border rounded-lg ${active ? 'bg-amber-600 text-white border-amber-600' : 'border-gray-300 hover:bg-gray-50'}`} onClick={() => setPage(pageNum)}>
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
      </div>
    </div>
  );
};

export default StockManagement;