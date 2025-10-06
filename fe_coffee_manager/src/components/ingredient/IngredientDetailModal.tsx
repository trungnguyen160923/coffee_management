import React from 'react';
import { X } from 'lucide-react';
import { CatalogIngredient } from '../../types';

interface IngredientDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredient: CatalogIngredient | null;
}

const IngredientDetailModal: React.FC<IngredientDetailModalProps> = ({
  isOpen,
  onClose,
  ingredient
}) => {
  if (!isOpen || !ingredient) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <h3 className="text-xl font-semibold">Ingredient Details</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
          {/* Basic Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">ID</label>
                <p className="mt-1 text-sm text-gray-900">{ingredient.ingredientId}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="mt-1 text-sm text-gray-900">{ingredient.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Unit</label>
                <p className="mt-1 text-sm text-gray-900">{ingredient.unit?.name || ingredient.unit?.code || '—'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Unit Price</label>
                <p className="mt-1 text-sm text-gray-900">{Number(ingredient.unitPrice).toLocaleString()} VND</p>
              </div>
            </div>
          </div>

          {/* Supplier Information */}
          {ingredient.supplier && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Supplier Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Supplier ID</label>
                  <p className="mt-1 text-sm text-gray-900">{ingredient.supplier.supplierId}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Supplier Name</label>
                  <p className="mt-1 text-sm text-gray-900">{ingredient.supplier.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Name</label>
                  <p className="mt-1 text-sm text-gray-900">{ingredient.supplier.contactName || '—'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="mt-1 text-sm text-gray-900">{ingredient.supplier.phone || '—'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{ingredient.supplier.email || '—'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <p className="mt-1 text-sm text-gray-900">{ingredient.supplier.address || '—'}</p>
                </div>
              </div>
              {ingredient.supplier.note && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">Note</label>
                  <p className="mt-1 text-sm text-gray-900">{ingredient.supplier.note}</p>
                </div>
              )}
            </div>
          )}

          {/* Timestamps */}
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="text-lg font-medium text-gray-900 mb-4">Timestamps</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Created At</label>
                <p className="mt-1 text-sm text-gray-900">
                  {ingredient.createAt ? new Date(ingredient.createAt).toLocaleString('en-GB') : '—'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Updated At</label>
                <p className="mt-1 text-sm text-gray-900">
                  {ingredient.updateAt ? new Date(ingredient.updateAt).toLocaleString('en-GB') : '—'}
                </p>
              </div>
            </div>
          </div>
          </div>
        </div>

        <div className="flex justify-end p-6 pt-4 border-t border-gray-200">
          <button 
            onClick={onClose} 
            className="px-4 py-2 border rounded hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default IngredientDetailModal;
