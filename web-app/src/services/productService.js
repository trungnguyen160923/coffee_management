import httpClient from '../configurations/httpClient';
import { API, CONFIG } from '../configurations/configuration';

export const productService = {
    // Get all products - từ ProductController @GetMapping
    getAllProducts: async () => {
        try {
            const response = await httpClient.get(`${API.GET_PRODUCTS}`);
            // API trả về ApiResponse<List<ProductResponse>>
            return response.data.result || [];
        } catch (error) {
            console.error('Error fetching products:', error);
            throw error;
        }
    },

    // Get products by category ID - có thể cần thêm endpoint này
    getProductsByCategory: async (categoryId) => {
        try {
            const response = await httpClient.get(`${API.GET_PRODUCTS}/category/${categoryId}`);
            return response.data.result || [];
        } catch (error) {
            console.error(`Error fetching products for category ${categoryId}:`, error);
            throw error;
        }
    },

    // Get single product by ID - từ ProductController @GetMapping("/{productId}")
    getProductById: async (productId) => {
        try {
            const response = await httpClient.get(`${API.GET_PRODUCT_BY_ID}/${productId}`);
            // API trả về ApiResponse<ProductResponse>
            return response.data.result;
        } catch (error) {
            console.error(`Error fetching product ${productId}:`, error);
            throw error;
        }
    },

    // Get product detail by detail ID - từ ProductController @GetMapping("/detail/{productDetailId}")
    getProductDetailById: async (productDetailId) => {
        try {
            const response = await httpClient.get(`${API.GET_PRODUCT_DETAIL_BY_ID}/${productDetailId}`);
            // API trả về ApiResponse<ProductDetailResponse>
            return response.data.result;
        } catch (error) {
            console.error(`Error fetching product detail ${productDetailId}:`, error);
            throw error;
        }
    },

    // Utility function để tạo đầy đủ image URL
    getFullImageUrl: (imagePath) => {
        if (!imagePath) return '/images/placeholder.jpg';
        if (typeof imagePath !== 'string') return '/images/placeholder.jpg';
        if (imagePath.startsWith('http')) return imagePath;

        // Chuẩn hóa: nếu là đường dẫn '/files/images/products/filename', chỉ lấy filename
        const marker = '/files/images/products/';
        let filename = imagePath;
        if (filename.includes(marker)) {
            filename = filename.substring(filename.lastIndexOf('/') + 1);
            //
        } else {
            // Loại bỏ ký tự '{}' nếu có, và chỉ lấy phần sau cùng sau '/'
            filename = filename.replace(/[{}]/g, '');
            if (filename.includes('/')) {
                filename = filename.substring(filename.lastIndexOf('/') + 1);
            }
        }
        console.log('filename', filename);
        // Trả về URL đúng qua API Gateway (absolute URL)
        return `${CONFIG.API_GATEWAY}${API.FILE_IMAGE_PRODUCTS}/${filename}`;
    }
};

export default productService;
