import React, { useState, useEffect } from 'react';
import { reservationService } from '../../services/reservationService';

const BookTableForm = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        date: '',
        time: '',
        phone: '',
        partySize: 1,
        branchId: '',
        message: ''
    });
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);

    // Derived constraints for pickers
    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const maxDateStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const getMinTimeForSelectedDate = () => {
        if (!formData.date) return undefined;
        const selected = new Date(formData.date + 'T00:00:00');
        const today = new Date();
        // If selected is today, min time is now + 1 hour
        if (
            selected.getFullYear() === today.getFullYear() &&
            selected.getMonth() === today.getMonth() &&
            selected.getDate() === today.getDate()
        ) {
            const plus1h = new Date(today.getTime() + 60 * 60 * 1000);
            const hh = String(plus1h.getHours()).padStart(2, '0');
            const mm = String(plus1h.getMinutes()).padStart(2, '0');
            return `${hh}:${mm}`;
        }
        return undefined;
    };

    // Check authentication status and load branches on component mount
    useEffect(() => {
        const checkAuthStatus = () => {
            const token = localStorage.getItem('token');
            const userData = localStorage.getItem('user');

            if (token && userData) {
                setIsAuthenticated(true);
                setUser(JSON.parse(userData));
            } else {
                setIsAuthenticated(false);
                setUser(null);
            }
        };

        const loadBranches = async () => {
            try {
                const response = await reservationService.getBranches();
                setBranches(response.result || []);
            } catch (err) {
                setError('Unable to load branches. Please try again later.');
            }
        };

        checkAuthStatus();
        loadBranches();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear messages when user types
        if (error) setError('');
        if (success) setSuccess('');
    };

    const handlePartySizeChange = (increment) => {
        setFormData(prev => ({
            ...prev,
            partySize: Math.max(1, Math.min(10, prev.partySize + increment))
        }));
    };

    const validateFields = () => {
        const firstName = (formData.firstName || '').trim();
        const date = (formData.date || '').trim();
        const time = (formData.time || '').trim();
        const phone = (formData.phone || '').trim();
        const branchId = (formData.branchId || '').toString().trim();

        const missing = [];

        // For authenticated users, only require date, time, and branch
        if (isAuthenticated) {
            if (!date) missing.push('Date');
            if (!time) missing.push('Time');
            if (!branchId) missing.push('Branch');
        } else {
            // For guest users, require all fields
            if (!firstName) missing.push('First Name');
            if (!date) missing.push('Date');
            if (!time) missing.push('Time');
            if (!phone) missing.push('Phone');
            if (!branchId) missing.push('Branch');
        }

        return { valid: missing.length === 0, missing, values: { firstName, date, time, phone, branchId } };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const check = validateFields();

        if (!check.valid) {
            setError(`Please fill all the Mandatory details !! Missing: ${check.missing.join(', ')}`);
            return;
        }

        try {
            setLoading(true);
            setError('');
            setSuccess('');

            // Build request payload based on authentication status
            const branchId = parseInt(check.values.branchId, 10);

            // Normalize time (native input provides HH:mm)
            let timeInput = check.values.time;
            let normalizedTime = timeInput;
            if (/^\d{1,2}:\d{2}$/.test(timeInput)) {
                const [h, m] = timeInput.split(':');
                normalizedTime = `${h.padStart(2, '0')}:${m}:00`;
            }

            // Date is already YYYY-MM-DD from native input
            const reservedAt = `${check.values.date}T${normalizedTime}`; // ISO-8601 for LocalDateTime

            let payload;
            if (isAuthenticated) {
                // For authenticated users, include customerId
                const userId = user?.userId || user?.user_id || user?.id;
                console.log('Extracted userId:', userId, 'Type:', typeof userId);

                payload = {
                    customerId: userId ? parseInt(userId, 10) : null,
                    branchId,
                    reservedAt,
                    partySize: formData.partySize,
                    notes: formData.message
                };
            } else {
                // For guest users, include customer info
                const customerName = `${check.values.firstName} ${formData.lastName || ''}`.trim();
                payload = {
                    customerName,
                    phone: check.values.phone,
                    branchId,
                    reservedAt,
                    partySize: formData.partySize,
                    notes: formData.message
                };
            }

            // Debug log for authenticated users
            if (isAuthenticated) {
                console.log('Authenticated user payload:', payload);
                console.log('User data:', user);
                console.log('User ID from localStorage:', user?.userId);
                console.log('User ID type:', typeof user?.userId);
                console.log('Raw user data from localStorage:', localStorage.getItem('user'));
            }

            const resp = await reservationService.createReservation(payload);

            if ((resp && resp.code === 200) || (resp && resp.code === 201)) {
                setSuccess(resp.message || 'Table booking request submitted successfully!');
            } else if (resp && resp.message) {
                // API returned non-200 code but has message
                setError(resp.message);
            } else {
                setSuccess('Table booking request submitted successfully!');
            }

            // Reset form
            setFormData({
                firstName: '',
                lastName: '',
                date: '',
                time: '',
                phone: '',
                partySize: 1,
                branchId: '',
                message: ''
            });
        } catch (err) {
            const apiMsg = err?.response?.data?.message;
            setError(apiMsg || 'Failed to submit booking. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const minTime = getMinTimeForSelectedDate();

    return (
        <div className="book p-4" style={{ color: 'white' }}>
            <h3 style={{ color: 'white', fontSize: '1.5rem' }}>Book a Table</h3>

            {/* Error Message */}
            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            {/* Success Message */}
            {success && (
                <div className="alert alert-success" role="alert">
                    {success}
                </div>
            )}

            <form onSubmit={handleSubmit} className="appointment-form">
                {/* Show user info if authenticated */}
                {isAuthenticated && user && (
                    <div className="mb-3">
                        <p style={{ color: 'white', fontSize: '0.9rem' }}>
                            Booking as: <strong>{user.username}</strong> ({user.email})
                        </p>
                    </div>
                )}

                {/* Name fields - only show for guest users */}
                {!isAuthenticated && (
                    <div className="d-md-flex">
                        <div className="form-group">
                            <input
                                type="text"
                                name="firstName"
                                value={formData.firstName}
                                onChange={handleInputChange}
                                className="form-control"
                                placeholder="First Name*"
                                style={{ color: 'white', fontSize: '1rem' }}
                            />
                        </div>
                        <div className="form-group ml-md-4">
                            <input
                                type="text"
                                name="lastName"
                                value={formData.lastName}
                                onChange={handleInputChange}
                                className="form-control"
                                placeholder="Last Name"
                                style={{ color: 'white', fontSize: '1rem' }}
                            />
                        </div>
                    </div>
                )}
                <div className="d-md-flex">
                    <div className="form-group">
                        <div className="input-wrap">
                            <input
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleInputChange}
                                className="form-control"
                                placeholder="Date* (YYYY-MM-DD)"
                                style={{ color: 'white', fontSize: '1rem' }}
                                min={todayStr}
                                max={maxDateStr}
                            />
                        </div>
                    </div>
                    <div className="form-group ml-md-4">
                        <div className="input-wrap">
                            <input
                                type="time"
                                name="time"
                                value={formData.time}
                                onChange={handleInputChange}
                                className="form-control"
                                placeholder="Time* (HH:mm)"
                                style={{ color: 'white', fontSize: '1rem' }}
                                step="60"
                                min={minTime}
                            />
                        </div>
                    </div>
                    {/* Phone field - only show for guest users */}
                    {!isAuthenticated && (
                        <div className="form-group ml-md-4">
                            <input
                                type="text"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                className="form-control"
                                placeholder="Phone*"
                                style={{ color: 'white', fontSize: '1rem' }}
                            />
                        </div>
                    )}
                </div>
                <div className="d-md-flex">
                    <div className="form-group d-flex align-items-center">
                        <span className="me-2" style={{ color: 'white', fontSize: '1rem' }}>Party Size*</span>
                        <button
                            type="button"
                            className="btn btn-outline-secondary me-1"
                            onClick={() => handlePartySizeChange(-1)}
                            disabled={formData.partySize <= 1}
                            style={{
                                padding: '1px 2px',
                                fontSize: '0.7rem',
                                minWidth: '16px',
                                width: '16px',
                                height: '24px'
                            }}
                        >
                            -
                        </button>
                        <input
                            type="text"
                            className="form-control text-center me-1"
                            value={`${formData.partySize}`}
                            readOnly
                            style={{
                                color: 'white',
                                fontSize: '1rem',
                                padding: '2px 4px',
                                minWidth: '40px',
                                width: '50px'
                            }}
                        />
                        <button
                            type="button"
                            className="btn btn-outline-secondary"
                            onClick={() => handlePartySizeChange(1)}
                            disabled={formData.partySize >= 10}
                            style={{
                                padding: '1px 2px',
                                fontSize: '0.7rem',
                                minWidth: '16px',
                                width: '16px',
                                height: '24px'
                            }}
                        >
                            +
                        </button>
                    </div>
                </div>
                <div className="d-md-flex">
                    <div className="form-group">
                        <select
                            name="branchId"
                            value={formData.branchId}
                            onChange={handleInputChange}
                            className="form-control"
                            style={{
                                color: 'white',
                                fontSize: '1rem',
                                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                border: '1px solid rgba(255, 255, 255, 0.3)',
                                borderRadius: '4px',
                                padding: '8px 12px'
                            }}
                            required
                        >
                            <option value="" style={{ backgroundColor: '#333', color: 'white' }}>Select Branch*</option>
                            {branches.length > 0 ? (
                                branches.map(branch => (
                                    <option
                                        key={branch.branchId}
                                        value={branch.branchId}
                                        style={{ backgroundColor: '#333', color: 'white' }}
                                    >
                                        {branch.name} - {branch.address}
                                    </option>
                                ))
                            ) : (
                                <option value="" disabled style={{ backgroundColor: '#333', color: 'white' }}>Loading branches...</option>
                            )}
                        </select>
                    </div>
                </div>
                <div className="d-md-flex">
                    <div className="form-group">
                        <textarea
                            name="message"
                            value={formData.message}
                            onChange={handleInputChange}
                            cols="30"
                            rows="2"
                            className="form-control"
                            placeholder="Message"
                            style={{ color: 'white', fontSize: '1rem' }}
                        ></textarea>
                    </div>
                    <div className="form-group ml-md-4">
                        <button type="submit" className="btn btn-white py-3 px-4" style={{ fontSize: '1rem' }} disabled={loading}>
                            {loading ? 'Booking...' : 'Book a Table'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default BookTableForm;
