import React, { useState, useEffect } from 'react';
import { StockSearchParams } from '../../services/stockService';

interface StockFiltersProps {
  onFiltersChange: (filters: StockSearchParams) => void;
  loading?: boolean;
}

interface Branch {
  branchId: number;
  name: string;
}

interface Ingredient {
  ingredientId: number;
  name: string;
}

interface Unit {
  code: string;
  name: string;
}

const StockFilters: React.FC<StockFiltersProps> = ({ onFiltersChange, loading = false }) => {
  const [filters, setFilters] = useState<StockSearchParams>({
    search: '',
    branchId: undefined,
    ingredientId: undefined,
    unitCode: undefined,
    lowStock: undefined,
    page: 0,
    size: 10,
    sortBy: 'lastUpdated',
    sortDirection: 'desc'
  });

  const [branches, setBranches] = useState<Branch[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Mock data - trong thực tế sẽ fetch từ API
  useEffect(() => {
    setBranches([
      { branchId: 1, name: 'Chi nhánh Hà Nội' },
      { branchId: 2, name: 'Chi nhánh TP.HCM' },
      { branchId: 3, name: 'Chi nhánh Đà Nẵng' }
    ]);

    setIngredients([
      { ingredientId: 1, name: 'Cà phê Arabica' },
      { ingredientId: 2, name: 'Cà phê Robusta' },
      { ingredientId: 3, name: 'Sữa tươi' },
      { ingredientId: 4, name: 'Đường' }
    ]);

    setUnits([
      { code: 'kg', name: 'Kilogram' },
      { code: 'g', name: 'Gram' },
      { code: 'l', name: 'Liter' },
      { code: 'ml', name: 'Milliliter' },
      { code: 'pcs', name: 'Pieces' },
      { code: 'box', name: 'Box' },
      { code: 'pack', name: 'Pack' }
    ]);
  }, []);

  const handleFilterChange = (key: keyof StockSearchParams, value: any) => {
    const newFilters = { ...filters, [key]: value, page: 0 }; // Reset to first page
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onFiltersChange(filters);
  };

  const clearFilters = () => {
    const clearedFilters: StockSearchParams = {
      search: '',
      branchId: undefined,
      ingredientId: undefined,
      unitCode: undefined,
      lowStock: undefined,
      page: 0,
      size: 10,
      sortBy: 'lastUpdated',
      sortDirection: 'desc'
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Bộ lọc</h3>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showAdvanced ? 'Ẩn bộ lọc nâng cao' : 'Hiện bộ lọc nâng cao'}
        </button>
      </div>

      <form onSubmit={handleSearch} className="space-y-4">
        {/* Search input */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Tìm kiếm
            </label>
            <input
              type="text"
              id="search"
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Tìm theo tên nguyên liệu, SKU..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? 'Đang tìm...' : 'Tìm kiếm'}
            </button>
          </div>
        </div>

        {/* Advanced filters */}
        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            {/* Branch filter */}
            <div>
              <label htmlFor="branchId" className="block text-sm font-medium text-gray-700 mb-1">
                Chi nhánh
              </label>
              <select
                id="branchId"
                value={filters.branchId || ''}
                onChange={(e) => handleFilterChange('branchId', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tất cả chi nhánh</option>
                {branches.map((branch) => (
                  <option key={branch.branchId} value={branch.branchId}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Ingredient filter */}
            <div>
              <label htmlFor="ingredientId" className="block text-sm font-medium text-gray-700 mb-1">
                Nguyên liệu
              </label>
              <select
                id="ingredientId"
                value={filters.ingredientId || ''}
                onChange={(e) => handleFilterChange('ingredientId', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tất cả nguyên liệu</option>
                {ingredients.map((ingredient) => (
                  <option key={ingredient.ingredientId} value={ingredient.ingredientId}>
                    {ingredient.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit filter */}
            <div>
              <label htmlFor="unitCode" className="block text-sm font-medium text-gray-700 mb-1">
                Đơn vị
              </label>
              <select
                id="unitCode"
                value={filters.unitCode || ''}
                onChange={(e) => handleFilterChange('unitCode', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tất cả đơn vị</option>
                {units.map((unit) => (
                  <option key={unit.code} value={unit.code}>
                    {unit.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Low stock filter */}
            <div>
              <label htmlFor="lowStock" className="block text-sm font-medium text-gray-700 mb-1">
                Trạng thái
              </label>
              <select
                id="lowStock"
                value={filters.lowStock === undefined ? '' : filters.lowStock.toString()}
                onChange={(e) => handleFilterChange('lowStock', e.target.value === '' ? undefined : e.target.value === 'true')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tất cả</option>
                <option value="true">Tồn kho thấp</option>
                <option value="false">Bình thường</option>
              </select>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={clearFilters}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Xóa bộ lọc
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <label htmlFor="size" className="text-sm font-medium text-gray-700">
                Hiển thị:
              </label>
              <select
                id="size"
                value={filters.size || 10}
                onChange={(e) => handleFilterChange('size', parseInt(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default StockFilters;
