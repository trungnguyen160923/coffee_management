import React, { useEffect, useState } from 'react';
import { catalogService } from '../../services';
import { CatalogUnit } from '../../types';
import { toast } from 'react-hot-toast';
import { Scale, Plus, Settings, Loader, X, Trash2, RefreshCw } from 'lucide-react';
import ConfirmModal from '../common/ConfirmModal';

interface UnitManagerProps {
  onClose: () => void;
  onUnitsUpdated: () => void;
  editingUnit?: CatalogUnit | null;
}

const UnitManager: React.FC<UnitManagerProps> = ({ onClose, onUnitsUpdated, editingUnit }) => {
  const [units, setUnits] = useState<CatalogUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingUnitData, setEditingUnitData] = useState<CatalogUnit | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [unitToDelete, setUnitToDelete] = useState<CatalogUnit | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    dimension: '',
    factorToBase: '',
    baseUnitCode: ''
  });

  const [formErrors, setFormErrors] = useState({
    code: '',
    name: '',
    dimension: '',
    factorToBase: '',
    baseUnitCode: ''
  });

  useEffect(() => {
    loadUnits();
    if (editingUnit) {
      setEditingUnitData(editingUnit);
      setFormData({
        code: editingUnit.code,
        name: editingUnit.name,
        dimension: editingUnit.dimension,
        factorToBase: editingUnit.factorToBase.toString(),
        baseUnitCode: editingUnit.baseUnitCode === editingUnit.code ? '' : (editingUnit.baseUnitCode || '')
      });
      setShowForm(true);
    }
  }, [editingUnit]);

  const loadUnits = async () => {
    try {
      setLoading(true);
      const response = await catalogService.getUnits();
      setUnits(response);
    } catch (error) {
      console.error('Error loading units:', error);
      toast.error('Failed to load units!');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingUnitData(null);
    setFormData({
      code: '',
      name: '',
      dimension: '',
      factorToBase: '',
      baseUnitCode: ''
    });
    setFormErrors({
      code: '',
      name: '',
      dimension: '',
      factorToBase: '',
      baseUnitCode: ''
    });
    setShowForm(true);
  };

  const handleEdit = (unit: CatalogUnit) => {
    setEditingUnitData(unit);
    setFormData({
      code: unit.code,
      name: unit.name,
      dimension: unit.dimension,
      factorToBase: unit.factorToBase.toString(),
      baseUnitCode: unit.baseUnitCode === unit.code ? '' : (unit.baseUnitCode || '')
    });
    setFormErrors({
      code: '',
      name: '',
      dimension: '',
      factorToBase: '',
      baseUnitCode: ''
    });
    setShowForm(true);
  };

  const validateField = (field: string, value: string) => {
    let error = '';
    
    switch (field) {
      case 'code':
        if (!value.trim()) {
          error = 'Code is required';
        } else if (value.trim().length < 2) {
          error = 'Code must be at least 2 characters';
        } else if (value.trim().length > 20) {
          error = 'Code must be at most 20 characters';
        }
        break;
      case 'name':
        if (!value.trim()) {
          error = 'Name is required';
        } else if (value.trim().length < 2) {
          error = 'Name must be at least 2 characters';
        } else if (value.trim().length > 50) {
          error = 'Name must be at most 50 characters';
        }
        break;
      case 'dimension':
        if (!value.trim()) {
          error = 'Dimension is required';
        }
        break;
      case 'factorToBase':
        if (!value.trim()) {
          error = 'Factor to base is required';
        } else {
          const num = Number(value);
          if (isNaN(num)) {
            error = 'Factor to base must be a number';
          } else if (num <= 0) {
            error = 'Factor to base must be greater than 0';
          }
        }
        break;
      case 'baseUnitCode':
        // baseUnitCode is optional, no validation needed
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
      code: validateField('code', formData.code),
      name: validateField('name', formData.name),
      dimension: validateField('dimension', formData.dimension),
      factorToBase: validateField('factorToBase', formData.factorToBase),
      baseUnitCode: validateField('baseUnitCode', formData.baseUnitCode)
    };
    
    setFormErrors(errors);
    
    return !Object.values(errors).some(error => error !== '');
  };

  const handleDelete = (unit: CatalogUnit) => {
    setUnitToDelete(unit);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!unitToDelete) return;
    
    try {
      await catalogService.deleteUnit(unitToDelete.code);
      toast.success('Unit deleted successfully!');
      await loadUnits();
      onUnitsUpdated();
    } catch (error: any) {
      console.error('Error deleting unit:', error);
      toast.error(error.message || 'Failed to delete unit!');
    } finally {
      setShowDeleteConfirm(false);
      setUnitToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setUnitToDelete(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the errors below');
      return;
    }

    try {
      setSubmitting(true);
      
      // If baseUnitCode is empty (self-reference), set it to the same as code
      const baseUnitCode = formData.baseUnitCode.trim() || formData.code.trim();
      
      const payload = {
        code: formData.code.trim(),
        name: formData.name.trim(),
        dimension: formData.dimension.trim(),
        factorToBase: Number(formData.factorToBase),
        baseUnitCode: baseUnitCode
      };

      if (editingUnitData) {
        // Update existing unit
        await catalogService.updateUnit(editingUnitData.code, payload);
        toast.success('Unit updated successfully!');
      } else {
        // Create new unit
        await catalogService.createUnit(payload);
        toast.success('Unit created successfully!');
      }

      await loadUnits();
      onUnitsUpdated();
      setShowForm(false);
      setEditingUnitData(null);
      setFormData({
        code: '',
        name: '',
        dimension: '',
        factorToBase: '',
        baseUnitCode: ''
      });
    } catch (error: any) {
      console.error('Error saving unit:', error);
      toast.error(error.message || 'Failed to save unit!');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingUnitData(null);
    setFormData({
      code: '',
      name: '',
      dimension: '',
      factorToBase: '',
      baseUnitCode: ''
    });
    setFormErrors({
      code: '',
      name: '',
      dimension: '',
      factorToBase: '',
      baseUnitCode: ''
    });
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      await loadUnits();
      toast.success('Units refreshed!');
    } catch (error) {
      toast.error('Failed to refresh units!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white p-2 rounded-lg">
                <Scale className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Unit Management</h2>
                <p className="text-blue-100">Manage measurement units</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 text-white px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh units"
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
                    {editingUnitData ? 'Edit Unit' : 'Add New Unit'}
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Code *
                      </label>
                      <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        onBlur={(e) => handleFieldBlur('code', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          formErrors.code ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="e.g., kg, l, pcs"
                        disabled={!!editingUnitData}
                      />
                      {formErrors.code && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.code}</p>
                      )}
                    </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name *
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          onBlur={(e) => handleFieldBlur('name', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            formErrors.name ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="e.g., Kilogram, Liter, Pieces"
                        />
                        {formErrors.name && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Dimension *
                        </label>
                        <select
                          value={formData.dimension}
                          onChange={(e) => setFormData({ ...formData, dimension: e.target.value })}
                          onBlur={(e) => handleFieldBlur('dimension', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            formErrors.dimension ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select dimension</option>
                          <option value="MASS">Mass</option>
                          <option value="VOLUME">Volume</option>
                          <option value="COUNT">Count</option>
                          <option value="LENGTH">Length</option>
                          <option value="AREA">Area</option>
                        </select>
                        {formErrors.dimension && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.dimension}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Factor to Base *
                        </label>
                        <input
                          type="number"
                          step="0.00000001"
                          value={formData.factorToBase}
                          onChange={(e) => setFormData({ ...formData, factorToBase: e.target.value })}
                          onBlur={(e) => handleFieldBlur('factorToBase', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            formErrors.factorToBase ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="e.g., 1.0, 0.001, 0.45359237"
                        />
                        {formErrors.factorToBase && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.factorToBase}</p>
                        )}
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Base Unit Code
                        </label>
                        <select
                          value={formData.baseUnitCode}
                          onChange={(e) => setFormData({ ...formData, baseUnitCode: e.target.value })}
                          onBlur={(e) => handleFieldBlur('baseUnitCode', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            formErrors.baseUnitCode ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Self-reference (base unit)</option>
                          {units.map(unit => (
                            <option key={unit.code} value={unit.code}>
                              {unit.code} - {unit.name}
                            </option>
                          ))}
                        </select>
                        {formErrors.baseUnitCode && (
                          <p className="mt-1 text-sm text-red-600">{formErrors.baseUnitCode}</p>
                        )}
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
                        className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        {submitting && <Loader className="w-4 h-4 animate-spin" />}
                        <span>{editingUnitData ? 'Update Unit' : 'Create Unit'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Units</h3>
                <button
                  onClick={handleCreate}
                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Unit</span>
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-500">Loading units...</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dimension</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Unit</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {units.map((unit) => (
                        <tr key={unit.code} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{unit.code}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{unit.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{unit.dimension}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{Number(unit.factorToBase).toFixed(8)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{unit.baseUnitCode || '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEdit(unit)}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit unit"
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(unit)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete unit"
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

                {units.length === 0 && (
                  <div className="text-center py-12">
                    <Scale className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No units found</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by adding a new unit.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete Unit"
        description={`Are you sure you want to delete unit "${unitToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
};

export default UnitManager;
