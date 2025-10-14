import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import catalogService from '../../services/catalogService';
import { CatalogRecipe, RecipePageResponse } from '../../types';
import RecipeModal from '../../components/recipe/RecipeModal';
import RecipeDetailModal from '../../components/recipe/RecipeDetailModal';
import { BookOpen, ChefHat, Loader, RefreshCw, Settings, Trash2, Plus, Search, Eye, RotateCcw } from 'lucide-react';

export default function RecipeManagement() {
  const [data, setData] = useState<RecipePageResponse | null>(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [status, setStatus] = useState<string>('');
  const [showDeleted, setShowDeleted] = useState(false);
  // Removed extra filters for a single-field search UX
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogRecipe | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewing, setViewing] = useState<CatalogRecipe | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const searchStatus = showDeleted ? 'DELETED' : (status || undefined);
      const res = await catalogService.searchRecipes({ keyword: debouncedKeyword || undefined, status: searchStatus, page, size, sortBy: 'updateAt', sortDir: 'desc' });
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword), 500);
    return () => clearTimeout(t);
  }, [keyword]);

  useEffect(() => { load(); }, [page, size, debouncedKeyword, status, showDeleted]);

  const onSearch = () => { setPage(0); setDebouncedKeyword(keyword); };

  const onSaved = () => { setModalOpen(false); setEditing(null); load(); };

  const totalPages = data?.totalPages || 0;
  const totalElements = data?.totalElements || 0;
  const currentActive = (data?.content || []).filter(r => r.status === 'ACTIVE').length;
  const currentInactive = (data?.content || []).filter(r => r.status !== 'ACTIVE').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className="max-w-7xl mx-auto px-2 py-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white p-2 rounded-lg">
                  <ChefHat className="w-8 h-8 text-amber-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Recipe Management</h1>
                  <p className="text-amber-100 mt-1">Manage product recipes</p>
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
            {/* Search & Status Filter (single-field like IngredientManagement) */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search recipes..."
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
                  value={status}
                  onChange={(e) => { setStatus(e.target.value); setPage(0); }}
                  className="w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                >
                  <option value="">All status</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
              {/* No explicit search button (debounced) */}
              <div></div>
            </div>

              {/* Simple stats */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-blue-800">{showDeleted ? 'Deleted Recipes' : 'Total Recipes'}</div>
                <div className="text-2xl font-bold text-blue-700">{totalElements}</div>
              </div>
              {!showDeleted ? (
                <>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-sm text-green-800">Active (current page)</div>
                    <div className="text-2xl font-bold text-green-700">{currentActive}</div>
                  </div>
                  <div className="bg-gray-100 rounded-lg p-4">
                    <div className="text-sm text-gray-700">Inactive (current page)</div>
                    <div className="text-2xl font-bold text-gray-800">{currentInactive}</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="text-sm text-red-800">Deleted (current page)</div>
                    <div className="text-2xl font-bold text-red-700">{totalElements}</div>
                  </div>
                  <div className="bg-gray-100 rounded-lg p-4">
                    <div className="text-sm text-gray-700">Viewing deleted recipes</div>
                    <div className="text-2xl font-bold text-gray-800">—</div>
                  </div>
                </>
              )}
            </div>

            {/* Action buttons aligned to right under stats */}
            <div className="mb-4 flex justify-end gap-2">
              <button
                onClick={() => setShowDeleted(!showDeleted)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  showDeleted 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
              >
                <Trash2 className="w-5 h-5" />
                <span>{showDeleted ? 'Hide Deleted' : 'View Deleted'}</span>
              </button>
              {!showDeleted && (
                <button
                  onClick={() => { setEditing(null); setModalOpen(true); }}
                  className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg"
                >
                  <Plus className="w-5 h-5" />
                  <span>Create recipe</span>
                </button>
              )}
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-medium text-gray-700">ID</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Name</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Version</th>
                      <th className="px-4 py-3 font-medium text-gray-700">PD</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Category</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Status</th>
                      <th className="px-4 py-3 font-medium text-gray-700">Updated At</th>
                      <th className="px-4 py-3 font-medium text-gray-700 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.content.map(r => (
                      <tr key={r.recipeId} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2">{r.recipeId}</td>
                        <td className="px-4 py-2">{r.name}</td>
                        <td className="px-4 py-2">{r.version}</td>
                        <td className="px-4 py-2">{r.productDetail?.pdId}</td>
                        <td className="px-4 py-2">{r.category?.name || '—'}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            r.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 
                            r.status === 'DELETED' ? 'bg-red-100 text-red-700' : 
                            'bg-gray-100 text-gray-700'
                          }`}>{r.status}</span>
                        </td>
                        <td className="px-4 py-2">{new Date(r.updateAt).toLocaleString()}</td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2 justify-end">
                            <button className="p-2 rounded hover:bg-gray-100" title="View details" onClick={() => { setViewing(r); setDetailOpen(true); }}>
                              <Eye className="w-4 h-4" />
                            </button>
                            {r.status !== 'DELETED' && (
                              <>
                                <button className="p-2 rounded hover:bg-gray-100" title="Edit" onClick={() => { setEditing(r); setModalOpen(true); }}>
                                  <Settings className="w-4 h-4" />
                                </button>
                                <button className="p-2 rounded hover:bg-red-50 text-red-600" title="Delete" onClick={async () => {
                                  try {
                                    await catalogService.deleteRecipe(r.recipeId);
                                    toast.success('Recipe deleted successfully');
                                    load();
                                  } catch (e: any) {
                                    const message = e?.response?.data?.message || e?.message || 'Failed to delete recipe';
                                    toast.error(message);
                                  }
                                }}>
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {r.status === 'DELETED' && (
                              <button 
                                className="p-2 rounded hover:bg-green-50 text-green-600" 
                                title="Restore recipe"
                                onClick={async () => {
                                  try {
                                    await catalogService.restoreRecipe(r.recipeId);
                                    toast.success('Recipe restored successfully');
                                    load();
                                  } catch (e: any) {
                                    const message = e?.response?.data?.message || e?.message || 'Failed to restore recipe';
                                    toast.error(message);
                                  }
                                }}
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
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
              <div className="text-sm text-gray-600">Trang {page + 1}/{totalPages || 1} • Tổng {totalElements} recipes</div>
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

        <RecipeModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} onSaved={onSaved} recipe={editing} />
        <RecipeDetailModal open={detailOpen} onClose={() => { setDetailOpen(false); setViewing(null); }} recipe={viewing} />
      </div>
    </div>
  );
}


