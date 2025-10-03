import React, { useState, useEffect } from 'react';
import { X, Loader } from 'lucide-react';
import { CatalogSupplier } from '../../types';
import { catalogService } from '../../services';
import { toast } from 'react-hot-toast';

interface SupplierFormData {
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  note: string;
}

interface FormErrors {
  name?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  note?: string;
}

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier?: CatalogSupplier | null;
  onSuccess: () => void;
}

const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  onClose,
  supplier,
  onSuccess
}) => {
  const [formData, setFormData] = useState<SupplierFormData>({
    name: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    note: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!supplier;

  useEffect(() => {
    if (isOpen) {
      if (supplier) {
        setFormData({
          name: supplier.name,
          contactName: supplier.contactName || '',
          phone: supplier.phone || '',
          email: supplier.email || '',
          address: supplier.address || '',
          note: supplier.note || ''
        });
      } else {
        setFormData({
          name: '',
          contactName: '',
          phone: '',
          email: '',
          address: '',
          note: ''
        });
      }
      // Clear errors when modal opens
      setErrors({});
    }
  }, [isOpen, supplier]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate required fields
    if (!formData.name.trim()) {
      newErrors.name = 'Supplier name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!formData.contactName.trim()) {
      newErrors.contactName = 'Contact person is required';
    }

    // Validate email format
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    // Validate phone format
    if (formData.phone.trim()) {
      const cleanPhone = formData.phone.replace(/[\s\-\(\)]/g, '');
      // Accept: 10 digits (local) or +country code + 10 digits (international)
      const localPhoneRegex = /^[0-9]{10}$/;
      const internationalPhoneRegex = /^\+[0-9]{1,3}[0-9]{10}$/;
      
      if (!localPhoneRegex.test(cleanPhone) && !internationalPhoneRegex.test(cleanPhone)) {
        newErrors.phone = 'Please enter a valid phone number (10 digits or +country code + 10 digits)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submitting
    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        name: formData.name.trim(),
        contactName: formData.contactName.trim() || null,
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        note: formData.note.trim() || null
      };

      if (isEdit && supplier) {
        await catalogService.updateSupplier(supplier.supplierId, payload);
        toast.success('Supplier updated successfully');
      } else {
        await catalogService.createSupplier(payload);
        toast.success('Supplier created successfully');
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving supplier:', error);
      toast.error(error.message || 'Failed to save supplier!');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof SupplierFormData, value: string) => {
    // Special handling for phone number - only allow numbers and specific characters
    if (field === 'phone') {
      // Allow only numbers, +, (, ), -, and spaces
      const phoneRegex = /^[0-9+\-\(\)\s]*$/;
      if (!phoneRegex.test(value)) {
        return; // Don't update if invalid characters
      }
    }
    
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleInputBlur = (field: keyof SupplierFormData) => {
    const value = formData[field];
    
    // Validate required fields on blur
    if (field === 'name' && !value.trim()) {
      setErrors(prev => ({ ...prev, [field]: 'Supplier name is required' }));
    }
    
    if (field === 'phone' && !value.trim()) {
      setErrors(prev => ({ ...prev, [field]: 'Phone number is required' }));
    }
    
    if (field === 'email' && !value.trim()) {
      setErrors(prev => ({ ...prev, [field]: 'Email is required' }));
    }
    
    if (field === 'address' && !value.trim()) {
      setErrors(prev => ({ ...prev, [field]: 'Address is required' }));
    }
    
    if (field === 'contactName' && !value.trim()) {
      setErrors(prev => ({ ...prev, [field]: 'Contact person is required' }));
    }
    
    // Validate email format on blur if provided
    if (field === 'email' && value.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        setErrors(prev => ({ ...prev, [field]: 'Please enter a valid email address' }));
      }
    }
    
    // Validate phone format on blur if provided
    if (field === 'phone' && value.trim()) {
      const cleanPhone = value.replace(/[\s\-\(\)]/g, '');
      // Accept: 10 digits (local) or +country code + 10 digits (international)
      const localPhoneRegex = /^[0-9]{10}$/;
      const internationalPhoneRegex = /^\+[0-9]{1,3}[0-9]{10}$/;
      
      if (!localPhoneRegex.test(cleanPhone) && !internationalPhoneRegex.test(cleanPhone)) {
        setErrors(prev => ({ ...prev, [field]: 'Please enter a valid phone number (10 digits or +country code + 10 digits)' }));
      }
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {isEdit ? 'Edit Supplier' : 'Add New Supplier'}
          </h2>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              onBlur={() => handleInputBlur('name')}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.name 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-amber-500'
              }`}
              disabled={submitting}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Person *
            </label>
            <input
              type="text"
              value={formData.contactName}
              onChange={(e) => handleInputChange('contactName', e.target.value)}
              onBlur={() => handleInputBlur('contactName')}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.contactName 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-amber-500'
              }`}
              disabled={submitting}
            />
            {errors.contactName && (
              <p className="mt-1 text-sm text-red-600">{errors.contactName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              onBlur={() => handleInputBlur('phone')}
              maxLength={15}
              placeholder="Enter phone number (e.g., 0123456789 or +84123456789)"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.phone 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-amber-500'
              }`}
              disabled={submitting}
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              onBlur={() => handleInputBlur('email')}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.email 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-amber-500'
              }`}
              disabled={submitting}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address *
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              onBlur={() => handleInputBlur('address')}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.address 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-amber-500'
              }`}
              disabled={submitting}
            />
            {errors.address && (
              <p className="mt-1 text-sm text-red-600">{errors.address}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note
            </label>
            <textarea
              value={formData.note}
              onChange={(e) => handleInputChange('note', e.target.value)}
              onBlur={() => handleInputBlur('note')}
              rows={3}
              placeholder="Additional notes about the supplier..."
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.note 
                  ? 'border-red-300 focus:ring-red-500' 
                  : 'border-gray-300 focus:ring-amber-500'
              }`}
              disabled={submitting}
            />
            {errors.note && (
              <p className="mt-1 text-sm text-red-600">{errors.note}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {submitting && <Loader className="w-4 h-4 animate-spin" />}
              <span>
                {submitting 
                  ? 'Saving...' 
                  : (isEdit ? 'Update' : 'Create')
                }
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupplierModal;
