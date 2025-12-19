import { apiClient } from '../config/api';

interface ApiResponse<T> {
  code: number;
  message?: string;
  result: T;
}

export type PenaltyType = 'NO_SHOW' | 'LATE' | 'EARLY_LEAVE' | 'MISTAKE' | 'VIOLATION' | 'OTHER';
export type PenaltyStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Penalty {
  penaltyId: number;
  userId: number;
  branchId: number;
  period: string; // Format: YYYY-MM
  penaltyType: PenaltyType;
  amount: number;
  description: string;
  status: PenaltyStatus;
  sourceTemplateId: number | null;
  incidentDate?: string | null; // Format: YYYY-MM-DD
  shiftId?: number | null; // Tham chiếu đến shift
  reasonCode?: string | null; // Mã lý do
  createdBy: number;
  approvedBy: number | null;
  rejectedBy: number | null;
  rejectionReason: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  createAt: string;
  updateAt: string;
}

export interface PenaltyCreationRequest {
  userId: number;
  period: string; // Format: YYYY-MM
  penaltyType: PenaltyType;
  amount: number;
  description: string;
  incidentDate?: string | null; // Format: YYYY-MM-DD
  shiftId?: number | null; // Tham chiếu đến shift
  reasonCode?: string | null; // Mã lý do
}

export interface ApplyTemplateRequest {
  userId: number;
  period: string; // Format: YYYY-MM
  templateId: number;
  // Match backend ApplyTemplateRequest field names
  overrideAmount?: number;
  overrideDescription?: string;
  shiftId?: number | null;
  incidentDate?: string | null; // Format: YYYY-MM-DD
}

export interface PenaltyFilters {
  userId?: number;
  branchId?: number;
  period?: string;
  status?: PenaltyStatus;
}

class PenaltyService {
  private baseUrl = '/api/profiles/penalties';

  /**
   * Tạo penalty custom (không dùng template)
   */
  async createPenalty(request: PenaltyCreationRequest): Promise<Penalty> {
    try {
      const response = await apiClient.post<ApiResponse<Penalty>>(
        this.baseUrl,
        request
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error creating penalty:', error);
      throw error;
    }
  }

  /**
   * Apply template cho staff (Manager)
   */
  async applyTemplate(request: ApplyTemplateRequest): Promise<Penalty> {
    try {
      const response = await apiClient.post<ApiResponse<Penalty>>(
        `${this.baseUrl}/apply-template`,
        request
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error applying penalty template:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách penalty (có filter)
   */
  async getPenalties(filters?: PenaltyFilters): Promise<Penalty[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.userId) params.append('userId', filters.userId.toString());
      if (filters?.branchId) params.append('branchId', filters.branchId.toString());
      if (filters?.period) params.append('period', filters.period);
      if (filters?.status) params.append('status', filters.status);

      const queryString = params.toString();
      const url = queryString ? `${this.baseUrl}?${queryString}` : this.baseUrl;

      const response = await apiClient.get<ApiResponse<Penalty[]>>(url);
      if (response.code === 1000 || response.code === 200) {
        return response.result || [];
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error fetching penalties:', error);
      throw error;
    }
  }

  /**
   * Lấy penalties theo shift và userId
   */
  async getPenaltiesByShift(shiftId?: number, userId?: number): Promise<Penalty[]> {
    try {
      const params = new URLSearchParams();
      if (shiftId) params.append('shiftId', shiftId.toString());
      if (userId) params.append('userId', userId.toString());

      const queryString = params.toString();
      const url = `${this.baseUrl}/by-shift${queryString ? `?${queryString}` : ''}`;

      const response = await apiClient.get<ApiResponse<Penalty[]>>(url);
      if (response.code === 1000 || response.code === 200) {
        return response.result || [];
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error fetching penalties by shift:', error);
      throw error;
    }
  }

  /**
   * Lấy chi tiết penalty
   */
  async getPenaltyById(penaltyId: number): Promise<Penalty> {
    try {
      const response = await apiClient.get<ApiResponse<Penalty>>(
        `${this.baseUrl}/${penaltyId}`
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error fetching penalty by id:', error);
      throw error;
    }
  }

  /**
   * Duyệt penalty
   */
  async approvePenalty(penaltyId: number): Promise<Penalty> {
    try {
      const response = await apiClient.put<ApiResponse<Penalty>>(
        `${this.baseUrl}/${penaltyId}/approve`
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error approving penalty:', error);
      throw error;
    }
  }

  /**
   * Từ chối penalty
   */
  async rejectPenalty(penaltyId: number, rejectionReason?: string): Promise<Penalty> {
    try {
      const response = await apiClient.put<ApiResponse<Penalty>>(
        `${this.baseUrl}/${penaltyId}/reject`,
        rejectionReason || ''
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error rejecting penalty:', error);
      throw error;
    }
  }

  /**
   * Cập nhật penalty (chỉ khi PENDING)
   */
  async updatePenalty(penaltyId: number, request: PenaltyCreationRequest): Promise<Penalty> {
    try {
      const response = await apiClient.put<ApiResponse<Penalty>>(
        `${this.baseUrl}/${penaltyId}`,
        request
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error updating penalty:', error);
      throw error;
    }
  }

  /**
   * Xóa penalty (chỉ khi PENDING)
   */
  async deletePenalty(penaltyId: number): Promise<void> {
    try {
      await apiClient.delete<ApiResponse<void>>(`${this.baseUrl}/${penaltyId}`);
    } catch (error) {
      console.error('Error deleting penalty:', error);
      throw error;
    }
  }
}

export default new PenaltyService();

