import { apiClient } from '../config/api';
import { UsersListResponseDto, UserResponseDto } from '../types';

class ManagerService {
  private baseUrl = '/api/auth-service/users/managers';

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
}

export default new ManagerService();
