import { useEffect, useCallback, useRef } from 'react';
import { useNotificationWebSocket, NotificationPayload } from './useNotificationWebSocket';
import { useAuth } from '../context/AuthContext';

export interface ShiftUpdatePayload extends NotificationPayload {
  metadata?: {
    assignmentId?: number;
    shiftId?: number;
    staffUserId?: number;
    shiftDate?: string;
    startTime?: string;
    endTime?: string;
    status?: string;
    assignmentType?: string;
    branchId?: number;
  };
}

export interface UseShiftWebSocketOptions {
  onAssignmentCreated?: (payload: ShiftUpdatePayload) => void;
  onAssignmentUpdated?: (payload: ShiftUpdatePayload) => void;
  onAssignmentApproved?: (payload: ShiftUpdatePayload) => void;
  onAssignmentRejected?: (payload: ShiftUpdatePayload) => void;
  onAssignmentDeleted?: (payload: ShiftUpdatePayload) => void;
  onAssignmentCheckedIn?: (payload: ShiftUpdatePayload) => void;
  onAssignmentCheckedOut?: (payload: ShiftUpdatePayload) => void;
  // Draft shift events
  onDraftCreated?: (payload: ShiftUpdatePayload) => void;
  onDraftUpdated?: (payload: ShiftUpdatePayload) => void;
  onDraftDeleted?: (payload: ShiftUpdatePayload) => void;
  // Request events
  onRequestCreated?: (payload: ShiftUpdatePayload) => void;
  onRequestApproved?: (payload: ShiftUpdatePayload) => void;
  onRequestRejected?: (payload: ShiftUpdatePayload) => void;
  onRequestCancelled?: (payload: ShiftUpdatePayload) => void;
  onRequestTargetResponded?: (payload: ShiftUpdatePayload) => void;
  // Shift published
  onShiftPublished?: (payload: ShiftUpdatePayload) => void;
  enabled?: boolean;
}

const SHIFT_NOTIFICATION_TYPES = [
  'SHIFT_ASSIGNMENT_CREATED',
  'SHIFT_ASSIGNMENT_UPDATED',
  'SHIFT_ASSIGNMENT_APPROVED',
  'SHIFT_ASSIGNMENT_REJECTED',
  'SHIFT_ASSIGNMENT_DELETED',
  'SHIFT_ASSIGNMENT_CHECKED_IN',
  'SHIFT_ASSIGNMENT_CHECKED_OUT',
  'SHIFT_DRAFT_CREATED',
  'SHIFT_DRAFT_UPDATED',
  'SHIFT_DRAFT_DELETED',
  'SHIFT_PUBLISHED',
  'SHIFT_REQUEST_LEAVE_CREATED',
  'SHIFT_REQUEST_SWAP_CREATED',
  'SHIFT_REQUEST_OVERTIME_CREATED',
  'SHIFT_REQUEST_APPROVED',
  'SHIFT_REQUEST_REJECTED',
  'SHIFT_REQUEST_CANCELLED',
  'SHIFT_REQUEST_TARGET_RESPONDED',
] as const;

export function useShiftWebSocket(options: UseShiftWebSocketOptions = {}) {
  const {
    onAssignmentCreated,
    onAssignmentUpdated,
    onAssignmentApproved,
    onAssignmentRejected,
    onAssignmentDeleted,
    onAssignmentCheckedIn,
    onAssignmentCheckedOut,
    onDraftCreated,
    onDraftUpdated,
    onDraftDeleted,
    onRequestCreated,
    onRequestApproved,
    onRequestRejected,
    onRequestCancelled,
    onRequestTargetResponded,
    onShiftPublished,
    enabled = true,
  } = options;

  const { user, managerBranch } = useAuth();
  const callbacksRef = useRef({
    onAssignmentCreated,
    onAssignmentUpdated,
    onAssignmentApproved,
    onAssignmentRejected,
    onAssignmentDeleted,
    onAssignmentCheckedIn,
    onAssignmentCheckedOut,
    onDraftCreated,
    onDraftUpdated,
    onDraftDeleted,
    onRequestCreated,
    onRequestApproved,
    onRequestRejected,
    onRequestCancelled,
    onRequestTargetResponded,
    onShiftPublished,
  });

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = {
      onAssignmentCreated,
      onAssignmentUpdated,
      onAssignmentApproved,
      onAssignmentRejected,
      onAssignmentDeleted,
      onAssignmentCheckedIn,
      onAssignmentCheckedOut,
      onDraftCreated,
      onDraftUpdated,
      onDraftDeleted,
      onRequestCreated,
      onRequestApproved,
      onRequestRejected,
      onRequestCancelled,
      onRequestTargetResponded,
      onShiftPublished,
    };
  }, [
    onAssignmentCreated,
    onAssignmentUpdated,
    onAssignmentApproved,
    onAssignmentRejected,
    onAssignmentDeleted,
    onAssignmentCheckedIn,
    onAssignmentCheckedOut,
    onDraftCreated,
    onDraftUpdated,
    onDraftDeleted,
    onRequestCreated,
    onRequestApproved,
    onRequestRejected,
    onRequestCancelled,
    onRequestTargetResponded,
    onShiftPublished,
  ]);

  const handleMessage = useCallback((message: NotificationPayload) => {
    // Only handle shift-related notifications
    if (!SHIFT_NOTIFICATION_TYPES.includes(message.type as any)) {
      return;
    }

    const shiftPayload = message as ShiftUpdatePayload;

    // Call appropriate callback based on notification type
    switch (message.type) {
      case 'SHIFT_ASSIGNMENT_CREATED':
        callbacksRef.current.onAssignmentCreated?.(shiftPayload);
        break;
      case 'SHIFT_ASSIGNMENT_UPDATED':
        callbacksRef.current.onAssignmentUpdated?.(shiftPayload);
        break;
      case 'SHIFT_ASSIGNMENT_APPROVED':
        callbacksRef.current.onAssignmentApproved?.(shiftPayload);
        break;
      case 'SHIFT_ASSIGNMENT_REJECTED':
        callbacksRef.current.onAssignmentRejected?.(shiftPayload);
        break;
      case 'SHIFT_ASSIGNMENT_DELETED':
        callbacksRef.current.onAssignmentDeleted?.(shiftPayload);
        break;
      case 'SHIFT_ASSIGNMENT_CHECKED_IN':
        callbacksRef.current.onAssignmentCheckedIn?.(shiftPayload);
        break;
      case 'SHIFT_ASSIGNMENT_CHECKED_OUT':
        callbacksRef.current.onAssignmentCheckedOut?.(shiftPayload);
        break;
      case 'SHIFT_DRAFT_CREATED':
        callbacksRef.current.onDraftCreated?.(shiftPayload);
        break;
      case 'SHIFT_DRAFT_UPDATED':
        callbacksRef.current.onDraftUpdated?.(shiftPayload);
        break;
      case 'SHIFT_DRAFT_DELETED':
        callbacksRef.current.onDraftDeleted?.(shiftPayload);
        break;
      case 'SHIFT_PUBLISHED':
        callbacksRef.current.onShiftPublished?.(shiftPayload);
        break;
      case 'SHIFT_REQUEST_LEAVE_CREATED':
      case 'SHIFT_REQUEST_SWAP_CREATED':
      case 'SHIFT_REQUEST_OVERTIME_CREATED':
        callbacksRef.current.onRequestCreated?.(shiftPayload);
        break;
      case 'SHIFT_REQUEST_APPROVED':
        callbacksRef.current.onRequestApproved?.(shiftPayload);
        break;
      case 'SHIFT_REQUEST_REJECTED':
        callbacksRef.current.onRequestRejected?.(shiftPayload);
        break;
      case 'SHIFT_REQUEST_CANCELLED':
        callbacksRef.current.onRequestCancelled?.(shiftPayload);
        break;
      case 'SHIFT_REQUEST_TARGET_RESPONDED':
        callbacksRef.current.onRequestTargetResponded?.(shiftPayload);
        break;
    }
  }, []);

  // Determine branchId and role
  const branchId = managerBranch?.branchId || user?.branch?.branchId || (user?.branchId ? Number(user.branchId) : null);
  const userId = user?.user_id || (user?.id ? Number(user.id) : null);
  const role = user?.role || '';

  // Subscribe to both branch topic and user queue
  const { isConnected } = useNotificationWebSocket({
    branchId,
    userId,
    enabled: enabled && (branchId !== null || userId !== null),
    subscribeBranch: true,
    subscribeUserQueue: true,
    role: role.toLowerCase(),
    onMessage: handleMessage,
  });

  return {
    isConnected,
  };
}

