import { apiClient } from '../config/api';

interface ApiResponse<T> {
  code: number;
  message?: string;
  result: T;
}

export type AllowanceType = 'TRANSPORT' | 'MEAL' | 'PHONE' | 'HOUSING' | 'OTHER';
export type AllowanceStatus = 'ACTIVE' | 'INACTIVE';

export interface Allowance {
  allowanceId: number;
  userId: number;
  branchId: number;
  period: string; // Format: YYYY-MM
  allowanceType: AllowanceType;
  amount: number;
  description: string;
  status: AllowanceStatus;
  sourceTemplateId: number | null;
  createdBy: number;
  createAt: string;
  updateAt: string;
}

export interface AllowanceCreationRequest {
  userId: number;
  period: string; // Format: YYYY-MM
  allowanceType: AllowanceType;
  amount: number;
  description: string;
}

export interface ApplyTemplateRequest {
  userId: number;
  period: string; // Format: YYYY-MM
  templateId: number;
  // Match backend ApplyTemplateRequest field names
  overrideAmount?: number;
  overrideDescription?: string;
}

export interface AllowanceFilters {
  userId?: number;
  branchId?: number;
  period?: string;
  status?: AllowanceStatus;
}

class AllowanceService {
  private baseUrl = '/api/profiles/allowances';

  /**
   * Tạo allowance custom (không dùng template)
   */
  async createAllowance(request: AllowanceCreationRequest): Promise<Allowance> {
    try {
      const response = await apiClient.post<ApiResponse<Allowance>>(
        this.baseUrl,
        request
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error creating allowance:', error);
      throw error;
    }
  }

  /**
   * Apply template cho staff (Manager)
   */
  async applyTemplate(request: ApplyTemplateRequest): Promise<Allowance> {
    try {
      const response = await apiClient.post<ApiResponse<Allowance>>(
        `${this.baseUrl}/apply-template`,
        request
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error applying allowance template:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách allowance (có filter)
   */
  async getAllowances(filters?: AllowanceFilters): Promise<Allowance[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.userId) params.append('userId', filters.userId.toString());
      if (filters?.branchId) params.append('branchId', filters.branchId.toString());
      if (filters?.period) params.append('period', filters.period);
      if (filters?.status) params.append('status', filters.status);

      const queryString = params.toString();
      const url = queryString ? `${this.baseUrl}?${queryString}` : this.baseUrl;

      const response = await apiClient.get<ApiResponse<Allowance[]>>(url);
      if (response.code === 1000 || response.code === 200) {
        return response.result || [];
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error fetching allowances:', error);
      throw error;
    }
  }

  /**
   * Lấy chi tiết allowance
   */
  async getAllowanceById(allowanceId: number): Promise<Allowance> {
    try {
      const response = await apiClient.get<ApiResponse<Allowance>>(
        `${this.baseUrl}/${allowanceId}`
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error fetching allowance by id:', error);
      throw error;
    }
  }

  /**
   * Cập nhật allowance
   */
  async updateAllowance(allowanceId: number, request: AllowanceCreationRequest): Promise<Allowance> {
    try {
      const response = await apiClient.put<ApiResponse<Allowance>>(
        `${this.baseUrl}/${allowanceId}`,
        request
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error updating allowance:', error);
      throw error;
    }
  }

  /**
   * Xóa allowance
   */
  async deleteAllowance(allowanceId: number): Promise<void> {
    try {
      await apiClient.delete<ApiResponse<void>>(`${this.baseUrl}/${allowanceId}`);
    } catch (error) {
      console.error('Error deleting allowance:', error);
      throw error;
    }
  }
}

export default new AllowanceService();

