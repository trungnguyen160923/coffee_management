import { apiClient } from '../config/api';
import { API_ENDPOINTS } from '../config/constants';

// POS Order interfaces
export interface CreatePOSOrderRequest {
    staffId: number;
    branchId: number;
    customerId?: number;
    customerName?: string;
    phone?: string;
    tableIds: number[];
    orderItems: {
        productId: number;
        productDetailId: number;
        quantity: number;
        notes?: string;
    }[];
    paymentMethod?: string;
    paymentStatus?: string;
    discount?: number;
    discountCode?: string;
    notes?: string;
}

export interface POSOrderResponse {
    orderId: number;
    staffId: number;
    branchId: number;
    customerId?: number;
    customerName?: string;
    phone?: string;
    tableIds: number[];
    status: string;
    paymentMethod?: string;
    paymentStatus?: string;
    subtotal: number;
    discount: number;
    vat: number;
    totalAmount: number;
    discountCode?: string;
    notes?: string;
    orderDate: string;
    createAt: string;
    updateAt: string;
    orderItems: {
        orderItemId: number;
        productId: number;
        productDetailId: number;
        sizeId?: number;
        product?: any;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        notes?: string;
    }[];
}

export interface POSOrderService {
    createPOSOrder: (order: CreatePOSOrderRequest) => Promise<POSOrderResponse>;
    getPOSOrdersByStaff: (staffId: number) => Promise<POSOrderResponse[]>;
    getPOSOrdersByBranch: (branchId: number) => Promise<POSOrderResponse[]>;
    getPOSOrderById: (orderId: number) => Promise<POSOrderResponse>;
    updatePOSOrderStatus: (orderId: number, status: string) => Promise<POSOrderResponse>;
    deletePOSOrder: (orderId: number) => Promise<void>;
    getProducts: () => Promise<any[]>;
    getProductById: (productId: number) => Promise<any>;
    getTablesByBranch: (branchId: number) => Promise<any[]>;
    getTablesByBranchAndStatus: (branchId: number, status: string) => Promise<any[]>;
}

// POS Service Implementation
export const posService: POSOrderService = {
    async createPOSOrder(order: CreatePOSOrderRequest): Promise<POSOrderResponse> {
        const response = await apiClient.post<{ code: number; result: POSOrderResponse }>(
            API_ENDPOINTS.POS.ORDERS,
            order
        );
        return response.result;
    },

    async getPOSOrdersByStaff(staffId: number): Promise<POSOrderResponse[]> {
        const response = await apiClient.get<{ code: number; result: POSOrderResponse[] }>(
            API_ENDPOINTS.POS.ORDERS_BY_STAFF(staffId)
        );
        return response.result;
    },

    async getPOSOrdersByBranch(branchId: number): Promise<POSOrderResponse[]> {
        const response = await apiClient.get<{ code: number; result: POSOrderResponse[] }>(
            API_ENDPOINTS.POS.ORDERS_BY_BRANCH(branchId)
        );
        return response.result;
    },

    async getPOSOrderById(orderId: number): Promise<POSOrderResponse> {
        const response = await apiClient.get<{ code: number; result: POSOrderResponse }>(
            API_ENDPOINTS.POS.ORDER_BY_ID(orderId.toString())
        );
        return response.result;
    },

    async updatePOSOrderStatus(orderId: number, status: string): Promise<POSOrderResponse> {
        const response = await apiClient.put<{ code: number; result: POSOrderResponse }>(
            `${API_ENDPOINTS.POS.ORDER_STATUS(orderId.toString())}?status=${encodeURIComponent(status)}`
        );
        return response.result;
    },

    async deletePOSOrder(orderId: number): Promise<void> {
        await apiClient.delete(API_ENDPOINTS.POS.ORDER_BY_ID(orderId.toString()));
    },

    async getProducts(): Promise<any[]> {
        const response = await apiClient.get<{ code: number; result: any[] }>(
            API_ENDPOINTS.POS.PRODUCTS
        );
        return response.result;
    },

    async getProductById(productId: number): Promise<any> {
        const response = await apiClient.get<{ code: number; result: any }>(
            API_ENDPOINTS.POS.PRODUCT_BY_ID(productId.toString())
        );
        return response.result;
    },

    async getTablesByBranch(branchId: number): Promise<any[]> {
        const response = await apiClient.get<{ code: number; result: any[] }>(
            API_ENDPOINTS.POS.TABLES_BY_BRANCH(branchId)
        );
        return response.result;
    },

    async getTablesByBranchAndStatus(branchId: number, status: string): Promise<any[]> {
        const response = await apiClient.get<{ code: number; result: any[] }>(
            API_ENDPOINTS.POS.TABLES_BY_BRANCH_STATUS(branchId, status)
        );
        return response.result;
    },
};

export default posService;
