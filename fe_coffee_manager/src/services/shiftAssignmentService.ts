import apiClient from '../config/api';
import { StaffWithUserDto } from '../types';

export interface ShiftAssignment {
  assignmentId: number;
  shiftId: number;
  staffUserId: number;
  // roleId removed - staff works with all their roles
  assignmentType: string; // 'SELF_REGISTERED' | 'MANUAL'
  status: string; // 'PENDING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED'
  borrowedStaff: boolean;
  staffBaseBranchId: number | null;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  actualHours: number | null;
  notes: string | null;
  createAt?: string;
}

export interface ShiftAssignmentCreateRequest {
  shiftId: number;
  staffUserId: number;
  overrideReason?: string; // Optional: Reason for overriding role requirements
  capacityOverrideReason?: string; // Optional: Reason for overriding capacity limit
  // roleId removed - staff works with all their roles
}

export interface ShiftAssignmentUpdateRequest {
  // roleId removed - staff works with all their roles
  // This interface is kept for backward compatibility but no fields are needed
}

export interface ShiftAssignmentRejectRequest {
  reason?: string;
}

interface ApiResponse<T> {
  code: number;
  message?: string;
  result: T;
}

export const shiftAssignmentService = {
  // Staff APIs
  async getMyAssignments(params: {
    startDate: string;
    endDate: string;
  }): Promise<ShiftAssignment[]> {
    const query = new URLSearchParams({
      startDate: params.startDate,
      endDate: params.endDate,
    }).toString();
    const res = await apiClient.get<ApiResponse<ShiftAssignment[]>>(
      `/api/profiles/shift-assignments/my-assignments?${query}`
    );
    return res.result || [];
  },

  // Manager APIs
  async getByShift(shiftId: number): Promise<ShiftAssignment[]> {
    const res = await apiClient.get<ApiResponse<ShiftAssignment[]>>(
      `/api/profiles/shift-assignments/shift/${shiftId}`
    );
    return res.result || [];
  },

  async getByStaff(params: {
    staffId: number;
    startDate: string;
    endDate: string;
  }): Promise<ShiftAssignment[]> {
    const query = new URLSearchParams({
      startDate: params.startDate,
      endDate: params.endDate,
    }).toString();
    const res = await apiClient.get<ApiResponse<ShiftAssignment[]>>(
      `/api/profiles/shift-assignments/staff/${params.staffId}?${query}`
    );
    return res.result || [];
  },

  async getByBranch(params: {
    branchId: number;
    startDate: string;
    endDate: string;
    status?: string;
  }): Promise<ShiftAssignment[]> {
    const query = new URLSearchParams({
      startDate: params.startDate,
      endDate: params.endDate,
      ...(params.status ? { status: params.status } : {}),
    }).toString();
    const res = await apiClient.get<ApiResponse<ShiftAssignment[]>>(
      `/api/profiles/shift-assignments/branch/${params.branchId}?${query}`
    );
    return res.result || [];
  },

  async createAssignment(payload: ShiftAssignmentCreateRequest): Promise<ShiftAssignment> {
    const res = await apiClient.post<ApiResponse<ShiftAssignment>>(
      `/api/profiles/shift-assignments`,
      payload
    );
    return res.result;
  },

  async updateAssignment(assignmentId: number, payload: ShiftAssignmentUpdateRequest): Promise<ShiftAssignment> {
    const res = await apiClient.put<ApiResponse<ShiftAssignment>>(
      `/api/profiles/shift-assignments/${assignmentId}`,
      payload
    );
    return res.result;
  },

  async deleteAssignment(assignmentId: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(
      `/api/profiles/shift-assignments/${assignmentId}`
    );
  },

  async approveAssignment(assignmentId: number): Promise<ShiftAssignment> {
    const res = await apiClient.post<ApiResponse<ShiftAssignment>>(
      `/api/profiles/shift-assignments/${assignmentId}/approve`
    );
    return res.result;
  },

  async rejectAssignment(assignmentId: number, reason?: string): Promise<ShiftAssignment> {
    const res = await apiClient.post<ApiResponse<ShiftAssignment>>(
      `/api/profiles/shift-assignments/${assignmentId}/reject`,
      reason ? { reason } : {}
    );
    return res.result;
  },

  async getAvailableStaffForShift(shiftId: number): Promise<AvailableStaffForShift[]> {
    const res = await apiClient.get<ApiResponse<AvailableStaffForShift[]>>(
      `/api/profiles/shift-assignments/shift/${shiftId}/available-staff`
    );
    return res.result || [];
  },

  // Public branch schedule (chỉ tên nhân viên và giờ)
  async getPublicBranchSchedule(params: {
    branchId: number;
    startDate: string;
    endDate: string;
  }): Promise<BranchPublicScheduleItem[]> {
    const query = new URLSearchParams({
      startDate: params.startDate,
      endDate: params.endDate,
    }).toString();
    const res = await apiClient.get<ApiResponse<BranchPublicScheduleItem[]>>(
      `/api/profiles/shift-assignments/branch/${params.branchId}/public-schedule?${query}`
    );
    return res.result || [];
  },

  // Staff check-in/check-out APIs
  async checkIn(assignmentId: number): Promise<ShiftAssignment> {
    const res = await apiClient.post<ApiResponse<ShiftAssignment>>(
      `/api/profiles/shift-assignments/${assignmentId}/check-in`
    );
    return res.result;
  },

  async checkOut(assignmentId: number): Promise<ShiftAssignment> {
    const res = await apiClient.post<ApiResponse<ShiftAssignment>>(
      `/api/profiles/shift-assignments/${assignmentId}/check-out`
    );
    return res.result;
  },
};

export interface BranchPublicScheduleItem {
  shiftDate: string; // yyyy-MM-dd
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  staffName: string;
  staffUserId: number;
  shiftId: number;
  assignmentId: number;
}

export interface AvailableStaffForShift {
  staff: StaffWithUserDto;
  isAvailable: boolean;
  conflictReason: string | null;
  remainingSlots: number;
}

export default shiftAssignmentService;

