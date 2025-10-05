import httpClient from '../configurations/httpClient';
import { API } from '../configurations/configuration';

export const emailService = {
    sendOrderConfirmation: async (orderData) => {
        try {
            const response = await httpClient.post(API.SEND_ORDER_CONFIRMATION_EMAIL, {
                email: orderData.email,
                customerName: orderData.customerName,
                orderId: orderData.orderId,
                orderItems: orderData.orderItems.map(item => ({
                    productName: item.productName || item.name || 'Unknown Product',
                    quantity: item.quantity,
                    totalPrice: item.totalPrice || (item.price * item.quantity)
                })),
                totalAmount: orderData.totalAmount,
                deliveryAddress: orderData.deliveryAddress,
                paymentMethod: orderData.paymentMethod,
                orderDate: orderData.orderDate
            });
            return response.data;
        } catch (error) {
            console.error('Error sending order confirmation email:', error);
            throw error;
        }
    }
};

export default emailService;
