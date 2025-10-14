import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Calendar, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency, formatQuantity } from '../../utils/helpers';

export default function SupplierConfirmPage() {
  const BASE_URL = "http://localhost:8000/api/catalogs/public/purchase-orders";
  const { poId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [po, setPo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    expectedDeliveryAt: '',
    supplierResponse: ''
  });
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isProcessed, setIsProcessed] = useState(false);
  
  // Check if this is a cancel action
  const isCancelAction = window.location.pathname.includes('/cancel');

  useEffect(() => {
    if (poId && token) {
      // Store token in session storage to hide it from URL
      sessionStorage.setItem('supplier-token', token);
      // Remove token from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('token');
      window.history.replaceState({}, '', url.toString());
      
      if (isCancelAction) {
        // Load PO first, then show cancel modal
        loadPurchaseOrder()
          .then(() => {
            setShowCancelModal(true);
          })
          .catch(() => {
            // Error already handled in loadPurchaseOrder
          });
      } else {
        loadPurchaseOrder();
      }
    } else if (!token) {
      toast.error('Invalid access. This link is not valid.');
      navigate('/');
    }
  }, [poId, token, isCancelAction]);

  const loadPurchaseOrder = async () => {
    try {
      const storedToken = sessionStorage.getItem('supplier-token');
      
      const url = `${BASE_URL}/${poId}?token=${storedToken}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Purchase Order not found or invalid token');
      }
      const data = await response.json();
      setPo(data.result);
      
      // Check if PO is already processed or cancelled
      const status = data.result.status;
      if (status === 'SUPPLIER_CONFIRMED' || status === 'SUPPLIER_CANCELLED' || 
          status === 'CANCELLED' || status === 'PARTIALLY_RECEIVED' || 
          status === 'RECEIVED' || status === 'DELIVERED' || status === 'COMPLETED') {
        setIsProcessed(true);
      }
      
      return data.result; // Return PO data
    } catch (error) {
      toast.error('Purchase Order not found or access denied');
      throw error; // Re-throw to handle in caller
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Validate delivery date
    if (formData.expectedDeliveryAt) {
      const deliveryDate = new Date(formData.expectedDeliveryAt);
      const now = new Date();
      
      if (deliveryDate <= now) {
        toast.error('Expected delivery date must be in the future. Please select a future date and time.');
        setSubmitting(false);
        return;
      }
    }

    try {
      const payload = {
        status: 'SUPPLIER_CONFIRMED',
        expectedDeliveryAt: formData.expectedDeliveryAt ? new Date(formData.expectedDeliveryAt).toISOString() : null,
        supplierResponse: formData.supplierResponse || null
      };

      const storedToken = sessionStorage.getItem('supplier-token');
      const response = await fetch(`${BASE_URL}/${poId}/supplier-response?token=${storedToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to confirm order');
      }
      
      await response.json();

      toast.success('Order confirmed successfully! Thank you for your response.');
      navigate('/supplier/success');
    } catch (error: any) {
      toast.error(error.message || 'Failed to confirm order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelClick = () => {
    setShowCancelModal(true);
  };

  const handleCancelConfirm = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation.');
      return;
    }

    setSubmitting(true);
    try {
      const storedToken = sessionStorage.getItem('supplier-token');
      
      const response = await fetch(`${BASE_URL}/${poId}/cancel?token=${storedToken}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: cancelReason
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel order');
      }

      await response.json();
      toast.success('Order cancelled successfully.');
      navigate('/supplier/cancelled');
    } catch (error: any) {
      toast.error(error.message || 'Failed to cancel order');
    } finally {
      setSubmitting(false);
      setShowCancelModal(false);
    }
  };

  const handleCancelModalClose = () => {
    setShowCancelModal(false);
    setCancelReason('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Purchase Order...</p>
        </div>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Purchase Order Not Found</h1>
          <p className="text-gray-600">This purchase order is no longer available for response.</p>
        </div>
      </div>
    );
  }

  // Show processed PO information
  if (isProcessed) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="text-center mb-6">
              {po.status === 'SUPPLIER_CONFIRMED' || po.status === 'PARTIALLY_RECEIVED' || po.status === 'RECEIVED' ? (
                <div className="flex items-center justify-center mb-4">
                  <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
              ) : po.status === 'CANCELLED' || po.status === 'SUPPLIER_CANCELLED' ? (
                <div className="flex items-center justify-center mb-4">
                  <XCircle className="h-16 w-16 text-red-500" />
                </div>
              ) : (
                <div className="flex items-center justify-center mb-4">
                  <CheckCircle className="h-16 w-16 text-blue-500" />
                </div>
              )}
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {po.status === 'SUPPLIER_CONFIRMED' ? 'Purchase Order Confirmed' :
                 po.status === 'PARTIALLY_RECEIVED' ? 'Purchase Order Partially Received' :
                 po.status === 'RECEIVED' ? 'Purchase Order Received' :
                 po.status === 'DELIVERED' ? 'Purchase Order Delivered' :
                 po.status === 'COMPLETED' ? 'Purchase Order Completed' :
                 po.status === 'CANCELLED' ? 'Purchase Order Cancelled by System' :
                 po.status === 'SUPPLIER_CANCELLED' ? 'Purchase Order Cancelled by You' :
                 'Purchase Order Status'}
              </h1>
              <p className="text-gray-600">
                {po.status === 'SUPPLIER_CONFIRMED' || po.status === 'PARTIALLY_RECEIVED' || po.status === 'RECEIVED' 
                  ? '✅ This Purchase Order has been successfully processed. Thank you for your response!' 
                  : po.status === 'DELIVERED' || po.status === 'COMPLETED'
                  ? '📦 This Purchase Order has been completed. Thank you for your service!'
                  : po.status === 'CANCELLED'
                  ? '❌ This Purchase Order has been cancelled by the system and cannot be modified.'
                  : po.status === 'SUPPLIER_CANCELLED'
                  ? '❌ You have cancelled this Purchase Order. The order has been cancelled.'
                  : 'This Purchase Order is in ' + po.status + ' status.'}
              </p>
            </div>

            <div className="border-t pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Purchase Order Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">PO Number</label>
                  <p className="mt-1 text-sm text-gray-900">{po.poNumber}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Supplier</label>
                  <p className="mt-1 text-sm text-gray-900">{po.supplier?.name || 'N/A'}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    po.status === 'SUPPLIER_CONFIRMED' || po.status === 'PARTIALLY_RECEIVED' || po.status === 'RECEIVED'
                      ? 'bg-green-100 text-green-800' 
                      : po.status === 'DELIVERED' || po.status === 'COMPLETED'
                      ? 'bg-blue-100 text-blue-800'
                      : po.status === 'CANCELLED'
                      ? 'bg-red-100 text-red-800'
                      : po.status === 'SUPPLIER_CANCELLED'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {po.status === 'SUPPLIER_CONFIRMED' ? 'Confirmed' :
                     po.status === 'PARTIALLY_RECEIVED' ? 'Partially Received' :
                     po.status === 'RECEIVED' ? 'Received' :
                     po.status === 'DELIVERED' ? 'Delivered' :
                     po.status === 'COMPLETED' ? 'Completed' :
                     po.status === 'CANCELLED' ? 'Cancelled by System' :
                     po.status === 'SUPPLIER_CANCELLED' ? 'Cancelled by You' :
                     po.status}
                  </span>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                  <p className="mt-1 text-sm text-gray-900">{formatCurrency(Number(po.totalAmount) || 0)}</p>
                </div>
                
                {po.expectedDeliveryAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Expected Delivery</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(po.expectedDeliveryAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
                
                {po.supplierResponse && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Supplier Response</label>
                    <p className="mt-1 text-sm text-gray-900">{po.supplierResponse}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                      <th className="px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {po.details?.map((detail: any, index: number) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {detail.ingredient?.name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {detail.qty}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {detail.unitCode || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(Number(detail.unitPrice) || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(Number(detail.lineTotal) || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 text-white p-6">
            <h1 className="text-2xl font-bold">Purchase Order Response</h1>
            <p className="mt-2">Please confirm or cancel this purchase order</p>
          </div>

          {/* PO Details */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">PO Number:</span>
                    <span className="font-medium">{po.poNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Supplier:</span>
                    <span className="font-medium">{po.supplier?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="font-medium text-green-600">
                      {new Intl.NumberFormat('vi-VN', { 
                        style: 'currency', 
                        currency: 'VND' 
                      }).format(po.totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                      {po.status}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
                <div className="space-y-2">
                  {po.details?.map((detail: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{detail.ingredient?.name} x {detail.qty} {detail.unitCode}</span>
                      <span>{new Intl.NumberFormat('vi-VN', { 
                        style: 'currency', 
                        currency: 'VND' 
                      }).format(detail.lineTotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Response Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Confirm Order
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Expected Delivery Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.expectedDeliveryAt}
                      onChange={(e) => setFormData(prev => ({ ...prev, expectedDeliveryAt: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                      min={new Date().toISOString().slice(0, 16)} // Set minimum to current datetime
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Please select a future date and time for delivery
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MessageSquare className="w-4 h-4 inline mr-1" />
                    Additional Notes
                  </label>
                  <textarea
                    value={formData.supplierResponse}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplierResponse: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    rows={3}
                    placeholder="Any additional information or notes..."
                  />
                </div>
              </div>

              {/* Action Buttons - Only show if not cancelled */}
              {po && po.status !== 'CANCELLED' && po.status !== 'SUPPLIER_CANCELLED' && (
                <div className="flex flex-col sm:flex-row gap-4 justify-end">
                  <button
                    type="button"
                    onClick={handleCancelClick}
                    disabled={submitting}
                    className="px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 flex items-center justify-center"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Order
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 flex items-center justify-center"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {submitting ? 'Confirming...' : 'Confirm Order'}
                  </button>
                </div>
              )}
              
              {/* Show message for cancelled orders */}
              {po && po.status === 'CANCELLED' && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex items-center">
                    <XCircle className="h-5 w-5 text-red-400 mr-2" />
                    <p className="text-red-800">
                      This Purchase Order has been cancelled by the system and cannot be modified.
                    </p>
                  </div>
                </div>
              )}
              
              {/* Show message for supplier cancelled orders */}
              {po && po.status === 'SUPPLIER_CANCELLED' && (
                <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
                  <div className="flex items-center">
                    <XCircle className="h-5 w-5 text-orange-400 mr-2" />
                    <p className="text-orange-800">
                      You have cancelled this Purchase Order. The order has been cancelled.
                    </p>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancel Purchase Order</h3>
            <p className="text-gray-600 mb-4">Please provide a reason for cancelling this order:</p>
            
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
              rows={4}
              placeholder="Enter cancellation reason..."
              required
            />
            
            <div className="flex gap-3 mt-6 justify-end">
              <button
                type="button"
                onClick={handleCancelModalClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCancelConfirm}
                disabled={submitting || !cancelReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
