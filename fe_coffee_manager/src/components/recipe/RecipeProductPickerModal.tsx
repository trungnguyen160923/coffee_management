import React, { useEffect, useState } from 'react';
import { X, Search } from 'lucide-react';
import catalogService from '../../services/catalogService';
import { CatalogProduct } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  onPicked: (pdId: number, productName: string, sizeName?: string) => void;
  // Allow selecting this pdId even if it already has a recipe (for edit mode)
  allowPdId?: number;
}

export default function RecipeProductPickerModal({ open, onClose, onPicked, allowPdId }: Props) {
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [selectedPdId, setSelectedPdId] = useState<number | ''>('');
  const [pdIdsWithRecipesByProduct, setPdIdsWithRecipesByProduct] = useState<Record<number, Set<number>>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await catalogService.searchProducts({ page: 0, size: 20, search: keyword || undefined, active: true, sortBy: 'updateAt', sortDirection: 'DESC' });
      const list = res.content || [];
      setProducts(list);

      // Fetch recipes for these products to know which pdIds are already used
      const results = await Promise.allSettled(
        list.map(p => catalogService.searchRecipes({ productId: p.productId, page: 0, size: 100 }))
      );
      const map: Record<number, Set<number>> = {};
      results.forEach((r, idx) => {
        const p = list[idx];
        if (!p) return;
        const set = new Set<number>();
        if (r.status === 'fulfilled') {
          for (const rc of (r.value?.content || [])) {
            const pdId = (rc as any)?.productDetail?.pdId;
            if (typeof pdId === 'number') set.add(pdId);
          }
        }
        map[p.productId] = set;
      });
      setPdIdsWithRecipesByProduct(map);
    } finally { setLoading(false); }
  };

  useEffect(() => { if (open) { setSelectedProduct(null); setSelectedPdId(''); load(); } }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={onClose} />
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
        <div className="inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full">
          <div className="bg-white px-6 pt-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Chọn sản phẩm và size</h3>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Close"><X className="w-6 h-6" /></button>
            </div>

            <div className="mb-4 flex gap-2">
              <div className="relative flex-1">
                <input
                  placeholder="Tìm theo tên, SKU..."
                  value={keyword}
                  onChange={e => setKeyword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg outline-none hover:border-amber-400 focus:border-amber-500"
                />
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
              <button onClick={load} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700">Tìm</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[50vh] overflow-auto pr-2">
              {products.map(p => (
                <div key={p.productId} className={`border rounded-lg p-3 hover:border-amber-400 ${selectedProduct?.productId === p.productId ? 'border-amber-500' : 'border-gray-200'}`}>
                  <div className="font-semibold text-gray-900">{p.name}</div>
                  <div className="text-xs text-gray-500">#{p.productId} • {p.sku || '—'}</div>
                  <div className="mt-2">
                    <label className="text-sm text-gray-600">Chọn size</label>
                    <select
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg outline-none hover:border-amber-400 focus:border-amber-500"
                      value={selectedProduct?.productId === p.productId ? (selectedPdId as any) : ''}
                      onChange={e => { setSelectedProduct(p); setSelectedPdId(Number(e.target.value)); }}
                    >
                      <option value="">— Chọn —</option>
                  {p.productDetails
                    ?.filter(pd => {
                      const used = pdIdsWithRecipesByProduct[p.productId]?.has(pd.pdId);
                      if (!used) return true;
                      return allowPdId === pd.pdId; // keep visible if editing this one
                    })
                    .map(pd => (
                      <option key={pd.pdId} value={pd.pdId}>Size {pd.size?.name || '—'} • {Number(pd.price).toLocaleString()}đ</option>
                    ))}
                    </select>
                  </div>
                </div>
              ))}
              {!products.length && (
                <div className="text-center text-gray-500 py-8 col-span-2">Không tìm thấy sản phẩm</div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50" onClick={onClose}>Hủy</button>
              <button
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                disabled={!selectedPdId}
                onClick={() => {
                  if (selectedPdId) {
                    const pd = selectedProduct?.productDetails?.find(d => d.pdId === Number(selectedPdId));
                    onPicked(Number(selectedPdId), selectedProduct?.name || `PD #${selectedPdId}`, pd?.size?.name || undefined);
                    onClose();
                  }
                }}
              >
                Chọn
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


