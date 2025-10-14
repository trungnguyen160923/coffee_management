import { apiClient } from '../config/api';
import { API_ENDPOINTS } from '../config/constants';
import {
    Discount,
    CreateDiscountRequest,
    UpdateDiscountRequest,
    ApplyDiscountRequest,
    DiscountApplicationResponse,
    DiscountPageResponse
} from '../types/discount';

// Discount API interfaces
export interface DiscountFilters {
    status?: 'active' | 'inactive' | 'expired';
    branchId?: number;
    search?: string;
    keyword?: string;
    page?: number;
    size?: number;
    limit?: number;
    sortBy?: string;
    sortDir?: 'asc' | 'desc';
}

export interface DiscountListResponse {
    discounts: Discount[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface DiscountStats {
    totalDiscounts: number;
    activeDiscounts: number;
    expiredDiscounts: number;
    totalUsage: number;
    totalSavings: number;
}

export interface DiscountService {
    // Discount CRUD
    getDiscounts: (filters?: DiscountFilters) => Promise<DiscountListResponse>;
    getAllDiscounts: (filters?: DiscountFilters) => Promise<DiscountPageResponse>;
    getDiscount: (id: number) => Promise<Discount>;
    createDiscount: (discount: CreateDiscountRequest) => Promise<Discount>;
    updateDiscount: (id: number, discount: UpdateDiscountRequest) => Promise<Discount>;
    deleteDiscount: (id: number) => Promise<void>;

    // Discount management
    getActiveDiscounts: (branchId?: number) => Promise<Discount[]>;
    applyDiscount: (request: ApplyDiscountRequest) => Promise<DiscountApplicationResponse>;
    useDiscount: (code: string) => Promise<void>;

    // Statistics
    getDiscountStats: (branchId?: number) => Promise<DiscountStats>;
}

// Discount Service Implementation
export const discountService: DiscountService = {
    async getDiscounts(filters: DiscountFilters = {}): Promise<DiscountListResponse> {
        const params = new URLSearchParams();

        if (filters.status) params.append('status', filters.status);
        if (filters.branchId) params.append('branchId', filters.branchId.toString());
        if (filters.search) params.append('search', filters.search);
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());

        const queryString = params.toString();
        const endpoint = `${API_ENDPOINTS.DISCOUNTS.BASE}${queryString ? `?${queryString}` : ''}`;

        return await apiClient.get<DiscountListResponse>(endpoint);
    },

    async getAllDiscounts(filters: DiscountFilters = {}): Promise<DiscountPageResponse> {
        const params = new URLSearchParams();

        if (filters.status) params.append('status', filters.status);
        if (filters.branchId) params.append('branchId', filters.branchId.toString());
        if (filters.search) params.append('search', filters.search);
        if (filters.keyword) params.append('keyword', filters.keyword);
        if (filters.page !== undefined) params.append('page', filters.page.toString());
        if (filters.size) params.append('size', filters.size.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());
        if (filters.sortBy) params.append('sortBy', filters.sortBy);
        if (filters.sortDir) params.append('sortDir', filters.sortDir);

        const queryString = params.toString();
        const endpoint = `${API_ENDPOINTS.DISCOUNTS.BASE}${queryString ? `?${queryString}` : ''}`;

        const response = await apiClient.get<{
            code: number;
            message: string;
            result: DiscountPageResponse;
        }>(endpoint);

        return response.result;
    },

    async getDiscount(id: number): Promise<Discount> {
        const response = await apiClient.get<{
            code: number;
            message: string;
            result: Discount;
        }>(`${API_ENDPOINTS.DISCOUNTS.BASE}/${id}`);

        return response.result;
    },

    async createDiscount(discount: CreateDiscountRequest): Promise<Discount> {
        const response = await apiClient.post<{
            code: number;
            message: string;
            result: Discount;
        }>(API_ENDPOINTS.DISCOUNTS.BASE, discount);

        return response.result;
    },

    async updateDiscount(id: number, discount: UpdateDiscountRequest): Promise<Discount> {
        const response = await apiClient.put<{
            code: number;
            message: string;
            result: Discount;
        }>(`${API_ENDPOINTS.DISCOUNTS.BASE}/${id}`, discount);

        return response.result;
    },

    async deleteDiscount(id: number): Promise<void> {
        await apiClient.delete(`${API_ENDPOINTS.DISCOUNTS.BASE}/${id}`);
    },

    async getActiveDiscounts(branchId?: number): Promise<Discount[]> {
        const params = new URLSearchParams();
        if (branchId) params.append('branchId', branchId.toString());

        const queryString = params.toString();
        const endpoint = `${API_ENDPOINTS.DISCOUNTS.ACTIVE}${queryString ? `?${queryString}` : ''}`;

        const response = await apiClient.get<{
            code: number;
            message: string;
            result: Discount[];
        }>(endpoint);

        return response.result;
    },

    async applyDiscount(request: ApplyDiscountRequest): Promise<DiscountApplicationResponse> {
        const response = await apiClient.post<{
            code: number;
            message: string;
            result: DiscountApplicationResponse;
        }>(API_ENDPOINTS.DISCOUNTS.APPLY, request);

        return response.result;
    },

    async useDiscount(code: string): Promise<void> {
        await apiClient.post(API_ENDPOINTS.DISCOUNTS.USE(code));
    },

    async getDiscountStats(branchId?: number): Promise<DiscountStats> {
        const params = new URLSearchParams();
        if (branchId) params.append('branchId', branchId.toString());

        const queryString = params.toString();
        const endpoint = `${API_ENDPOINTS.DISCOUNTS.BASE}/stats${queryString ? `?${queryString}` : ''}`;

        return await apiClient.get<DiscountStats>(endpoint);
    },
};

export default discountService;
