import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { orderService } from '../../services/orderService';

const SimpleTrackOrder = () => {
    const { orderId } = useParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [cancelling, setCancelling] = useState(false);

    useEffect(() => {
        if (orderId) {
            fetchOrder();
        }
    }, [orderId]);

    const fetchOrder = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await orderService.getOrderByIdPublic(orderId);

            if (response && response.result) {
                setOrder(response.result);
            } else {
                setError('Order not found');
            }
        } catch (err) {
            console.error('Error fetching order:', err);
            setError('Unable to load order information. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelOrder = async () => {
        if (!window.confirm('Are you sure you want to cancel this order?')) {
            return;
        }

        try {
            setCancelling(true);
            await orderService.cancelOrderPublic(orderId);

            // Refresh order data to show updated status
            await fetchOrder();

            alert('Order cancelled successfully!');
        } catch (err) {
            console.error('Error cancelling order:', err);
            alert('Failed to cancel order. Please try again.');
        } finally {
            setCancelling(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status?.toUpperCase()) {
            case 'PENDING':
                return { color: '#f39c12', text: 'Pending' };
            case 'CONFIRMED':
                return { color: '#27ae60', text: 'Confirmed' };
            case 'PREPARING':
                return { color: '#3498db', text: 'Preparing' };
            case 'READY':
                return { color: '#9b59b6', text: 'Ready' };
            case 'DELIVERED':
                return { color: '#2ecc71', text: 'Delivered' };
            case 'CANCELLED':
                return { color: '#e74c3c', text: 'Cancelled' };
            default:
                return { color: '#95a5a6', text: status || 'Unknown' };
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatTime = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#1a1a1a',
                margin: 0,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '30px',
                        height: '30px',
                        border: '3px solid #333',
                        borderTop: '3px solid #fff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite',
                        margin: '0 auto 15px'
                    }}></div>
                    <p style={{ color: '#ccc', fontSize: '14px' }}>Loading...</p>
                </div>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#1a1a1a',
                margin: 0,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
            }}>
                <div style={{
                    backgroundColor: '#2d2d2d',
                    padding: '30px',
                    borderRadius: '8px',
                    border: '1px solid #444',
                    textAlign: 'center',
                    maxWidth: '400px',
                    width: '90%'
                }}>
                    <h3 style={{ color: '#ff6b6b', marginBottom: '15px', fontSize: '18px' }}>Order Not Found</h3>
                    <p style={{ color: '#ccc', marginBottom: '0', fontSize: '14px' }}>{error}</p>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#1a1a1a',
                margin: 0,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
            }}>
                <div style={{
                    backgroundColor: '#2d2d2d',
                    padding: '30px',
                    borderRadius: '8px',
                    border: '1px solid #444',
                    textAlign: 'center',
                    maxWidth: '400px',
                    width: '90%'
                }}>
                    <h3 style={{ color: '#ffa726', marginBottom: '15px', fontSize: '18px' }}>No Order Information</h3>
                    <p style={{ color: '#ccc', marginBottom: '0', fontSize: '14px' }}>Please check your order ID.</p>
                </div>
            </div>
        );
    }

    const statusInfo = getStatusColor(order.status);

    return (
        <>
            <style>{`
                body {
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow-x: hidden;
                }
                html {
                    margin: 0 !important;
                    padding: 0 !important;
                }
            `}</style>
            <div style={{
                minHeight: '100vh',
                backgroundImage: 'url(/images/bg_4.jpg)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                padding: '15px',
                margin: 0,
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
            }}>
                <div style={{
                    maxWidth: '500px',
                    margin: '0 auto'
                }}>
                    <div style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        overflow: 'hidden',
                        backdropFilter: 'blur(10px)'
                    }}>
                        {/* Header */}
                        <div style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.9)',
                            color: 'white',
                            padding: '12px',
                            textAlign: 'center',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
                        }}>
                            <h2 style={{ margin: 0, fontSize: '16px' }}>📦 Order Information</h2>
                        </div>

                        {/* Content */}
                        <div style={{ padding: '15px' }}>
                            {/* Status Badge */}
                            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                                <span style={{
                                    backgroundColor: statusInfo.color,
                                    color: 'white',
                                    padding: '4px 12px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                }}>
                                    {statusInfo.text}
                                </span>
                            </div>

                            {/* Table */}
                            <div style={{
                                border: '1px solid #333',
                                borderRadius: '6px',
                                overflow: 'hidden'
                            }}>
                                <table style={{
                                    width: '100%',
                                    borderCollapse: 'collapse',
                                    fontSize: '12px',
                                    backgroundColor: 'rgba(0, 0, 0, 0.7)'
                                }}>
                                    <thead style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
                                        <tr>
                                            <th style={{
                                                padding: '8px',
                                                textAlign: 'left',
                                                borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                                                fontWeight: 'bold',
                                                color: 'white',
                                                width: '35%',
                                                fontSize: '11px'
                                            }}>
                                                Information
                                            </th>
                                            <th style={{
                                                padding: '8px',
                                                textAlign: 'left',
                                                borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                                                fontWeight: 'bold',
                                                color: 'white',
                                                fontSize: '11px'
                                            }}>
                                                Details
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', fontWeight: 'bold', color: '#e0e0e0', fontSize: '11px' }}>
                                                Order ID
                                            </td>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', fontSize: '11px' }}>
                                                #{order.orderId}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', fontWeight: 'bold', color: '#e0e0e0', fontSize: '11px' }}>
                                                Customer Name
                                            </td>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', fontSize: '11px' }}>
                                                {order.customerName}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', fontWeight: 'bold', color: '#e0e0e0', fontSize: '11px' }}>
                                                Phone Number
                                            </td>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', fontSize: '11px' }}>
                                                {order.phone}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', fontWeight: 'bold', color: '#e0e0e0', fontSize: '11px' }}>
                                                Order Date
                                            </td>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', fontSize: '11px' }}>
                                                {formatDate(order.orderDate)}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', fontWeight: 'bold', color: '#e0e0e0', fontSize: '11px' }}>
                                                Order Time
                                            </td>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', fontSize: '11px' }}>
                                                {formatTime(order.orderDate)}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', fontWeight: 'bold', color: '#e0e0e0', fontSize: '11px' }}>
                                                Total Amount
                                            </td>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', fontSize: '11px' }}>
                                                ${order.totalAmount}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', fontWeight: 'bold', color: '#e0e0e0', fontSize: '11px' }}>
                                                Status
                                            </td>
                                            <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)' }}>
                                                <span style={{
                                                    backgroundColor: statusInfo.color,
                                                    color: 'white',
                                                    padding: '2px 8px',
                                                    borderRadius: '8px',
                                                    fontSize: '10px'
                                                }}>
                                                    {statusInfo.text}
                                                </span>
                                            </td>
                                        </tr>
                                        {order.deliveryAddress && (
                                            <tr>
                                                <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', fontWeight: 'bold', color: '#e0e0e0', fontSize: '11px' }}>
                                                    Delivery Address
                                                </td>
                                                <td style={{ padding: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)', color: 'white', fontSize: '11px' }}>
                                                    {order.deliveryAddress}
                                                </td>
                                            </tr>
                                        )}
                                        {order.paymentMethod && (
                                            <tr>
                                                <td style={{ padding: '8px', fontWeight: 'bold', color: '#e0e0e0', fontSize: '11px' }}>
                                                    Payment Method
                                                </td>
                                                <td style={{ padding: '8px', color: 'white', fontSize: '11px' }}>
                                                    {order.paymentMethod}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Status Message */}
                            <div style={{ marginTop: '15px' }}>
                                {order.status?.toUpperCase() === 'PENDING' && (
                                    <div style={{
                                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        color: '#ffa726',
                                        padding: '10px',
                                        borderRadius: '4px',
                                        textAlign: 'center',
                                        fontSize: '11px'
                                    }}>
                                        <strong>⏰ Order is pending</strong><br />
                                        <span style={{ color: '#e0e0e0' }}>We are processing your order.</span>
                                    </div>
                                )}
                                {order.status?.toUpperCase() === 'CONFIRMED' && (
                                    <div style={{
                                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        color: '#4caf50',
                                        padding: '10px',
                                        borderRadius: '4px',
                                        textAlign: 'center',
                                        fontSize: '11px'
                                    }}>
                                        <strong>✅ Order confirmed</strong><br />
                                        <span style={{ color: '#e0e0e0' }}>Your order has been confirmed.</span>
                                    </div>
                                )}
                                {order.status?.toUpperCase() === 'PREPARING' && (
                                    <div style={{
                                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        color: '#3498db',
                                        padding: '10px',
                                        borderRadius: '4px',
                                        textAlign: 'center',
                                        fontSize: '11px'
                                    }}>
                                        <strong>👨‍🍳 Order is being prepared</strong><br />
                                        <span style={{ color: '#e0e0e0' }}>Our chefs are preparing your order.</span>
                                    </div>
                                )}
                                {order.status?.toUpperCase() === 'READY' && (
                                    <div style={{
                                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        color: '#9b59b6',
                                        padding: '10px',
                                        borderRadius: '4px',
                                        textAlign: 'center',
                                        fontSize: '11px'
                                    }}>
                                        <strong>🍽️ Order is ready</strong><br />
                                        <span style={{ color: '#e0e0e0' }}>Your order is ready for pickup/delivery.</span>
                                    </div>
                                )}
                                {order.status?.toUpperCase() === 'DELIVERED' && (
                                    <div style={{
                                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        color: '#2ecc71',
                                        padding: '10px',
                                        borderRadius: '4px',
                                        textAlign: 'center',
                                        fontSize: '11px'
                                    }}>
                                        <strong>🚚 Order delivered</strong><br />
                                        <span style={{ color: '#e0e0e0' }}>Your order has been delivered. Enjoy your meal!</span>
                                    </div>
                                )}
                                {order.status?.toUpperCase() === 'CANCELLED' && (
                                    <div style={{
                                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        color: '#f44336',
                                        padding: '10px',
                                        borderRadius: '4px',
                                        textAlign: 'center',
                                        fontSize: '11px'
                                    }}>
                                        <strong>❌ Order cancelled</strong><br />
                                        <span style={{ color: '#e0e0e0' }}>This order has been cancelled.</span>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div style={{ textAlign: 'center', marginTop: '15px' }}>
                                <button
                                    onClick={fetchOrder}
                                    style={{
                                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                        color: 'white',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        padding: '6px 12px',
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                        fontSize: '11px',
                                        marginRight: '10px'
                                    }}
                                >
                                    🔄 Refresh
                                </button>

                                {order.status?.toUpperCase() === 'PENDING' && (
                                    <button
                                        onClick={handleCancelOrder}
                                        disabled={cancelling}
                                        style={{
                                            backgroundColor: cancelling ? 'rgba(0, 0, 0, 0.5)' : 'rgba(220, 53, 69, 0.8)',
                                            color: 'white',
                                            border: '1px solid rgba(255, 255, 255, 0.2)',
                                            padding: '6px 12px',
                                            borderRadius: '3px',
                                            cursor: cancelling ? 'not-allowed' : 'pointer',
                                            fontSize: '11px',
                                            opacity: cancelling ? 0.6 : 1
                                        }}
                                    >
                                        {cancelling ? '⏳ Cancelling...' : '❌ Cancel Order'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SimpleTrackOrder;
