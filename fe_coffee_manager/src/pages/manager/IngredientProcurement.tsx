import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Truck, ShoppingCart, Search, Loader, RefreshCw, Plus, Minus, Trash2 } from 'lucide-react';
import catalogService from '../../services/catalogService';
import { CatalogIngredient, CatalogSupplier, IngredientPageResponse } from '../../types';
import { useAuth } from '../../context/AuthContext';

type CartItem = {
  ingredient: CatalogIngredient;
  quantity: number;
};

export default function IngredientProcurement() {
  const { managerBranch } = useAuth();
  const [supplierList, setSupplierList] = useState<CatalogSupplier[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | undefined>(undefined);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [ingredientsPage, setIngredientsPage] = useState<IngredientPageResponse | null>(null);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Load suppliers once
  useEffect(() => {
    (async () => {
      try {
        const res = await catalogService.getSuppliers({ page: 0, size: 100, sortBy: 'name', sortDirection: 'ASC' });
        setSupplierList(res.content || []);
      } catch {}
    })();
  }, []);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword), 500);
    return () => clearTimeout(t);
  }, [keyword]);

  // Load ingredients by supplier/search
  const loadIngredients = async () => {
    setLoading(true);
    try {
      const res = await catalogService.searchIngredients({
        page,
        size,
        search: debouncedKeyword || undefined,
        supplierId: selectedSupplierId,
        sortBy: 'updateAt',
        sortDirection: 'DESC'
      });
      setIngredientsPage(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadIngredients(); }, [page, size, debouncedKeyword, selectedSupplierId]);

  const addToCart = (ingredient: CatalogIngredient) => {
    setCart(prev => {
      const existingIdx = prev.findIndex(ci => ci.ingredient.ingredientId === ingredient.ingredientId);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = { ...next[existingIdx], quantity: next[existingIdx].quantity + 1 };
        return next;
      }
      return [...prev, { ingredient, quantity: 1 }];
    });
  };

  const updateQty = (ingredientId: number, qty: number) => {
    setCart(prev => prev.map(ci => ci.ingredient.ingredientId === ingredientId ? { ...ci, quantity: Math.max(1, qty) } : ci));
  };

  const removeFromCart = (ingredientId: number) => {
    setCart(prev => prev.filter(ci => ci.ingredient.ingredientId !== ingredientId));
  };

  const clearCart = () => setCart([]);

  const subtotal = useMemo(() => (
    cart.reduce((sum, ci) => sum + (Number(ci.ingredient.unitPrice) || 0) * ci.quantity, 0)
  ), [cart]);

  const placeOrder = async () => {
    if (!selectedSupplierId) {
      toast.error('Please select a supplier');
      return;
    }
    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    const payload = {
      branchId: managerBranch?.branchId,
      items: cart.map(ci => ({
        ingredientId: ci.ingredient.ingredientId,
        qty: ci.quantity,
        unitCode: ci.ingredient.unit?.code as string,
        unitPrice: Number(ci.ingredient.unitPrice),
        supplierId: ci.ingredient.supplier?.supplierId as number
      }))
    };
    try {
      const res = await catalogService.createPurchaseOrdersBulk(payload);
      toast.success(`Created ${res?.length ?? 0} purchase order(s)`);
      clearCart();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create purchase orders');
    }
  };

  const totalPages = ingredientsPage?.totalPages || 0;
  const totalElements = ingredientsPage?.totalElements || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      <div className="max-w-7xl mx-auto px-2 py-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-white p-2 rounded-lg">
                  <ShoppingCart className="w-8 h-8 text-amber-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Procurement</h1>
                  <p className="text-amber-100 mt-1">Order ingredients from suppliers</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadIngredients}
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

          <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Filters + Ingredient list */}
            <div className="lg:col-span-2">
              <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search ingredients..."
                    value={keyword}
                    onChange={(e) => { setKeyword(e.target.value); setPage(0); }}
                    className="w-full px-4 py-3 pl-10 pr-4 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                    {loading ? <Loader className="w-5 h-5 text-gray-400 animate-spin" /> : <Search className="w-5 h-5 text-gray-400" />}
                  </div>
                </div>
                <div>
                  <select
                    value={selectedSupplierId ?? ''}
                    onChange={(e) => { const v = e.target.value; setSelectedSupplierId(v ? Number(v) : undefined); setPage(0); }}
                    className="w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  >
                    <option value="">All suppliers</option>
                    {supplierList.map(s => (
                      <option key={s.supplierId} value={s.supplierId}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div></div>
              </div>

              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr className="text-left">
                        <th className="px-4 py-3 font-medium text-gray-700">Ingredient</th>
                        <th className="px-4 py-3 font-medium text-gray-700">Supplier</th>
                        <th className="px-4 py-3 font-medium text-gray-700">Unit</th>
                        <th className="px-4 py-3 font-medium text-gray-700">Unit Price</th>
                        <th className="px-4 py-3 font-medium text-gray-700 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ingredientsPage?.content.map(ing => (
                        <tr key={ing.ingredientId} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium">{ing.name}</td>
                          <td className="px-4 py-2">{ing.supplier?.name || '—'}</td>
                          <td className="px-4 py-2">{ing.unit?.name || ing.unit?.code || '—'}</td>
                          <td className="px-4 py-2">{Number(ing.unitPrice).toLocaleString('vi-VN')}đ</td>
                          <td className="px-4 py-2">
                            <div className="flex gap-2 justify-end">
                              <button
                                className="px-3 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                                onClick={() => addToCart(ing)}
                              >
                                Add
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {(!ingredientsPage || ingredientsPage.content.length === 0) && (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-gray-500">No data available</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-600">Trang {page + 1}/{totalPages || 1} • Tổng {totalElements} ingredients</div>
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

            {/* Right: Cart */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-amber-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Order Cart</h3>
                  </div>
                  <button className="text-sm text-gray-500 hover:text-gray-700" onClick={clearCart}>Clear</button>
                </div>

                <div className="space-y-3 max-h-80 overflow-auto pr-1">
                  {cart.map(ci => (
                    <div key={ci.ingredient.ingredientId} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border">
                      <div>
                        <div className="font-medium text-gray-900">{ci.ingredient.name}</div>
                        <div className="text-xs text-gray-500">{ci.ingredient.unit?.name || ci.ingredient.unit?.code || '—'} • {Number(ci.ingredient.unitPrice).toLocaleString('vi-VN')}đ</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="p-1 rounded bg-white border hover:bg-gray-50" onClick={() => updateQty(ci.ingredient.ingredientId, ci.quantity - 1)}><Minus className="w-4 h-4" /></button>
                        <input
                          className="w-14 text-center border rounded py-1"
                          type="number"
                          value={ci.quantity}
                          onChange={e => updateQty(ci.ingredient.ingredientId, Number(e.target.value || '1'))}
                          min={1}
                        />
                        <button className="p-1 rounded bg-white border hover:bg-gray-50" onClick={() => updateQty(ci.ingredient.ingredientId, ci.quantity + 1)}><Plus className="w-4 h-4" /></button>
                        <button className="p-1 rounded bg-red-50 text-red-600 hover:bg-red-100" onClick={() => removeFromCart(ci.ingredient.ingredientId)} title="Remove"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                  {cart.length === 0 && (
                    <div className="text-center text-gray-500 py-8">No items in cart</div>
                  )}
                </div>

                <div className="mt-4 border-t pt-3">
                  <div className="flex items-center justify-between text-sm text-gray-700">
                    <span>Subtotal</span>
                    <span className="font-semibold text-gray-900">{subtotal.toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>
                <button
                  className="mt-4 w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                  onClick={placeOrder}
                  disabled={cart.length === 0 || !selectedSupplierId || !managerBranch?.branchId}
                >
                  Place Order
                </button>
                {(!selectedSupplierId || !managerBranch?.branchId) && (
                  <div className="mt-2 text-xs text-gray-500">
                    {!selectedSupplierId ? 'Select a supplier to enable ordering.' : ''}
                    {!managerBranch?.branchId ? ' Manager branch is not set.' : ''}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


