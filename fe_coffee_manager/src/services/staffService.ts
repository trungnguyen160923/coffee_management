import { apiClient } from '../config/api';
import { UsersListResponseDto, UserResponseDto } from '../types';

class StaffService {
  private baseUrl = '/api/auth-service/users/staffs';
  private v2Url = '/api/auth-service/users-v2';

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
    hireDate?: string; 
    active?: boolean;
  }): Promise<any> {
    try {
      const response = await apiClient.put(`${this.baseUrl}/${userId}/profile`, payload);
      return response;
    } catch (error) {
      console.error('Error updating staff profile:', error);
      throw error;
    }
  }

  async deleteStaff(userId: number): Promise<any> {
    try {
      const response = await apiClient.delete(`${this.baseUrl}/${userId}`);
      return response;
    } catch (error) {
      console.error('Error deleting staff:', error);
      throw error;
    }
  }
}

export default new StaffService();
