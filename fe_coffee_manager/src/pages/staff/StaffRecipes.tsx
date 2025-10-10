import { useEffect, useMemo, useState } from 'react';
import catalogService from '../../services/catalogService';
import { CatalogCategory, CatalogRecipe } from '../../types';

export default function StaffRecipes() {
    const [recipes, setRecipes] = useState<CatalogRecipe[]>([]);
    const [categories, setCategories] = useState<CatalogCategory[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
    const [search, setSearch] = useState<string>('');
    const [debouncedSearch, setDebouncedSearch] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [detailOpen, setDetailOpen] = useState<boolean>(false);
    const [detail, setDetail] = useState<CatalogRecipe | null>(null);

    // Load categories once
    useEffect(() => {
        (async () => {
            try {
                const cats = await catalogService.getCategories();
                setCategories(Array.isArray(cats) ? cats : []);
            } catch { }
        })();
    }, []);

    // Load recipes whenever category changes
    useEffect(() => {
        // debounce search term
        const handle = setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => clearTimeout(handle);
    }, [search]);

    // Load recipes whenever category or search changes
    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                setError(null);
                // Fetch only ACTIVE recipes, optionally filtered by category
                const page = await catalogService.searchRecipes({
                    status: 'ACTIVE',
                    categoryId: selectedCategoryId === 'all' ? undefined : selectedCategoryId,
                    keyword: debouncedSearch || undefined,
                    page: 0,
                    size: 200
                });
                setRecipes(Array.isArray(page?.content) ? page.content : []);
            } catch (e: any) {
                setError(e?.message || 'Failed to load recipes.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [selectedCategoryId, debouncedSearch]);

    const groupedByCategory = useMemo(() => {
        const map = new Map<string, CatalogRecipe[]>();
        for (const r of recipes) {
            const name = r.category?.name || 'Uncategorized';
            if (!map.has(name)) map.set(name, []);
            map.get(name)!.push(r);
        }
        return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [recipes]);

    const openDetail = (r: CatalogRecipe) => {
        setDetail(r);
        setDetailOpen(true);
    };

    const closeDetail = () => {
        setDetailOpen(false);
        setDetail(null);
    };

    return (
        <div className="p-8">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Recipe List</h1>
            </div>
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Category</label>
                    <select
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                        value={selectedCategoryId === 'all' ? 'all' : String(selectedCategoryId)}
                        onChange={(e) => {
                            const v = e.target.value;
                            setSelectedCategoryId(v === 'all' ? 'all' : Number(v));
                        }}
                    >
                        <option value="all">All</option>
                        {categories.map(c => (
                            <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-1 min-w-[220px]">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search recipes..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-400"
                    />
                </div>
            </div>

            {loading && <div className="bg-white rounded-2xl shadow p-6">Loading...</div>}
            {error && <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl p-4 mb-4">{error}</div>}

            {!loading && !error && (
                <div className="space-y-6">
                    {recipes.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow p-6 text-gray-600">No recipes.</div>
                    ) : (
                        groupedByCategory.map(([catName, items]) => (
                            <div key={catName} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-gray-800">{catName}</h2>
                                    <span className="text-xs text-gray-500">{items.length} recipe(s)</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full table-fixed text-sm">
                                        <colgroup>
                                            <col style={{ width: '28%' }} />
                                            <col style={{ width: '18%' }} />
                                            <col style={{ width: '12%' }} />
                                            <col style={{ width: '12%' }} />
                                            <col style={{ width: '18%' }} />
                                            <col style={{ width: '12%' }} />
                                        </colgroup>
                                        <thead>
                                            <tr className="bg-gray-50 text-left text-gray-600">
                                                <th className="px-6 py-3 font-medium">Name</th>
                                                <th className="px-6 py-3 font-medium">Product</th>
                                                <th className="px-6 py-3 font-medium">Size</th>
                                                <th className="px-6 py-3 font-medium">Version</th>
                                                <th className="px-6 py-3 font-medium">Status</th>
                                                <th className="px-6 py-3 font-medium">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {items.map((r) => (
                                                <tr key={r.recipeId} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 font-semibold text-gray-900">{r.name}</td>
                                                    <td className="px-6 py-4 text-gray-800">{r.productDetail?.pdId ? `#${r.productDetail.pdId}` : '-'}</td>
                                                    <td className="px-6 py-4 text-gray-800">{r.productDetail?.size?.name || '-'}</td>
                                                    <td className="px-6 py-4 text-gray-800">{r.version}</td>
                                                    <td className="px-6 py-4 text-gray-800">{r.status}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <button
                                                            onClick={() => openDetail(r)}
                                                            className="px-2 py-1 text-xs rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 inline-flex"
                                                            title="View details"
                                                        >
                                                            View
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {detailOpen && detail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-800">Recipe Details</h3>
                            <button onClick={closeDetail} className="text-gray-500 hover:text-gray-700">✕</button>
                        </div>
                        <div className="p-6 text-sm text-gray-800 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><span className="text-gray-500">Name:</span> <span className="font-semibold">{detail.name}</span></div>
                                <div><span className="text-gray-500">Version:</span> <span className="font-semibold">{detail.version}</span></div>
                                <div><span className="text-gray-500">Status:</span> <span className="font-semibold">{detail.status}</span></div>
                                <div><span className="text-gray-500">Product/Size:</span> <span className="font-semibold">{detail.productDetail?.size?.name || '-'}</span></div>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-2">Instructions</h4>
                                <div className="whitespace-pre-wrap bg-gray-50 border border-gray-100 rounded-xl p-3 text-gray-700">{detail.instructions || '-'}</div>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-2">Ingredients</h4>
                                {Array.isArray(detail.items) && detail.items.length > 0 ? (
                                    <div className="border border-gray-100 rounded-xl overflow-hidden">
                                        <table className="min-w-full text-xs">
                                            <thead>
                                                <tr className="bg-gray-50 text-gray-600">
                                                    <th className="px-4 py-2 text-left font-medium">Ingredient</th>
                                                    <th className="px-4 py-2 text-left font-medium">Quantity</th>
                                                    <th className="px-4 py-2 text-left font-medium">Unit</th>
                                                    <th className="px-4 py-2 text-left font-medium">Note</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {detail.items.map((it, i) => (
                                                    <tr key={i}>
                                                        <td className="px-4 py-2">{it.ingredient?.name || '-'}</td>
                                                        <td className="px-4 py-2">{String(it.qty ?? '-')}</td>
                                                        <td className="px-4 py-2">{it.unit?.name || it.unit?.code || '-'}</td>
                                                        <td className="px-4 py-2">{it.note || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-gray-600">No ingredients.</div>
                                )}
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                            <button onClick={closeDetail} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


