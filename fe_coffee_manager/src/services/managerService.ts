import { apiClient } from '../config/api';
import { UsersListResponseDto, UserResponseDto } from '../types';

class ManagerService {
  private baseUrl = '/api/auth-service/users/managers';
  private v2Url = '/api/auth-service/users-v2';

  async getManagerProfiles(): Promise<UserResponseDto[]> {
    try {
      const response = await apiClient.get<UsersListResponseDto<UserResponseDto>>(this.baseUrl);
      
      if (response.code === 1000) {
        return response.result;
      } else {
        throw new Error(`API Error: ${response.code}`);
      }
    } catch (error) {
      console.error('Error fetching manager profiles:', error);
      throw error;
    }
  }

  async getManagerProfilesPaged(page = 0, size = 10): Promise<{
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

  async getManagerProfile(userId: number): Promise<UserResponseDto> {
    try {
      const response = await apiClient.get<{ code: number; result: UserResponseDto }>(`${this.baseUrl}/${userId}`);
      
      if (response.code === 1000) {
        return response.result;
      } else {
        throw new Error(`API Error: ${response.code}`);
      }
    } catch (error) {
      console.error('Error fetching manager profile:', error);
      throw error;
    }
  }

  async createManager(payload: {
    email: string;
    password: string;
    fullname: string;
    phoneNumber: string;
    role: 'MANAGER';
    branchId: number;
    hireDate: string; // YYYY-MM-DD
    identityCard: string;
    baseSalary?: number;
    numberOfDependents?: number;
  }): Promise<any> {
    const response = await apiClient.post<{ code: number; message?: string; result?: any }>(`${this.v2Url}/create-manager`, payload);
    if (response.code && response.code !== 1000 && response.code !== 200 && response.code !== 201 && response.code !== 202) {
      throw new Error(response.message || 'Create manager failed');
    }
    return response;
  }

  async updateUser(userId: number, payload: Partial<{
    email: string;
    fullname: string;
    phone_number: string;
    role: string;
  }>): Promise<UserResponseDto> {
    const resp = await apiClient.put<{ code: number; result: UserResponseDto }>(`/api/auth-service/users/${userId}`, payload);
    if (resp.code && resp.code !== 1000 && resp.code !== 200) {
      throw new Error((resp as any).message || 'Update user failed');
    }
    return resp.result;
  }

  async updateManagerProfile(userId: number, payload: {
    identityCard?: string;
    hireDate?: string;
    baseSalary?: number;
    numberOfDependents?: number;
    branchId?: number;
  }): Promise<any> {
    const resp = await apiClient.put<{ code: number; result: any }>(`/api/profiles/manager-profiles/${userId}`, payload);
    if (resp.code && resp.code !== 1000 && resp.code !== 200) {
      throw new Error((resp as any).message || 'Update manager profile failed');
    }
    return resp.result;
  }

  async updateManager(userId: number, payload: {
    email?: string;
    fullname?: string;
    phoneNumber?: string;
    identityCard?: string;
    hireDate?: string;
    baseSalary?: number;
    numberOfDependents?: number;
    branchId?: number;
    currentBranchId?: number; // To check if branch actually changed
  }): Promise<any> {
    // Update user info (email, fullname, phoneNumber)
    const userUpdates: any = {};
    if (payload.email !== undefined) userUpdates.email = payload.email;
    if (payload.fullname !== undefined) userUpdates.fullname = payload.fullname;
    if (payload.phoneNumber !== undefined) userUpdates.phone_number = payload.phoneNumber;

    if (Object.keys(userUpdates).length > 0) {
      await this.updateUser(userId, userUpdates);
    }

    // Update manager profile (identityCard, hireDate, baseSalary, numberOfDependents)
    const profileUpdates: any = {};
    if (payload.identityCard !== undefined) profileUpdates.identityCard = payload.identityCard;
    if (payload.hireDate !== undefined) profileUpdates.hireDate = payload.hireDate;
    if (payload.baseSalary !== undefined) profileUpdates.baseSalary = payload.baseSalary;
    if (payload.numberOfDependents !== undefined) profileUpdates.numberOfDependents = payload.numberOfDependents;

    if (Object.keys(profileUpdates).length > 0) {
      await this.updateManagerProfile(userId, profileUpdates);
    }

    // Handle branch assignment only if branchId is provided and different from current
    if (payload.branchId !== undefined) {
      const currentBranchId = payload.currentBranchId ?? null;
      const newBranchId = payload.branchId === -1 || payload.branchId === null ? null : payload.branchId;
      
      // Only update if branch actually changed
      if (currentBranchId !== newBranchId) {
        if (newBranchId === null) {
          await this.unassignManager(userId);
        } else {
          await this.assignManagerToBranch(userId, newBranchId);
        }
      }
    }

    // Fetch updated manager
    return await this.getManagerProfile(userId);
  }

  async unassignManager(userId: number): Promise<any> {
    const resp = await apiClient.put<{ code: number; result?: any; message?: string }>(`/api/profiles/manager-profiles/unassign-manager/${userId}`);
    if (resp.code && resp.code !== 1000 && resp.code !== 200) {
      throw new Error((resp as any).message || 'Unassign manager failed');
    }
    return resp.result;
  }

  async assignManagerToBranch(managerUserId: number, branchId: number): Promise<any> {
    const resp = await apiClient.put<{ code: number; result?: any; message?: string }>(`/api/profiles/manager-profiles/assign-manager`, {
      managerUserId: managerUserId,
      branchId: branchId
    });
    if (resp.code && resp.code !== 1000 && resp.code !== 200) {
      throw new Error((resp as any).message || 'Assign manager failed');
    }
    return resp.result;
  }

  async deleteManager(userId: number): Promise<{ code?: number; message?: string; result?: any }> {
    const resp = await apiClient.delete<{ code?: number; message?: string; result?: any }>(`${this.v2Url}/delete-manager/${userId}`);
    return resp;
  }
}

export default new ManagerService();
