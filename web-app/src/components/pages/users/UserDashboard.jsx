import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const UserDashboard = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // Check if user is authenticated
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token || !userData) {
            // Redirect to login if not authenticated
            navigate('/auth/login');
            return;
        }

        try {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
        } catch (error) {
            console.error('Error parsing user data:', error);
            // Clear invalid data and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/auth/login');
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/auth/login');
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
                <div className="spinner-border" role="status">
                    <span className="sr-only">Loading...</span>
                </div>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect to login
    }

    return (
        <>
            {/* Hero Section */}
            <section className="home-slider owl-carousel">
                <div className="slider-item" style={{ backgroundImage: 'url(/images/bg_1.jpg)' }} data-stellar-background-ratio="0.5">
                    <div className="overlay"></div>
                    <div className="container">
                        <div className="row slider-text justify-content-center align-items-center">
                            <div className="col-md-7 col-sm-12 text-center ftco-animate">
                                <h1 className="mb-3 mt-5 bread">User Dashboard</h1>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Dashboard Content */}
            <section className="ftco-section">
                <div className="container">
                    <div className="row">
                        <div className="col-md-12 ftco-animate">
                            <div className="card">
                                <div className="card-body">
                                    <h2 className="card-title mb-4">Welcome, {user.username || user.email}!</h2>

                                    <div className="row">
                                        <div className="col-md-6 mb-4">
                                            <div className="card h-100">
                                                <div className="card-body text-center">
                                                    <i className="icon-calendar" style={{ fontSize: '3rem', color: '#007bff' }}></i>
                                                    <h5 className="card-title mt-3">My Bookings</h5>
                                                    <p className="card-text">View and manage your table bookings</p>
                                                    <Link to="/users/bookings" className="btn btn-primary">
                                                        View Bookings
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-md-6 mb-4">
                                            <div className="card h-100">
                                                <div className="card-body text-center">
                                                    <i className="icon-shopping_cart" style={{ fontSize: '3rem', color: '#28a745' }}></i>
                                                    <h5 className="card-title mt-3">My Orders</h5>
                                                    <p className="card-text">View your order history and status</p>
                                                    <Link to="/users/orders" className="btn btn-success">
                                                        View Orders
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="row mt-4">
                                        <div className="col-md-12">
                                            <div className="card">
                                                <div className="card-body">
                                                    <h5 className="card-title">Quick Actions</h5>
                                                    <div className="d-flex flex-wrap gap-2">
                                                        <Link to="/coffee/menu" className="btn btn-outline-primary">
                                                            Browse Menu
                                                        </Link>
                                                        <Link to="/coffee/contact" className="btn btn-outline-secondary">
                                                            Contact Us
                                                        </Link>
                                                        <button onClick={handleLogout} className="btn btn-outline-danger">
                                                            Logout
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="row mt-4">
                                        <div className="col-md-12">
                                            <div className="card">
                                                <div className="card-body">
                                                    <h5 className="card-title">Account Information</h5>
                                                    <div className="row">
                                                        <div className="col-md-6">
                                                            <p><strong>Username:</strong> {user.username || 'N/A'}</p>
                                                            <p><strong>Email:</strong> {user.email || 'N/A'}</p>
                                                        </div>
                                                        <div className="col-md-6">
                                                            <p><strong>Member Since:</strong> {new Date().toLocaleDateString()}</p>
                                                            <p><strong>Status:</strong> <span className="badge badge-success">Active</span></p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default UserDashboard;
