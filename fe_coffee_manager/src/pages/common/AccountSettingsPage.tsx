import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail, Phone, User, Shield, Building2, Eye, EyeOff, Edit2, X, Check, CreditCard, Calendar, DollarSign, Users, Clock, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService, StaffBusinessRole } from '../../services/authService';

export const AccountSettingsPage: React.FC = () => {
  const { user } = useAuth();
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
  
  // Salary visibility states
  const [showBaseSalary, setShowBaseSalary] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullname: user?.fullname || user?.name || '',
    email: user?.email || '',
    phoneNumber: user?.phoneNumber || '',
    identityCard: user?.identityCard || '',
  });
  
  // Staff business roles
  const [staffBusinessRoles, setStaffBusinessRoles] = useState<StaffBusinessRole[]>([]);
  
  useEffect(() => {
    if (user?.role === 'staff') {
      authService.getStaffBusinessRoles()
        .then(setStaffBusinessRoles)
        .catch((error) => {
          console.error('Failed to fetch staff business roles:', error);
        });
    }
  }, [user?.role]);

  if (!user) {
    return null;
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New password and confirmation password do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }

    try {
      setIsSubmitting(true);
      await authService.changePassword(oldPassword, newPassword);
      toast.success('Password changed successfully');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      const message = error?.message || 'Failed to change password, please try again';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEditProfile = () => {
    setProfileForm({
      fullname: user?.fullname || user?.name || '',
      email: user?.email || '',
      phoneNumber: user?.phoneNumber || '',
      identityCard: user?.identityCard || '',
    });
    setIsEditingProfile(true);
  };

  const handleCancelEditProfile = () => {
    setIsEditingProfile(false);
    setProfileForm({
      fullname: user?.fullname || user?.name || '',
      email: user?.email || '',
      phoneNumber: user?.phoneNumber || '',
      identityCard: user?.identityCard || '',
    });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.user_id) {
      toast.error('User ID not found');
      return;
    }

    // Validation
    if (!profileForm.fullname || !profileForm.fullname.trim()) {
      toast.error('Full name is required');
      return;
    }

    if (user.role === 'admin') {
      // Admin can edit email
      if (!profileForm.email || !profileForm.email.trim()) {
        toast.error('Email is required');
        return;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(profileForm.email)) {
        toast.error('Please enter a valid email address');
        return;
      }
    }

    if (!profileForm.phoneNumber || !profileForm.phoneNumber.trim()) {
      toast.error('Phone number is required');
      return;
    }

    // Phone number validation (at least 10 digits)
    const phoneRegex = /^[0-9]{10,}$/;
    if (!phoneRegex.test(profileForm.phoneNumber)) {
      toast.error('Phone number must be at least 10 digits');
      return;
    }

    // Manager: validate identity card
    if (user.role === 'manager') {
      if (!profileForm.identityCard || !profileForm.identityCard.trim()) {
        toast.error('Identity card is required');
        return;
      }

      // Identity card validation (at least 10 digits, numeric only)
      const identityCardRegex = /^[0-9]{10,}$/;
      if (!identityCardRegex.test(profileForm.identityCard)) {
        toast.error('Identity card must be at least 10 digits and contain only numbers');
        return;
      }
    }

    try {
      setIsUpdatingProfile(true);

      if (user.role === 'admin') {
        // Admin: update fullname, email, phoneNumber
        const updatedUser = await authService.updateProfile(user.user_id, {
          fullname: profileForm.fullname.trim(),
          email: profileForm.email.trim(),
          phone_number: profileForm.phoneNumber.trim(),
        });
        
        // Update localStorage with new user data
        localStorage.setItem('coffee-user', JSON.stringify(updatedUser));
        
        // Reload page to refresh user context
        window.location.reload();
      } else if (user.role === 'manager') {
        // Manager: update fullname, phoneNumber (via /users/me endpoint) and identityCard (via profile-service)
        const updatePromises = [
          authService.updateOwnProfile({
            fullname: profileForm.fullname.trim(),
            phone_number: profileForm.phoneNumber.trim(),
          })
        ];

        // Update identity card if changed
        if (profileForm.identityCard.trim() !== (user.identityCard || '')) {
          updatePromises.push(
            authService.updateManagerProfile(user.user_id, profileForm.identityCard.trim())
          );
        }

        await Promise.all(updatePromises);
        
        // Reload page to refresh user context
        window.location.reload();
      } else if (user.role === 'staff') {
        // Staff: update fullname, phoneNumber (via /users/me endpoint)
        await authService.updateOwnProfile({
          fullname: profileForm.fullname.trim(),
          phone_number: profileForm.phoneNumber.trim(),
        });
        
        // Reload page to refresh user context
        window.location.reload();
      }
      
      toast.success('Profile updated successfully');
    } catch (error: any) {
      const message = error?.message || 'Failed to update profile, please try again';
      toast.error(message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const roleLabel = user.role === 'admin' ? 'Admin' : user.role === 'manager' ? 'Manager' : 'Staff';

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Account Information</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your personal information and change password for your current account.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 border border-sky-100">
            <Shield className="h-4 w-4 text-sky-500" />
            <span className="text-xs font-medium uppercase tracking-wide text-sky-700">{roleLabel}</span>
          </div>
        </div>

        {/* Personal info card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">Personal Information</h2>
            {(user.role === 'admin' || user.role === 'manager' || user.role === 'staff') && !isEditingProfile && (
              <button
                type="button"
                onClick={handleStartEditProfile}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg transition-colors"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
          </div>

          {isEditingProfile && (user.role === 'admin' || user.role === 'manager' || user.role === 'staff') ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <User className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      value={profileForm.fullname}
                      onChange={(e) => setProfileForm({ ...profileForm, fullname: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                </div>

                {user.role === 'admin' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Mail className="h-4 w-4" />
                      </span>
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                        placeholder="Enter email address"
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Phone className="h-4 w-4" />
                    </span>
                    <input
                      type="tel"
                      value={profileForm.phoneNumber}
                      onChange={(e) => setProfileForm({ ...profileForm, phoneNumber: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      placeholder="Enter phone number"
                      required
                    />
                  </div>
                </div>

                {user.role === 'manager' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">
                      Identity Card <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <CreditCard className="h-4 w-4" />
                      </span>
                      <input
                        type="text"
                        value={profileForm.identityCard}
                        onChange={(e) => setProfileForm({ ...profileForm, identityCard: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2.5 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                        placeholder="Enter identity card number"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Check className="h-4 w-4" />
                  {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelEditProfile}
                  disabled={isUpdatingProfile}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                    <User className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Full Name</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{user.fullname || user.name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                    <Mail className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Email</p>
                    <p className="mt-1 text-sm font-medium text-slate-900 break-all">{user.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <Phone className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Phone Number</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{user.phoneNumber || 'Not updated'}</p>
                  </div>
                </div>

                {user.role === 'manager' && user.identityCard && (
                  <div className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <CreditCard className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Identity Card</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{user.identityCard}</p>
                    </div>
                  </div>
                )}

                {user.role === 'staff' && user.identityCard && (
                  <div className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <CreditCard className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Identity Card</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{user.identityCard}</p>
                    </div>
                  </div>
                )}

                {(user.role === 'manager' || user.role === 'staff') && (
                  <div className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                      <Building2 className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Branch</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {user.branch?.name || 'Not assigned'}
                      </p>
                      {user.branch?.address && (
                        <p className="mt-0.5 text-xs text-slate-500">{user.branch.address}</p>
                      )}
                    </div>
                  </div>
                )}

                {user.role === 'admin' && (
                  <div className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-purple-50 text-purple-600">
                      <Shield className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Admin Level</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {user.adminLevel != null ? `Level ${user.adminLevel}` : 'Default'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Manager Profile Additional Information */}
              {user.role === 'manager' && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Employment Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {user.hireDate && (
                      <div className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-green-50 text-green-600">
                          <Calendar className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Hire Date</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {new Date(user.hireDate).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                      </div>
                    )}

                    {user.salary != null && (
                      <div className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-yellow-50 text-yellow-600">
                          <DollarSign className="h-4 w-4" />
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Base Salary</p>
                            <button
                              type="button"
                              onClick={() => setShowBaseSalary(!showBaseSalary)}
                              className="text-slate-400 hover:text-slate-600 transition-colors"
                              tabIndex={-1}
                            >
                              {showBaseSalary ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {showBaseSalary ? (
                              new Intl.NumberFormat('vi-VN', { 
                                style: 'currency', 
                                currency: 'VND' 
                              }).format(user.salary)
                            ) : (
                              <span className="text-slate-400">••••••••</span>
                            )}
                          </p>
                        </div>
                      </div>
                    )}

                    {user.insuranceSalary != null && (
                      <div className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-50 text-cyan-600">
                          <Shield className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Insurance Salary</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {new Intl.NumberFormat('vi-VN', { 
                              style: 'currency', 
                              currency: 'VND' 
                            }).format(user.insuranceSalary)}
                          </p>
                        </div>
                      </div>
                    )}

                    {user.overtimeRate != null && (
                      <div className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                          <Clock className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Overtime Rate</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {(user.overtimeRate * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    )}

                    {user.numberOfDependents != null && (
                      <div className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-pink-50 text-pink-600">
                          <Users className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Number of Dependents</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {user.numberOfDependents} {user.numberOfDependents === 1 ? 'person' : 'people'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Staff Profile Additional Information */}
              {user.role === 'staff' && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Employment Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {user.hireDate && (
                      <div className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-green-50 text-green-600">
                          <Calendar className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Hire Date</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {new Date(user.hireDate).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                      </div>
                    )}

                    {user.employmentType && (
                      <div className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-violet-50 text-violet-600">
                          <Clock className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Employment Type</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {user.employmentType.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                    )}

                    {user.payType && (
                      <div className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                          <DollarSign className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pay Type</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">{user.payType}</p>
                        </div>
                      </div>
                    )}

                    {user.baseSalary != null && user.payType === 'MONTHLY' && (
                      <div className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-yellow-50 text-yellow-600">
                          <DollarSign className="h-4 w-4" />
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Base Salary</p>
                            <button
                              type="button"
                              onClick={() => setShowBaseSalary(!showBaseSalary)}
                              className="text-slate-400 hover:text-slate-600 transition-colors"
                              tabIndex={-1}
                            >
                              {showBaseSalary ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {showBaseSalary ? (
                              new Intl.NumberFormat('vi-VN', { 
                                style: 'currency', 
                                currency: 'VND' 
                              }).format(user.baseSalary)
                            ) : (
                              <span className="text-slate-400">••••••••</span>
                            )}
                          </p>
                        </div>
                      </div>
                    )}

                    {user.hourlyRate != null && user.payType === 'HOURLY' && (
                      <div className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-yellow-50 text-yellow-600">
                          <DollarSign className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Hourly Rate</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {new Intl.NumberFormat('vi-VN', { 
                              style: 'currency', 
                              currency: 'VND' 
                            }).format(user.hourlyRate)}/hour
                          </p>
                        </div>
                      </div>
                    )}

                    {user.insuranceSalary != null && (
                      <div className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-50 text-cyan-600">
                          <Shield className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Insurance Salary</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {new Intl.NumberFormat('vi-VN', { 
                              style: 'currency', 
                              currency: 'VND' 
                            }).format(user.insuranceSalary)}
                          </p>
                        </div>
                      </div>
                    )}

                    {user.overtimeRate != null && (
                      <div className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-orange-50 text-orange-600">
                          <Clock className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Overtime Rate</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {(user.overtimeRate * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>
                    )}

                    {user.numberOfDependents != null && (
                      <div className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-pink-50 text-pink-600">
                          <Users className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Number of Dependents</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {user.numberOfDependents} {user.numberOfDependents === 1 ? 'person' : 'people'}
                          </p>
                        </div>
                      </div>
                    )}

                    {user.proficiencyLevel && (
                      <div className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                          <Shield className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Proficiency Level</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">{user.proficiencyLevel}</p>
                        </div>
                      </div>
                    )}

                    {user.staffBusinessRoleIds && user.staffBusinessRoleIds.length > 0 && (
                      <div className="flex items-start gap-3">
                        <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-purple-50 text-purple-600">
                          <Briefcase className="h-4 w-4" />
                        </span>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Staff Roles</p>
                          <div className="flex flex-wrap gap-2">
                            {user.staffBusinessRoleIds.map((roleId) => {
                              const role = staffBusinessRoles.find(r => r.roleId === roleId);
                              return (
                                <span
                                  key={roleId}
                                  className="inline-flex items-center rounded-md bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10"
                                >
                                  {role?.roleName || role?.name || `Role ${roleId}`}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Extra description per role */}
          <div className="mt-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 px-4 py-3 text-xs text-slate-500">
            {user.role === 'admin' && (
              <p>
                This is the account information page for system administrators. More detailed system configuration information is managed in other admin pages.
              </p>
            )}
            {user.role === 'manager' && (
              <p>
                This information represents the branch management account. Any changes related to staff permissions are adjusted from the staff management page.
              </p>
            )}
            {user.role === 'staff' && (
              <p>
                This is the staff account information. If there are any errors in personal information, please contact the branch manager for updates.
              </p>
            )}
          </div>
        </div>

        {/* Change password card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Change Password</h2>
              <p className="mt-1 text-xs text-slate-500">
                For security, please use a strong password and do not share it with anyone.
              </p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Current Password</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type={showOldPassword ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-10 py-2.5 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="Enter current password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">New Password</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-10 py-2.5 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Confirm New Password</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-10 py-2.5 text-sm text-slate-900 shadow-xs focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sky-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AccountSettingsPage;
