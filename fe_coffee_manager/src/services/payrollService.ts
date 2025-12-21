import { apiClient } from '../config/api';

interface ApiResponse<T> {
  code: number;
  message?: string;
  result: T;
}

export type PayrollStatus = 'DRAFT' | 'REVIEW' | 'APPROVED' | 'PAID';

export interface Payroll {
  payrollId: number;
  userId: number;
  userRole: string;
  branchId: number;
  period: string; // Format: YYYY-MM
  userName?: string;
  branchName?: string;
  baseSalary: number;
  baseSalarySnapshot: number;
  hourlyRateSnapshot: number;
  insuranceSalarySnapshot: number;
  overtimeHours: number;
  overtimePay: number;
  totalAllowances: number;
  totalBonuses: number;
  totalPenalties: number;
  grossSalary: number;
  amountInsurances: number;
  amountTax: number;
  amountAdvances: number;
  totalDeductions: number;
  netSalary: number;
  status: PayrollStatus;
  createdBy: number;
  approvedBy: number | null;
  approvedAt: string | null;
  paidAt: string | null;
  notes: string | null;
  createAt: string;
  updateAt: string;
}

export interface PayrollCalculationRequest {
  userId: number;
  period: string; // Format: YYYY-MM
  notes?: string;
}

export interface BatchCalculateRequest {
  userIds: number[];
  period: string; // Format: YYYY-MM
}

export interface BatchApproveRequest {
  payrollIds: number[];
}

export interface PayrollFilters {
  userId?: number;
  branchId?: number;
  period?: string;
  status?: PayrollStatus;
}

class PayrollService {
  private baseUrl = '/api/profiles/payrolls';

  /**
   * Tính lương cho 1 nhân viên
   */
  async calculatePayroll(request: PayrollCalculationRequest): Promise<Payroll> {
    try {
      const response = await apiClient.post<ApiResponse<Payroll>>(
        `${this.baseUrl}/calculate`,
        request
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error calculating payroll:', error);
      throw error;
    }
  }

  /**
   * Tính lương cho nhiều nhân viên (batch)
   */
  async calculatePayrollBatch(request: BatchCalculateRequest): Promise<Payroll[]> {
    try {
      const response = await apiClient.post<ApiResponse<Payroll[]>>(
        `${this.baseUrl}/calculate-batch`,
        request
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result || [];
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error calculating payroll batch:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách payroll (có filter)
   */
  async getPayrolls(filters?: PayrollFilters): Promise<Payroll[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.userId) params.append('userId', filters.userId.toString());
      if (filters?.branchId) params.append('branchId', filters.branchId.toString());
      if (filters?.period) params.append('period', filters.period);
      if (filters?.status) params.append('status', filters.status);

      const queryString = params.toString();
      const url = queryString ? `${this.baseUrl}?${queryString}` : this.baseUrl;

      const response = await apiClient.get<ApiResponse<Payroll[]>>(url);
      if (response.code === 1000 || response.code === 200) {
        return response.result || [];
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error fetching payrolls:', error);
      throw error;
    }
  }

  /**
   * Lấy chi tiết payroll
   */
  async getPayrollById(payrollId: number): Promise<Payroll> {
    try {
      const response = await apiClient.get<ApiResponse<Payroll>>(
        `${this.baseUrl}/${payrollId}`
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error fetching payroll by id:', error);
      throw error;
    }
  }

  /**
   * Duyệt payroll
   */
  async approvePayroll(payrollId: number): Promise<Payroll> {
    try {
      const response = await apiClient.put<ApiResponse<Payroll>>(
        `${this.baseUrl}/${payrollId}/approve`
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error approving payroll:', error);
      throw error;
    }
  }

  /**
   * Duyệt nhiều payroll cùng lúc (batch)
   */
  async approvePayrollBatch(request: BatchApproveRequest): Promise<Payroll[]> {
    try {
      const response = await apiClient.put<ApiResponse<Payroll[]>>(
        `${this.baseUrl}/approve-batch`,
        request
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result || [];
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error approving payroll batch:', error);
      throw error;
    }
  }

  /**
   * Đánh dấu đã thanh toán (Admin only)
   */
  async markPayrollAsPaid(payrollId: number): Promise<Payroll> {
    try {
      const response = await apiClient.put<ApiResponse<Payroll>>(
        `${this.baseUrl}/${payrollId}/pay`
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error marking payroll as paid:', error);
      throw error;
    }
  }

  /**
   * Đánh dấu nhiều payroll đã thanh toán (batch) - Admin only
   */
  async markPayrollAsPaidBatch(request: BatchApproveRequest): Promise<Payroll[]> {
    try {
      const response = await apiClient.put<ApiResponse<Payroll[]>>(
        `${this.baseUrl}/pay-batch`,
        request
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result || [];
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error marking payroll as paid batch:', error);
      throw error;
    }
  }

  /**
   * Revert payroll status về trạng thái trước đó
   * - PAID -> APPROVED
   * - APPROVED -> DRAFT
   * Chỉ cho phép revert khi payroll period là tháng hiện tại hoặc 1 tháng trước
   */
  async revertPayrollStatus(payrollId: number): Promise<Payroll> {
    try {
      const response = await apiClient.put<ApiResponse<Payroll>>(
        `${this.baseUrl}/${payrollId}/revert`
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error reverting payroll status:', error);
      throw error;
    }
  }

  /**
   * Revert nhiều payroll status về trạng thái trước đó (batch)
   * - PAID -> APPROVED
   * - APPROVED -> DRAFT
   * Chỉ cho phép revert khi payroll period là tháng hiện tại hoặc 1 tháng trước
   */
  async revertPayrollStatusBatch(request: BatchApproveRequest): Promise<Payroll[]> {
    try {
      const response = await apiClient.put<ApiResponse<Payroll[]>>(
        `${this.baseUrl}/revert-batch`,
        request
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result || [];
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error reverting payroll status batch:', error);
      throw error;
    }
  }

  /**
   * Tính lại payroll
   */
  async recalculatePayroll(payrollId: number): Promise<Payroll> {
    try {
      const response = await apiClient.post<ApiResponse<Payroll>>(
        `${this.baseUrl}/${payrollId}/recalculate`
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error recalculating payroll:', error);
      throw error;
    }
  }

  /**
   * Lấy thông tin tổng giờ làm và số ca từ shift start/end time
   */
  async getShiftWorkSummary(userId: number, period: string): Promise<{ totalHours: number; totalShifts: number }> {
    try {
      const params = new URLSearchParams();
      params.append('userId', userId.toString());
      params.append('period', period);
      
      const response = await apiClient.get<ApiResponse<{ totalHours: number; totalShifts: number }>>(
        `${this.baseUrl}/shift-work-summary?${params.toString()}`
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error fetching shift work summary:', error);
      throw error;
    }
  }
}

export default new PayrollService();

