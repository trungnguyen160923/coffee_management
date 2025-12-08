import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Clock4, X, Check, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { shiftAssignmentService, AvailableStaffForShift } from '../../services/shiftAssignmentService';
import { shiftService, Shift } from '../../services/shiftService';

interface AssignStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: number;
  onSuccess: () => void;
  initialDate?: string; // Optional: pre-select a date (yyyy-MM-dd format)
}

export default function AssignStaffModal({
  isOpen,
  onClose,
  branchId,
  onSuccess,
  initialDate,
}: AssignStaffModalProps) {
  const [selectedDateForAssign, setSelectedDateForAssign] = useState<string>('');
  const [shiftsForDate, setShiftsForDate] = useState<Shift[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);
  const [availableStaff, setAvailableStaff] = useState<AvailableStaffForShift[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<Set<number>>(new Set());
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [remainingSlots, setRemainingSlots] = useState<number>(0);
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState<string>('ALL');
  const [staffNameFilter, setStaffNameFilter] = useState<string>('');
  const [overrideReasons, setOverrideReasons] = useState<Map<number, string>>(new Map());
  const [capacityOverrideReasons, setCapacityOverrideReasons] = useState<Map<number, string>>(new Map());
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [showCapacityOverrideModal, setShowCapacityOverrideModal] = useState(false);
  const [pendingStaffId, setPendingStaffId] = useState<number | null>(null);
  const [currentOverrideReason, setCurrentOverrideReason] = useState<string>('');
  const [currentCapacityOverrideReason, setCurrentCapacityOverrideReason] = useState<string>('');
  const [maxStaffAllowed, setMaxStaffAllowed] = useState<number | null>(null);

  // Reset state when modal closes or opens
  useEffect(() => {
    if (!isOpen) {
      setSelectedDateForAssign('');
      setSelectedShiftId(null);
      setSelectedStaffIds(new Set());
      setAvailableStaff([]);
      setShiftsForDate([]);
      setEmploymentTypeFilter('ALL');
      setStaffNameFilter('');
      setOverrideReasons(new Map());
      setCapacityOverrideReasons(new Map());
      setShowOverrideModal(false);
      setShowCapacityOverrideModal(false);
      setPendingStaffId(null);
      setCurrentOverrideReason('');
      setCurrentCapacityOverrideReason('');
      setMaxStaffAllowed(null);
    } else {
      // Set date: use initialDate if provided, otherwise use today
      const dateToUse = initialDate || format(new Date(), 'yyyy-MM-dd');
      setSelectedDateForAssign(dateToUse);
      loadShiftsForDate(dateToUse);
    }
  }, [isOpen, initialDate]);

  // Load shifts for a specific date (only PUBLISHED shifts)
  const loadShiftsForDate = async (date: string) => {
    if (!branchId) return;
    
    try {
      setLoadingShifts(true);
      const shiftsData = await shiftService.getByBranch({
        branchId,
        startDate: date,
        endDate: date,
        status: 'PUBLISHED', // Only show PUBLISHED shifts for assignment
      });
      setShiftsForDate(shiftsData || []);
    } catch (error: any) {
      console.error('Failed to load shifts', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to load shifts');
    } finally {
      setLoadingShifts(false);
    }
  };

  // Load available staff for selected shift
  const loadAvailableStaff = async (shiftId: number) => {
    try {
      setLoadingStaff(true);
      const staff = await shiftAssignmentService.getAvailableStaffForShift(shiftId);
      setAvailableStaff(staff || []);
      // Get remaining slots from first staff (all should have same value)
      if (staff && staff.length > 0) {
        setRemainingSlots(staff[0].remainingSlots);
      } else {
        setRemainingSlots(0);
      }
      // Get maxStaffAllowed from shift
      const shift = shiftsForDate.find(s => s.shiftId === shiftId);
      if (shift) {
        setMaxStaffAllowed(shift.maxStaffAllowed || null);
      }
    } catch (error: any) {
      console.error('Failed to load available staff', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to load available staff');
      setAvailableStaff([]);
      setRemainingSlots(0);
    } finally {
      setLoadingStaff(false);
    }
  };

  // Handle shift selection
  const handleShiftSelect = (shiftId: number) => {
    setSelectedShiftId(shiftId);
    setSelectedStaffIds(new Set());
    loadAvailableStaff(shiftId);
  };

  // Check if staff has required role for shift
  const checkStaffHasRequiredRole = (staffId: number): boolean => {
    if (!selectedShiftId) return true;
    
    const shift = shiftsForDate.find(s => s.shiftId === selectedShiftId);
    if (!shift || !shift.roleRequirements || shift.roleRequirements.length === 0) {
      return true; // No role requirements
    }

    const staffItem = availableStaff.find(s => s.staff.userId === staffId);
    if (!staffItem) return false;

    const staffRoleIds = staffItem.staff.staffBusinessRoleIds || [];
    if (staffRoleIds.length === 0) return false;

    // Check if staff has at least one required role
    const requiredRoleIds = shift.roleRequirements
      .filter(req => req.required !== false)
      .map(req => req.roleId);

    if (requiredRoleIds.length === 0) return true; // No required roles

    return requiredRoleIds.some(roleId => staffRoleIds.includes(roleId));
  };

  // Toggle staff selection
  const handleStaffToggle = (staffId: number, isAvailable: boolean) => {
    if (!isAvailable) {
      toast.error('This staff member is not available for this shift');
      return;
    }
    
    const newSelected = new Set(selectedStaffIds);
    if (newSelected.has(staffId)) {
      newSelected.delete(staffId);
      // Remove override reasons when deselecting
      const newReasons = new Map(overrideReasons);
      newReasons.delete(staffId);
      setOverrideReasons(newReasons);
      const newCapacityReasons = new Map(capacityOverrideReasons);
      newCapacityReasons.delete(staffId);
      setCapacityOverrideReasons(newCapacityReasons);
    } else {
      // Check capacity
      // Calculate total staff count: already assigned + currently selected (including this new one)
      const currentAssignedCount = maxStaffAllowed !== null ? (maxStaffAllowed - remainingSlots) : 0;
      const currentSelectedCount = newSelected.size;
      const totalAfterAdding = currentAssignedCount + currentSelectedCount + 1; // +1 for the staff being added
      
      const maxAllowedWithOverride = maxStaffAllowed !== null ? Math.ceil(maxStaffAllowed * 1.20) : Infinity;
      const willExceedMaxOverride = maxStaffAllowed !== null && (totalAfterAdding > maxAllowedWithOverride);
      
      if (willExceedMaxOverride) {
        toast.error(`Cannot exceed capacity limit. Maximum allowed with override: ${maxAllowedWithOverride} (20% over ${maxStaffAllowed}). Current: ${currentAssignedCount}, Selected: ${currentSelectedCount + 1}`);
        return;
      }
      
      // Check if adding this staff will exceed capacity
      const willExceedCapacity = maxStaffAllowed !== null && (totalAfterAdding > maxStaffAllowed);
      
      if (willExceedCapacity) {
        // Show capacity override modal
        setPendingStaffId(staffId);
        setCurrentCapacityOverrideReason(capacityOverrideReasons.get(staffId) || '');
        setShowCapacityOverrideModal(true);
        return;
      }
      
      // Check if staff has required role
      const hasRequiredRole = checkStaffHasRequiredRole(staffId);
      if (!hasRequiredRole) {
        // Show role override modal
        setPendingStaffId(staffId);
        setCurrentOverrideReason(overrideReasons.get(staffId) || '');
        setShowOverrideModal(true);
        return;
      }
      
      newSelected.add(staffId);
    }
    setSelectedStaffIds(newSelected);
  };

  // Handle override reason confirmation
  const handleOverrideConfirm = () => {
    if (!pendingStaffId) return;
    
    if (!currentOverrideReason.trim()) {
      toast.error('Please provide a reason for overriding role requirements');
      return;
    }

    // Add staff to selection
    const newSelected = new Set(selectedStaffIds);
    newSelected.add(pendingStaffId);
    setSelectedStaffIds(newSelected);

    // Save override reason
    const newReasons = new Map(overrideReasons);
    newReasons.set(pendingStaffId, currentOverrideReason.trim());
    setOverrideReasons(newReasons);

    // Close modal
    setShowOverrideModal(false);
    setPendingStaffId(null);
    setCurrentOverrideReason('');
  };

  // Handle capacity override reason confirmation
  const handleCapacityOverrideConfirm = () => {
    if (!pendingStaffId) return;
    
    if (!currentCapacityOverrideReason.trim()) {
      toast.error('Please provide a reason for overriding capacity limit');
      return;
    }

    // Check if staff has required role
    const hasRequiredRole = checkStaffHasRequiredRole(pendingStaffId);
    if (!hasRequiredRole) {
      // Need role override too - show role override modal after capacity override
      setShowCapacityOverrideModal(false);
      // Save capacity override reason first
      const newCapacityReasons = new Map(capacityOverrideReasons);
      newCapacityReasons.set(pendingStaffId, currentCapacityOverrideReason.trim());
      setCapacityOverrideReasons(newCapacityReasons);
      // Then show role override modal
      setCurrentOverrideReason(overrideReasons.get(pendingStaffId) || '');
      setShowOverrideModal(true);
      return;
    }

    // Add staff to selection
    const newSelected = new Set(selectedStaffIds);
    newSelected.add(pendingStaffId);
    setSelectedStaffIds(newSelected);

    // Save capacity override reason
    const newCapacityReasons = new Map(capacityOverrideReasons);
    newCapacityReasons.set(pendingStaffId, currentCapacityOverrideReason.trim());
    setCapacityOverrideReasons(newCapacityReasons);

    // Close modal
    setShowCapacityOverrideModal(false);
    setPendingStaffId(null);
    setCurrentCapacityOverrideReason('');
  };

  // Assign selected staff to shift
  const handleAssignStaff = async () => {
    if (!selectedShiftId || selectedStaffIds.size === 0) {
      toast.error('Please select a shift and at least one staff member');
      return;
    }

    // Validate capacity (considering override)
    if (maxStaffAllowed !== null) {
      // Calculate total staff count: already assigned + currently selected
      const currentAssignedCount = maxStaffAllowed - remainingSlots;
      const currentSelectedCount = selectedStaffIds.size;
      const totalAfterAssigning = currentAssignedCount + currentSelectedCount;
      const maxAllowedWithOverride = Math.ceil(maxStaffAllowed * 1.20); // 20% over
      
      // Check if exceeding 20% limit
      if (totalAfterAssigning > maxAllowedWithOverride) {
        toast.error(`Cannot exceed capacity limit. Maximum allowed with override: ${maxAllowedWithOverride} (20% over ${maxStaffAllowed}). Current: ${currentAssignedCount}, Selected: ${currentSelectedCount}`);
        return;
      }
      
      // Count how many staff have capacity override reason
      let staffWithCapacityOverride = 0;
      selectedStaffIds.forEach(staffId => {
        if (capacityOverrideReasons.has(staffId) && capacityOverrideReasons.get(staffId)?.trim()) {
          staffWithCapacityOverride++;
        }
      });
      
      // Calculate how many staff are exceeding normal capacity
      const exceedingCapacity = totalAfterAssigning > maxStaffAllowed ? (totalAfterAssigning - maxStaffAllowed) : 0;
      
      // Check if staff exceeding capacity have override reason
      if (exceedingCapacity > 0) {
        if (staffWithCapacityOverride < exceedingCapacity) {
          const missingCount = exceedingCapacity - staffWithCapacityOverride;
          toast.error(`${missingCount} staff member(s) exceed capacity without override reason. Please provide capacity override reason for all exceeding staff.`);
          return;
        }
      }
    } else {
      // No maxStaffAllowed - no capacity limit
      // Just check if we have remaining slots (for display purposes)
      if (remainingSlots < 0 && selectedStaffIds.size > 0) {
        // This shouldn't happen, but just in case
        console.warn('Assigning staff when remainingSlots is negative');
      }
    }

    try {
      setAssigning(true);
      let successCount = 0;
      let errorCount = 0;

      for (const staffId of selectedStaffIds) {
        try {
          const overrideReason = overrideReasons.get(staffId);
          const capacityOverrideReason = capacityOverrideReasons.get(staffId);
          await shiftAssignmentService.createAssignment({
            shiftId: selectedShiftId,
            staffUserId: staffId,
            overrideReason: overrideReason,
            capacityOverrideReason: capacityOverrideReason,
          });
          successCount++;
        } catch (e: any) {
          console.error(`Failed to assign staff ${staffId}`, e);
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully assigned ${successCount} staff member(s)!`);
      }
      if (errorCount > 0) {
        toast.error(`Failed to assign ${errorCount} staff member(s)`);
      }

      // Reset and close
      onSuccess();
      onClose();
    } catch (e: any) {
      console.error('Failed to assign staff', e);
      toast.error(e?.response?.data?.message || e?.message || 'Failed to assign staff');
    } finally {
      setAssigning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-100 bg-white shadow-xl max-h-[90vh] flex flex-col relative">
        {/* Loading Overlay */}
        {assigning && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-sky-600 rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-slate-700">Assigning staff...</p>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Assign Staff to Shift</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Select a date, choose a shift, then select staff members
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
        <div className={`flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-6 ${assigning ? 'pointer-events-none opacity-60' : ''}`}>
          {/* Step 1: Select Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Step 1: Select Date</label>
            <input
              type="date"
              value={selectedDateForAssign}
              onChange={(e) => {
                const date = e.target.value;
                setSelectedDateForAssign(date);
                setSelectedShiftId(null);
                setSelectedStaffIds(new Set());
                setAvailableStaff([]);
                if (date) {
                  loadShiftsForDate(date);
                }
              }}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Step 2: Select Shift */}
          {selectedDateForAssign && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Step 2: Select Shift</label>
                <select
                  value={employmentTypeFilter}
                  onChange={(e) => {
                    setEmploymentTypeFilter(e.target.value);
                    setSelectedShiftId(null);
                    setSelectedStaffIds(new Set());
                    setAvailableStaff([]);
                  }}
                  className="text-xs rounded-lg border border-slate-200 px-2 py-1 text-slate-700 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="ALL">All</option>
                  <option value="FULL_TIME">Full-time</option>
                  <option value="PART_TIME">Part-time</option>
                  <option value="CASUAL">Casual</option>
                </select>
              </div>
              {loadingShifts ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-slate-200 border-t-sky-600 rounded-full animate-spin"></div>
                </div>
              ) : shiftsForDate.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-500 border border-slate-200 rounded-lg">
                  No shifts available for this date
                </div>
              ) : (() => {
                // Filter shifts by employment type
                const filteredShifts = shiftsForDate.filter((shift) => {
                  if (employmentTypeFilter === 'ALL') return true;
                  if (shift.employmentType === 'ANY') return true;
                  return shift.employmentType === employmentTypeFilter;
                });
                
                if (filteredShifts.length === 0) {
                  return (
                    <div className="text-center py-8 text-sm text-slate-500 border border-slate-200 rounded-lg">
                      No shifts available for selected employment type
                    </div>
                  );
                }
                
                return (
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                    {filteredShifts.map((shift) => (
                    <button
                      key={shift.shiftId}
                      type="button"
                      onClick={() => handleShiftSelect(shift.shiftId)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        selectedShiftId === shift.shiftId
                          ? 'border-sky-500 bg-sky-50'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock4 className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-900">
                            {shift.startTime.substring(0, 5)} - {shift.endTime.substring(0, 5)}
                          </span>
                          {shift.employmentType && shift.employmentType !== 'ANY' && (
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                              {shift.employmentType.replace('_', '-')}
                            </span>
                          )}
                        </div>
                        {selectedShiftId === shift.shiftId && (
                          <Check className="w-4 h-4 text-sky-600" />
                        )}
                      </div>
                      {shift.maxStaffAllowed && (
                        <p className="text-xs text-slate-500 mt-1">
                          Max: {shift.maxStaffAllowed} staff
                        </p>
                      )}
                      {selectedShiftId === shift.shiftId && remainingSlots >= 0 && (
                        <p className="text-xs text-slate-600 mt-1 font-medium">
                          {remainingSlots} slot(s) remaining
                        </p>
                      )}
                    </button>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Step 3: Select Staff */}
          {selectedShiftId && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Step 3: Select Staff ({selectedStaffIds.size} selected)
                  </label>
                  {remainingSlots > 0 && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {remainingSlots} slot(s) remaining
                    </p>
                  )}
                  {remainingSlots === 0 && maxStaffAllowed !== null && (
                    <p className="text-xs text-amber-600 mt-0.5">
                      Shift is full. You can still add staff with capacity override (up to {Math.ceil(maxStaffAllowed * 1.20)} staff, 20% over limit)
                    </p>
                  )}
                  {remainingSlots < 0 && maxStaffAllowed !== null && (
                    <p className="text-xs text-amber-600 mt-0.5">
                      Capacity exceeded. Can add up to {Math.ceil(maxStaffAllowed * 1.20)} staff (20% over limit)
                    </p>
                  )}
                </div>
                {selectedStaffIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedStaffIds(new Set())}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Clear selection
                  </button>
                )}
              </div>
              {/* Search filter */}
              <input
                type="text"
                placeholder="Search by name..."
                value={staffNameFilter}
                onChange={(e) => setStaffNameFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              {loadingStaff ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-slate-200 border-t-sky-600 rounded-full animate-spin"></div>
                </div>
              ) : (() => {
                // Calculate current assigned count and max allowed with override
                const currentAssignedCount = maxStaffAllowed !== null ? (maxStaffAllowed - remainingSlots) : 0;
                const maxAllowedWithOverride = maxStaffAllowed !== null ? Math.ceil(maxStaffAllowed * 1.20) : Infinity;
                const canStillAddStaff = currentAssignedCount < maxAllowedWithOverride;
                
                // Filter staff by availability and name
                // Show staff even if not available due to capacity, as long as we're within 20% limit
                const filteredStaff = availableStaff.filter((staffItem) => {
                  // If shift is within 20% limit, show staff even if not available due to capacity
                  if (!staffItem.isAvailable) {
                    // Check if the conflict is due to capacity (can be overridden)
                    const isCapacityConflict = canStillAddStaff && 
                      staffItem.conflictReason && 
                      (staffItem.conflictReason.includes("capacity") || 
                       staffItem.conflictReason.includes("full") ||
                       staffItem.conflictReason === null); // null conflictReason might indicate capacity issue
                    
                    // Only hide if conflict is not capacity-related or we've exceeded 20% limit
                    if (!isCapacityConflict) {
                      return false; // Hide staff with other conflicts (time conflict, etc.)
                    }
                    // Show staff with capacity conflict if within 20% limit
                  }
                  
                  // Filter by name if search term exists
                  if (!staffNameFilter.trim()) return true;
                  const searchTerm = staffNameFilter.toLowerCase().trim();
                  const staffName = staffItem.staff.fullname?.toLowerCase() || '';
                  const staffEmail = staffItem.staff.email?.toLowerCase() || '';
                  return staffName.includes(searchTerm) || staffEmail.includes(searchTerm);
                });
                
                if (filteredStaff.length === 0) {
                  return (
                    <div className="text-center py-8 text-sm text-slate-500 border border-slate-200 rounded-lg">
                      {staffNameFilter.trim() 
                        ? 'No staff found matching your search'
                        : !canStillAddStaff
                        ? `Shift has exceeded capacity limit (${maxAllowedWithOverride} staff, 20% over ${maxStaffAllowed})`
                        : 'No available staff found for this shift'}
                    </div>
                  );
                }
                
                return (
                  <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                    {filteredStaff.map((staffItem) => {
                      const staff = staffItem.staff;
                      const isAvailable = staffItem.isAvailable;
                      // Check if this staff is not available due to capacity (can be overridden)
                      const conflictReason = staffItem.conflictReason || '';
                      const isCapacityConflict = !isAvailable && canStillAddStaff && 
                        (conflictReason.includes("capacity") || 
                         conflictReason.includes("full") ||
                         conflictReason === '');
                      
                      return (
                        <button
                          key={staff.userId}
                          type="button"
                          onClick={() => {
                            // Allow clicking even if not available due to capacity (will show override modal)
                            if (!isAvailable && !isCapacityConflict) {
                              toast.error(conflictReason || 'This staff member is not available for this shift');
                              return;
                            }
                            // Pass true to allow selection (capacity override will be handled in handleStaffToggle)
                            handleStaffToggle(staff.userId, true);
                          }}
                          className={`p-3 rounded-lg border text-left transition-colors ${
                            selectedStaffIds.has(staff.userId)
                              ? 'border-sky-500 bg-sky-50'
                              : isCapacityConflict
                              ? 'border-amber-300 bg-amber-50 hover:border-amber-400 hover:bg-amber-100'
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-900">
                                  {staff.fullname}
                                </span>
                                {staff.employmentType && (
                                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                    {staff.employmentType.replace('_', '-')}
                                  </span>
                                )}
                              </div>
                              {staff.email && (
                                <p className="text-xs text-slate-500 mt-0.5">{staff.email}</p>
                              )}
                              {staff.staffBusinessRoleIds && staff.staffBusinessRoleIds.length > 0 && (
                                <p className="text-xs text-slate-400 mt-1">
                                  {staff.staffBusinessRoleIds.length} role(s)
                                </p>
                              )}
                              {isCapacityConflict && (
                                <p className="text-xs text-amber-600 mt-1 font-medium">
                                  Requires capacity override
                                </p>
                              )}
                              {!isAvailable && !isCapacityConflict && staffItem.conflictReason && (
                                <p className="text-xs text-red-500 mt-1">
                                  {staffItem.conflictReason}
                                </p>
                              )}
                            </div>
                            {selectedStaffIds.has(staff.userId) && (
                              <Check className="w-5 h-5 text-sky-600" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAssignStaff}
            disabled={!selectedShiftId || selectedStaffIds.size === 0 || assigning}
            className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[140px] justify-center"
          >
            {assigning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Assign {selectedStaffIds.size} Staff
              </>
            )}
          </button>
        </div>
      </div>

      {/* Override Role Requirements Modal */}
      {showOverrideModal && pendingStaffId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Override Role Requirements
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                This staff member does not have the required role for this shift. Please provide a reason for overriding this requirement.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reason for Override <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={currentOverrideReason}
                  onChange={(e) => setCurrentOverrideReason(e.target.value)}
                  placeholder="e.g., Emergency coverage, Training, etc."
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowOverrideModal(false);
                    setPendingStaffId(null);
                    setCurrentOverrideReason('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleOverrideConfirm}
                  disabled={!currentOverrideReason.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Override Capacity Limit Modal */}
      {showCapacityOverrideModal && pendingStaffId && maxStaffAllowed !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Override Capacity Limit
              </h3>
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800 mb-1">
                  <span className="font-semibold">Warning:</span> This shift has reached its maximum capacity ({maxStaffAllowed} staff).
                </p>
                <p className="text-xs text-amber-700">
                  Maximum allowed with override: {Math.ceil(maxStaffAllowed * 1.20)} (20% over limit)
                </p>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Please provide a reason for exceeding the capacity limit.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reason for Override <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={currentCapacityOverrideReason}
                  onChange={(e) => setCurrentCapacityOverrideReason(e.target.value)}
                  placeholder="e.g., Emergency coverage, Special event, etc."
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCapacityOverrideModal(false);
                    setPendingStaffId(null);
                    setCurrentCapacityOverrideReason('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCapacityOverrideConfirm}
                  disabled={!currentCapacityOverrideReason.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

