import React from 'react';
import { X } from 'lucide-react';
import { CatalogIngredient, CatalogSupplier, CatalogUnit } from '../../types';
import { catalogService } from '../../services';

interface IngredientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: {
    name: string;
    unitCode: string;
    unitPrice: string;
    supplierId: string;
  }) => void;
  ingredient?: CatalogIngredient | null;
  suppliers: CatalogSupplier[];
  loading?: boolean;
}

const IngredientModal: React.FC<IngredientModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  ingredient,
  suppliers,
  loading = false
}) => {
  const [form, setForm] = React.useState({
    name: '',
    unitCode: '',
    unitPrice: '',
    supplierId: ''
  });

  const [errors, setErrors] = React.useState({
    name: '',
    unitCode: '',
    unitPrice: '',
    supplierId: ''
  });

  const [units, setUnits] = React.useState<CatalogUnit[]>([]);
  const [unitsLoading, setUnitsLoading] = React.useState(false);

  // Load units when modal opens
  React.useEffect(() => {
    if (isOpen) {
      loadUnits();
    }
  }, [isOpen]);

  // Load units function
  const loadUnits = async () => {
    try {
      setUnitsLoading(true);
      const data = await catalogService.getUnits();
      setUnits(data);
    } catch (error) {
      console.error('Error loading units:', error);
    } finally {
      setUnitsLoading(false);
    }
  };

  React.useEffect(() => {
    if (ingredient) {
      setForm({
        name: ingredient.name || '',
        unitCode: ingredient.unit?.code || '',
        unitPrice: String(ingredient.unitPrice ?? ''),
        supplierId: ingredient.supplier?.supplierId ? String(ingredient.supplier.supplierId) : ''
      });
    } else {
      // Clear form when creating new ingredient
      setForm({
        name: '',
        unitCode: '',
        unitPrice: '',
        supplierId: ''
      });
    }
    // Clear errors when modal opens/closes
    setErrors({
      name: '',
      unitCode: '',
      unitPrice: '',
      supplierId: ''
    });
  }, [ingredient, isOpen]);

  const validateField = (field: string, value: string) => {
    let error = '';
    
    switch (field) {
      case 'name':
        if (!value.trim()) {
          error = 'Name is required';
        } else if (value.trim().length < 2) {
          error = 'Name must be at least 2 characters';
        } else if (value.trim().length > 100) {
          error = 'Name must be at most 100 characters';
        }
        break;
      case 'unitCode':
        if (!value.trim()) {
          error = 'Unit is required';
        }
        break;
      case 'unitPrice':
        if (!value.trim()) {
          error = 'Unit price is required';
        } else if (isNaN(Number(value))) {
          error = 'Unit price must be a valid number';
        } else if (Number(value) <= 0) {
          error = 'Unit price must be greater than 0';
        } else if (Number(value) > 999999.99) {
          error = 'Unit price must be less than 1,000,000';
        }
        break;
      case 'supplierId':
        if (!value.trim()) {
          error = 'Please select a supplier';
        }
        break;
    }
    
    return error;
  };

  const handleFieldBlur = (field: string, value: string) => {
    const error = validateField(field, value);
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));
  };

  const validateForm = () => {
    const newErrors = {
      name: validateField('name', form.name),
      unitCode: validateField('unitCode', form.unitCode),
      unitPrice: validateField('unitPrice', form.unitPrice),
      supplierId: validateField('supplierId', form.supplierId)
    };

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(form);
    } else {
      // Show error message if validation fails
      console.log('Form validation failed');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            {ingredient ? 'Edit Ingredient' : 'Add Ingredient'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              onBlur={(e) => handleFieldBlur('name', e.target.value)}
              className={`mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter ingredient name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Unit <span className="text-red-500">*</span></label>
              <select
                value={form.unitCode}
                onChange={(e) => setForm({ ...form, unitCode: e.target.value })}
                onBlur={(e) => handleFieldBlur('unitCode', e.target.value)}
                className={`mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  errors.unitCode ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={unitsLoading}
              >
                <option value="">Select unit</option>
                {units.map(unit => (
                  <option key={unit.code} value={unit.code}>
                    {unit.name} ({unit.code})
                  </option>
                ))}
              </select>
              {errors.unitCode && (
                <p className="mt-1 text-sm text-red-600">{errors.unitCode}</p>
              )}
              {unitsLoading && (
                <p className="mt-1 text-sm text-gray-500">Loading units...</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Unit Price <span className="text-red-500">*</span></label>
              <input
                type="number"
                value={form.unitPrice}
                onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                onBlur={(e) => handleFieldBlur('unitPrice', e.target.value)}
                className={`mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  errors.unitPrice ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0"
                min="0"
                step="0.01"
              />
              {errors.unitPrice && (
                <p className="mt-1 text-sm text-red-600">{errors.unitPrice}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Supplier <span className="text-red-500">*</span></label>
            <select
              value={form.supplierId}
              onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
              onBlur={(e) => handleFieldBlur('supplierId', e.target.value)}
              className={`mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                errors.supplierId ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select supplier</option>
              {suppliers.map(s => (
                <option key={s.supplierId} value={s.supplierId}>{s.name}</option>
              ))}
            </select>
            {errors.supplierId && (
              <p className="mt-1 text-sm text-red-600">{errors.supplierId}</p>
            )}
          </div>

            <div className="mt-6 flex justify-end gap-2">
              <button 
                type="button"
                onClick={onClose} 
                className="px-4 py-2 border rounded hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : (ingredient ? 'Update' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default IngredientModal;
