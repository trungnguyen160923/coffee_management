import { apiClient } from '../config/api';

interface ApiResponse<T> {
  code: number;
  message?: string;
  result: T;
}

export type BonusType = 'PERFORMANCE' | 'ATTENDANCE' | 'SPECIAL' | 'HOLIDAY' | 'OTHER';
export type BonusStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Bonus {
  bonusId: number;
  userId: number;
  branchId: number;
  period: string; // Format: YYYY-MM
  bonusType: BonusType;
  amount: number;
  description: string;
  status: BonusStatus;
  sourceTemplateId: number | null;
  createdBy: number;
  approvedBy: number | null;
  rejectedBy: number | null;
  rejectionReason: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  createAt: string;
  updateAt: string;
}

export interface BonusCreationRequest {
  userId: number;
  period: string; // Format: YYYY-MM
  bonusType: BonusType;
  amount: number;
  description: string;
  shiftId?: number | null;
}

export interface ApplyTemplateRequest {
  userId: number;
  period: string; // Format: YYYY-MM
  templateId: number;
  // Match backend ApplyTemplateRequest field names
  overrideAmount?: number;
  overrideDescription?: string;
  shiftId?: number | null;
}

export interface BonusFilters {
  userId?: number;
  branchId?: number;
  period?: string;
  status?: BonusStatus;
}

class BonusService {
  private baseUrl = '/api/profiles/bonuses';

  /**
   * Tạo bonus custom (không dùng template)
   */
  async createBonus(request: BonusCreationRequest): Promise<Bonus> {
    try {
      const response = await apiClient.post<ApiResponse<Bonus>>(
        this.baseUrl,
        request
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error creating bonus:', error);
      throw error;
    }
  }

  /**
   * Apply template cho staff (Manager)
   */
  async applyTemplate(request: ApplyTemplateRequest): Promise<Bonus> {
    try {
      const response = await apiClient.post<ApiResponse<Bonus>>(
        `${this.baseUrl}/apply-template`,
        request
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error applying bonus template:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách bonus (có filter)
   */
  async getBonuses(filters?: BonusFilters): Promise<Bonus[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.userId) params.append('userId', filters.userId.toString());
      if (filters?.branchId) params.append('branchId', filters.branchId.toString());
      if (filters?.period) params.append('period', filters.period);
      if (filters?.status) params.append('status', filters.status);

      const queryString = params.toString();
      const url = queryString ? `${this.baseUrl}?${queryString}` : this.baseUrl;

      const response = await apiClient.get<ApiResponse<Bonus[]>>(url);
      if (response.code === 1000 || response.code === 200) {
        return response.result || [];
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error fetching bonuses:', error);
      throw error;
    }
  }

  /**
   * Lấy chi tiết bonus
   */
  async getBonusById(bonusId: number): Promise<Bonus> {
    try {
      const response = await apiClient.get<ApiResponse<Bonus>>(
        `${this.baseUrl}/${bonusId}`
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error fetching bonus by id:', error);
      throw error;
    }
  }

  /**
   * Duyệt bonus
   */
  async approveBonus(bonusId: number): Promise<Bonus> {
    try {
      const response = await apiClient.put<ApiResponse<Bonus>>(
        `${this.baseUrl}/${bonusId}/approve`
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error approving bonus:', error);
      throw error;
    }
  }

  /**
   * Cập nhật bonus (chỉ khi PENDING)
   */
  async updateBonus(bonusId: number, request: BonusCreationRequest): Promise<Bonus> {
    try {
      const response = await apiClient.put<ApiResponse<Bonus>>(
        `${this.baseUrl}/${bonusId}`,
        request
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error updating bonus:', error);
      throw error;
    }
  }

  /**
   * Từ chối bonus
   */
  async rejectBonus(bonusId: number, rejectionReason?: string): Promise<Bonus> {
    try {
      const response = await apiClient.put<ApiResponse<Bonus>>(
        `${this.baseUrl}/${bonusId}/reject`,
        rejectionReason || ''
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error rejecting bonus:', error);
      throw error;
    }
  }

  /**
   * Xóa bonus (chỉ khi PENDING)
   */
  async deleteBonus(bonusId: number): Promise<void> {
    try {
      await apiClient.delete<ApiResponse<void>>(`${this.baseUrl}/${bonusId}`);
    } catch (error) {
      console.error('Error deleting bonus:', error);
      throw error;
    }
  }
}

export default new BonusService();

