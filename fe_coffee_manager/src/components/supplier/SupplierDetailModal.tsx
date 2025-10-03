import React from 'react';
import { X } from 'lucide-react';
import { CatalogSupplier } from '../../types';

interface SupplierDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: CatalogSupplier | null;
}

const SupplierDetailModal: React.FC<SupplierDetailModalProps> = ({
  isOpen,
  onClose,
  supplier
}) => {
  if (!isOpen || !supplier) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Supplier Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <span className="font-medium text-gray-700">Supplier Name:</span>
            <p className="text-gray-900">{supplier.name}</p>
          </div>
          
          <div>
            <span className="font-medium text-gray-700">Contact Person:</span>
            <p className="text-gray-900">{supplier.contactName || '—'}</p>
          </div>
          
          <div>
            <span className="font-medium text-gray-700">Phone Number:</span>
            <p className="text-gray-900">{supplier.phone || '—'}</p>
          </div>
          
          <div>
            <span className="font-medium text-gray-700">Email:</span>
            <p className="text-gray-900">{supplier.email || '—'}</p>
          </div>
          
          <div>
            <span className="font-medium text-gray-700">Address:</span>
            <p className="text-gray-900">{supplier.address || '—'}</p>
          </div>
          
          <div>
            <span className="font-medium text-gray-700">Note:</span>
            <p className="text-gray-900">{supplier.note || '—'}</p>
          </div>
          
          <div>
            <span className="font-medium text-gray-700">Created Date:</span>
            <p className="text-gray-900">
              {supplier.createAt ? new Date(supplier.createAt).toLocaleString('en-US') : '—'}
            </p>
          </div>
          
          <div>
            <span className="font-medium text-gray-700">Last Updated:</span>
            <p className="text-gray-900">
              {supplier.updateAt ? new Date(supplier.updateAt).toLocaleString('en-US') : '—'}
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupplierDetailModal;
