import httpClient from '../configurations/httpClient';
import axios from 'axios';
import { API, CONFIG } from '../configurations/configuration';

export const stockService = {
    /**
     * Kiểm tra tồn kho cho các sản phẩm trong giỏ hàng
     * @param {Array} cartItems - Danh sách sản phẩm trong giỏ hàng
     * @param {number} branchId - ID chi nhánh
     * @param {Object} userSession - Thông tin session user (optional)
     * @returns {Promise<Object>} - Kết quả kiểm tra tồn kho
     */
    async checkStockAvailability(cartItems, branchId, userSession = null) {
        try {
            const items = cartItems.map(item => ({
                productDetailId: item.productDetailId,
                quantity: item.quantity
            }));

            // Xác định loại user và session
            let cartId = null;
            let guestId = null;

            if (userSession && userSession.cartId) {
                // User đã đăng nhập có cart
                cartId = userSession.cartId;
                guestId = null;
            } else if (userSession && userSession.guestId) {
                // Guest user có session
                cartId = null;
                guestId = userSession.guestId;
            } else {
                // Sử dụng guestId từ localStorage (cùng với cartService)
                cartId = null;
                guestId = localStorage.getItem('guestId');
                if (!guestId) {
                    guestId = `GUEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    localStorage.setItem('guestId', guestId);
                }
            }

            console.log('Stock check request:', {
                branchId,
                items: items.length,
                cartId,
                guestId,
                userType: cartId ? 'authenticated' : 'guest'
            });

            // Sử dụng axios trực tiếp để không gửi token
            const response = await axios.post(`${CONFIG.API_GATEWAY}${API.CATALOG_API}/stocks/check-and-reserve`, {
                branchId: branchId,
                items: items,
                cartId: cartId,
                guestId: guestId
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && response.data.code === 200) {
                return {
                    success: true,
                    available: true,
                    holdId: response.data.result.holdId,
                    expiresAt: response.data.result.expiresAt,
                    message: 'Stock available'
                };
            } else {
                return {
                    success: false,
                    available: false,
                    message: response.data?.message || 'Stock not available',
                    holdId: null
                };
            }
        } catch (error) {
            console.error('Error checking stock availability:', error);
            return {
                success: false,
                available: false,
                message: error.response?.data?.message || 'Failed to check stock availability',
                holdId: null
            };
        }
    },

    /**
     * Kiểm tra tồn kho cho nhiều chi nhánh
     * @param {Array} cartItems - Danh sách sản phẩm trong giỏ hàng
     * @param {Array} branches - Danh sách chi nhánh
     * @param {Object} userSession - Thông tin session user (optional)
     * @returns {Promise<Array>} - Danh sách chi nhánh có hàng
     */
    async checkStockForMultipleBranches(cartItems, branches, userSession = null) {
        const results = [];
        
        for (const branch of branches) {
            try {
                const stockResult = await this.checkStockAvailability(cartItems, branch.branchId, userSession);
                if (stockResult.success && stockResult.available) {
                    results.push({
                        branch: branch,
                        stockResult: stockResult,
                        available: true
                    });
                } else {
                    results.push({
                        branch: branch,
                        stockResult: stockResult,
                        available: false
                    });
                }
            } catch (error) {
                console.error(`Error checking stock for branch ${branch.branchId}:`, error);
                results.push({
                    branch: branch,
                    stockResult: { success: false, available: false, message: 'Error checking stock' },
                    available: false
                });
            }
        }
        
        return results;
    },

    /**
     * Xóa tất cả reservations của user/guest
     * @param {Object} userSession - Thông tin session user (optional)
     * @returns {Promise<Object>} - Kết quả xóa reservations
     */
    async clearAllReservations(userSession = null) {
        try {
            // Xác định loại user và session
            let cartId = null;
            let guestId = null;

            if (userSession && userSession.cartId) {
                // User đã đăng nhập có cart
                cartId = userSession.cartId;
                guestId = null;
            } else if (userSession && userSession.guestId) {
                // Guest user có session
                cartId = null;
                guestId = userSession.guestId;
            } else {
                // Không có session, không cần xóa
                return {
                    success: true,
                    message: 'No session to clear'
                };
            }

            console.log('Clearing reservations:', {
                cartId,
                guestId,
                userType: cartId ? 'authenticated' : 'guest'
            });

            const response = await httpClient.delete(API.CLEAR_RESERVATIONS, {
                data: {
                    cartId: cartId,
                    guestId: guestId
                }
            });

            if (response.data && response.data.code === 200) {
                return {
                    success: true,
                    message: 'Reservations cleared successfully'
                };
            } else {
                return {
                    success: false,
                    message: response.data?.message || 'Failed to clear reservations'
                };
            }
        } catch (error) {
            console.error('Error clearing reservations:', error);
            return {
                success: false,
                message: error.response?.data?.message || 'Failed to clear reservations'
            };
        }
    }
};

export default stockService;
