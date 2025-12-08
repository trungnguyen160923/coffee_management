import { apiClient } from '../config/api';
import { UsersListResponseDto, UserResponseDto, StaffWithUserDto } from '../types';

class StaffService {
  private baseUrl = '/api/auth-service/users/staffs';
  private v2Url = '/api/auth-service/users-v2';
  private userUrl = '/api/auth-service/users';
  private staffProfileUrl = '/api/profiles/staff-profiles';

  async getStaffProfiles(): Promise<UserResponseDto[]> {
    try {
      const response = await apiClient.get<UsersListResponseDto<UserResponseDto>>(this.baseUrl);
      
      if (response.code === 1000) {
        return response.result;
      } else {
        throw new Error(`API Error: ${response.code}`);
      }
    } catch (error) {
      console.error('Error fetching staff profiles:', error);
      throw error;
    }
  }

  async getStaffProfilesPaged(page = 0, size = 10): Promise<{
    data: UserResponseDto[];
    total: number;
    page: number;
    size: number;
    totalPages: number;
  }> {
    const qs = `?page=${page}&size=${size}`;
    const response = await apiClient.get<{ code: number; result: { data: UserResponseDto[]; total: number; page: number; size: number; totalPages: number } }>(`${this.baseUrl}/paged${qs}`);
    if (response.code === 1000) {
      return response.result;
    }
    throw new Error(`API Error: ${response.code}`);
  }

  async getStaffProfilesByBranch(branchId: number): Promise<UserResponseDto[]> {
    try {
      const response = await apiClient.get<{ code: number; result: UserResponseDto[] }>(`${this.baseUrl}/branch/${branchId}`);
      
      if (response.code === 1000) {
        return response.result;
      } else {
        throw new Error(`API Error: ${response.code}`);
      }
    } catch (error) {
      console.error('Error fetching staff profiles by branch:', error);
      throw error;
    }
  }

  async getStaffProfile(userId: number): Promise<UserResponseDto> {
    try {
      const response = await apiClient.get<{ code: number; result: UserResponseDto }>(`${this.baseUrl}/${userId}`);
      
      if (response.code === 1000) {
        return response.result;
      } else {
        throw new Error(`API Error: ${response.code}`);
      }
    } catch (error) {
      console.error('Error fetching staff profile:', error);
      throw error;
    }
  }

  async createStaff(payload: {
    fullname: string;
    email: string;
    password: string;
    phoneNumber: string;
    identityCard?: string;
    hireDate?: string;
    active?: boolean;
  }): Promise<any> {
    try {
      const response = await apiClient.post(this.baseUrl, payload);
      return response;
    } catch (error) {
      console.error('Error creating staff:', error);
      throw error;
    }
  }

  async createStaffV2(payload: {
    fullname: string;
    email: string;
    password: string;
    phoneNumber: string;
    role: 'STAFF';
    branchId: number;
    salary?: number; // monthly salary for FULL_TIME
    employmentType?: 'FULL_TIME' | 'PART_TIME';
    payType?: 'MONTHLY' | 'HOURLY';
    hourlyRate?: number;
    overtimeRate?: number;
    proficiencyLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
    hireDate?: string;
    identityCard?: string;
    active?: boolean;
    staffBusinessRoleIds?: number[];
  }): Promise<any> {
    try {
      const response = await apiClient.post('/api/auth-service/users-v2/create-staff', payload);
      return response;
    } catch (error) {
      console.error('Error creating staff (v2):', error);
      throw error;
    }
  }

  async updateUser(userId: number, payload: { email?: string; password?: string }): Promise<any> {
    try {
      const response = await apiClient.put(`${this.v2Url}/${userId}`, payload);
      return response;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  async updateStaffProfile(userId: number, payload: { 
    identityCard?: string;
    phone?: string;
    hireDate?: string; 
    email?: string;
    employmentType?: 'FULL_TIME' | 'PART_TIME';
    payType?: 'MONTHLY' | 'HOURLY';
    baseSalary?: number;
    hourlyRate?: number;
    overtimeRate?: number;
    staffBusinessRoleIds?: number[];
    proficiencyLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
  }): Promise<any> {
    try {
      const response = await apiClient.put(
        `${this.v2Url}/staff/${userId}`,
        payload
      );
      return response;
    } catch (error) {
      console.error('Error updating staff profile:', error);
      throw error;
    }
  }

  async deleteStaff(userId: number): Promise<any> {
    try {
      const response = await apiClient.delete(`${this.v2Url}/delete-staff/${userId}`);
      return response;
    } catch (error) {
      console.error('Error deleting staff:', error);
      throw error;
    }
  }

  async getStaffsWithUserInfoByBranch(branchId: number): Promise<StaffWithUserDto[]> {
    try {
      const response = await apiClient.get<{ code: number; result: StaffWithUserDto[] }>(`${this.staffProfileUrl}/branch/${branchId}/with-user-info`);
      if (response.code === 200 || response.code === 1000) {
        return response.result || [];
      } else {
        throw new Error(`API Error: ${response.code}`);
      }
    } catch (error) {
      console.error('Error fetching staffs with user info by branch:', error);
      throw error;
    }
  }
}

export default new StaffService();
