/**
 * Utility functions để quản lý user session
 */

/**
 * Lấy thông tin user session hiện tại (sync)
 * @returns {Object|null} - Thông tin session hoặc null
 */
export const getCurrentUserSession = () => {
    try {
        const user = localStorage.getItem('user');
        const cartId = localStorage.getItem('cartId');
        const guestId = localStorage.getItem('guestId');
        
        if (user) {
            // User đã đăng nhập
            const userData = JSON.parse(user);
            return {
                type: 'authenticated',
                userId: userData.userId,
                cartId: cartId ? parseInt(cartId) : null,
                guestId: null
            };
        } else if (guestId) {
            // Guest user có session
            return {
                type: 'guest',
                userId: null,
                cartId: null,
                guestId: guestId
            };
        } else {
            // Chưa có session
            return null;
        }
    } catch (error) {
        console.error('Error getting user session:', error);
        return null;
    }
};

/**
 * Lấy thông tin user session hiện tại (async với Cart ID)
 * @returns {Promise<Object|null>} - Thông tin session hoặc null
 */
export const getCurrentUserSessionAsync = async () => {
    try {
        const user = localStorage.getItem('user');
        const guestId = localStorage.getItem('guestId');
        
        if (user) {
            // User đã đăng nhập - lấy Cart ID từ API
            const userData = JSON.parse(user);
            const cartId = await getOrCreateCartId();
            
            return {
                type: 'authenticated',
                userId: userData.userId,
                cartId: cartId,
                guestId: null
            };
        } else if (guestId) {
            // Guest user có session
            return {
                type: 'guest',
                userId: null,
                cartId: null,
                guestId: guestId
            };
        } else {
            // Chưa có session
            return null;
        }
    } catch (error) {
        console.error('Error getting user session async:', error);
        return null;
    }
};

/**
 * Tạo guest session mới
 * @returns {Object} - Guest session
 */
export const createGuestSession = () => {
    // Chỉ tạo guestId mới nếu chưa có
    let guestId = localStorage.getItem('guestId');
    
    if (!guestId) {
        guestId = `GUEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('guestId', guestId);
    }
    
    return {
        type: 'guest',
        userId: null,
        cartId: null,
        guestId: guestId
    };
};

/**
 * Làm sạch session
 */
export const clearUserSession = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('cartId');
    // Không xóa guestId để giữ cart cho guest user
    // localStorage.removeItem('guestId');
};

/**
 * Cập nhật cart ID cho user đã đăng nhập
 * @param {number} cartId - Cart ID
 */
export const updateCartId = (cartId) => {
    if (cartId) {
        localStorage.setItem('cartId', cartId.toString());
    } else {
        localStorage.removeItem('cartId');
    }
};

/**
 * Kiểm tra user có đăng nhập không
 * @returns {boolean}
 */
export const isUserAuthenticated = () => {
    const user = localStorage.getItem('user');
    return user !== null;
};

/**
 * Lấy user ID hiện tại
 * @returns {number|null}
 */
export const getCurrentUserId = () => {
    try {
        const user = localStorage.getItem('user');
        if (user) {
            const userData = JSON.parse(user);
            return userData.userId;
        }
        return null;
    } catch (error) {
        console.error('Error getting user ID:', error);
        return null;
    }
};

/**
 * Lấy Cart ID thực tế từ API cho user đã đăng nhập
 * @returns {Promise<number|null>} - Cart ID hoặc null
 */
export const getCartIdFromAPI = async () => {
    try {
        const user = localStorage.getItem('user');
        if (!user) {
            return null;
        }

        const userData = JSON.parse(user);
        const userId = userData.userId ?? userData.user_id;
        
        if (!userId) {
            return null;
        }

        // Gọi API để lấy cart của user
        const response = await fetch('http://localhost:8000/api/order-service/api/cart', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.result && data.result.cartId) {
                // Lưu cart ID vào localStorage
                updateCartId(data.result.cartId);
                return data.result.cartId;
            }
        } else {
            console.error('Cart API error:', response.status, response.statusText);
        }

        return null;
    } catch (error) {
        console.error('Error getting cart ID from API:', error);
        return null;
    }
};

/**
 * Lấy hoặc tạo Cart ID cho user đã đăng nhập
 * @returns {Promise<number|null>} - Cart ID hoặc null
 */
export const getOrCreateCartId = async () => {
    try {
        // Kiểm tra localStorage trước
        const storedCartId = localStorage.getItem('cartId');
        if (storedCartId) {
            return parseInt(storedCartId);
        }

        // Nếu chưa có, lấy từ API
        const cartId = await getCartIdFromAPI();
        if (cartId) {
            return cartId;
        }

        // Nếu vẫn chưa có, cart sẽ được tạo tự động khi gọi GET /api/cart
        // Không cần tạo cart mới, vì CartService sẽ tự động tạo khi cần
        return null;
    } catch (error) {
        console.error('Error getting or creating cart ID:', error);
        return null;
    }
};
