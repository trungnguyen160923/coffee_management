import { apiClient } from '../config/api';

interface ApiResponse<T> {
  code: number;
  message?: string;
  result: T;
}

export type ConfigType = 'RATE' | 'AMOUNT' | 'DAYS' | 'HOURS' | 'MULTIPLIER';

export interface PayrollConfiguration {
  configId: number;
  configKey: string;
  configValue: number;
  configType: ConfigType;
  displayName: string;
  description?: string;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  isActive: boolean;
  updatedBy?: number;
  createAt: string;
  updateAt: string;
}

export interface PayrollConfigurationUpdateRequest {
  configValue: number;
  description?: string;
  minValue?: number | null;
  maxValue?: number | null;
  isActive?: boolean;
}

export interface PayrollConfigurationCreationRequest {
  configKey: string;
  configValue: number;
  configType: ConfigType;
  displayName: string;
  description?: string;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  isActive?: boolean;
}

export interface BatchUpdateRequest {
  updates: Record<string, PayrollConfigurationUpdateRequest>;
}

class PayrollConfigService {
  private baseUrl = '/api/profiles/payroll-config';

  /**
   * Lấy tất cả cấu hình
   */
  async getAllConfigs(includeInactive: boolean = false): Promise<PayrollConfiguration[]> {
    try {
      const response = await apiClient.get<ApiResponse<PayrollConfiguration[]>>(
        `${this.baseUrl}?includeInactive=${includeInactive}`
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error fetching payroll configurations:', error);
      throw error;
    }
  }

  /**
   * Lấy cấu hình theo key
   */
  async getConfigByKey(configKey: string): Promise<PayrollConfiguration> {
    try {
      const response = await apiClient.get<ApiResponse<PayrollConfiguration>>(
        `${this.baseUrl}/${configKey}`
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error fetching payroll configuration:', error);
      throw error;
    }
  }

  /**
   * Cập nhật cấu hình
   */
  async updateConfig(
    configKey: string,
    request: PayrollConfigurationUpdateRequest
  ): Promise<PayrollConfiguration> {
    try {
      const response = await apiClient.put<ApiResponse<PayrollConfiguration>>(
        `${this.baseUrl}/${configKey}`,
        request
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error updating payroll configuration:', error);
      throw error;
    }
  }

  /**
   * Cập nhật nhiều cấu hình cùng lúc
   */
  async updateConfigsBatch(request: BatchUpdateRequest): Promise<PayrollConfiguration[]> {
    try {
      const response = await apiClient.put<ApiResponse<PayrollConfiguration[]>>(
        `${this.baseUrl}/batch`,
        request
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error updating payroll configurations batch:', error);
      throw error;
    }
  }

  /**
   * Tạo cấu hình mới
   */
  async createConfig(request: PayrollConfigurationCreationRequest): Promise<PayrollConfiguration> {
    try {
      const response = await apiClient.post<ApiResponse<PayrollConfiguration>>(
        this.baseUrl,
        request
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error creating payroll configuration:', error);
      throw error;
    }
  }

  /**
   * Xóa cấu hình
   */
  async deleteConfig(configKey: string): Promise<void> {
    try {
      const response = await apiClient.delete<ApiResponse<void>>(
        `${this.baseUrl}/${configKey}`
      );
      if (response.code === 1000 || response.code === 200) {
        return;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error deleting payroll configuration:', error);
      throw error;
    }
  }
}

export const payrollConfigService = new PayrollConfigService();

