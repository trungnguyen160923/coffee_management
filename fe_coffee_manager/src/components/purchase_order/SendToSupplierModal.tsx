import React, { useState } from 'react';
import { X, Send, Mail } from 'lucide-react';
import catalogService from '../../services/catalogService';
import toast from 'react-hot-toast';

interface SendToSupplierModalProps {
  open: boolean;
  onClose: () => void;
  po: any | null;
  onSuccess?: () => void;
}

export default function SendToSupplierModal({ open, onClose, po, onSuccess }: SendToSupplierModalProps) {
  const [formData, setFormData] = useState({
    toEmail: '',
    cc: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);

  // Auto-fill supplier email when PO changes
  React.useEffect(() => {
    if (po?.supplier?.email) {
      setFormData(prev => ({
        ...prev,
        toEmail: po.supplier.email,
        subject: `Purchase Order: ${po.poNumber}`
      }));
    }
  }, [po]);

  if (!open || !po) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.toEmail.trim()) {
      toast.error('Email address is required');
      return;
    }

    setLoading(true);
    try {
      await catalogService.sendToSupplier(po.poId, {
        toEmail: formData.toEmail,
        cc: formData.cc || undefined,
        subject: formData.subject || undefined,
        message: formData.message || undefined
      });
      
      toast.success('PO sent to supplier successfully');
      onSuccess?.();
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send PO');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white p-2 rounded-lg">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Send PO to Supplier</h2>
                <p className="text-blue-100 text-sm">PO: {po.poNumber}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Supplier Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-2">Supplier Information</h3>
              <div className="text-sm text-gray-600">
                <p><strong>Name:</strong> {po.supplier?.name}</p>
                <p><strong>Email:</strong> {po.supplier?.email} {po.supplier?.email && <span className="text-green-600">(Auto-filled)</span>}</p>
                <p><strong>Phone:</strong> {po.supplier?.phone}</p>
              </div>
            </div>

            {/* Email Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Email *
                </label>
                <input
                  type="email"
                  name="toEmail"
                  value={formData.toEmail}
                  onChange={handleChange}
                  placeholder="supplier@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CC (Optional)
                </label>
                <input
                  type="email"
                  name="cc"
                  value={formData.cc}
                  onChange={handleChange}
                  placeholder="manager@company.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject (Optional)
              </label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                placeholder={`Purchase Order: ${po.poNumber}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message (Optional)
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                rows={4}
                placeholder="Add any additional message for the supplier..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>{loading ? 'Sending...' : 'Send PO'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
