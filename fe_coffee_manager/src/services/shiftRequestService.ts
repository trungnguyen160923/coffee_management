import apiClient from '../config/api';

export interface ShiftRequest {
  requestId: number;
  assignmentId: number;
  staffUserId: number;
  requestType: 'SWAP' | 'PICK_UP' | 'TWO_WAY_SWAP' | 'LEAVE' | 'OVERTIME';
  targetStaffUserId?: number | null;
  targetAssignmentId?: number | null;
  overtimeHours?: number | null;
  reason: string;
  status: 'PENDING' | 'PENDING_TARGET_APPROVAL' | 'PENDING_MANAGER_APPROVAL' | 'APPROVED' | 'REJECTED' | 'REJECTED_BY_TARGET' | 'CANCELLED';
  requestedAt: string;
  reviewedBy?: number | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  // Shift information
  shiftId?: number | null;
  shiftDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  durationHours?: number | null;
  // Timestamps
  updateAt?: string | null;
}

export interface ShiftRequestCreationRequest {
  assignmentId?: number; // Required for SWAP/PICK_UP/TWO_WAY_SWAP/LEAVE
  shiftId?: number; // Required for OVERTIME (xin làm ca mới)
  requestType: 'SWAP' | 'PICK_UP' | 'TWO_WAY_SWAP' | 'LEAVE' | 'OVERTIME';
  targetStaffUserId?: number;
  targetAssignmentId?: number; // For TWO_WAY_SWAP
  overtimeHours?: number; // Deprecated, not needed for OVERTIME
  reason: string;
}

export interface ApproveRejectRequest {
  reviewNotes?: string;
}

interface ApiResponse<T> {
  code: number;
  message?: string;
  result: T;
}

export const shiftRequestService = {
  /**
   * Get requests by staff ID
   * @deprecated Use getMyRequests() instead to avoid authentication issues
   */
  async getRequestsByStaff(staffId: number): Promise<ShiftRequest[]> {
    const res = await apiClient.get<ApiResponse<ShiftRequest[]>>(
      `/api/profiles/shift-requests/staff/${staffId}`
    );
    return res.result || [];
  },

  /**
   * Get my requests (uses authenticated user ID from token)
   * This is the preferred method to avoid path variable authentication issues
   */
  async getMyRequests(): Promise<ShiftRequest[]> {
    const res = await apiClient.get<ApiResponse<ShiftRequest[]>>(
      `/api/profiles/shift-requests/my-requests`
    );
    return res.result || [];
  },

  /**
   * Get request by ID
   */
  async getRequestById(requestId: number): Promise<ShiftRequest> {
    const res = await apiClient.get<ApiResponse<ShiftRequest>>(
      `/api/profiles/shift-requests/${requestId}`
    );
    return res.result;
  },

  /**
   * Create a shift request
   */
  async createRequest(request: ShiftRequestCreationRequest): Promise<ShiftRequest> {
    const res = await apiClient.post<ApiResponse<ShiftRequest>>(
      `/api/profiles/shift-requests`,
      request
    );
    return res.result;
  },

  /**
   * Approve a shift request (Manager only)
   */
  async approveRequest(requestId: number, reviewNotes?: string): Promise<ShiftRequest> {
    const res = await apiClient.put<ApiResponse<ShiftRequest>>(
      `/api/profiles/shift-requests/${requestId}/approve`,
      reviewNotes ? { reviewNotes } : {}
    );
    return res.result;
  },

  /**
   * Reject a shift request (Manager only)
   */
  async rejectRequest(requestId: number, reviewNotes?: string): Promise<ShiftRequest> {
    const res = await apiClient.put<ApiResponse<ShiftRequest>>(
      `/api/profiles/shift-requests/${requestId}/reject`,
      reviewNotes ? { reviewNotes } : {}
    );
    return res.result;
  },

  /**
   * Cancel a request (by staff who created it)
   */
  async cancelRequest(requestId: number): Promise<ShiftRequest> {
    const res = await apiClient.put<ApiResponse<ShiftRequest>>(
      `/api/profiles/shift-requests/${requestId}/cancel`
    );
    return res.result;
  },

  /**
   * Get requests waiting for target staff response (only PENDING_TARGET_APPROVAL)
   */
  async getPendingResponseRequests(): Promise<ShiftRequest[]> {
    const res = await apiClient.get<ApiResponse<ShiftRequest[]>>(
      `/api/profiles/shift-requests/pending-response`
    );
    return res.result || [];
  },

  /**
   * Get all requests sent to current user (all statuses including REJECTED_BY_TARGET, APPROVED, etc.)
   */
  async getIncomingRequests(): Promise<ShiftRequest[]> {
    const res = await apiClient.get<ApiResponse<ShiftRequest[]>>(
      `/api/profiles/shift-requests/incoming-requests`
    );
    return res.result || [];
  },

  /**
   * Target staff respond to request (accept/reject)
   */
  async respondToRequest(requestId: number, accept: boolean, responseNotes?: string): Promise<ShiftRequest> {
    const res = await apiClient.put<ApiResponse<ShiftRequest>>(
      `/api/profiles/shift-requests/${requestId}/respond`,
      { accept, responseNotes }
    );
    return res.result;
  },

  /**
   * Get all requests by branch ID (for manager)
   * Returns all requests regardless of status
   */
  async getRequestsByBranch(branchId: number): Promise<ShiftRequest[]> {
    const res = await apiClient.get<ApiResponse<ShiftRequest[]>>(
      `/api/profiles/shift-requests/branch/${branchId}`
    );
    return res.result || [];
  },

  /**
   * Get requests by branch ID that need manager approval
   * Only returns requests with status PENDING or PENDING_MANAGER_APPROVAL
   */
  async getRequestsPendingManagerApprovalByBranch(branchId: number): Promise<ShiftRequest[]> {
    const res = await apiClient.get<ApiResponse<ShiftRequest[]>>(
      `/api/profiles/shift-requests/branch/${branchId}/pending-manager`
    );
    return res.result || [];
  },
};

export default shiftRequestService;

