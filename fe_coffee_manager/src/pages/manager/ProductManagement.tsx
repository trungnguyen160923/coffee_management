import { useEffect, useState } from 'react';
import catalogService from '../../services/catalogService';
import { CatalogProduct, ProductPageResponse, CatalogCategory } from '../../types';
import { Coffee, Loader, RefreshCw, Search, Eye } from 'lucide-react';
import ProductDetailModal from '../../components/manager/staff/ProductDetailModal';

export default function ProductManagement() {
  const [data, setData] = useState<ProductPageResponse | null>(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewing, setViewing] = useState<CatalogProduct | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await catalogService.searchProducts({ 
        search: debouncedKeyword || undefined, 
        page, 
        size, 
        sortBy: 'updateAt', 
        sortDirection: 'DESC',
        active: true,
        categoryId
      });
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword), 500);
    return () => clearTimeout(t);
  }, [keyword]);

  useEffect(() => { load(); }, [page, size, debouncedKeyword, categoryId]);

  // Load categories once
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await catalogService.getCategories();
        setCategories(res);
      } catch {}
    };
    void fetchCategories();
  }, []);

  // (Recipe detail is handled inside ProductDetailModal)

  const totalPages = data?.totalPages || 0;
  const totalElements = data?.totalElements || 0;
  const activeProducts = (data?.content || []).filter(p => p.active).length;
  const inactiveProducts = (data?.content || []).filter(p => !p.active).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className="max-w-7xl mx-auto px-2 py-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white p-2 rounded-lg">
                  <Coffee className="w-8 h-8 text-amber-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Product Management</h1>
                  <p className="text-amber-100 mt-1">Coffee Shop Management System</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={load}
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
            {/* Search */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={keyword}
                  onChange={(e) => { setKeyword(e.target.value); setPage(0); }}
                  className="w-full px-4 py-3 pl-10 pr-4 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                  {loading ? (
                    <Loader className="w-5 h-5 text-gray-400 animate-spin" />
                  ) : (
                    <Search className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
              <div>
                <select
                  value={categoryId ?? ''}
                  onChange={(e) => { const v = e.target.value; setCategoryId(v ? Number(v) : undefined); setPage(0); }}
                  className="w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">All categories</option>
                  {categories.map(c => (
                    <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div></div>
            </div>

            {/* Simple stats */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-blue-800">Total Products</div>
                <div className="text-2xl font-bold text-blue-700">{totalElements}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-green-800">Active (current page)</div>
                <div className="text-2xl font-bold text-green-700">{activeProducts}</div>
              </div>
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="text-sm text-gray-700">Inactive (current page)</div>
                <div className="text-2xl font-bold text-gray-800">{inactiveProducts}</div>
              </div>
            </div>

            {/* Result info */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-gray-600">
                Found <span className="font-semibold text-gray-900">{totalElements}</span> products
              </p>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-medium text-gray-700 w-1/4">Product Name</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Description</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Category</th>
                      <th className="px-4 py-3 font-medium text-gray-700">SKU</th>
                      <th className="px-4 py-3 font-medium text-gray-700 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.content.map(product => {
                      const API_BASE = (import.meta as any).env?.API_BASE_URL || 'http://localhost:8000';
                      const imageSrc = product.imageUrl && (product.imageUrl.startsWith('http') ? product.imageUrl : `${API_BASE}/api/catalogs${product.imageUrl}`);
                      return (
                        <tr key={product.productId} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-2 w-1/4">
                            <div className="flex items-center space-x-3">
                              {imageSrc ? (
                                <img
                                  src={imageSrc}
                                  alt={product.name}
                                  className="w-12 h-12 rounded-lg object-cover"
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
                                  <Coffee className="w-6 h-6 text-amber-600" />
                                </div>
                              )}
                              <span className="font-medium text-gray-900">{product.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <p className="text-gray-600 text-sm line-clamp-2">{product.description || 'No description'}</p>
                          </td>
                          <td className="px-4 py-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                              {product.category?.name || 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <span className="font-mono text-sm text-gray-600">{product.sku || 'N/A'}</span>
                          </td>
                          <td className="px-4 py-2">
                            <div className="flex gap-2 justify-end">
                              <button
                                className="p-2 rounded hover:bg-gray-100"
                                title="View details"
                                onClick={() => { setViewing(product); setDetailOpen(true); }}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {(!data || data.content.length === 0) && (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-gray-500">Không có dữ liệu</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">Trang {page + 1}/{totalPages || 1} • Tổng {totalElements} products</div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50" disabled={page === 0} onClick={() => setPage(0)}>First</button>
                <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Prev</button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, Math.max(1, totalPages)) }).map((_, idx) => {
                    const half = 2;
                    let start = Math.max(0, Math.min(page - half, (totalPages - 1) - (5 - 1)));
                    if (totalPages <= 5) start = 0;
                    const pageNum = start + idx;
                    if (pageNum >= totalPages) return null;
                    const active = pageNum === page;
                    return (
                      <button key={pageNum} className={`px-3 py-1 text-sm border rounded-lg ${active ? 'bg-amber-600 text-white border-amber-600' : 'border-gray-300 hover:bg-gray-50'}`} onClick={() => setPage(pageNum)}>
                        {pageNum + 1}
                      </button>
                    );
                  })}
                </div>
                <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50" disabled={totalPages === 0 || page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</button>
                <button className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50" disabled={totalPages === 0 || page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>Last</button>
                <select className="select select-bordered select-sm" value={size} onChange={e => { setSize(Number(e.target.value)); setPage(0); }}>
                  {[5,10,20,50].map(s => <option key={s} value={s}>{s}/page</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <ProductDetailModal open={detailOpen} onClose={() => { setDetailOpen(false); setViewing(null); }} product={viewing} />
      </div>
    </div>
  );
}
