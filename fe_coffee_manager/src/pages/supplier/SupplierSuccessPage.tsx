import { CheckCircle, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SupplierSuccessPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for confirming the purchase order. We will contact you soon regarding delivery arrangements.
          </p>
        </div>
      </div>
    </div>
  );
}
