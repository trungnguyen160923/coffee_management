import React, { useEffect, useState } from 'react';
import { catalogService } from '../../services';
import { CatalogIngredient, CatalogSupplier, CatalogUnit } from '../../types';
import { toast } from 'react-hot-toast';
import { UtensilsCrossed, Loader, RefreshCw, Eye, ArrowRightLeft } from 'lucide-react';
import { IngredientDetailModal } from '../../components/ingredient';
import UnitManager from '../../components/unit/UnitManager';
import ManagerConversionModal from '../../components/unit/ManagerConversionModal';
import { useAuth } from '../../context/AuthContext';
import { IngredientManagementSkeleton } from '../../components/manager/skeletons';

type ModalType = 'view' | null;

const IngredientManagement: React.FC = () => {
  const { user } = useAuth();
  const [ingredients, setIngredients] = useState<CatalogIngredient[]>([]);
  const [suppliers, setSuppliers] = useState<CatalogSupplier[]>([]);
  const [units, setUnits] = useState<CatalogUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState<number | ''>('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [modalType, setModalType] = useState<ModalType>(null);
  const [viewingIngredient, setViewingIngredient] = useState<CatalogIngredient | null>(null);
  const [showUnitManager, setShowUnitManager] = useState(false);
  const [editingUnit, setEditingUnit] = useState<CatalogUnit | null>(null);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [conversions, setConversions] = useState<any[]>([]);
  const [conversionsLoading, setConversionsLoading] = useState(false);
  
  // Get current branch ID from user context
  const currentBranchId = user?.branchId ? Number(user.branchId) : null;

  useEffect(() => {
    loadSuppliers();
    loadUnits();
    loadIngredients();
    loadConversions();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setSearchLoading(search !== debouncedSearch);
  }, [search, debouncedSearch]);

  useEffect(() => {
    loadIngredients();
  }, [currentPage, debouncedSearch, supplierFilter]);

  const loadSuppliers = async () => {
    try {
      const resp = await catalogService.getSuppliers({ page: 0, size: 100, sortBy: 'name', sortDirection: 'ASC' });
      setSuppliers(resp.content);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadUnits = async () => {
    try {
      const resp = await catalogService.getUnits();
      setUnits(resp);
    } catch (error) {
      console.error('Error loading units:', error);
    }
  };

  const loadConversions = async () => {
    try {
      setConversionsLoading(true);
      if (currentBranchId) {
        const resp = await (catalogService as any).getConversionsForBranch(currentBranchId);
        setConversions(resp);
      } else {
        const resp = await catalogService.getAllGlobalConversions();
        setConversions(resp);
      }
    } catch (error) {
      console.error('Error loading conversions:', error);
    } finally {
      setConversionsLoading(false);
    }
  };

  const loadIngredients = async () => {
    try {
      setLoading(true);
      setIsUpdating(true);
      const response = await catalogService.searchIngredients({
        page: currentPage,
        size: pageSize,
        search: debouncedSearch || undefined,
        supplierId: supplierFilter === '' ? undefined : Number(supplierFilter),
        sortBy: 'createAt',
        sortDirection: 'DESC'
      });
      setIngredients(response.content);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (error) {
      console.error('Error loading ingredients:', error);
      toast.error('Failed to load ingredients!');
    } finally {
      setLoading(false);
      setIsUpdating(false);
    }
  };

  const openView = (ingredient: CatalogIngredient) => {
    setViewingIngredient(ingredient);
    setModalType('view');
  };

  const closeModal = () => {
    setModalType(null);
    setViewingIngredient(null);
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      await Promise.all([loadSuppliers(), loadUnits(), loadIngredients(), loadConversions()]);
      toast.success('Data refreshed');
    } catch (error) {
      toast.error('Failed to refresh');
    } finally {
      setLoading(false);
    }
  };


  const handleCloseUnitManager = () => {
    setShowUnitManager(false);
    setEditingUnit(null);
  };

  const handleUnitsUpdated = () => {
    loadUnits();
  };

  const handleConversionModal = () => {
    setShowConversionModal(true);
  };

  const handleCloseConversionModal = () => {
    setShowConversionModal(false);
    // Refresh conversions when modal closes
    loadConversions();
  };

  if (loading && ingredients.length === 0) {
    return <IngredientManagementSkeleton />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-2 py-4 sm:px-4 lg:px-4">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-8 pt-6 pb-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Ingredient Management</h1>
              <p className="text-sm text-slate-500">View ingredients and manage unit conversions</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center space-x-2 rounded-lg bg-slate-100 text-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="p-8 pt-0">
            <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900">Total Ingredients</h2>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 mb-4">
                    <div className="text-xl font-bold text-blue-600">{totalElements}</div>
                    <div className="text-xs text-blue-800">Ingredients</div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900">Suppliers</h2>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-xl font-bold text-green-600">{suppliers.length}</div>
                    <div className="text-xs text-green-800">Available suppliers</div>
                  </div>
                </div>
              </div>

              {/* Unit Management - View Only */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900">Units</h2>
                    <button
                      onClick={() => setShowUnitManager(true)}
                      className="flex items-center space-x-1 text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <span>View Units</span>
                    </button>
                  </div>
                  {/* Unit Statistics */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-xl font-bold text-blue-600">{units.length}</div>
                      <div className="text-xs text-blue-800">Total Units</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-xl font-bold text-green-600">
                        {units.filter(u => u.baseUnitCode === u.code).length}
                      </div>
                      <div className="text-xs text-green-800">Base Units</div>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto max-h-32 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-center py-2 font-medium text-gray-700">Code</th>
                          <th className="text-center py-2 font-medium text-gray-700">Name</th>

                        </tr>
                      </thead>
                      <tbody>
                        {units.slice(0, 5).map(unit => (
                          <tr key={unit.code} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 text-center font-medium text-gray-900 max-w-[80px] truncate" title={unit.code}>{unit.code}</td>
                            <td className="py-2 text-center text-gray-600 max-w-[150px] truncate" title={unit.name}>{unit.name}</td>

                          </tr>
                        ))}
                        {!units.length && (
                          <tr>
                            <td colSpan={2} className="py-4 text-center text-gray-500">
                              No units available
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    {units.length > 5 && (
                      <div className="text-center mt-2">
                        <button
                          onClick={() => setShowUnitManager(true)}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View all {units.length} units
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Unit Conversion Management */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-medium text-gray-900">Unit Conversions</h2>
                    <button
                      onClick={handleConversionModal}
                      className="flex items-center space-x-1 text-sm bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                      <span>Manage</span>
                    </button>
                  </div>
                  
                  {/* Conversion Statistics */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="text-xl font-bold text-purple-600">
                        {conversionsLoading ? (
                          <Loader className="w-5 h-5 animate-spin mx-auto" />
                        ) : (
                          conversions.length
                        )}
                      </div>
                      <div className="text-xs text-purple-800">Total Rules</div>
                    </div>
                    <div className="bg-indigo-50 rounded-lg p-3">
                      <div className="text-xl font-bold text-indigo-600">
                        {conversionsLoading ? (
                          <Loader className="w-5 h-5 animate-spin mx-auto" />
                        ) : (
                          conversions.filter(c => c.isActive).length
                        )}
                      </div>
                      <div className="text-xs text-indigo-800">Active Rules</div>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto max-h-32 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 font-medium text-gray-700">Ingredient</th>
                          <th className="text-left py-2 font-medium text-gray-700">From → To</th>
                          <th className="text-center py-2 font-medium text-gray-700">Scope</th>
                        </tr>
                      </thead>
                      <tbody>
                        {conversionsLoading ? (
                          <tr>
                            <td colSpan={3} className="py-4 text-center text-gray-500">
                              <Loader className="w-4 h-4 animate-spin mx-auto" />
                              <span className="ml-2">Loading conversions...</span>
                            </td>
                          </tr>
                        ) : conversions.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-4 text-center text-gray-500">
                              No conversions available
                            </td>
                          </tr>
                        ) : (
                          conversions.slice(0, 5).map((conversion, index) => (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-2 text-gray-900 max-w-[120px] truncate" title={conversion.ingredientId}>
                                Ingredient #{conversion.ingredientId}
                              </td>
                              <td className="py-2 text-gray-600">
                                {conversion.fromUnitCode} → {conversion.toUnitCode}
                                <span className="text-xs text-gray-400 ml-1">
                                  ({Number(conversion.factor).toFixed(2)})
                                </span>
                              </td>
                              <td className="py-2 text-center">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  conversion.scope === 'GLOBAL'
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {conversion.scope}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                    {conversions.length > 5 && (
                      <div className="text-center mt-2">
                        <button
                          onClick={handleConversionModal}
                          className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                        >
                          View all {conversions.length} conversions
                        </button>
                      </div>
                    )}
                    {conversions.length > 0 && conversions.length <= 5 && (
                      <div className="text-center mt-2">
                        <button
                          onClick={handleConversionModal}
                          className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                        >
                          Manage conversions
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Search & Filter */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search ingredients..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(0); }}
                  className="w-full px-4 py-3 pl-10 pr-4 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 left-0 flex items-center pl-3">
                  {searchLoading ? (
                    <Loader className="w-5 h-5 text-gray-400 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </div>
              </div>

              <div>
                <select
                  value={supplierFilter}
                  onChange={(e) => { setSupplierFilter(e.target.value ? Number(e.target.value) : ''); setCurrentPage(0); }}
                  className="w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                >
                  <option value="">All suppliers</option>
                  {suppliers.map(s => (
                    <option key={s.supplierId} value={s.supplierId}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex md:justify-end">
                <div className="text-sm text-gray-500 flex items-center">
                  <span>View only - Manager permissions</span>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader className="w-12 h-12 text-sky-500 animate-spin mb-4" />
                <p className="text-gray-500">Loading data...</p>
              </div>
            ) : (
              <>
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <p className="text-gray-600">
                      Found <span className="font-semibold text-gray-900">{totalElements}</span> ingredients
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isUpdating && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Loader className="w-4 h-4 animate-spin mr-2 text-sky-500" /> Updating...
                      </div>
                    )}
                  </div>
                </div>

                {/* Ingredients Table */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {ingredients.map((ing) => (
                          <tr key={ing.ingredientId} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{ing.ingredientId}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ing.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {ing.unit?.name && ing.unit?.code 
                                ? `${ing.unit.name} (${ing.unit.code})` 
                                : ing.unit?.name || ing.unit?.code || '—'
                              }
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Number(ing.unitPrice).toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{ing.supplier?.name || '—'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => openView(ing)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="View ingredient details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {ingredients.length === 0 && (
                    <div className="text-center py-12">
                      <UtensilsCrossed className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No ingredients found</h3>
                      <p className="mt-1 text-sm text-gray-500">No ingredients match your search criteria.</p>
                    </div>
                  )}
                </div>

                {totalPages > 1 && (
                  <div className="mt-8">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">Page {currentPage + 1} / {totalPages} • Total {totalElements} ingredients</div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                          disabled={currentPage === 0}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                          disabled={currentPage >= totalPages - 1}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* View Details Modal */}
      <IngredientDetailModal
        isOpen={modalType === 'view'}
        onClose={closeModal}
        ingredient={viewingIngredient}
      />

      {/* Unit Manager Modal */}
      {showUnitManager && (
        <UnitManager
          onClose={handleCloseUnitManager}
          onUnitsUpdated={handleUnitsUpdated}
          editingUnit={editingUnit}
          viewOnly={true}
        />
      )}

      {/* Manager Conversion Modal */}
      {showConversionModal && (
        <ManagerConversionModal
          isOpen={showConversionModal}
          onClose={handleCloseConversionModal}
          suppliers={suppliers}
          currentBranchId={currentBranchId}
        />
      )}
    </div>
  );
};

export default IngredientManagement;
