import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { authService } from '../../../services/authService';

const LoginPage = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear error when user starts typing
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Validate form
            if (!formData.email || !formData.password) {
                setError('Please fill in all fields');
                return;
            }

            // Call real API
            const response = await authService.login(formData.email, formData.password);

            // Decode JWT token to get user ID
            const token = response.result.token;
            const tokenPayload = JSON.parse(atob(token.split('.')[1]));
            const userId = tokenPayload.user_id;

            // Create user data object
            const userData = {
                email: formData.email,
                username: formData.email.split('@')[0],
                userId: userId
            };

            // Use AuthContext login method
            login(token, userData);

            // Redirect to home page
            navigate('/coffee');

        } catch (err) {
            setError('Login failed. Please check your credentials.');
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
                                <h1 className="mb-3 mt-5 bread">Login</h1>
                                <p className="breadcrumbs">
                                    <span className="mr-2"><Link to="/coffee">Home</Link></span>
                                    <span>Login</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Login Form Section */}
            <section className="ftco-section">
                <div className="container">
                    <div className="row">
                        <div className="col-md-12 ftco-animate">
                            <form onSubmit={handleSubmit} className="billing-form ftco-bg-dark p-3 p-md-5">
                                <h3 className="mb-4 billing-heading">Login</h3>

                                {error && (
                                    <div className="alert alert-danger" role="alert">
                                        {error}
                                    </div>
                                )}

                                <div className="row align-items-end">
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
                                            <label htmlFor="password">Password</label>
                                            <input
                                                name="password"
                                                id="password"
                                                type="password"
                                                className="form-control"
                                                placeholder="Password"
                                                value={formData.password}
                                                onChange={handleInputChange}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="col-md-12">
                                        <Link to="/auth/forgot-password">Forgot Password |</Link>
                                        <Link to="/auth/register"> Don't have an Account</Link>
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
                                                    {loading ? 'Logging in...' : 'Login'}
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

export default LoginPage;
