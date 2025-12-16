import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { authService } from '../../../services/authService';
import { showToast } from '../../../utils/toast';
import httpClient from '../../../configurations/httpClient';
import { API, CONFIG } from '../../../configurations/configuration';

const AccountSettingsPage = () => {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    // Profile edit states
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [profileForm, setProfileForm] = useState({
        fullname: user?.fullname || user?.username || '',
        email: user?.email || '',
        phoneNumber: user?.phoneNumber || '',
        dob: user?.dob || '',
        bio: user?.bio || '',
    });
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/auth/login');
            return;
        }

        fetchUserProfile();
    }, [navigate]);

    const fetchUserProfile = async () => {
        try {
            setLoading(true);
            const response = await authService.getMe();
            if (response.code === 1000 || response.code === 200) {
                const userData = response.result || response;
                setUserProfile(userData);
                setProfileForm({
                    fullname: userData.fullname || userData.username || '',
                    email: userData.email || '',
                    phoneNumber: userData.phoneNumber || '',
                    dob: userData.dob || '',
                    bio: userData.bio || '',
                });
            }
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
            showToast('Failed to load profile information', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (!oldPassword || !newPassword || !confirmPassword) {
            showToast('Please fill in all password fields', 'error');
            return;
        }

        if (newPassword !== confirmPassword) {
            showToast('New password and confirmation password do not match', 'error');
            return;
        }

        if (newPassword.length < 8) {
            showToast('New password must be at least 8 characters', 'error');
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await httpClient.post(`${CONFIG.API_GATEWAY}/auth-service/auth/change-password`, {
                oldPassword,
                newPassword
            });
            
            if (response.data.code === 1000 || response.data.code === 200) {
                showToast('Password changed successfully', 'success');
                setOldPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                showToast(response.data.message || 'Failed to change password', 'error');
            }
        } catch (error) {
            const message = error?.response?.data?.message || error?.message || 'Failed to change password, please try again';
            showToast(message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStartEditProfile = () => {
        setIsEditingProfile(true);
    };

    const handleCancelEditProfile = () => {
        setIsEditingProfile(false);
        setProfileForm({
            fullname: userProfile?.fullname || userProfile?.username || '',
            email: userProfile?.email || '',
            phoneNumber: userProfile?.phoneNumber || '',
            dob: userProfile?.dob || '',
            bio: userProfile?.bio || '',
        });
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();

        if (!profileForm.fullname || !profileForm.fullname.trim()) {
            showToast('Full name is required', 'error');
            return;
        }

        if (!profileForm.email || !profileForm.email.trim()) {
            showToast('Email is required', 'error');
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(profileForm.email)) {
            showToast('Please enter a valid email address', 'error');
            return;
        }

        if (!profileForm.phoneNumber || !profileForm.phoneNumber.trim()) {
            showToast('Phone number is required', 'error');
            return;
        }

        // Phone number validation (at least 10 digits)
        const phoneRegex = /^[0-9]{10,}$/;
        if (!phoneRegex.test(profileForm.phoneNumber)) {
            showToast('Phone number must be at least 10 digits', 'error');
            return;
        }

        try {
            setIsUpdatingProfile(true);
            
            // Update user info via auth-service (fullname, phoneNumber)
            await httpClient.put(
                `${CONFIG.API_GATEWAY}/auth-service/users/me`,
                {
                    fullname: profileForm.fullname.trim(),
                    phone_number: profileForm.phoneNumber.trim(),
                }
            );

            // Update customer profile info via profile-service (dob, bio)
            const profileData = {};
            if (profileForm.dob) profileData.dob = profileForm.dob;
            if (profileForm.bio !== undefined) profileData.bio = profileForm.bio.trim() || null;

            if (Object.keys(profileData).length > 0) {
                await httpClient.put(`${CONFIG.API_GATEWAY}/profiles/customer-profiles/me`, profileData);
            }

            // Refresh user data
            await fetchUserProfile();
            
            // Update localStorage
            const updatedUser = {
                ...user,
                fullname: profileForm.fullname.trim(),
                email: profileForm.email.trim(),
                phoneNumber: profileForm.phoneNumber.trim(),
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            login(localStorage.getItem('token'), updatedUser);
            
            setIsEditingProfile(false);
            showToast('Profile updated successfully', 'success');
        } catch (error) {
            const message = error?.response?.data?.message || error?.message || 'Failed to update profile, please try again';
            showToast(message, 'error');
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    if (loading) {
        return (
            <div className="container mt-5">
                <div className="row justify-content-center">
                    <div className="col-md-8">
                        <div className="text-center">
                            <div className="spinner-border" role="status">
                                <span className="sr-only">Loading...</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const displayUser = userProfile || user;

    return (
        <div className="container mt-5 mb-5" style={{ paddingTop: '6rem' }}>
            <div className="row justify-content-center">
                <div className="col-md-10 col-lg-8">
                    <div className="card shadow-sm" style={{ backgroundColor: '#151111', borderColor: '#2b2623' }}>
                        <div
                            className="card-header text-white"
                            style={{
                                backgroundColor: '#151111',
                                borderBottom: '1px solid #c49b63',
                            }}
                        >
                            <h4 className="mb-0" style={{ fontFamily: '"Poppins", sans-serif', letterSpacing: '0.03em' }}>
                                Account Information
                            </h4>
                            <p className="mb-0 small text-muted" style={{ color: '#c4b7a6' }}>
                                Manage your personal information and change password
                            </p>
                        </div>
                        <div className="card-body p-4" style={{ backgroundColor: '#1b1714', color: '#f8f5f0' }}>
                            {/* Personal Information Section */}
                            <div className="mb-4">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h5 className="mb-0" style={{ color: '#f8f5f0' }}>Personal Information</h5>
                                    {!isEditingProfile && (
                                        <button
                                            type="button"
                                            className="btn btn-sm"
                                            style={{
                                                borderColor: '#c49b63',
                                                color: '#c49b63',
                                                backgroundColor: 'transparent',
                                            }}
                                            onClick={handleStartEditProfile}
                                        >
                                            <i className="fa fa-edit"></i> Edit
                                        </button>
                                    )}
                                </div>

                                {isEditingProfile ? (
                                    <form onSubmit={handleUpdateProfile}>
                                        <div className="row">
                                            <div className="col-md-6 mb-3">
                                                <label className="form-label text-muted">
                                                    Full Name <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    className="form-control bg-dark text-light border"
                                                    value={profileForm.fullname}
                                                    onChange={(e) => setProfileForm({ ...profileForm, fullname: e.target.value })}
                                                    required
                                                />
                                            </div>

                                            <div className="col-md-6 mb-3">
                                                <label className="form-label text-muted">
                                                    Email <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="email"
                                                    className="form-control bg-dark text-light border"
                                                    value={profileForm.email}
                                                    readOnly
                                                    disabled
                                                />
                                                <small className="text-muted">
                                                    Email cannot be changed. Please contact support if you need to update it.
                                                </small>
                                            </div>

                                            <div className="col-md-6 mb-3">
                                                <label className="form-label text-muted">
                                                    Phone Number <span className="text-danger">*</span>
                                                </label>
                                                <input
                                                    type="tel"
                                                    className="form-control bg-dark text-light border"
                                                    value={profileForm.phoneNumber}
                                                    onChange={(e) => setProfileForm({ ...profileForm, phoneNumber: e.target.value })}
                                                    required
                                                />
                                            </div>

                                            <div className="col-md-6 mb-3">
                                                <label className="form-label text-muted">Date of Birth</label>
                                                <input
                                                    type="date"
                                                    className="form-control bg-dark text-light border"
                                                    value={profileForm.dob || ''}
                                                    onChange={(e) => setProfileForm({ ...profileForm, dob: e.target.value })}
                                                />
                                            </div>

                                            <div className="col-12 mb-3">
                                                <label className="form-label text-muted">Bio</label>
                                                <textarea
                                                    className="form-control bg-dark text-light border"
                                                    rows="3"
                                                    value={profileForm.bio || ''}
                                                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                                                    placeholder="Tell us about yourself..."
                                                />
                                            </div>
                                        </div>

                                        <div className="d-flex gap-2">
                                            <button
                                                type="submit"
                                                className="btn"
                                                style={{ backgroundColor: '#c49b63', borderColor: '#c49b63', color: '#151111' }}
                                                disabled={isUpdatingProfile}
                                            >
                                                {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
                                            </button>
                                            <button
                                                type="button"
                                                className="btn btn-outline-secondary"
                                                onClick={handleCancelEditProfile}
                                                disabled={isUpdatingProfile}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <label className="text-muted small">Full Name</label>
                                            <p className="mb-0">{displayUser?.fullname || displayUser?.username || 'Not set'}</p>
                                        </div>

                                        <div className="col-md-6 mb-3">
                                            <label className="text-muted small">Email</label>
                                            <p className="mb-0">{displayUser?.email || 'Not set'}</p>
                                        </div>

                                        <div className="col-md-6 mb-3">
                                            <label className="text-muted small">Phone Number</label>
                                            <p className="mb-0">{displayUser?.phoneNumber || 'Not set'}</p>
                                        </div>

                                        {displayUser?.dob && (
                                            <div className="col-md-6 mb-3">
                                                <label className="text-muted small">Date of Birth</label>
                                                <p className="mb-0">
                                                    {new Date(displayUser.dob).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                        )}

                                        {displayUser?.bio && (
                                            <div className="col-12 mb-3">
                                                <label className="text-muted small">Bio</label>
                                                <p className="mb-0">{displayUser.bio}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <hr />

                            {/* Change Password Section */}
                            <div>
                                <h5 className="mb-3" style={{ color: '#f8f5f0' }}>Change Password</h5>
                                <p className="text-muted small mb-3">
                                    For security, please use a strong password and do not share it with anyone.
                                </p>

                                <form onSubmit={handleChangePassword}>
                                    <div className="row">
                                        <div className="col-md-12 mb-3">
                                            <label className="form-label text-muted">Current Password</label>
                                            <div className="position-relative">
                                                <input
                                                    type={showOldPassword ? 'text' : 'password'}
                                                    className="form-control bg-dark text-light border"
                                                    value={oldPassword}
                                                    onChange={(e) => setOldPassword(e.target.value)}
                                                    placeholder="Enter current password"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    className="btn btn-link position-absolute text-muted"
                                                    style={{ right: '10px', top: '50%', transform: 'translateY(-50%)', padding: '0', minWidth: 'auto' }}
                                                    onClick={() => setShowOldPassword(!showOldPassword)}
                                                >
                                                    <i className={`fa ${showOldPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="col-md-12 mb-3">
                                            <label className="form-label text-muted">New Password</label>
                                            <div className="position-relative">
                                                <input
                                                    type={showNewPassword ? 'text' : 'password'}
                                                    className="form-control bg-dark text-light border"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    placeholder="At least 8 characters"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    className="btn btn-link position-absolute text-muted"
                                                    style={{ right: '10px', top: '50%', transform: 'translateY(-50%)', padding: '0', minWidth: 'auto' }}
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                >
                                                    <i className={`fa ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="col-md-12 mb-3">
                                            <label className="form-label text-muted">Confirm New Password</label>
                                            <div className="position-relative">
                                                <input
                                                    type={showConfirmPassword ? 'text' : 'password'}
                                                    className="form-control bg-dark text-light border"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    placeholder="Re-enter new password"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    className="btn btn-link position-absolute text-muted"
                                                    style={{ right: '10px', top: '50%', transform: 'translateY(-50%)', padding: '0', minWidth: 'auto' }}
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                >
                                                    <i className={`fa ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn"
                                        style={{ backgroundColor: '#c49b63', borderColor: '#c49b63', color: '#151111' }}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? 'Updating...' : 'Update Password'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountSettingsPage;
