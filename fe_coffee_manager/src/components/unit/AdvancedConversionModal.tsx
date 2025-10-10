import React, { useEffect, useState } from 'react';
import { catalogService } from '../../services';
import { CatalogUnit, CatalogIngredient, CatalogSupplier } from '../../types';
import { toast } from 'react-hot-toast';
import { ArrowRightLeft, Plus, Settings, Loader, X, Trash2, RefreshCw } from 'lucide-react';
import ConfirmModal from '../common/ConfirmModal';

interface AdvancedConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers?: CatalogSupplier[];
}

interface ConversionRule {
  id?: number;
  ingredientId?: number;
  fromUnitCode: string;
  toUnitCode: string;
  factor: number;
  description?: string;
  isActive: boolean;
  scope?: string;
  branchId?: number;
}

const AdvancedConversionModal: React.FC<AdvancedConversionModalProps> = ({ 
  isOpen, 
  onClose,
  suppliers = []
}) => {
  const [units, setUnits] = useState<CatalogUnit[]>([]);
  const [allIngredients, setAllIngredients] = useState<CatalogIngredient[]>([]);
  const [conversions, setConversions] = useState<ConversionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingConversion, setEditingConversion] = useState<ConversionRule | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [conversionToDelete, setConversionToDelete] = useState<ConversionRule | null>(null);
  const [supplierFilter, setSupplierFilter] = useState<number | ''>('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [showDeleted, setShowDeleted] = useState(false);

  // Filter ingredients based on supplier selection
  const filteredIngredients = supplierFilter === '' 
    ? allIngredients 
    : allIngredients.filter(ingredient => ingredient.supplier?.supplierId === supplierFilter);

  // Filter conversions based on status and showDeleted
  const filteredConversions = conversions.filter(conversion => {
    if (showDeleted) {
      // Show only inactive (soft deleted) conversions
      return !conversion.isActive;
    } else {
      // Show based on status filter
      switch (statusFilter) {
        case 'active':
          return conversion.isActive;
        case 'inactive':
          return !conversion.isActive;
        case 'all':
          return true;
        default:
          return conversion.isActive;
      }
    }
  });

  const [formData, setFormData] = useState({
    ingredientId: '',
    fromUnitCode: '',
    toUnitCode: '',
    factor: '',
    description: '',
    scope: 'GLOBAL',
    branchId: ''
  });

  const [formErrors, setFormErrors] = useState({
    ingredientId: '',
    fromUnitCode: '',
    toUnitCode: '',
    factor: '',
    description: '',
    scope: '',
    branchId: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadUnits();
      loadAllIngredients();
      loadConversions();
    }
  }, [isOpen]);

  const loadUnits = async () => {
    try {
      const response = await catalogService.getUnits();
      setUnits(response);
    } catch (error: any) {
      console.error('Error loading units:', error);
      
      let errorMessage = 'Failed to load units!';
      if (error.response?.message) {
        errorMessage = error.response.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  };

  const loadAllIngredients = async () => {
    try {
      const response = await catalogService.searchIngredients({
        page: 0,
        size: 1000, // Load a large number to get all ingredients
        sortBy: 'name',
        sortDirection: 'ASC'
      });
      setAllIngredients(response.content);
    } catch (error: any) {
      console.error('Error loading ingredients:', error);
      
      let errorMessage = 'Failed to load ingredients!';
      if (error.response?.message) {
        errorMessage = error.response.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    }
  };

  const loadConversions = async () => {
    try {
      setLoading(true);
      const response = await catalogService.getAllGlobalConversions();
      setConversions(response);
    } catch (error: any) {
      console.error('Error loading conversions:', error);
      
      let errorMessage = 'Failed to load conversions!';
      if (error.response?.message) {
        errorMessage = error.response.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingConversion(null);
    setFormData({
      ingredientId: '',
      fromUnitCode: '',
      toUnitCode: '',
      factor: '',
      description: '',
      scope: 'GLOBAL',
      branchId: ''
    });
    setFormErrors({
      ingredientId: '',
      fromUnitCode: '',
      toUnitCode: '',
      factor: '',
      description: '',
      scope: '',
      branchId: ''
    });
    setShowForm(true);
  };

  const handleEdit = (conversion: ConversionRule) => {
    setEditingConversion(conversion);
    setFormData({
      ingredientId: conversion.ingredientId?.toString() || '',
      fromUnitCode: conversion.fromUnitCode,
      toUnitCode: conversion.toUnitCode,
      factor: conversion.factor.toString(),
      description: conversion.description || '',
      scope: conversion.scope || 'GLOBAL',
      branchId: conversion.branchId?.toString() || ''
    });
    setFormErrors({
      ingredientId: '',
      fromUnitCode: '',
      toUnitCode: '',
      factor: '',
      description: '',
      scope: '',
      branchId: ''
    });
    setShowForm(true);
  };

  const validateField = (field: string, value: string) => {
    let error = '';
    
    switch (field) {
      case 'ingredientId':
        if (!value.trim()) {
          error = 'Ingredient is required';
        }
        break;
      case 'fromUnitCode':
        if (!value.trim()) {
          error = 'From unit is required';
        }
        break;
      case 'toUnitCode':
        if (!value.trim()) {
          error = 'To unit is required';
        } else if (value === formData.fromUnitCode) {
          error = 'To unit must be different from from unit';
        }
        break;
      case 'factor':
        if (!value.trim()) {
          error = 'Factor is required';
        } else {
          const num = Number(value);
          if (isNaN(num)) {
            error = 'Factor must be a number';
          } else if (num <= 0) {
            error = 'Factor must be greater than 0';
          }
        }
        break;
      case 'description':
        // Description is optional, no validation needed
        break;
      case 'scope':
        // Scope is always GLOBAL for admin, no validation needed
        break;
      case 'branchId':
        // Branch ID not needed for admin (always GLOBAL)
        break;
    }
    
    return error;
  };

  const handleFieldBlur = (field: string, value: string) => {
    const error = validateField(field, value);
    setFormErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  const validateForm = () => {
    const errors = {
      ingredientId: validateField('ingredientId', formData.ingredientId),
      fromUnitCode: validateField('fromUnitCode', formData.fromUnitCode),
      toUnitCode: validateField('toUnitCode', formData.toUnitCode),
      factor: validateField('factor', formData.factor),
      description: validateField('description', formData.description),
      scope: validateField('scope', formData.scope),
      branchId: validateField('branchId', formData.branchId)
    };
    
    setFormErrors(errors);
    
    return !Object.values(errors).some(error => error !== '');
  };

  const handleDelete = (conversion: ConversionRule) => {
    setConversionToDelete(conversion);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!conversionToDelete) return;
    
    try {
      // Soft delete: set status to inactive
      await catalogService.updateUnitConversionStatus(conversionToDelete.id!, false);
      toast.success('Conversion deactivated successfully!');
      await loadConversions();
    } catch (error: any) {
      console.error('Error deactivating conversion:', error);
      
      // Extract detailed error message
      let errorMessage = 'Failed to deactivate conversion!';
      
      if (error.response?.message) {
        errorMessage = error.response.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.error) {
        errorMessage = error.response.error;
      }
      
      toast.error(errorMessage);
    } finally {
      setShowDeleteConfirm(false);
      setConversionToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setConversionToDelete(null);
  };


  const handleRestore = async (conversion: ConversionRule) => {
    try {
      setSubmitting(true);
      await catalogService.updateUnitConversionStatus(conversion.id!, true);
      toast.success('Conversion restored successfully!');
      await loadConversions();
    } catch (error: any) {
      console.error('Error restoring conversion:', error);
      
      let errorMessage = 'Failed to restore conversion!';
      
      if (error.response?.message) {
        errorMessage = error.response.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.error) {
        errorMessage = error.response.error;
      }
      
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors below');
      return;
    }

    try {
      setSubmitting(true);
      
      const payload = {
        ingredientId: Number(formData.ingredientId),
        fromUnitCode: formData.fromUnitCode.trim(),
        toUnitCode: formData.toUnitCode.trim(),
        factor: Number(formData.factor),
        description: formData.description.trim() || undefined,
        scope: 'GLOBAL', // Admin can only create GLOBAL conversions
        branchId: null // GLOBAL conversions don't have branch
      };

      if (editingConversion) {
        // Update existing conversion
        await catalogService.updateUnitConversion(editingConversion.id!, payload);
        toast.success('Conversion updated successfully!');
      } else {
        // Create new conversion
        await catalogService.createUnitConversion(payload);
        toast.success('Conversion created successfully!');
      }

      await loadConversions();
      setShowForm(false);
      setEditingConversion(null);
      setFormData({
        ingredientId: '',
        fromUnitCode: '',
        toUnitCode: '',
        factor: '',
        description: '',
        scope: 'GLOBAL',
        branchId: ''
      });
    } catch (error: any) {
      console.error('Error saving conversion:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response,
        status: error.status,
        code: error.code
      });
      console.error('Full error object:', error);
      
      // Extract detailed error message from ApiResponse
      let errorMessage = 'Failed to save conversion!';
      
      // Check if it's an ApiResponse with error
      if (error.response?.message) {
        errorMessage = error.response.message;
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.error) {
        errorMessage = error.response.error;
      }
      

      
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingConversion(null);
    setFormData({
      ingredientId: '',
      fromUnitCode: '',
      toUnitCode: '',
      factor: '',
      description: '',
      scope: 'GLOBAL',
      branchId: ''
    });
    setFormErrors({
      ingredientId: '',
      fromUnitCode: '',
      toUnitCode: '',
      factor: '',
      description: '',
      scope: '',
      branchId: ''
    });
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      await Promise.all([loadUnits(), loadAllIngredients(), loadConversions()]);
      toast.success('Data refreshed!');
    } catch (error: any) {
      console.error('Error refreshing data:', error);
      
      let errorMessage = 'Failed to refresh data!';
      if (error.response?.message) {
        errorMessage = error.response.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white p-2 rounded-lg">
                <ArrowRightLeft className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Advanced Conversion</h2>
                <p className="text-purple-100">Manage unit conversion rules</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh data"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-sm">Refresh</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {showForm ? (
              <div className="mb-6">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {editingConversion ? 'Edit Conversion' : 'Add New Conversion'}
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Filter by Supplier
                        </label>
                        <select
                          value={supplierFilter}
                          onChange={(e) => setSupplierFilter(e.target.value ? Number(e.target.value) : '')}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="">All suppliers</option>
                          {suppliers.map(supplier => (
                            <option key={supplier.supplierId} value={supplier.supplierId}>
                              {supplier.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ingredient *
                        </label>
                        <select
                          value={formData.ingredientId}
                          onChange={(e) => setFormData({ ...formData, ingredientId: e.target.value })}
                          onBlur={(e) => handleFieldBlur('ingredientId', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                            formErrors.ingredientId ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select ingredient</option>
                          {filteredIngredients.map(ingredient => (
                            <option key={ingredient.ingredientId} value={ingredient.ingredientId}>
                              {ingredient.name} {ingredient.supplier?.name && `(${ingredient.supplier.name})`}
                            </option>
                          ))}
                        </select>
                        {formErrors.ingredientId && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.ingredientId}</p>
                        )}
                        {filteredIngredients.length === 0 && supplierFilter !== '' && (
                          <p className="mt-1 text-sm text-gray-500">No ingredients found for selected supplier</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          From Unit *
                        </label>
                        <select
                          value={formData.fromUnitCode}
                          onChange={(e) => setFormData({ ...formData, fromUnitCode: e.target.value })}
                          onBlur={(e) => handleFieldBlur('fromUnitCode', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                            formErrors.fromUnitCode ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select from unit</option>
                          {units.map(unit => (
                            <option key={unit.code} value={unit.code}>
                              {unit.code} - {unit.name}
                            </option>
                          ))}
                        </select>
                        {formErrors.fromUnitCode && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.fromUnitCode}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          To Unit *
                        </label>
                        <select
                          value={formData.toUnitCode}
                          onChange={(e) => setFormData({ ...formData, toUnitCode: e.target.value })}
                          onBlur={(e) => handleFieldBlur('toUnitCode', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                            formErrors.toUnitCode ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select to unit</option>
                          {units.map(unit => (
                            <option key={unit.code} value={unit.code}>
                              {unit.code} - {unit.name}
                            </option>
                          ))}
                        </select>
                        {formErrors.toUnitCode && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.toUnitCode}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Conversion Factor *
                        </label>
                        <input
                          type="number"
                          step="0.00000001"
                          value={formData.factor}
                          onChange={(e) => setFormData({ ...formData, factor: e.target.value })}
                          onBlur={(e) => handleFieldBlur('factor', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                            formErrors.factor ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="e.g., 0.001 for g to kg"
                        />
                        {formErrors.factor && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.factor}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          How many {formData.toUnitCode || 'to unit'} = 1 {formData.fromUnitCode || 'from unit'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          onBlur={(e) => handleFieldBlur('description', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                            formErrors.description ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Optional description"
                        />
                        {formErrors.description && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Scope
                        </label>
                        <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-600">
                          Global (Admin only)
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Admin can only create global conversions that apply to all branches
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="px-4 py-2 text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        {submitting && <Loader className="w-4 h-4 animate-spin" />}
                        <span>{editingConversion ? 'Update Conversion' : 'Create Conversion'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Conversion Rules</h3>
                  <button
                    onClick={handleCreate}
                    className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Conversion</span>
                  </button>
                </div>
                
                {/* Filter Controls */}
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-700">Status:</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as 'active' | 'inactive' | 'all')}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="all">All</option>
                    </select>
                  </div>
                  
                  <button
                    onClick={() => setShowDeleted(!showDeleted)}
                    className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm transition-colors ${
                      showDeleted 
                        ? 'bg-red-100 text-red-700 border border-red-300' 
                        : 'bg-gray-100 text-gray-700 border border-gray-300'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{showDeleted ? 'Hide Deleted' : 'Show Deleted'}</span>
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader className="w-8 h-8 text-purple-600 animate-spin mb-4" />
                <p className="text-gray-500">Loading conversions...</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">From Unit</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To Unit</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredConversions.map((conversion, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {units.find(u => u.code === conversion.fromUnitCode)?.name || conversion.fromUnitCode}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {units.find(u => u.code === conversion.toUnitCode)?.name || conversion.toUnitCode}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {Number(conversion.factor).toFixed(8)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {conversion.description || '—'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              conversion.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {conversion.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEdit(conversion)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit conversion"
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                              {showDeleted ? (
                                // Show restore button for deleted conversions
                                <button
                                  onClick={() => handleRestore(conversion)}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                                  title="Restore conversion"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                              ) : (
                                // Show delete button for active conversions
                                <button
                                  onClick={() => handleDelete(conversion)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Deactivate conversion"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredConversions.length === 0 && (
                  <div className="text-center py-12">
                    <ArrowRightLeft className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      {showDeleted ? 'No deleted conversions found' : 'No conversions found'}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {showDeleted 
                        ? 'No soft-deleted conversions to restore.' 
                        : 'Get started by adding a new conversion rule.'
                      }
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={showDeleteConfirm}
        title="Deactivate Conversion"
        description={`Are you sure you want to deactivate this conversion rule? You can restore it later if needed.`}
        confirmText="Deactivate"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
};

export default AdvancedConversionModal;
