import { apiClient } from '../config/api';
import { API_ENDPOINTS } from '../config/constants';

export interface Reservation {
    reservationId: number;
    branchId: number;
    customerId?: number;
    customerName?: string;
    phone?: string;
    reservedAt: string;
    partySize?: number;
    status: string;
    notes?: string;
    // Thời gian tạo đơn đặt bàn (create_at từ backend) - dùng để lọc theo ngày tạo
    createAt?: string;
}

export const reservationService = {
    async getById(id: number | string): Promise<Reservation> {
        const endpoint = `${API_ENDPOINTS.RESERVATIONS.BASE}/${id}`;
        const resp = await apiClient.get<any>(endpoint);
        return (resp && resp.result) ? resp.result as Reservation : (resp as Reservation);
    },
    async getByBranch(branchId: number | string): Promise<Reservation[]> {
        const endpoint = API_ENDPOINTS.RESERVATIONS.BY_BRANCH(branchId);
        const resp = await apiClient.get<{ code: number; result: Reservation[] } | Reservation[]>(endpoint);
        const maybeWrapped: any = resp as any;
        if (maybeWrapped && typeof maybeWrapped === 'object' && 'result' in maybeWrapped) {
            return maybeWrapped.result || [];
        }
        return resp as Reservation[];
    },

    async updateStatus(id: number | string, status: string): Promise<Reservation> {
        const endpoint = `${API_ENDPOINTS.RESERVATIONS.STATUS(id)}?status=${encodeURIComponent(status)}`;
        const resp = await apiClient.put<any>(endpoint);
        return (resp && resp.result) ? resp.result : resp;
    },

    async delete(id: number | string): Promise<void> {
        const endpoint = `${API_ENDPOINTS.RESERVATIONS.BASE}/${id}`;
        await apiClient.delete(endpoint);
    },
};

export default reservationService;


