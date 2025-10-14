import httpClient from '../configurations/httpClient';
import { API } from '../configurations/configuration';

class DiscountService {
    buildHeaders() {
        const token = localStorage.getItem('token');
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return headers;
    }

    /**
     * Validate discount code
     * @param {string} discountCode - The discount code to validate
     * @param {number} cartTotal - Current cart total amount
     * @returns {Promise<Object>} Validation result with discount details
     */
    async validateDiscount(discountCode, cartTotal) {
        try {
            const response = await httpClient.post(
                API.VALIDATE_DISCOUNT,
                {
                    discountCode: discountCode,
                    orderAmount: cartTotal,
                    branchId: 1 // Default branch ID, can be made dynamic later
                },
                { headers: this.buildHeaders() }
            );
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Apply discount to cart
     * @param {string} discountCode - The discount code to apply
     * @param {number} cartTotal - Current cart total amount
     * @returns {Promise<Object>} Application result with updated totals
     */
    async applyDiscount(discountCode, cartTotal) {
        try {
            const response = await httpClient.post(
                API.APPLY_DISCOUNT,
                {
                    discountCode: discountCode,
                    orderAmount: cartTotal,
                    branchId: 1 // Default branch ID, can be made dynamic later
                },
                { headers: this.buildHeaders() }
            );
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get available discounts for current user/cart
     * @returns {Promise<Array>} List of available discounts
     */
    async getAvailableDiscounts() {
        try {
            const response = await httpClient.get(
                API.GET_AVAILABLE_DISCOUNTS,
                { headers: this.buildHeaders() }
            );
            return response.data;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Remove applied discount (frontend only)
     * @returns {Promise<Object>} Result of discount removal
     */
    async removeDiscount() {
        try {
            // For frontend-only removal, we don't need to call API
            // Just return success response
            return {
                code: 2000,
                message: "Discount removed successfully",
                result: null
            };
        } catch (error) {
            throw error;
        }
    }
}

export const discountService = new DiscountService();
export default discountService;
