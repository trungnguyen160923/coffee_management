import React, { useEffect, useState } from 'react';
import catalogService from '../../services/catalogService';
import { CatalogSupplier, SupplierPageResponse } from '../../types';
import { Truck, Loader, RefreshCw, Search, Eye } from 'lucide-react';

export default function SupplierManagement() {
  const [data, setData] = useState<SupplierPageResponse | null>(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewing, setViewing] = useState<CatalogSupplier | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await catalogService.getSuppliers({ 
        search: debouncedKeyword || undefined, 
        page, 
        size, 
        sortBy: 'updateAt', 
        sortDirection: 'DESC' 
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

  useEffect(() => { load(); }, [page, size, debouncedKeyword]);

  const totalPages = data?.totalPages || 0;
  const totalElements = data?.totalElements || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className="max-w-7xl mx-auto px-2 py-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white p-2 rounded-lg">
                  <Truck className="w-8 h-8 text-amber-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Supplier Management</h1>
                  <p className="text-amber-100 mt-1">View supplier information</p>
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
                  placeholder="Search suppliers..."
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
              <div></div>
              <div></div>
            </div>

            {/* Simple stats */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-blue-800">Total Suppliers</div>
                <div className="text-2xl font-bold text-blue-700">{totalElements}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-green-800">Active Suppliers</div>
                <div className="text-2xl font-bold text-green-700">{totalElements}</div>
              </div>
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="text-sm text-gray-700">Current Page</div>
                <div className="text-2xl font-bold text-gray-800">{data?.content?.length || 0}</div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-medium text-gray-700">ID</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Name</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Contact Person</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Phone</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Email</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Address</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Updated At</th>
                      <th className="px-4 py-3 font-medium text-gray-700 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.content.map(supplier => (
                      <tr key={supplier.supplierId} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2">{supplier.supplierId}</td>
                        <td className="px-4 py-2 font-medium">{supplier.name}</td>
                        <td className="px-4 py-2">{supplier.contactName || '—'}</td>
                        <td className="px-4 py-2">{supplier.phone || '—'}</td>
                        <td className="px-4 py-2">{supplier.email || '—'}</td>
                        <td className="px-4 py-2">{supplier.address || '—'}</td>
                        <td className="px-4 py-2">{new Date(supplier.updateAt).toLocaleString()}</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2 justify-end">
                            <button 
                              className="p-2 rounded hover:bg-gray-100" 
                              title="View details" 
                              onClick={() => { setViewing(supplier); setDetailOpen(true); }}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(!data || data.content.length === 0) && (
                      <tr>
                        <td colSpan={8} className="px-4 py-6 text-center text-gray-500">No data available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">Trang {page + 1}/{totalPages || 1} • Tổng {totalElements} suppliers</div>
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

        {/* Supplier Detail Modal */}
        {detailOpen && viewing && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={() => { setDetailOpen(false); setViewing(null); }} />
              <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
              <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                <div className="bg-white px-6 pt-6 pb-4">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="bg-amber-50 p-2 rounded-lg">
                        <Truck className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{viewing.name}</h3>
                        <div className="text-sm text-gray-500">Supplier ID #{viewing.supplierId}</div>
                      </div>
                    </div>
                    <button onClick={() => { setDetailOpen(false); setViewing(null); }} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Close">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Contact Person</div>
                      <div className="mt-1 text-gray-900 font-semibold">{viewing.contactName || '—'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Phone</div>
                      <div className="mt-1 text-gray-900 font-semibold">{viewing.phone || '—'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Email</div>
                      <div className="mt-1 text-gray-900 font-semibold">{viewing.email || '—'}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Address</div>
                      <div className="mt-1 text-gray-900 font-semibold">{viewing.address || '—'}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Created: {new Date(viewing.createAt).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Updated: {new Date(viewing.updateAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
