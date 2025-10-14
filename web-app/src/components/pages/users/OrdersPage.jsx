import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderService } from '../../../services/orderService';
import { CONFIG } from '../../../configurations/configuration';

const OrdersPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // Check authentication
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/auth/login');
            return;
        }

        // Fetch orders data
        fetchOrders();
    }, [navigate]);

    const fetchOrders = async () => {
        try {
            setLoading(true);

            // Get user info from localStorage
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const customerId = user?.userId || user?.user_id || user?.id;

            if (!customerId) {
                console.error('Customer ID not found');
                setOrders([]);
                return;
            }

            // Fetch real data from API
            const response = await orderService.getOrdersByCustomer(customerId);

            if (response && response.result) {
                setOrders(response.result);
            } else {
                setOrders([]);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatTime = (dateTimeString) => {
        if (!dateTimeString) return 'N/A';
        const date = new Date(dateTimeString);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatPrice = (value) => {
        return new Intl.NumberFormat('vi-VN').format(Number(value || 0)) + ' VND';
    };

    const columns = [
        {
            header: 'Order ID',
            key: 'orderId'
        },
        {
            header: 'Customer Name',
            key: 'customerName'
        },
        {
            header: 'Phone',
            key: 'phone'
        },
        {
            header: 'Address',
            key: 'deliveryAddress',
            render: (order) => (
                <div style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {order.deliveryAddress || 'N/A'}
                </div>
            )
        },
        {
            header: 'Order Date',
            key: 'orderDate',
            render: (order) => formatDate(order.orderDate)
        },
        {
            header: 'Time',
            key: 'orderDate',
            render: (order) => formatTime(order.orderDate)
        },
        {
            header: 'Items',
            key: 'orderItems',
            render: (order) => order.orderItems?.length || 0
        },
        {
            header: 'Total Amount',
            key: 'totalAmount',
            render: (order) => formatPrice(order.totalAmount)
        },
        {
            header: 'Payment',
            key: 'paymentMethod'
        },
        {
            header: 'Status',
            key: 'status',
            render: (order) => (
                <span style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    backgroundColor: order.status === 'COMPLETED' ? '#28a745' :
                        order.status === 'PENDING' ? '#c49b63' :
                            order.status === 'CANCELLED' ? '#dc3545' :
                                order.status === 'PROCESSING' ? '#17a2b8' :
                                    '#6c757d',
                    color: '#fff'
                }}>
                    {order.status}
                </span>
            )
        }
    ];

    return (
        <>
            {/* Hero Section */}
            <section className="home-slider owl-carousel">
                <div className="slider-item" style={{ backgroundImage: 'url(/images/bg_1.jpg)' }} data-stellar-background-ratio="0.5">
                    <div className="overlay"></div>
                    <div className="container">
                        <div className="row slider-text justify-content-center align-items-center">
                            <div className="col-md-7 col-sm-12 text-center ftco-animate">
                                <h1 className="mb-3 mt-5 bread">My Orders</h1>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Orders Table Section */}
            <section className="ftco-section ftco-cart" style={{
                background: 'url(/images/bg_4.jpg) no-repeat fixed',
                backgroundSize: 'cover'
            }}>
                <div className="container">
                    <div className="row">
                        <div className="col-md-12 ftco-animate">
                            <div className="book p-4" style={{
                                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                                borderRadius: '10px',
                                color: 'white'
                            }}>
                                <h3 style={{ color: 'white', fontSize: '1.5rem', textAlign: 'center', marginBottom: '30px' }}>Order History</h3>

                                {loading ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: 'white' }}>
                                        <div className="spinner-border text-warning" role="status">
                                            <span className="sr-only">Loading...</span>
                                        </div>
                                        <p style={{ marginTop: '15px' }}>Loading orders...</p>
                                    </div>
                                ) : orders.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: 'white' }}>
                                        <p>You don't have any Orders!</p>
                                    </div>
                                ) : (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table className="table" style={{ margin: 0, backgroundColor: 'transparent' }}>
                                            <thead style={{ backgroundColor: '#c49b63' }}>
                                                <tr>
                                                    {columns.map((column, index) => (
                                                        <th key={index} style={{
                                                            color: 'white',
                                                            fontWeight: 'bold',
                                                            textAlign: 'center',
                                                            padding: '15px 10px',
                                                            border: 'none',
                                                            fontSize: '14px'
                                                        }}>
                                                            {column.header}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {orders.map((order, index) => (
                                                    <tr key={index} style={{ backgroundColor: 'transparent' }}>
                                                        {columns.map((column, colIndex) => (
                                                            <td key={colIndex} style={{
                                                                color: '#e0e0e0',
                                                                padding: '12px 10px',
                                                                border: 'none',
                                                                textAlign: column.key === 'orderId' || column.key === 'orderItems' ? 'center' : 'left',
                                                                fontSize: '13px'
                                                            }}>
                                                                {column.render ? column.render(order) : order[column.key]}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default OrdersPage;
