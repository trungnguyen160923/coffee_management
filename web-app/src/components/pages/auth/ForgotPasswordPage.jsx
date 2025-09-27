import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const ForgotPasswordPage = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear messages when user starts typing
        if (error) setError('');
        if (success) setSuccess('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            // Validate form
            if (!formData.username || !formData.email || !formData.newPassword || !formData.confirmPassword) {
                setError('Please fill in all fields');
                return;
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                setError('Please enter a valid email address');
                return;
            }

            // Password validation (minimum 6 characters)
            if (formData.newPassword.length < 6) {
                setError('Password must be at least 6 characters long');
                return;
            }

            // Confirm password validation
            if (formData.newPassword !== formData.confirmPassword) {
                setError('Password and Confirm Password must be the same');
                return;
            }

            // Here you would typically make an API call to your backend
            console.log('Forgot password data:', formData);

            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            setSuccess('Password reset successfully! You can now login with your new password.');

            // Clear form
            setFormData({
                username: '',
                email: '',
                newPassword: '',
                confirmPassword: ''
            });

            // Redirect to login page after 2 seconds
            setTimeout(() => {
                navigate('/auth/login');
            }, 2000);

        } catch (err) {
            setError('Password reset failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Hero Section */}
            <section className="home-slider owl-carousel">
                <div className="slider-item" style={{ backgroundImage: 'url(/images/bg_1.jpg)' }} data-stellar-background-ratio="0.5">
                    <div className="overlay"></div>
                    <div className="container">
                        <div className="row slider-text justify-content-center align-items-center">
                            <div className="col-md-7 col-sm-12 text-center ftco-animate">
                                <h1 className="mb-3 mt-5 bread">Forgot Password</h1>
                                <p className="breadcrumbs">
                                    <span className="mr-2"><Link to="/coffee">Home</Link></span>
                                    <span>Forgot Password</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Forgot Password Form Section */}
            <section className="ftco-section">
                <div className="container">
                    <div className="row">
                        <div className="col-md-12 ftco-animate">
                            <form onSubmit={handleSubmit} className="billing-form ftco-bg-dark p-3 p-md-5">
                                <h3 className="mb-4 billing-heading">Forgot Password</h3>

                                {error && (
                                    <div className="alert alert-danger" role="alert">
                                        {error}
                                    </div>
                                )}

                                {success && (
                                    <div className="alert alert-success" role="alert">
                                        {success}
                                    </div>
                                )}

                                <div className="row align-items-end">
                                    <div className="col-md-12">
                                        <div className="form-group">
                                            <label htmlFor="username">Username</label>
                                            <input
                                                name="username"
                                                id="username"
                                                type="text"
                                                className="form-control"
                                                placeholder="Username"
                                                value={formData.username}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-12">
                                        <div className="form-group">
                                            <label htmlFor="email">Email</label>
                                            <input
                                                name="email"
                                                id="email"
                                                type="email"
                                                className="form-control"
                                                placeholder="Email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-12">
                                        <div className="form-group">
                                            <label htmlFor="newPassword">New Password</label>
                                            <input
                                                name="newPassword"
                                                id="newPassword"
                                                type="password"
                                                className="form-control"
                                                placeholder="New Password"
                                                value={formData.newPassword}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-12">
                                        <div className="form-group">
                                            <label htmlFor="confirmPassword">Confirm Password</label>
                                            <input
                                                name="confirmPassword"
                                                id="confirmPassword"
                                                type="password"
                                                className="form-control"
                                                placeholder="Confirm Password"
                                                value={formData.confirmPassword}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-12">
                                        <div className="form-group mt-4">
                                            <div className="radio">
                                                <button
                                                    name="submit"
                                                    className="btn btn-primary py-3 px-4"
                                                    type="submit"
                                                    disabled={loading}
                                                >
                                                    {loading ? 'Processing...' : 'Submit'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default ForgotPasswordPage;
