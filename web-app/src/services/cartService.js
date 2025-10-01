import httpClient from '../configurations/httpClient';
import { API, CONFIG } from '../configurations/configuration';

class CartService {
    getGuestId() {
        let id = localStorage.getItem('guestId');
        if (!id) {
            id = String(Math.floor(Math.random() * 1000000000));
            localStorage.setItem('guestId', id);
        }
        return id;
    }

    buildHeaders() {
        return { 'X-Guest-Id': this.getGuestId() };
    }

    mapCartItems(rawItems = []) {
        return rawItems.map((it) => {
            const product = it.product || {};
            const price = it.unitPrice ?? (it.productDetail && it.productDetail.price) ?? 0;
            const imagePath = product.imageUrl || '';
            let imageUrl = '/images/placeholder.jpg';
            if (typeof imagePath === 'string' && imagePath.length > 0) {
                if (imagePath.startsWith('http')) {
                    imageUrl = imagePath;
                } else {
                    const marker = '/files/images/products/';
                    let filename = imagePath;
                    if (filename.includes(marker)) {
                        filename = filename.substring(filename.lastIndexOf('/') + 1);
                    } else {
                        filename = filename.replace(/[{}]/g, '');
                        if (filename.includes('/')) {
                            filename = filename.substring(filename.lastIndexOf('/') + 1);
                        }
                    }
                    imageUrl = `${CONFIG.API_GATEWAY}${API.FILE_IMAGE_PRODUCTS}/${filename}`;
                }
            }
            return {
                cartItemId: it.cartItemId,
                productId: it.productId,
                productDetailId: it.productDetailId,
                quantity: it.quantity,
                price: Number(price || 0),
                name: product.name || '',
                description: product.description || '',
                imageUrl,
            };
        });
    }

    async getCartItems() {
        const response = await httpClient.get(API.GET_CART, { headers: this.buildHeaders() });
        const items = response.data.result?.cartItems || [];
        return this.mapCartItems(items);
    }

    async addToCart(productId, productDetailId, quantity = 1) {
        const response = await httpClient.post(
            API.ADD_TO_CART,
            { productId, productDetailId, quantity },
            { headers: this.buildHeaders() }
        );
        return response.data.result;
    }

    async updateQuantity(productId, quantity) {
        const response = await httpClient.put(
            `${API.UPDATE_CART_ITEM}/${productId}`,
            { quantity },
            { headers: this.buildHeaders() }
        );
        return response.data.result;
    }

    async removeFromCart(productId) {
        const response = await httpClient.delete(
            `${API.REMOVE_FROM_CART}/${productId}`,
            { headers: this.buildHeaders() }
        );
        return response.data.result;
    }

    async clearCart() {
        const response = await httpClient.delete(API.CLEAR_CART, { headers: this.buildHeaders() });
        return response.data.result;
    }

    async getCartTotal() {
        const response = await httpClient.get(API.GET_CART_TOTAL, { headers: this.buildHeaders() });
        return response.data.result;
    }
}

export const cartService = new CartService();
