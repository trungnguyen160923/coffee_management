import { XCircle, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SupplierCancelledPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Cancelled</h1>
          <p className="text-gray-600 mb-6">
            The purchase order has been cancelled. If you have any questions, please contact our procurement team.
          </p>
        </div>
      </div>
    </div>
  );
}
