import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { authService } from '../../../services/authService';
import { showToast } from '../../../utils/toast';

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

            // Lưu token vào localStorage TRƯỚC khi gọi getMe()
            // để httpClient interceptor có thể đọc được token
            localStorage.setItem('token', token);
            
            // Đảm bảo token đã được lưu (localStorage là sync nhưng đợi một chút để chắc chắn)
            // Và đảm bảo httpClient instance đã được khởi tạo với token mới
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Verify token đã được lưu
            const savedToken = localStorage.getItem('token');
            if (!savedToken || savedToken !== token) {
                throw new Error('Không thể lưu token. Vui lòng thử lại.');
            }
            
            console.log('[LoginPage] Token saved, calling getMe()...');

            // Get user profile information to get fullname
            let fullname = formData.email.split('@')[0]; // fallback to username
            try {
                const userResponse = await authService.getMe();
                console.log('userResponse', userResponse);
                if (userResponse.result && userResponse.result.fullname) {
                    fullname = userResponse.result.fullname;
                    console.log('fullname', fullname);
                }
            } catch (profileErr) {
                // Nếu getMe() trả về 401, coi như login không thành công
                if (profileErr.response?.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    throw new Error('Đăng nhập không thành công. Vui lòng thử lại.');
                }
                console.log('Could not fetch user profile, using email username as fallback');
                // Don't show error or return, just use fallback
            }

            // Create user data object
            const userData = {
                email: formData.email,
                username: fullname, // Use fullname instead of email username
                userId: userId
            };

            // Lưu token và user vào localStorage TRƯỚC khi gọi login()
            // để đảm bảo token có sẵn khi các component khác render
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));

            // Use AuthContext login method (cập nhật state)
            login(token, userData);

            // Đợi để đảm bảo:
            // 1. localStorage đã được cập nhật (đồng bộ, không cần đợi)
            // 2. AuthContext state đã được update (React state update)
            // 3. Các component đã được re-render với token mới
            // Production có thể chậm hơn, nên đợi lâu hơn một chút
            await new Promise(resolve => setTimeout(resolve, 300));

            // Kiểm tra lại token có còn hợp lệ không (có thể bị xóa bởi interceptor nếu 401)
            const tokenStillValid = localStorage.getItem('token');
            if (!tokenStillValid || tokenStillValid !== token) {
              // Token đã bị xóa - có thể do API trả về 401
              throw new Error('Đăng nhập không thành công. Token không hợp lệ.');
            }

            // Redirect to home page
            navigate('/coffee');

        } catch (err) {
            // Extract error message from backend response
            let errorMessage = 'Login failed. Please check your credentials.';
            
            if (err.response) {
                // Backend returned an error response
                const errorData = err.response.data;
                errorMessage = errorData?.message 
                    || errorData?.result?.message 
                    || errorData?.error 
                    || errorMessage;
            } else if (err.message) {
                // Network error or other error
                errorMessage = err.message;
            }
            
            setError(errorMessage);
            console.error('Login error:', err);
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
