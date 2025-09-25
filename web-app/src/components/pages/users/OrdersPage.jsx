import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable from './DataTable';

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

            // Mock data - in real app, you would fetch from API
            const mockOrders = [
                {
                    id: 1,
                    firstName: 'John',
                    lastName: 'Doe',
                    streetAddress: '123 Main St',
                    country: 'USA',
                    town: 'New York',
                    zipCode: '10001',
                    phone: '+1-555-0123',
                    email: 'john.doe@email.com',
                    status: 'Delivered',
                    totalPrice: 25.99
                },
                {
                    id: 2,
                    firstName: 'Jane',
                    lastName: 'Smith',
                    streetAddress: '456 Oak Ave',
                    country: 'USA',
                    town: 'Los Angeles',
                    zipCode: '90210',
                    phone: '+1-555-0456',
                    email: 'jane.smith@email.com',
                    status: 'Processing',
                    totalPrice: 18.50
                },
                {
                    id: 3,
                    firstName: 'Bob',
                    lastName: 'Johnson',
                    streetAddress: '789 Pine Rd',
                    country: 'USA',
                    town: 'Chicago',
                    zipCode: '60601',
                    phone: '+1-555-0789',
                    email: 'bob.johnson@email.com',
                    status: 'Cancelled',
                    totalPrice: 32.75
                }
            ];

            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            setOrders(mockOrders);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        {
            header: 'First Name',
            key: 'firstName'
        },
        {
            header: 'Last Name',
            key: 'lastName'
        },
        {
            header: 'Address',
            key: 'address',
            render: (order) => `${order.streetAddress}, ${order.country}, ${order.town}`
        },
        {
            header: 'Zip Code',
            key: 'zipCode'
        },
        {
            header: 'Phone',
            key: 'phone'
        },
        {
            header: 'Email',
            key: 'email'
        },
        {
            header: 'Status',
            key: 'status',
            render: (order) => (
                <span className={`badge ${order.status === 'Delivered' ? 'badge-success' :
                    order.status === 'Processing' ? 'badge-warning' :
                        order.status === 'Cancelled' ? 'badge-danger' :
                            'badge-secondary'
                    }`}>
                    {order.status}
                </span>
            )
        },
        {
            header: 'Total Price',
            key: 'totalPrice',
            render: (order) => `$${order.totalPrice.toFixed(2)}`
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
            <section className="ftco-section ftco-cart">
                <div className="container">
                    <div className="row">
                        <div className="col-md-12 ftco-animate">
                            <div className="card">
                                <div className="card-header">
                                    <h3 className="card-title">Order History</h3>
                                </div>
                                <div className="card-body">
                                    <DataTable
                                        title="Orders"
                                        columns={columns}
                                        data={orders}
                                        emptyMessage="You don't have any Orders!"
                                        loading={loading}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default OrdersPage;
