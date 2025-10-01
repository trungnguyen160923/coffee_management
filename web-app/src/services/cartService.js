import httpClient from '../configurations/httpClient';
import { API } from '../configurations/configuration';

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
            const imageUrl = imagePath && imagePath.startsWith('http')
                ? imagePath
                : `${API.FILE_IMAGE_PRODUCTS}/${imagePath}`;
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
