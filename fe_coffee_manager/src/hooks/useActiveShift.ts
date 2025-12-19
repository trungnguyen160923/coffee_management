import { useState, useEffect } from 'react';
import shiftAssignmentService, { ShiftAssignment } from '../services/shiftAssignmentService';
import { toast } from 'react-hot-toast';

export function useActiveShift() {
  const [activeShift, setActiveShift] = useState<ShiftAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkActiveShift = async () => {
    try {
      setLoading(true);
      setError(null);
      const shift = await shiftAssignmentService.getMyActiveShift();
      setActiveShift(shift);
      return shift;
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'Không thể kiểm tra ca làm việc';
      setError(errorMessage);
      setActiveShift(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkActiveShift();
    
    // Refresh every 30 seconds to check if shift is still active
    const interval = setInterval(() => {
      checkActiveShift();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const hasActiveShift = activeShift !== null;

  return {
    activeShift,
    hasActiveShift,
    loading,
    error,
    refresh: checkActiveShift,
  };
}
