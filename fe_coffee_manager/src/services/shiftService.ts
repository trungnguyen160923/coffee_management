import apiClient from '../config/api';

export type ShiftStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CASUAL' | 'ANY';
export type ShiftType = 'NORMAL' | 'WEEKEND' | 'HOLIDAY' | 'OVERTIME';

export interface Shift {
  shiftId: number;
  branchId: number;
  templateId: number | null;
  shiftDate: string; // ISO date
  startTime: string; // HH:mm:ss
  endTime: string;   // HH:mm:ss
  durationHours: number;
  maxStaffAllowed: number | null;
  employmentType?: EmploymentType | null; // NULL = kế thừa từ template
  status: ShiftStatus;
  shiftType?: ShiftType; // NORMAL, WEEKEND, HOLIDAY, OVERTIME
  notes: string | null;
  roleRequirements?: ShiftRoleRequirement[];
  // Availability info for staff self-service
  isExpired?: boolean; // Shift date has passed
  isFull?: boolean; // Max staff reached
  isRegistered?: boolean; // Staff has already registered
  isAvailable?: boolean; // Can be registered (not expired, not full, not registered)
  assignmentId?: number | null; // Assignment ID if already registered (for unregister)
}

export interface ShiftRoleRequirement {
  id?: number; // Optional, only present in responses
  roleId: number;
  quantity: number;
  required: boolean;
  notes?: string | null;
}

export interface ShiftCreateRequest {
  branchId: number;
  templateId?: number | null;
  shiftDate: string;
  startTime: string;
  endTime: string;
  maxStaffAllowed?: number | null;
  employmentType?: EmploymentType | null; // NULL = kế thừa từ template
  notes?: string | null;
  roleRequirements?: ShiftRoleRequirement[];
}

export interface ShiftUpdateRequest {
  branchId?: number;
  templateId?: number | null;
  shiftDate?: string;
  startTime?: string;
  endTime?: string;
  maxStaffAllowed?: number | null;
  employmentType?: EmploymentType | null; // NULL = kế thừa từ template
  status?: ShiftStatus;
  notes?: string | null;
  roleRequirements?: ShiftRoleRequirement[];
}

export interface ShiftBatchCreateRequest {
  branchId: number;
  templateId: number;
  startDate: string;
  endDate: string;
  maxStaffAllowed?: number | null;
  employmentType?: EmploymentType | null; // NULL = kế thừa từ template
  notes?: string | null;
  roleRequirements?: ShiftRoleRequirement[];
}

interface ApiResponse<T> {
  code: number;
  message?: string;
  result: T;
}

export const shiftService = {
  async getByBranch(params: {
    branchId: number;
    startDate: string;
    endDate: string;
    status?: string;
  }): Promise<Shift[]> {
    const query = new URLSearchParams({
      startDate: params.startDate,
      endDate: params.endDate,
      ...(params.status ? { status: params.status } : {}),
    }).toString();

    const res = await apiClient.get<ApiResponse<Shift[]>>(
      `/api/profiles/shifts/branch/${params.branchId}?${query}`
    );
    return res.result || [];
  },

  async getById(shiftId: number): Promise<Shift> {
    const res = await apiClient.get<ApiResponse<Shift>>(`/api/profiles/shifts/${shiftId}`);
    return res.result;
  },

  async createShift(payload: ShiftCreateRequest): Promise<Shift> {
    const res = await apiClient.post<ApiResponse<Shift>>(`/api/profiles/shifts`, payload);
    return res.result;
  },

  async updateShift(shiftId: number, payload: ShiftUpdateRequest): Promise<Shift> {
    const res = await apiClient.put<ApiResponse<Shift>>(
      `/api/profiles/shifts/${shiftId}`,
      payload
    );
    return res.result;
  },

  async deleteShift(shiftId: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(`/api/profiles/shifts/${shiftId}`);
  },

  async publishShift(shiftId: number): Promise<Shift> {
    const res = await apiClient.post<ApiResponse<Shift>>(
      `/api/profiles/shifts/${shiftId}/publish`
    );
    return res.result;
  },

  async revertToDraft(shiftId: number): Promise<Shift> {
    const res = await apiClient.post<ApiResponse<Shift>>(
      `/api/profiles/shifts/${shiftId}/revert-to-draft`
    );
    return res.result;
  },

  async batchCreate(payload: ShiftBatchCreateRequest): Promise<Shift[]> {
    const res = await apiClient.post<ApiResponse<Shift[]>>(
      `/api/profiles/shifts/batch-create`,
      payload
    );
    return res.result || [];
  },

  async batchPublish(params: {
    branchId: number;
    startDate: string;
    endDate: string;
  }): Promise<BatchOperationResult> {
    const query = new URLSearchParams({
      branchId: params.branchId.toString(),
      startDate: params.startDate,
      endDate: params.endDate,
    }).toString();
    const res = await apiClient.post<ApiResponse<BatchOperationResult>>(
      `/api/profiles/shifts/batch-publish?${query}`
    );
    return res.result;
  },

  async batchCancel(params: {
    branchId: number;
    startDate: string;
    endDate: string;
  }): Promise<BatchOperationResult> {
    const query = new URLSearchParams({
      branchId: params.branchId.toString(),
      startDate: params.startDate,
      endDate: params.endDate,
    }).toString();
    const res = await apiClient.post<ApiResponse<BatchOperationResult>>(
      `/api/profiles/shifts/batch-cancel?${query}`
    );
    return res.result;
  },

  // Staff self-service APIs
  async getAvailableShifts(params: {
    branchId: number;
    startDate: string;
    endDate: string;
  }): Promise<Shift[]> {
    const query = new URLSearchParams({
      branchId: params.branchId.toString(),
      startDate: params.startDate,
      endDate: params.endDate,
    }).toString();
    const res = await apiClient.get<ApiResponse<Shift[]>>(
      `/api/profiles/shifts/available?${query}`
    );
    return res.result || [];
  },

  async registerForShift(shiftId: number): Promise<ShiftAssignmentResponse> {
    const res = await apiClient.post<ApiResponse<ShiftAssignmentResponse>>(
      `/api/profiles/shifts/${shiftId}/register`
    );
    return res.result;
  },

  async unregisterFromShift(assignmentId: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(
      `/api/profiles/shift-assignments/${assignmentId}/unregister`
    );
  },

  /**
   * Lấy danh sách shifts mà staff được assign trong period
   */
  async getShiftsByStaffAndPeriod(userId: number, period: string): Promise<Shift[]> {
    const query = new URLSearchParams({
      userId: userId.toString(),
      period: period,
    }).toString();
    const res = await apiClient.get<ApiResponse<Shift[]>>(
      `/api/profiles/shifts/staff/${userId}?${query}`
    );
    return res.result || [];
  },
};

export interface ShiftAssignmentResponse {
  assignmentId: number;
  shiftId: number;
  staffUserId: number;
  roleId: number | null;
  assignmentType: string;
  status: string;
  borrowedStaff: boolean;
  staffBaseBranchId: number | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  actualHours: number | null;
  notes: string | null;
}

export interface BatchOperationResult {
  successCount: number;
  skippedCount: number;
  updatedShifts: Shift[];
}

export default shiftService;



