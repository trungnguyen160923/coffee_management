import React, { useEffect, useState } from 'react';
import { catalogService } from '../../services';
import { CatalogSupplier } from '../../types';
import { toast } from 'react-hot-toast';
import { Truck, Plus, Settings, Loader, X, Trash2, RefreshCw, Pencil, Check, Eye } from 'lucide-react';
import ConfirmModal from '../../components/common/ConfirmModal';
import { SupplierModal, SupplierDetailModal } from '../../components/supplier';

type ModalType = 'create' | 'edit' | 'view' | null;

const SupplierManagement: React.FC = () => {
  const [suppliers, setSuppliers] = useState<CatalogSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<CatalogSupplier | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<number | null>(null);
  const [editing, setEditing] = useState<{ id: number; field: 'name' | 'phone' | 'address' } | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    loadSuppliers();
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  // Show search loading when search changes but debounced hasn't updated yet
  useEffect(() => {
    if (search !== debouncedSearch) {
      setSearchLoading(true);
    } else {
      setSearchLoading(false);
    }
  }, [search, debouncedSearch]);

  useEffect(() => {
    loadSuppliers();
  }, [currentPage, debouncedSearch]);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      setIsUpdating(true);
      
      const response = await catalogService.getSuppliers({
        page: currentPage,
        size: pageSize,
        search: debouncedSearch || undefined,
        sortBy: 'createAt',
        sortDirection: 'DESC'
      });
      
      setSuppliers(response.content);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      toast.error('Failed to load suppliers!');
    } finally {
      setLoading(false);
      setIsUpdating(false);
    }
  };

  const handleCreate = () => {
    setSelectedSupplier(null);
    setModalType('create');
  };

  const handleEdit = (supplier: CatalogSupplier) => {
    setSelectedSupplier(supplier);
    setModalType('edit');
  };

  const handleView = (supplier: CatalogSupplier) => {
    setSelectedSupplier(supplier);
    setModalType('view');
  };

  const handleDelete = (supplierId: number) => {
    setSupplierToDelete(supplierId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!supplierToDelete) return;
    
    try {
      await catalogService.deleteSupplier(supplierToDelete);
      toast.success('Supplier deleted successfully!');
      
      // Optimistic update - remove from local state
      setSuppliers(prevSuppliers => prevSuppliers.filter(s => s.supplierId !== supplierToDelete));
      setTotalElements(prev => Math.max(0, prev - 1));
      
      // If current page becomes empty and not first page, go to previous page
      const remainingSuppliers = suppliers.filter(s => s.supplierId !== supplierToDelete);
      if (remainingSuppliers.length === 0 && currentPage > 0) {
        setCurrentPage(prev => Math.max(0, prev - 1));
        loadSuppliers();
      }
    } catch (error: any) {
      console.error('Error deleting supplier:', error);
      toast.error(error.message || 'Failed to delete supplier!');
    } finally {
      setShowDeleteConfirm(false);
      setSupplierToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setSupplierToDelete(null);
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      await loadSuppliers();
      toast.success('Data refreshed successfully!');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data!');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedSupplier(null);
  };

  const handleModalSuccess = (newSupplier?: CatalogSupplier) => {
    if (newSupplier) {
      // Optimistic update for create
      setSuppliers(prevSuppliers => [newSupplier, ...prevSuppliers]);
      setTotalElements(prev => prev + 1);
      
      // If current page is not first page, go to first page to see new supplier
      if (currentPage > 0) {
        setCurrentPage(0);
      }
    } else {
      // For edit, reload to get updated data
      loadSuppliers();
    }
  };

  const startInlineEdit = (supplier: CatalogSupplier, field: 'name' | 'phone' | 'address') => {
    setEditing({ id: supplier.supplierId, field });
    setEditValue(String((supplier as any)[field] ?? ''));
  };

  const cancelInlineEdit = () => {
    setEditing(null);
    setEditValue('');
  };

  const saveInlineEdit = async (supplier: CatalogSupplier) => {
    if (!editing) return;
    
    try {
      const payload = {
        name: editing.field === 'name' ? editValue : supplier.name,
        contactName: supplier.contactName,
        phone: editing.field === 'phone' ? editValue : supplier.phone,
        email: supplier.email,
        address: editing.field === 'address' ? editValue : supplier.address,
        note: supplier.note
      };

      await catalogService.updateSupplier(supplier.supplierId, payload);
      
      // Update local state
      setSuppliers(prevSuppliers => 
        prevSuppliers.map(s => 
          s.supplierId === supplier.supplierId 
            ? { ...s, [editing.field]: editValue, updateAt: new Date().toISOString() }
            : s
        )
      );
      
      setEditing(null);
      setEditValue('');
      toast.success('Updated successfully');
    } catch (error: any) {
      console.error('Error updating supplier:', error);
      toast.error(error.message || 'Failed to update supplier!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-2 py-4 sm:px-4 lg:px-4">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-8 pt-6 pb-2">
            <div>
              <h1 className="text-xl font-semibold text-slate-800">Supplier Management</h1>
              <p className="text-sm text-slate-500">Manage suppliers and vendors</p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center space-x-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:border-sky-300 hover:text-sky-700 hover:bg-sky-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="p-8 pt-4">
            {/* Statistics Cards */}
            <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900">Total Suppliers</h2>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-xl font-bold text-blue-600">{totalElements}</div>
                    <div className="text-xs text-blue-800">Suppliers</div>
                  </div>
                </div>
              </div>

              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900">With Contact</h2>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-xl font-bold text-green-600">
                      {suppliers.filter(s => s.contactName || s.phone || s.email).length}
                    </div>
                    <div className="text-xs text-green-800">Have contact info</div>
                  </div>
                </div>
              </div>

              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-900">Actions</h2>
                    <button
                      onClick={handleCreate}
                      className="flex items-center space-x-1 text-sm bg-sky-500 text-white px-3 py-1.5 rounded-lg hover:bg-sky-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add New</span>
                    </button>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="text-xl font-bold text-purple-600">
                      {suppliers.filter(s => s.createAt && new Date(s.createAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length}
                    </div>
                    <div className="text-xs text-purple-800">Added in 30 days</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search suppliers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-4 py-3 pl-10 pr-4 text-gray-700 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
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
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader className="w-12 h-12 text-amber-600 animate-spin mb-4" />
                <p className="text-gray-500">Loading data...</p>
              </div>
            ) : (
              <>
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <p className="text-gray-600">
                      Found <span className="font-semibold text-gray-900">{totalElements}</span> suppliers
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {isUpdating && (
                      <div className="flex items-center text-sm text-gray-500">
                        <Loader className="w-4 h-4 animate-spin mr-2 text-amber-600" /> Updating...
                      </div>
                    )}
                    <button
                      onClick={handleCreate}
                      className="flex items-center space-x-1 text-sm bg-sky-500 text-white px-3 py-1.5 rounded-lg hover:bg-sky-600 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Supplier</span>
                    </button>
                  </div>
                </div>

                {/* Suppliers Table */}
                <div className="bg-white shadow rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {suppliers.map((supplier) => (
                          <tr key={supplier.supplierId} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {supplier.supplierId}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {editing && editing.id === supplier.supplierId && editing.field === 'name' ? (
                                <div className="flex items-center gap-2">
                                  <input 
                                    className="border rounded px-2 py-1 text-sm w-32" 
                                    value={editValue} 
                                    onChange={(e) => setEditValue(e.target.value)} 
                                  />
                                  <button onClick={() => saveInlineEdit(supplier)} className="text-emerald-600 hover:text-emerald-700" title="Save">
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button onClick={cancelInlineEdit} className="text-gray-500 hover:text-gray-700" title="Cancel">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{supplier.name}</span>
                                  <button onClick={() => startInlineEdit(supplier, 'name')} className="text-blue-600 hover:text-blue-700" title="Edit name">
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {editing && editing.id === supplier.supplierId && editing.field === 'phone' ? (
                                <div className="flex items-center gap-2">
                                  <input 
                                    className="border rounded px-2 py-1 text-sm w-32" 
                                    value={editValue} 
                                    onChange={(e) => setEditValue(e.target.value)} 
                                  />
                                  <button onClick={() => saveInlineEdit(supplier)} className="text-emerald-600 hover:text-emerald-700" title="Save">
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button onClick={cancelInlineEdit} className="text-gray-500 hover:text-gray-700" title="Cancel">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span>{supplier.phone || '—'}</span>
                                  <button onClick={() => startInlineEdit(supplier, 'phone')} className="text-blue-600 hover:text-blue-700" title="Edit phone">
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {editing && editing.id === supplier.supplierId && editing.field === 'address' ? (
                                <div className="flex items-center gap-2">
                                  <input 
                                    className="border rounded px-2 py-1 text-sm w-40" 
                                    value={editValue} 
                                    onChange={(e) => setEditValue(e.target.value)} 
                                  />
                                  <button onClick={() => saveInlineEdit(supplier)} className="text-emerald-600 hover:text-emerald-700" title="Save">
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button onClick={cancelInlineEdit} className="text-gray-500 hover:text-gray-700" title="Cancel">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <span className="max-w-32 truncate" title={supplier.address || ''}>{supplier.address || '—'}</span>
                                  <button onClick={() => startInlineEdit(supplier, 'address')} className="text-blue-600 hover:text-blue-700" title="Edit address">
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleView(supplier)}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                  title="View details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleEdit(supplier)}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                                  title="Edit supplier"
                                >
                                  <Settings className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(supplier.supplierId)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Delete supplier"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {suppliers.length === 0 && (
                    <div className="text-center py-12">
                      <Truck className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No suppliers found</h3>
                      <p className="mt-1 text-sm text-gray-500">Get started by adding a new supplier.</p>
                    </div>
                  )}
                </div>

                {totalPages > 1 && (
                  <div className="mt-8">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Page {currentPage + 1} / {totalPages} • Total {totalElements} suppliers
                      </div>
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

      {/* Create/Edit Modal */}
      <SupplierModal
        isOpen={modalType === 'create' || modalType === 'edit'}
        onClose={closeModal}
        supplier={modalType === 'edit' ? selectedSupplier : null}
        onSuccess={handleModalSuccess}
      />

      {/* View Modal */}
      <SupplierDetailModal
        isOpen={modalType === 'view'}
        onClose={closeModal}
        supplier={selectedSupplier}
      />

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete Supplier"
        description="Are you sure you want to delete this supplier? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
};

export default SupplierManagement;
