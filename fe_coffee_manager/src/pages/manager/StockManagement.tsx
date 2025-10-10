import React, { useState, useEffect } from 'react';
import { stockService, StockSearchParams, StockPageResponse, StockResponse } from '../../services/stockService';
import { useAuth } from '../../context/AuthContext';
import { Package, AlertTriangle, DollarSign, RefreshCw, Search, Filter, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';

const StockManagement: React.FC = () => {
  const { managerBranch } = useAuth();
  console.log('StockManagement component rendered, managerBranch:', managerBranch);
  const [stockData, setStockData] = useState<StockPageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState<boolean | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);
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
    console.log('loadStocks called, managerBranch:', managerBranch);
    if (!managerBranch?.branchId) {
      console.log('No managerBranch.branchId, returning early');
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
      
      console.log('Calling API with params:', params);
      const data = await stockService.searchStocks(params);
      console.log('Stock data received:', data);
      console.log('Data type:', typeof data);
      console.log('Data content:', data?.content);
      setStockData(data);
    } catch (err) {
      setError('Có lỗi xảy ra khi tải dữ liệu kho');
      console.error('Error loading stocks:', err);
      toast.error('Không thể tải dữ liệu kho');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadStocks();
    toast.success('Đã làm mới dữ liệu');
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

  console.log('StockManagement render - stockData:', stockData, 'loading:', loading, 'error:', error);
  
  return (
    <div className="p-6">
      <div className="mb-4 p-4 bg-red-100 text-red-800">
        DEBUG: Component is rendering. stockData: {stockData ? 'exists' : 'null'}, loading: {loading.toString()}, error: {error || 'none'}
      </div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="h-6 w-6" />
              Quản lý kho
            </h1>
            <p className="text-gray-600 mt-1">Theo dõi và quản lý tồn kho nguyên liệu</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stockData && (
        <div className="mb-4 p-2 bg-yellow-100 text-xs">
          Debug: stockData exists, content length: {stockData.content?.length || 0}
        </div>
      )}
      {stockData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tổng số mặt hàng</p>
                <p className="text-2xl font-bold text-gray-900">{stockData.totalElements}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tồn kho thấp</p>
                <p className="text-2xl font-bold text-red-600">{getLowStockCount()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tổng giá trị kho</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(getTotalStockValue())}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên nguyên liệu..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={lowStockFilter === undefined ? '' : lowStockFilter.toString()}
              onChange={(e) => setLowStockFilter(e.target.value === '' ? undefined : e.target.value === 'true')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Tất cả</option>
              <option value="true">Tồn kho thấp</option>
              <option value="false">Bình thường</option>
            </select>
            <select
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={5}>5/trang</option>
              <option value={10}>10/trang</option>
              <option value={20}>20/trang</option>
              <option value={50}>50/trang</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Lỗi tải dữ liệu</h3>
              <div className="mt-1 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Stock Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : !stockData?.content || stockData.content.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Không có dữ liệu kho</h3>
            <p className="text-gray-500">Thử thay đổi bộ lọc để tìm kiếm</p>
            <p className="text-xs text-gray-400 mt-2">Debug: stockData = {JSON.stringify(stockData)}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nguyên liệu
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Số lượng
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Đơn vị
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngưỡng
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Giá TB
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cập nhật
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {stockData.content.map((stock) => (
                    <tr key={stock.stockId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {stock.ingredientName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatNumber(stock.quantity)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{stock.unitName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{formatNumber(stock.threshold)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          stock.isLowStock 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {stock.isLowStock ? 'Tồn kho thấp' : 'Bình thường'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatCurrency(stock.avgCost)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{formatDate(stock.lastUpdated)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleViewStock(stock)}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          Xem
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {stockData.totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 0}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Trước
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= stockData.totalPages - 1}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Sau
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Hiển thị <span className="font-medium">{page * size + 1}</span> đến{' '}
                      <span className="font-medium">
                        {Math.min((page + 1) * size, stockData.totalElements)}
                      </span>{' '}
                      trong tổng số <span className="font-medium">{stockData.totalElements}</span> kết quả
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setPage(page - 1)}
                        disabled={page === 0}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Trước
                      </button>
                      {Array.from({ length: Math.min(5, stockData.totalPages) }, (_, i) => {
                        const pageNum = Math.max(0, page - 2) + i;
                        if (pageNum >= stockData.totalPages) return null;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              pageNum === page
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum + 1}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setPage(page + 1)}
                        disabled={page >= stockData.totalPages - 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Sau
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Stock Detail Modal */}
      {showDetail && viewingStock && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Chi tiết kho</h3>
                <button
                  onClick={() => setShowDetail(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-500">Nguyên liệu</label>
                  <p className="text-sm text-gray-900">{viewingStock.ingredientName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Số lượng</label>
                  <p className="text-sm text-gray-900">{formatNumber(viewingStock.quantity)} {viewingStock.unitName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Ngưỡng</label>
                  <p className="text-sm text-gray-900">{formatNumber(viewingStock.threshold)} {viewingStock.unitName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Trạng thái</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    viewingStock.isLowStock 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {viewingStock.isLowStock ? 'Tồn kho thấp' : 'Bình thường'}
                  </span>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Giá trung bình</label>
                  <p className="text-sm text-gray-900">{formatCurrency(viewingStock.avgCost)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Cập nhật cuối</label>
                  <p className="text-sm text-gray-900">{formatDate(viewingStock.lastUpdated)}</p>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetail(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockManagement;
