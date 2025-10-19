import httpClient from '../configurations/httpClient';
import { API } from '../configurations/configuration';

export const branchService = {
    /**
     * Tìm chi nhánh gần nhất dựa trên địa chỉ
     * @param {string} address - Địa chỉ để tìm chi nhánh gần nhất
     * @returns {Promise<Object>} - Thông tin chi nhánh gần nhất
     */
    async findNearestBranch(address) {
        try {
            const response = await httpClient.get(`${API.GET_BRANCHES}/nearest`, {
                params: { address }
            });

            if (response.data && response.data.result) {
                return {
                    success: true,
                    branch: response.data.result,
                    message: response.data.message
                };
            } else {
                return {
                    success: false,
                    message: 'No branch found',
                    branch: null
                };
            }
        } catch (error) {
            console.error('Error finding nearest branch:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to find nearest branch',
                branch: null
            };
        }
    },

    /**
     * Lấy n chi nhánh gần nhất dựa trên địa chỉ
     * @param {string} address - Địa chỉ để tìm chi nhánh gần nhất
     * @param {number} limit - Số lượng chi nhánh cần lấy (mặc định 5)
     * @returns {Promise<Object>} - Danh sách n chi nhánh gần nhất
     */
    async findTopNearestBranches(address, limit = 5) {
        try {
            const response = await httpClient.get(`${API.GET_BRANCHES}/nearest/top`, {
                params: { 
                    address,
                    limit: limit
                }
            });

            if (response.data && response.data.result) {
                return {
                    success: true,
                    branches: response.data.result,
                    message: response.data.message
                };
            } else {
                return {
                    success: false,
                    message: 'No branches found',
                    branches: []
                };
            }
        } catch (error) {
            console.error('Error finding top nearest branches:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to find nearest branches',
                branches: []
            };
        }
    },

    /**
     * Lấy 5 chi nhánh gần nhất dựa trên địa chỉ (backward compatibility)
     * @param {string} address - Địa chỉ để tìm chi nhánh gần nhất
     * @returns {Promise<Object>} - Danh sách 5 chi nhánh gần nhất
     */
    async findTop5NearestBranches(address) {
        return this.findTopNearestBranches(address, 5);
    },

    /**
     * Lấy tất cả chi nhánh
     * @returns {Promise<Array>} - Danh sách tất cả chi nhánh
     */
    async getAllBranches() {
        try {
            const response = await httpClient.get(`${API.GET_BRANCHES}`);
            return response.data?.result || [];
        } catch (error) {
            console.error('Failed to get all branches:', error);
            throw error;
        }
    }
};

export default branchService;
