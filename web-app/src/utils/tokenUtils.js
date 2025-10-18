/**
 * Utility functions để quản lý JWT token
 */

/**
 * Kiểm tra token có hết hạn không
 * @param {string} token - JWT token
 * @returns {boolean} - true nếu token hết hạn, false nếu còn hiệu lực
 */
export const isTokenExpired = (token) => {
    try {
        if (!token) {
            return true;
        }

        // Decode JWT token
        const parts = token.split('.');
        if (parts.length !== 3) {
            return true;
        }

        const payload = JSON.parse(atob(parts[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        
        // Kiểm tra exp (expiration time)
        if (payload.exp && payload.exp < currentTime) {
            return true;
        }

        return false;
    } catch (error) {
        console.error('Error checking token expiration:', error);
        return true;
    }
};

/**
 * Lấy thông tin từ token
 * @param {string} token - JWT token
 * @returns {Object|null} - Token payload hoặc null
 */
export const getTokenPayload = (token) => {
    try {
        if (!token) {
            return null;
        }

        const parts = token.split('.');
        if (parts.length !== 3) {
            return null;
        }

        return JSON.parse(atob(parts[1]));
    } catch (error) {
        console.error('Error parsing token payload:', error);
        return null;
    }
};

/**
 * Kiểm tra token có hợp lệ không (không null, không hết hạn)
 * @param {string} token - JWT token
 * @returns {boolean} - true nếu token hợp lệ
 */
export const isValidToken = (token) => {
    return token && !isTokenExpired(token);
};

/**
 * Làm sạch token và user data khỏi localStorage
 */
export const clearAuthData = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('cartId');
    // Không xóa guestId để giữ cart cho guest user
    // localStorage.removeItem('guestId');
};

/**
 * Kiểm tra và làm sạch token nếu hết hạn
 * @returns {boolean} - true nếu token còn hiệu lực, false nếu đã hết hạn
 */
export const checkAndCleanExpiredToken = () => {
    const token = localStorage.getItem('token');
    
    if (isTokenExpired(token)) {
        clearAuthData();
        return false;
    }
    
    return true;
};
