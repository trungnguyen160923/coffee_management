import { apiClient } from '../config/api';
import { Branch } from '../types';
import { API_ENDPOINTS } from '../config/constants';

// Branch API interfaces
export interface CreateBranchRequest {
  name: string;
  address: string;
  phone: string;
  managerUserId?: number;
  openHours?: string; // HH:mm
  endHours?: string;  // HH:mm
}

export interface UpdateBranchRequest extends Partial<CreateBranchRequest> {
  status?: 'active' | 'inactive';
}

export interface BranchFilters {
  status?: 'active' | 'inactive';
  managerId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface BranchListResponse {
  branches: Branch[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BranchStats {
  totalBranches: number;
  activeBranches: number;
  totalRevenue: number;
  averageRevenue: number;
  topPerformingBranches: Array<{
    branch: Branch;
    revenue: number;
    orderCount: number;
  }>;
}

export interface BranchService {
  // Branch CRUD
  getBranches: (filters?: BranchFilters) => Promise<BranchListResponse>;
  getBranch: (id: string) => Promise<Branch>;
  createBranch: (branch: CreateBranchRequest) => Promise<Branch>;
  updateBranch: (id: string, branch: UpdateBranchRequest) => Promise<Branch>;
  deleteBranch: (id: string) => Promise<void>;
  
  // Branch management
  getBranchStats: (filters?: { dateFrom?: string; dateTo?: string }) => Promise<BranchStats>;
  getUnassignedBranches: () => Promise<Branch[]>;
  getBranchRevenue: (branchId: string, filters?: { dateFrom?: string; dateTo?: string }) => Promise<{
    totalRevenue: number;
    dailyRevenue: Array<{ date: string; revenue: number }>;
    monthlyRevenue: Array<{ month: string; revenue: number }>;
  }>;
  
  // Branch staff
  getBranchStaff: (branchId: string) => Promise<any[]>;
  assignManager: (branchId: number | string, managerUserId: number | string) => Promise<Branch>;
  unassignManagerInternal: (branchId: number | string, managerUserId: number | string) => Promise<Branch>;
}

// Branch Service Implementation
export const branchService: BranchService = {
  async getBranches(filters: BranchFilters = {}): Promise<BranchListResponse> {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.managerId) params.append('managerId', filters.managerId);
    if (filters.search) params.append('search', filters.search);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const endpoint = `${API_ENDPOINTS.BRANCHES.BASE}${queryString ? `?${queryString}` : ''}`;
    
    return await apiClient.get<BranchListResponse>(endpoint);
  },

  async getBranch(id: string): Promise<Branch> {
    return await apiClient.get<Branch>(`${API_ENDPOINTS.BRANCHES.BASE}/${id}`);
  },

  async createBranch(branch: CreateBranchRequest): Promise<Branch> {
    return await apiClient.post<Branch>(API_ENDPOINTS.BRANCHES.BASE, branch);
  },

  async updateBranch(id: string, branch: UpdateBranchRequest): Promise<Branch> {
    return await apiClient.put<Branch>(`${API_ENDPOINTS.BRANCHES.BASE}/${id}`, branch);
  },

  async deleteBranch(id: string): Promise<void> {
    await apiClient.delete(`${API_ENDPOINTS.BRANCHES.BASE}/${id}`);
  },

  async getBranchStats(filters: { dateFrom?: string; dateTo?: string } = {}): Promise<BranchStats> {
    const params = new URLSearchParams();
    
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);

    const queryString = params.toString();
    const endpoint = `${API_ENDPOINTS.BRANCHES.STATS}${queryString ? `?${queryString}` : ''}`;
    
    return await apiClient.get<BranchStats>(endpoint);
  },

  async getBranchRevenue(branchId: string, filters: { dateFrom?: string; dateTo?: string } = {}): Promise<{
    totalRevenue: number;
    dailyRevenue: Array<{ date: string; revenue: number }>;
    monthlyRevenue: Array<{ month: string; revenue: number }>;
  }> {
    const params = new URLSearchParams();
    
    if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.append('dateTo', filters.dateTo);

    const queryString = params.toString();
    const endpoint = `${API_ENDPOINTS.BRANCHES.REVENUE(branchId)}${queryString ? `?${queryString}` : ''}`;
    
    return await apiClient.get(endpoint);
  },

  async getBranchStaff(branchId: string): Promise<any[]> {
    return await apiClient.get<any[]>(API_ENDPOINTS.BRANCHES.STAFF(branchId));
  },

  async assignManager(branchId: number | string, managerUserId: number | string): Promise<Branch> {
    return await apiClient.put<Branch>(API_ENDPOINTS.BRANCHES.ASSIGN_MANAGER(branchId), { managerUserId });
  },

  async getUnassignedBranches(): Promise<Branch[]> {
    const resp = await apiClient.get<{ code: number; result: Branch[] }>(API_ENDPOINTS.BRANCHES.UNASSIGNED);
    if ((resp as any).code && (resp as any).code !== 200 && (resp as any).code !== 1000) {
      throw new Error((resp as any).message || 'Failed to fetch unassigned branches');
    }
    return (resp as any).result || [];
  },


  async unassignManagerInternal(branchId: number | string, managerUserId: number | string): Promise<Branch> {
    return await apiClient.put<Branch>(API_ENDPOINTS.BRANCHES.UNASSIGN_MANAGER_INTERNAL(branchId), { managerUserId });
  },
};

export default branchService;
