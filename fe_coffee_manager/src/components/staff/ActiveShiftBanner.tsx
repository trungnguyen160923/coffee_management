import { useActiveShift } from '../../hooks/useActiveShift';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export function ActiveShiftBanner() {
  const { hasActiveShift, loading } = useActiveShift();
  const navigate = useNavigate();

  if (loading || hasActiveShift) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-lg"><AlertTriangle className="h-5 w-5" /></span>
          <span className="font-semibold">
            You are not checked in to a shift. Please check in to start working.
          </span>
        </div>
        <button
          onClick={() => navigate('/staff/my-shifts')}
          className="px-4 py-2 bg-white text-yellow-600 rounded-lg font-medium hover:bg-yellow-50 transition-colors"
        >
          Go to shift
        </button>
      </div>
    </div>
  );
}
