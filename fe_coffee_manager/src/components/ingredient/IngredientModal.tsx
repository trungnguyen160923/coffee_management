import React from 'react';
import { X } from 'lucide-react';
import { CatalogIngredient, CatalogSupplier } from '../../types';

interface IngredientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: {
    name: string;
    unit: string;
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
    unit: '',
    unitPrice: '',
    supplierId: ''
  });

  const [errors, setErrors] = React.useState({
    name: '',
    unit: '',
    unitPrice: '',
    supplierId: ''
  });

  React.useEffect(() => {
    if (ingredient) {
      setForm({
        name: ingredient.name || '',
        unit: ingredient.unit || '',
        unitPrice: String(ingredient.unitPrice ?? ''),
        supplierId: ingredient.supplier?.supplierId ? String(ingredient.supplier.supplierId) : ''
      });
    } else {
      // Clear form when creating new ingredient
      setForm({
        name: '',
        unit: '',
        unitPrice: '',
        supplierId: ''
      });
    }
    // Clear errors when modal opens/closes
    setErrors({
      name: '',
      unit: '',
      unitPrice: '',
      supplierId: ''
    });
  }, [ingredient, isOpen]);

  const validateForm = () => {
    const newErrors = {
      name: '',
      unit: '',
      unitPrice: '',
      supplierId: ''
    };

    // Name validation
    if (!form.name.trim()) {
      newErrors.name = 'Name is required';
    }

    // Unit validation
    if (!form.unit.trim()) {
      newErrors.unit = 'Unit is required';
    }

    // Unit Price validation
    if (!form.unitPrice.trim()) {
      newErrors.unitPrice = 'Unit price is required';
    } else if (isNaN(Number(form.unitPrice)) || Number(form.unitPrice) <= 0) {
      newErrors.unitPrice = 'Unit price must be a valid positive number';
    }

    // Supplier validation
    if (!form.supplierId) {
      newErrors.supplierId = 'Please select a supplier';
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(form);
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
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
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
              <label className="block text-sm font-medium text-gray-700">Unit</label>
              <input
                type="text"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className={`mt-1 w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  errors.unit ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., kg, g, ml"
              />
              {errors.unit && (
                <p className="mt-1 text-sm text-red-600">{errors.unit}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Unit Price</label>
              <input
                type="number"
                value={form.unitPrice}
                onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
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
            <label className="block text-sm font-medium text-gray-700">Supplier</label>
            <select
              value={form.supplierId}
              onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
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
