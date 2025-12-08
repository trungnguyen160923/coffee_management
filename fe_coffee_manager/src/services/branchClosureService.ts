import apiClient from '../config/api';
import { API_ENDPOINTS } from '../config/constants';

export interface BranchClosure {
  id: number;
  branchId: number | null;
  userId?: number | null; // Creator (admin/manager)
  startDate: string; // ISO date yyyy-MM-dd
  endDate: string;   // ISO date yyyy-MM-dd
  reason?: string | null;
  createAt: string;
  updateAt: string;
}

export interface CreateBranchClosureRequest {
  branchId?: number | null;
  startDate: string; // yyyy-MM-dd
  endDate: string;   // yyyy-MM-dd
  reason?: string | null;
}

export interface UpdateBranchClosureRequest {
  branchId?: number | null;
  startDate?: string; // yyyy-MM-dd
  endDate?: string;   // yyyy-MM-dd
  reason?: string | null;
}

export interface UpdateBranchClosureGroupRequest {
  closureIds: number[];
  branchIds?: number[] | null;
  startDate: string; // yyyy-MM-dd
  endDate?: string;   // yyyy-MM-dd
  reason?: string | null;
}

export interface DeleteBranchClosureGroupRequest {
  closureIds: number[];
}

export const branchClosureService = {
  async list(params?: { branchId?: number; from?: string; to?: string }): Promise<BranchClosure[]> {
    const search = new URLSearchParams();
    if (params?.branchId != null) search.append('branchId', String(params.branchId));
    if (params?.from) search.append('from', params.from);
    if (params?.to) search.append('to', params.to);
    const qs = search.toString();
    return apiClient.get<{
      code: number;
      message?: string;
      result: BranchClosure[];
    }>(`${API_ENDPOINTS.ORDER_BRANCH_CLOSURES.BASE}${qs ? `?${qs}` : ''}`).then((r) => r.result || []);
  },

  async create(payload: CreateBranchClosureRequest): Promise<BranchClosure> {
    const resp = await apiClient.post<{
      code: number;
      message?: string;
      result: BranchClosure;
    }>(API_ENDPOINTS.ORDER_BRANCH_CLOSURES.BASE, payload);
    return resp.result;
  },

  async update(id: number, payload: UpdateBranchClosureRequest): Promise<BranchClosure> {
    const resp = await apiClient.put<{
      code: number;
      message?: string;
      result: BranchClosure;
    }>(`${API_ENDPOINTS.ORDER_BRANCH_CLOSURES.BASE}/${id}`, payload);
    return resp.result;
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete<{
      code: number;
      message?: string;
    }>(`${API_ENDPOINTS.ORDER_BRANCH_CLOSURES.BASE}/${id}`);
  },

  async updateGroup(payload: UpdateBranchClosureGroupRequest): Promise<BranchClosure[]> {
    const resp = await apiClient.put<{
      code: number;
      message?: string;
      result: BranchClosure[];
    }>(`${API_ENDPOINTS.ORDER_BRANCH_CLOSURES.BASE}/group`, payload);
    return resp.result;
  },

  async removeGroup(payload: DeleteBranchClosureGroupRequest): Promise<void> {
    await apiClient.delete<{
      code: number;
      message?: string;
    }>(`${API_ENDPOINTS.ORDER_BRANCH_CLOSURES.BASE}/group`, { data: payload });
  },
};

export default branchClosureService;


