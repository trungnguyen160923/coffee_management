import { CONFIG, API } from '../configurations/configuration.js';

const API_BASE_URL = CONFIG.API_GATEWAY;

const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export const addressService = {
    // Lấy danh sách địa chỉ của khách hàng
    getCustomerAddresses: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}${API.GET_CUSTOMER_ADDRESSES}`, {
                method: 'GET',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.result || [];
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

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.result;
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

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.result;
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

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return true;
        } catch (error) {
            console.error('Error deleting address:', error);
            throw error;
        }
    }
};
