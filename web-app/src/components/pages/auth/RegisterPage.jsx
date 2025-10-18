import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../../services/authService';
import { showToast } from '../../../utils/toast';

const RegisterPage = () => {
    const [formData, setFormData] = useState({
        fullname: '',
        email: '',
        password: '',
        phoneNumber: '',
        dob: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({
        fullname: '',
        email: '',
        password: '',
        phoneNumber: '',
        dob: ''
    });
    const navigate = useNavigate();

    // Initialize datepicker when component mounts
    useEffect(() => {
        // Check if jQuery and datepicker are available
        if (typeof window !== 'undefined' && window.$ && window.$.fn.datepicker) {
            // Initialize datepicker for the dob field
            window.$('#dob').datepicker({
                format: 'yyyy-mm-dd',
                autoclose: true,
                todayHighlight: true,
                endDate: new Date(), // Prevent future dates
                orientation: 'bottom auto'
            }).on('changeDate', function(e) {
                // Update form data when date is selected
                const selectedDate = e.format('yyyy-mm-dd');
                setFormData(prev => ({
                    ...prev,
                    dob: selectedDate
                }));
                // Trigger validation for DOB field
                handleFieldBlur('dob', selectedDate);
            });
        }
    }, []);

    // Validation functions
    const validateFullname = (value) => {
        if (!value.trim()) {
            return 'Full name is required';
        }
        return '';
    };

    const validateEmail = (value) => {
        if (!value.trim()) {
            return 'Email is required';
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            return 'Please enter a valid email address';
        }
        return '';
    };

    const validatePassword = (value) => {
        if (!value) {
            return 'Password is required';
        }
        if (value.length < 6) {
            return 'Password must be at least 6 characters long';
        }
        return '';
    };

    const validatePhoneNumber = (value) => {
        if (!value.trim()) {
            return 'Phone number is required';
        }
        const phoneRegex = /^[0-9]{10,11}$/;
        if (!phoneRegex.test(value)) {
            return 'Please enter a valid phone number (10-11 digits)';
        }
        return '';
    };

    const validateDob = (value) => {
        if (!value) {
            return 'Date of birth is required';
        }
        const today = new Date();
        const dob = new Date(value);
        if (dob >= today) {
            return 'Date of birth must be in the past';
        }
        return '';
    };

    // Handle field blur validation
    const handleFieldBlur = (fieldName, value) => {
        let errorMessage = '';
        
        switch (fieldName) {
            case 'fullname':
                errorMessage = validateFullname(value);
                break;
            case 'email':
                errorMessage = validateEmail(value);
                break;
            case 'password':
                errorMessage = validatePassword(value);
                break;
            case 'phoneNumber':
                errorMessage = validatePhoneNumber(value);
                break;
            case 'dob':
                errorMessage = validateDob(value);
                break;
            default:
                break;
        }

        setFieldErrors(prev => ({
            ...prev,
            [fieldName]: errorMessage
        }));
    };

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
            // Validate all fields
            const fullnameError = validateFullname(formData.fullname);
            const emailError = validateEmail(formData.email);
            const passwordError = validatePassword(formData.password);
            const phoneError = validatePhoneNumber(formData.phoneNumber);
            const dobError = validateDob(formData.dob);

            // Update field errors
            setFieldErrors({
                fullname: fullnameError,
                email: emailError,
                password: passwordError,
                phoneNumber: phoneError,
                dob: dobError
            });

            // Check if there are any validation errors
            if (fullnameError || emailError || passwordError || phoneError || dobError) {
                setError('Please fix the validation errors below');
                return;
            }

            // Make API call to create customer using authService
            const result = await authService.createCustomer({
                email: formData.email,
                password: formData.password,
                fullname: formData.fullname,
                phoneNumber: formData.phoneNumber,
                role: 'CUSTOMER',
                dob: formData.dob,
                avatarUrl: '',
                bio: ''
            });

            if (result.code === 1000) {
                // Show success toast
                showToast('Registration successful! Please login to continue.', 'success');
                
                // Redirect to login page
                navigate('/auth/login');
            } else {
                setError(result.message || 'Registration failed. Please try again.');
                showToast(result.message || 'Registration failed. Please try again.', 'error');
            }

        } catch (err) {
            console.log("error register", err);
            setError(err?.response?.data?.message || 'Registration failed. Please try again.');
            showToast(err?.response?.data?.message || 'Registration failed. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Hero Section */}
            <section className="home-slider owl-carousel">
                <div className="slider-item" style={{ backgroundImage: 'url(/images/bg_2.jpg)' }} data-stellar-background-ratio="0.5">
                    <div className="overlay"></div>
                    <div className="container">
                        <div className="row slider-text justify-content-center align-items-center">
                            <div className="col-md-7 col-sm-12 text-center ftco-animate">
                                <h1 className="mb-3 mt-5 bread">Register</h1>
                                <p className="breadcrumbs">
                                    <span className="mr-2"><Link to="/coffee">Home</Link></span>
                                    <span>Register</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Register Form Section */}
            <section className="ftco-section">
                <div className="container">
                    <div className="row">
                        <div className="col-md-12 ftco-animate">
                            <form onSubmit={handleSubmit} className="billing-form ftco-bg-dark p-3 p-md-5">
                                <h3 className="mb-4 billing-heading">Register</h3>

                                <div className="row align-items-end">
                                    <div className="col-md-12">
                                        <div className="form-group">
                                            <label htmlFor="fullname">Full Name</label>
                                            <input
                                                type="text"
                                                name="fullname"
                                                id="fullname"
                                                className={`form-control ${fieldErrors.fullname ? 'is-invalid' : ''}`}
                                                placeholder="Full Name"
                                                value={formData.fullname}
                                                onChange={handleInputChange}
                                                onBlur={(e) => handleFieldBlur('fullname', e.target.value)}
                                            />
                                            {fieldErrors.fullname && (
                                                <div className="invalid-feedback d-block">
                                                    {fieldErrors.fullname}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="col-md-12">
                                        <div className="form-group">
                                            <label htmlFor="email">Email</label>
                                            <input
                                                type="email"
                                                name="email"
                                                id="email"
                                                className={`form-control ${fieldErrors.email ? 'is-invalid' : ''}`}
                                                placeholder="Email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                onBlur={(e) => handleFieldBlur('email', e.target.value)}
                                            />
                                            {fieldErrors.email && (
                                                <div className="invalid-feedback d-block">
                                                    {fieldErrors.email}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="col-md-12">
                                        <div className="form-group">
                                            <label htmlFor="password">Password</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    name="password"
                                                    id="password"
                                                    className={`form-control ${fieldErrors.password ? 'is-invalid' : ''}`}
                                                    placeholder="Password"
                                                    value={formData.password}
                                                    onChange={handleInputChange}
                                                    onBlur={(e) => handleFieldBlur('password', e.target.value)}
                                                    style={{ paddingRight: '40px' }}
                                                />
                                                <span 
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    style={{ 
                                                        position: 'absolute',
                                                        right: '10px',
                                                        top: '50%',
                                                        transform: 'translateY(-50%)',
                                                        cursor: 'pointer',
                                                        color: '#6c757d',
                                                        zIndex: 10
                                                    }}
                                                >
                                                    {showPassword ? (
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                                                        </svg>
                                                    ) : (
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                                                        </svg>
                                                    )}
                                                </span>
                                            </div>
                                            {fieldErrors.password && (
                                                <div className="invalid-feedback d-block">
                                                    {fieldErrors.password}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="col-md-12">
                                        <div className="form-group">
                                            <label htmlFor="phoneNumber">Phone Number</label>
                                            <input
                                                type="tel"
                                                name="phoneNumber"
                                                id="phoneNumber"
                                                className={`form-control ${fieldErrors.phoneNumber ? 'is-invalid' : ''}`}
                                                placeholder="Phone Number"
                                                value={formData.phoneNumber}
                                                onChange={handleInputChange}
                                                onBlur={(e) => handleFieldBlur('phoneNumber', e.target.value)}
                                            />
                                            {fieldErrors.phoneNumber && (
                                                <div className="invalid-feedback d-block">
                                                    {fieldErrors.phoneNumber}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="col-md-12">
                                        <div className="form-group">
                                            <label htmlFor="dob">Date of Birth</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="text"
                                                    name="dob"
                                                    id="dob"
                                                    className={`form-control ${fieldErrors.dob ? 'is-invalid' : ''}`}
                                                    placeholder="Select Date of Birth"
                                                    value={formData.dob}
                                                    onChange={handleInputChange}
                                                    onBlur={(e) => handleFieldBlur('dob', e.target.value)}
                                                    readOnly
                                                    style={{ cursor: 'pointer' }}
                                                />
                                                <span 
                                                    style={{ 
                                                        position: 'absolute',
                                                        right: '10px',
                                                        top: '50%',
                                                        transform: 'translateY(-50%)',
                                                        cursor: 'pointer',
                                                        color: '#6c757d',
                                                        zIndex: 10,
                                                        pointerEvents: 'none'
                                                    }}
                                                >
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                                                    </svg>
                                                </span>
                                            </div>
                                            {fieldErrors.dob && (
                                                <div className="invalid-feedback d-block">
                                                    {fieldErrors.dob}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="col-md-12">
                                        <Link to="/auth/login">Already have an Account</Link>
                                    </div>
                                    
                                    {error && (
                                        <div className="col-md-12">
                                            <div className="alert alert-danger" role="alert">
                                                {error}
                                            </div>
                                        </div>
                                    )}
                                    
                                    <div className="col-md-12">
                                        <div className="form-group mt-4">
                                            <div className="radio">
                                                <button
                                                    className="btn btn-primary py-3 px-4"
                                                    name="submit"
                                                    type="submit"
                                                    disabled={loading}
                                                >
                                                    {loading ? 'Registering...' : 'Register'}
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

export default RegisterPage;
