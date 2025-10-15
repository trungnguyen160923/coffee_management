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
    }
};

export default branchService;
