import { useState, useEffect } from 'react';
import { X, Clock4 } from 'lucide-react';
import toast from 'react-hot-toast';
import { shiftRequestService } from '../../services/shiftRequestService';
import staffService from '../../services/staffService';
import { StaffWithUserDto } from '../../types';
import { format } from 'date-fns';
import { shiftAssignmentService } from '../../services/shiftAssignmentService';

interface GiveShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  assignmentId: number;
  shiftId: number;
  shiftDate: string;
  startTime: string;
  endTime: string;
  branchId: number;
  currentStaffUserId: number;
}

export default function GiveShiftModal({
  isOpen,
  onClose,
  onSuccess,
  assignmentId,
  shiftId,
  shiftDate,
  startTime,
  endTime,
  branchId,
  currentStaffUserId,
}: GiveShiftModalProps) {
  const [reason, setReason] = useState('');
  const [targetStaffId, setTargetStaffId] = useState<number | null>(null);
  const [availableStaff, setAvailableStaff] = useState<StaffWithUserDto[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setTargetStaffId(null);
      loadAvailableStaff();
    }
  }, [isOpen, branchId]);

  const loadAvailableStaff = async () => {
    try {
      setLoadingStaff(true);
      
      // Load staff list and assignments for this shift in parallel
      const [staff, assignments] = await Promise.all([
        staffService.getStaffsWithUserInfoByBranch(branchId),
        shiftAssignmentService.getByShift(shiftId)
      ]);
      
      // Get list of staff IDs who already have assignments in this shift
      const assignedStaffIds = new Set(
        assignments
          .filter(a => a.status === 'CONFIRMED' || a.status === 'PENDING')
          .map(a => a.staffUserId)
      );
      
      // Get current user's employment type
      const currentStaff = staff.find(s => s.userId === currentStaffUserId);
      const currentEmploymentType = currentStaff?.employmentType || null;
      
      // Filter: exclude current user, filter by employment type, and exclude staff already assigned
      let filtered = staff.filter(s => 
        s.userId !== currentStaffUserId && !assignedStaffIds.has(s.userId)
      );
      
      // Only show staff with same employment type (if current user has employment type)
      if (currentEmploymentType && currentEmploymentType !== 'CASUAL') {
        filtered = filtered.filter(s => {
          return s.employmentType === currentEmploymentType || s.employmentType === null;
        });
      }
      
      setAvailableStaff(filtered);
    } catch (error: any) {
      console.error('Failed to load staff', error);
      setAvailableStaff([]);
      toast.error('Failed to load staff list');
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleSubmit = async () => {
    if (!reason.trim() || !targetStaffId) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      await shiftRequestService.createRequest({
        assignmentId,
        requestType: 'SWAP',
        targetStaffUserId: targetStaffId,
        reason: reason.trim(),
      });
      toast.success('Give shift request submitted successfully! The staff member will be notified.');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to create give shift request', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md max-h-[90vh] rounded-2xl border border-slate-100 bg-white shadow-xl relative flex flex-col">
        {/* Loading Overlay */}
        {submitting && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-sky-600 rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-slate-700">Submitting request...</p>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Give Shift to Someone</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {format(new Date(shiftDate), 'EEEE, MMMM dd, yyyy')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className={`flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-4 ${submitting ? 'pointer-events-none opacity-60' : ''}`}>
          {/* Shift Info */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 text-sm">
              <Clock4 className="w-4 h-4 text-slate-400" />
              <span className="font-medium text-slate-900">{startTime} - {endTime}</span>
            </div>
          </div>

          {/* Select Staff */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Select Staff to Give Shift To <span className="text-red-500">*</span>
            </label>
            {loadingStaff ? (
              <div className="flex items-center justify-center py-4">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-sky-600 rounded-full animate-spin"></div>
              </div>
            ) : (
              <select
                value={targetStaffId || ''}
                onChange={(e) => setTargetStaffId(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">-- Select staff --</option>
                {availableStaff.map((staff) => (
                  <option key={staff.userId} value={staff.userId}>
                    {staff.fullname}
                  </option>
                ))}
              </select>
            )}
            {availableStaff.length === 0 && !loadingStaff && (
              <p className="text-xs text-slate-500">No available staff found</p>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why do you want to give this shift to someone?"
              rows={4}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            />
            <p className="text-xs text-slate-500">
              Please provide a clear reason for your request
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !reason.trim() || !targetStaffId}
            className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[140px] justify-center"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

