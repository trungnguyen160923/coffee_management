import httpClient from '../configurations/httpClient';

export const reviewService = {
    /**
     * Lấy danh sách reviews với filter
     * @param {Object} filters - Bộ lọc reviews
     * @param {number} filters.productId - ID sản phẩm
     * @param {number} filters.branchId - ID chi nhánh (optional)
     * @param {number} filters.customerId - ID khách hàng (optional)
     * @param {number} filters.rating - Rating (optional)
     * @param {string} filters.keyword - Từ khóa tìm kiếm (optional)
     * @param {number} filters.timeRange - Khoảng thời gian (optional)
     * @returns {Promise<Array>} - Danh sách reviews
     */
    async getReviews(filters = {}) {
        try {
            const params = new URLSearchParams();
            
            if (filters.productId) params.append('productId', filters.productId);
            if (filters.branchId) params.append('branchId', filters.branchId);
            if (filters.customerId) params.append('customerId', filters.customerId);
            if (filters.rating) params.append('rating', filters.rating);
            if (filters.keyword) params.append('keyword', filters.keyword);
            if (filters.timeRange) params.append('timeRange', filters.timeRange);

            const response = await httpClient.get(`/order-service/reviews/filter?${params}`);
            return response.data?.result?.content || [];
        } catch (error) {
            console.error('Failed to get reviews:', error);
            throw error;
        }
    },

    /**
     * Tạo review mới
     * @param {Object} reviewData - Dữ liệu review
     * @param {number} reviewData.productId - ID sản phẩm
     * @param {number} reviewData.branchId - ID chi nhánh
     * @param {number} reviewData.rating - Rating (1-5)
     * @param {string} reviewData.comment - Bình luận
     * @returns {Promise<Object>} - Review đã tạo
     */
    async createReview(reviewData) {
        try {
            const response = await httpClient.post('/order-service/reviews', reviewData);
            return response.data?.result;
        } catch (error) {
            console.error('Failed to create review:', error);
            throw error;
        }
    },

    /**
     * Cập nhật review
     * @param {number} reviewId - ID review
     * @param {Object} updateData - Dữ liệu cập nhật
     * @param {string} updateData.comment - Bình luận mới
     * @returns {Promise<Object>} - Review đã cập nhật
     */
    async updateReview(reviewId, updateData) {
        try {
            const response = await httpClient.put(`/order-service/reviews/${reviewId}`, updateData);
            return response.data?.result;
        } catch (error) {
            console.error('Failed to update review:', error);
            throw error;
        }
    },

    /**
     * Xóa review (customer)
     * @param {number} reviewId - ID review
     * @param {string} reason - Lý do xóa
     * @returns {Promise<void>}
     */
    async deleteReview(reviewId, reason) {
        try {
            await httpClient.delete(`/order-service/reviews/${reviewId}/customer`, {
                reason
            });
        } catch (error) {
            console.error('Failed to delete review:', error);
            throw error;
        }
    }
};
