import { apiClient } from '../config/api';

interface ApiResponse<T> {
  code: number;
  message?: string;
  result: T;
}

export type AllowanceType = 'TRANSPORT' | 'MEAL' | 'PHONE' | 'HOUSING' | 'OTHER';
export type BonusType = 'PERFORMANCE' | 'ATTENDANCE' | 'SPECIAL' | 'HOLIDAY' | 'OTHER';
export type PenaltyType = 'NO_SHOW' | 'LATE' | 'EARLY_LEAVE' | 'MISTAKE' | 'VIOLATION' | 'OTHER';

export interface AllowanceTemplate {
  templateId: number;
  branchId: number | null; // NULL = SYSTEM scope
  name: string;
  allowanceType: AllowanceType;
  amount: number;
  description: string;
  isActive: boolean;
  createdBy: number;
  createAt: string;
  updateAt: string;
}

export interface BonusTemplate {
  templateId: number;
  branchId: number | null; // NULL = SYSTEM scope
  name: string;
  bonusType: BonusType;
  amount: number;
  description: string;
  isActive: boolean;
  createdBy: number;
  createAt: string;
  updateAt: string;
}

export interface PenaltyConfig {
  configId: number;
  branchId: number | null; // NULL = SYSTEM scope
  name: string;
  penaltyType: PenaltyType;
  amount: number;
  description: string;
  isActive: boolean;
  createdBy: number;
  createAt: string;
  updateAt: string;
}

export interface AllowanceTemplateCreationRequest {
  branchId?: number | null; // NULL = SYSTEM scope
  name: string;
  allowanceType: AllowanceType;
  amount: number;
  description?: string;
  isActive?: boolean;
}

export interface AllowanceTemplateUpdateRequest {
  name?: string;
  allowanceType?: AllowanceType;
  amount?: number;
  description?: string;
  isActive?: boolean;
}

export interface BonusTemplateCreationRequest {
  branchId?: number | null; // NULL = SYSTEM scope
  name: string;
  bonusType: BonusType;
  amount: number;
  description?: string;
  isActive?: boolean;
}

export interface BonusTemplateUpdateRequest {
  name?: string;
  bonusType?: BonusType;
  amount?: number;
  description?: string;
  isActive?: boolean;
}

export interface PenaltyConfigCreationRequest {
  branchId?: number | null; // NULL = SYSTEM scope
  name: string;
  penaltyType: PenaltyType;
  amount: number;
  description?: string;
  isActive?: boolean;
}

export interface PenaltyConfigUpdateRequest {
  name?: string;
  penaltyType?: PenaltyType;
  amount?: number;
  description?: string;
  isActive?: boolean;
}

export interface TemplateFilters {
  branchId?: number;
  isActive?: boolean;
}

class PayrollTemplateService {
  private allowanceBaseUrl = '/api/profiles/allowance-templates';
  private bonusBaseUrl = '/api/profiles/bonus-templates';
  private penaltyBaseUrl = '/api/profiles/penalty-configs';

  // ========== Allowance Templates ==========

  /**
   * Lấy danh sách allowance templates
   */
  async getAllowanceTemplates(filters?: TemplateFilters): Promise<AllowanceTemplate[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.branchId !== undefined) {
        params.append('branchId', filters.branchId?.toString() || '');
      }
      if (filters?.isActive !== undefined) {
        params.append('isActive', filters.isActive.toString());
      }

      const queryString = params.toString();
      const url = queryString ? `${this.allowanceBaseUrl}?${queryString}` : this.allowanceBaseUrl;

      const response = await apiClient.get<ApiResponse<AllowanceTemplate[]>>(url);
      if (response.code === 1000 || response.code === 200) {
        return response.result || [];
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error fetching allowance templates:', error);
      throw error;
    }
  }

  /**
   * Lấy allowance templates cho Manager (SYSTEM + BRANCH của mình)
   */
  async getAllowanceTemplatesForManager(): Promise<AllowanceTemplate[]> {
    try {
      const response = await apiClient.get<ApiResponse<AllowanceTemplate[]>>(
        `${this.allowanceBaseUrl}/manager`
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result || [];
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error fetching allowance templates for manager:', error);
      throw error;
    }
  }

  /**
   * Lấy chi tiết allowance template
   */
  async getAllowanceTemplateById(templateId: number): Promise<AllowanceTemplate> {
    try {
      const response = await apiClient.get<ApiResponse<AllowanceTemplate>>(
        `${this.allowanceBaseUrl}/${templateId}`
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error fetching allowance template by id:', error);
      throw error;
    }
  }

  /**
   * Tạo allowance template (Admin only)
   */
  async createAllowanceTemplate(request: AllowanceTemplateCreationRequest): Promise<AllowanceTemplate> {
    try {
      const response = await apiClient.post<ApiResponse<AllowanceTemplate>>(
        this.allowanceBaseUrl,
        request
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error creating allowance template:', error);
      throw error;
    }
  }

  /**
   * Tạo allowance template cho Manager (Manager only - tự động set branchId)
   */
  async createAllowanceTemplateForManager(request: Omit<AllowanceTemplateCreationRequest, 'branchId'>): Promise<AllowanceTemplate> {
    try {
      const response = await apiClient.post<ApiResponse<AllowanceTemplate>>(
        `${this.allowanceBaseUrl}/manager`,
        request
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error creating allowance template for manager:', error);
      throw error;
    }
  }

  /**
   * Cập nhật allowance template (Admin only)
   */
  async updateAllowanceTemplate(
    templateId: number,
    request: AllowanceTemplateUpdateRequest
  ): Promise<AllowanceTemplate> {
    try {
      const response = await apiClient.put<ApiResponse<AllowanceTemplate>>(
        `${this.allowanceBaseUrl}/${templateId}`,
        request
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error updating allowance template:', error);
      throw error;
    }
  }

  /**
   * Cập nhật allowance template cho Manager (Manager only)
   */
  async updateAllowanceTemplateForManager(
    templateId: number,
    request: AllowanceTemplateUpdateRequest
  ): Promise<AllowanceTemplate> {
    try {
      const response = await apiClient.put<ApiResponse<AllowanceTemplate>>(
        `${this.allowanceBaseUrl}/${templateId}/manager`,
        request
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error updating allowance template for manager:', error);
      throw error;
    }
  }

  /**
   * Soft delete allowance template cho Manager (Manager only)
   */
  async deleteAllowanceTemplateForManager(templateId: number): Promise<void> {
    try {
      await apiClient.delete<ApiResponse<void>>(`${this.allowanceBaseUrl}/${templateId}/manager`);
    } catch (error) {
      console.error('Error deleting allowance template for manager:', error);
      throw error;
    }
  }

  /**
   * Xóa allowance template (Admin only)
   */
  async deleteAllowanceTemplate(templateId: number): Promise<void> {
    try {
      await apiClient.delete<ApiResponse<void>>(`${this.allowanceBaseUrl}/${templateId}`);
    } catch (error) {
      console.error('Error deleting allowance template:', error);
      throw error;
    }
  }

  // ========== Bonus Templates ==========

  /**
   * Lấy danh sách bonus templates
   */
  async getBonusTemplates(filters?: TemplateFilters): Promise<BonusTemplate[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.branchId !== undefined) {
        params.append('branchId', filters.branchId?.toString() || '');
      }
      if (filters?.isActive !== undefined) {
        params.append('isActive', filters.isActive.toString());
      }

      const queryString = params.toString();
      const url = queryString ? `${this.bonusBaseUrl}?${queryString}` : this.bonusBaseUrl;

      const response = await apiClient.get<ApiResponse<BonusTemplate[]>>(url);
      if (response.code === 1000 || response.code === 200) {
        return response.result || [];
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error fetching bonus templates:', error);
      throw error;
    }
  }

  /**
   * Lấy bonus templates cho Manager (SYSTEM + BRANCH của mình)
   */
  async getBonusTemplatesForManager(): Promise<BonusTemplate[]> {
    try {
      const response = await apiClient.get<ApiResponse<BonusTemplate[]>>(
        `${this.bonusBaseUrl}/manager`
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result || [];
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error fetching bonus templates for manager:', error);
      throw error;
    }
  }

  /**
   * Lấy chi tiết bonus template
   */
  async getBonusTemplateById(templateId: number): Promise<BonusTemplate> {
    try {
      const response = await apiClient.get<ApiResponse<BonusTemplate>>(
        `${this.bonusBaseUrl}/${templateId}`
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error fetching bonus template by id:', error);
      throw error;
    }
  }

  /**
   * Tạo bonus template (Admin only)
   */
  async createBonusTemplate(request: BonusTemplateCreationRequest): Promise<BonusTemplate> {
    try {
      const response = await apiClient.post<ApiResponse<BonusTemplate>>(
        this.bonusBaseUrl,
        request
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error creating bonus template:', error);
      throw error;
    }
  }

  /**
   * Tạo bonus template cho Manager (Manager only - tự động set branchId)
   */
  async createBonusTemplateForManager(request: Omit<BonusTemplateCreationRequest, 'branchId'>): Promise<BonusTemplate> {
    try {
      const response = await apiClient.post<ApiResponse<BonusTemplate>>(
        `${this.bonusBaseUrl}/manager`,
        request
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error creating bonus template for manager:', error);
      throw error;
    }
  }

  /**
   * Cập nhật bonus template (Admin only)
   */
  async updateBonusTemplate(
    templateId: number,
    request: BonusTemplateUpdateRequest
  ): Promise<BonusTemplate> {
    try {
      const response = await apiClient.put<ApiResponse<BonusTemplate>>(
        `${this.bonusBaseUrl}/${templateId}`,
        request
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error updating bonus template:', error);
      throw error;
    }
  }

  /**
   * Cập nhật bonus template cho Manager (Manager only)
   */
  async updateBonusTemplateForManager(
    templateId: number,
    request: BonusTemplateUpdateRequest
  ): Promise<BonusTemplate> {
    try {
      const response = await apiClient.put<ApiResponse<BonusTemplate>>(
        `${this.bonusBaseUrl}/${templateId}/manager`,
        request
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error updating bonus template for manager:', error);
      throw error;
    }
  }

  /**
   * Soft delete bonus template cho Manager (Manager only)
   */
  async deleteBonusTemplateForManager(templateId: number): Promise<void> {
    try {
      await apiClient.delete<ApiResponse<void>>(`${this.bonusBaseUrl}/${templateId}/manager`);
    } catch (error) {
      console.error('Error deleting bonus template for manager:', error);
      throw error;
    }
  }

  /**
   * Xóa bonus template (Admin only)
   */
  async deleteBonusTemplate(templateId: number): Promise<void> {
    try {
      await apiClient.delete<ApiResponse<void>>(`${this.bonusBaseUrl}/${templateId}`);
    } catch (error) {
      console.error('Error deleting bonus template:', error);
      throw error;
    }
  }

  // ========== Penalty Configs ==========

  /**
   * Lấy danh sách penalty configs
   */
  async getPenaltyConfigs(filters?: TemplateFilters): Promise<PenaltyConfig[]> {
    try {
      const params = new URLSearchParams();
      if (filters?.branchId !== undefined) {
        params.append('branchId', filters.branchId?.toString() || '');
      }
      if (filters?.isActive !== undefined) {
        params.append('isActive', filters.isActive.toString());
      }

      const queryString = params.toString();
      const url = queryString ? `${this.penaltyBaseUrl}?${queryString}` : this.penaltyBaseUrl;

      const response = await apiClient.get<ApiResponse<PenaltyConfig[]>>(url);
      if (response.code === 1000 || response.code === 200) {
        return response.result || [];
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error fetching penalty configs:', error);
      throw error;
    }
  }

  /**
   * Lấy penalty configs cho Manager (SYSTEM + BRANCH của mình)
   */
  async getPenaltyConfigsForManager(): Promise<PenaltyConfig[]> {
    try {
      const response = await apiClient.get<ApiResponse<PenaltyConfig[]>>(
        `${this.penaltyBaseUrl}/manager`
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result || [];
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error fetching penalty configs for manager:', error);
      throw error;
    }
  }

  /**
   * Lấy chi tiết penalty config
   */
  async getPenaltyConfigById(configId: number): Promise<PenaltyConfig> {
    try {
      const response = await apiClient.get<ApiResponse<PenaltyConfig>>(
        `${this.penaltyBaseUrl}/${configId}`
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error fetching penalty config by id:', error);
      throw error;
    }
  }

  /**
   * Tạo penalty config (Admin only)
   */
  async createPenaltyConfig(request: PenaltyConfigCreationRequest): Promise<PenaltyConfig> {
    try {
      const response = await apiClient.post<ApiResponse<PenaltyConfig>>(
        this.penaltyBaseUrl,
        request
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error creating penalty config:', error);
      throw error;
    }
  }

  /**
   * Tạo penalty config cho Manager (Manager only - tự động set branchId)
   */
  async createPenaltyConfigForManager(request: Omit<PenaltyConfigCreationRequest, 'branchId'>): Promise<PenaltyConfig> {
    try {
      const response = await apiClient.post<ApiResponse<PenaltyConfig>>(
        `${this.penaltyBaseUrl}/manager`,
        request
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error creating penalty config for manager:', error);
      throw error;
    }
  }

  /**
   * Cập nhật penalty config (Admin only)
   */
  async updatePenaltyConfig(
    configId: number,
    request: PenaltyConfigUpdateRequest
  ): Promise<PenaltyConfig> {
    try {
      const response = await apiClient.put<ApiResponse<PenaltyConfig>>(
        `${this.penaltyBaseUrl}/${configId}`,
        request
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error updating penalty config:', error);
      throw error;
    }
  }

  /**
   * Cập nhật penalty config cho Manager (Manager only)
   */
  async updatePenaltyConfigForManager(
    configId: number,
    request: PenaltyConfigUpdateRequest
  ): Promise<PenaltyConfig> {
    try {
      const response = await apiClient.put<ApiResponse<PenaltyConfig>>(
        `${this.penaltyBaseUrl}/${configId}/manager`,
        request
      );
      if (response.code === 1000 || response.code === 200) {
        return response.result;
      }
      throw new Error(`API Error: ${response.code}`);
    } catch (error) {
      console.error('Error updating penalty config for manager:', error);
      throw error;
    }
  }

  /**
   * Soft delete penalty config cho Manager (Manager only)
   */
  async deletePenaltyConfigForManager(configId: number): Promise<void> {
    try {
      await apiClient.delete<ApiResponse<void>>(`${this.penaltyBaseUrl}/${configId}/manager`);
    } catch (error) {
      console.error('Error deleting penalty config for manager:', error);
      throw error;
    }
  }

  /**
   * Xóa penalty config (Admin only)
   */
  async deletePenaltyConfig(configId: number): Promise<void> {
    try {
      await apiClient.delete<ApiResponse<void>>(`${this.penaltyBaseUrl}/${configId}`);
    } catch (error) {
      console.error('Error deleting penalty config:', error);
      throw error;
    }
  }
}

export default new PayrollTemplateService();

