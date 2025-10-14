import { apiClient } from '../config/api';
import { API_ENDPOINTS } from '../config/constants';
import {
    Table,
    TableAssignment,
    CreateTableRequest,
    AssignTableRequest,
    UpdateTableStatusRequest,
    UpdateTableRequest,
    AvailableTableFilters
} from '../types/table';

export const tableService = {
    // Create new table
    async createTable(request: CreateTableRequest): Promise<Table> {
        const endpoint = API_ENDPOINTS.TABLES.BASE;
        const resp = await apiClient.post<any>(endpoint, request);
        return (resp && resp.result) ? resp.result as Table : (resp as Table);
    },

    // Get tables by branch
    async getTablesByBranch(branchId: number | string): Promise<Table[]> {
        const endpoint = API_ENDPOINTS.TABLES.BY_BRANCH(branchId);
        const resp = await apiClient.get<{ code: number; result: Table[] } | Table[]>(endpoint);
        const maybeWrapped: any = resp as any;
        if (maybeWrapped && typeof maybeWrapped === 'object' && 'result' in maybeWrapped) {
            return maybeWrapped.result || [];
        }
        return resp as Table[];
    },

    // Get available tables for reservation
    async getAvailableTables(filters: AvailableTableFilters): Promise<Table[]> {
        const endpoint = `${API_ENDPOINTS.TABLES.AVAILABLE(filters.branchId)}?partySize=${filters.partySize}&reservedAt=${encodeURIComponent(filters.reservedAt)}`;
        const resp = await apiClient.get<{ code: number; result: Table[] } | Table[]>(endpoint);
        const maybeWrapped: any = resp as any;
        if (maybeWrapped && typeof maybeWrapped === 'object' && 'result' in maybeWrapped) {
            return maybeWrapped.result || [];
        }
        return resp as Table[];
    },

    // Assign tables to reservation
    async assignTablesToReservation(request: AssignTableRequest): Promise<TableAssignment> {
        const endpoint = API_ENDPOINTS.TABLES.ASSIGN;
        const resp = await apiClient.post<any>(endpoint, request);
        return (resp && resp.result) ? resp.result as TableAssignment : (resp as TableAssignment);
    },

    // Get table assignments for reservation
    async getTableAssignments(reservationId: number | string): Promise<Table[]> {
        const endpoint = API_ENDPOINTS.TABLES.BY_RESERVATION(reservationId);
        const resp = await apiClient.get<{ code: number; result: Table[] } | Table[]>(endpoint);
        const maybeWrapped: any = resp as any;
        if (maybeWrapped && typeof maybeWrapped === 'object' && 'result' in maybeWrapped) {
            return maybeWrapped.result || [];
        }
        return resp as Table[];
    },

    // Update table status
    async updateTableStatus(request: UpdateTableStatusRequest): Promise<Table> {
        const endpoint = API_ENDPOINTS.TABLES.STATUS;
        const resp = await apiClient.put<any>(endpoint, request);
        return (resp && resp.result) ? resp.result as Table : (resp as Table);
    },

    // Remove table assignments
    async removeTableAssignments(reservationId: number | string): Promise<void> {
        const endpoint = API_ENDPOINTS.TABLES.BY_RESERVATION(reservationId);
        await apiClient.delete(endpoint);
    },

    // Update table information
    async updateTable(tableId: number | string, request: UpdateTableRequest): Promise<Table> {
        const endpoint = `${API_ENDPOINTS.TABLES.BASE}/${tableId}`;
        const resp = await apiClient.put<any>(endpoint, request);
        return (resp && resp.result) ? resp.result as Table : (resp as Table);
    },

    // Delete table
    async deleteTable(tableId: number | string): Promise<void> {
        const endpoint = `${API_ENDPOINTS.TABLES.BASE}/${tableId}`;
        await apiClient.delete(endpoint);
    },

    // Get table status summary
    async getTableStatusSummary(branchId: number | string): Promise<Table[]> {
        const endpoint = API_ENDPOINTS.TABLES.STATUS_SUMMARY(branchId);
        const resp = await apiClient.get<{ code: number; result: Table[] } | Table[]>(endpoint);
        const maybeWrapped: any = resp as any;
        if (maybeWrapped && typeof maybeWrapped === 'object' && 'result' in maybeWrapped) {
            return maybeWrapped.result || [];
        }
        return resp as Table[];
    },
};
export default tableService;

