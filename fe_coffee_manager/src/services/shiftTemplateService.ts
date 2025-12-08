import apiClient from '../config/api';

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CASUAL' | 'ANY';

export interface TemplateRoleRequirement {
  id?: number;
  roleId: number;
  quantity: number;
  required: boolean;
  notes?: string | null;
}

export interface ShiftTemplate {
  templateId: number;
  branchId: number;
  name: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  maxStaffAllowed: number | null;
  employmentType: EmploymentType; // Default = 'ANY'
  isActive: boolean;
  description: string | null;
  roleRequirements?: TemplateRoleRequirement[];
}

export interface ShiftTemplateFormValues {
  name: string;
  startTime: string;
  endTime: string;
  maxStaffAllowed?: number | null;
  employmentType?: EmploymentType; // Default = 'ANY'
  description?: string | null;
  roleRequirements?: TemplateRoleRequirement[];
}

interface ApiResponse<T> {
  code: number;
  message?: string;
  result: T;
}

export const shiftTemplateService = {
  async getByBranch(branchId: number): Promise<ShiftTemplate[]> {
    const res = await apiClient.get<ApiResponse<ShiftTemplate[]>>(
      `/api/profiles/shift-templates/branch/${branchId}`
    );
    return res.result || [];
  },

  async getInactiveByBranch(branchId: number): Promise<ShiftTemplate[]> {
    const res = await apiClient.get<ApiResponse<ShiftTemplate[]>>(
      `/api/profiles/shift-templates/branch/${branchId}/inactive`
    );
    return res.result || [];
  },

  async createTemplate(branchId: number, data: ShiftTemplateFormValues): Promise<ShiftTemplate> {
    const payload: any = {
      branchId,
      name: data.name,
      startTime: data.startTime,
      endTime: data.endTime,
      maxStaffAllowed: data.maxStaffAllowed ?? null,
      employmentType: data.employmentType ?? 'ANY',
      description: data.description ?? null,
    };
    if (data.roleRequirements && data.roleRequirements.length > 0) {
      payload.roleRequirements = data.roleRequirements.map(req => ({
        roleId: req.roleId,
        quantity: req.quantity,
        required: req.required ?? true,
        notes: req.notes ?? null,
      }));
    }
    const res = await apiClient.post<ApiResponse<ShiftTemplate>>(
      `/api/profiles/shift-templates`,
      payload
    );
    return res.result;
  },

  async updateTemplate(templateId: number, data: Partial<ShiftTemplateFormValues> & { isActive?: boolean }): Promise<ShiftTemplate> {
    const payload: any = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.startTime !== undefined) payload.startTime = data.startTime;
    if (data.endTime !== undefined) payload.endTime = data.endTime;
    if (data.maxStaffAllowed !== undefined) payload.maxStaffAllowed = data.maxStaffAllowed;
    if (data.employmentType !== undefined) payload.employmentType = data.employmentType;
    if (data.description !== undefined) payload.description = data.description;
    if (data.isActive !== undefined) payload.isActive = data.isActive;
    if (data.roleRequirements !== undefined) {
      payload.roleRequirements = data.roleRequirements.map(req => ({
        roleId: req.roleId,
        quantity: req.quantity,
        required: req.required ?? true,
        notes: req.notes ?? null,
      }));
    }

    const res = await apiClient.put<ApiResponse<ShiftTemplate>>(
      `/api/profiles/shift-templates/${templateId}`,
      payload
    );
    return res.result;
  },

  async deleteTemplate(templateId: number): Promise<void> {
    await apiClient.delete<ApiResponse<null>>(
      `/api/profiles/shift-templates/${templateId}`
    );
  },
};

export default shiftTemplateService;



