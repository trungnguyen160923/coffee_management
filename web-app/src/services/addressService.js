import { CONFIG, API } from '../configurations/configuration.js';

const API_BASE_URL = CONFIG.API_GATEWAY;

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

// Parse JSON safely and keep server error message (if any)
const handleJsonResponse = async (response) => {
    const text = await response.text();
    const payload = text ? (() => {
        try {
            return JSON.parse(text);
        } catch {
            return { raw: text };
        }
    })() : null;

    if (!response.ok) {
        const message =
            payload?.message ||
            payload?.error ||
            payload?.errorMessage ||
            `HTTP error! status: ${response.status}`;

        const error = new Error(message);
        error.status = response.status;
        error.payload = payload;
        throw error;
    }

    return payload?.result ?? payload;
};

export const addressService = {
    // Lấy danh sách địa chỉ của khách hàng
    getCustomerAddresses: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}${API.GET_CUSTOMER_ADDRESSES}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });
            return await handleJsonResponse(response) || [];
        } catch (error) {
            console.error('Error fetching customer addresses:', error);
            throw error;
        }
    },

    // Tạo địa chỉ mới
    createAddress: async (addressData) => {
        try {
            const response = await fetch(`${API_BASE_URL}${API.CREATE_ADDRESS}`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(addressData)
            });
            return await handleJsonResponse(response);
        } catch (error) {
            console.error('Error creating address:', error);
            throw error;
        }
    },

    // Cập nhật địa chỉ
    updateAddress: async (addressId, addressData) => {
        try {
            const response = await fetch(`${API_BASE_URL}${API.UPDATE_CUSTOMER_ADDRESS}/${addressId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(addressData)
            });
            return await handleJsonResponse(response);
        } catch (error) {
            console.error('Error updating address:', error);
            throw error;
        }
    },

    // Xóa địa chỉ
    deleteAddress: async (addressId) => {
        try {
            const response = await fetch(`${API_BASE_URL}${API.DELETE_CUSTOMER_ADDRESS}/${addressId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            await handleJsonResponse(response);
            return true;
        } catch (error) {
            console.error('Error deleting address:', error);
            throw error;
        }
    }
};
