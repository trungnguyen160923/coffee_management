import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, EyeOff } from 'lucide-react';

export interface CreateStaffPayload {
  email: string;
  password: string;
  fullname: string;
  phoneNumber: string;
  role: 'STAFF';
  identityCard?: string;
  hireDate?: string; // YYYY-MM-DD
  active?: boolean;
}

interface CreateStaffModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateStaffPayload) => Promise<void> | void;
}

const CreateStaffModal: React.FC<CreateStaffModalProps> = ({ open, onClose, onSubmit }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullname, setFullname] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [identityCard, setIdentityCard] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [identityTouched, setIdentityTouched] = useState(false);
  const [fullnameTouched, setFullnameTouched] = useState(false);
  const [hireDateTouched, setHireDateTouched] = useState(false);

  const emailError = useMemo(() => {
    if (!email) return 'Email is required';
    // Simple RFC5322-like email check
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email) ? '' : 'Invalid email format';
  }, [email]);

  const passwordError = useMemo(() => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    return '';
  }, [password]);

  const phoneError = useMemo(() => {
    if (!phoneNumber) return 'Phone number is required';
    // Vietnamese phone number pattern
    const re = /^(\+84|84|0)[1-9][0-9]{8,9}$/;
    return re.test(phoneNumber.replace(/\s/g, '')) ? '' : 'Invalid phone number format';
  }, [phoneNumber]);

  const identityError = useMemo(() => {
    if (!identityCard) return '';
    // Vietnamese ID card pattern (9 or 12 digits)
    const re = /^[0-9]{9,12}$/;
    return re.test(identityCard.replace(/\s/g, '')) ? '' : 'Invalid ID card format (9-12 digits)';
  }, [identityCard]);

  const fullnameError = useMemo(() => {
    if (!fullname) return 'Full name is required';
    if (fullname.length < 2) return 'Full name must be at least 2 characters';
    return '';
  }, [fullname]);

  const hireDateError = useMemo(() => {
    if (!hireDate) return '';
    const date = new Date(hireDate);
    const today = new Date();
    if (date > today) return 'Hire date cannot be in the future';
    return '';
  }, [hireDate]);

  const isFormValid = useMemo(() => {
    return !emailError && !passwordError && !phoneError && !identityError && !fullnameError && !hireDateError &&
           email && password && phoneNumber && fullname;
  }, [emailError, passwordError, phoneError, identityError, fullnameError, hireDateError, email, password, phoneNumber, fullname]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullname('');
    setPhoneNumber('');
    setIdentityCard('');
    setHireDate('');
    setActive(true);
    setSubmitting(false);
    setShowPassword(false);
    setEmailTouched(false);
    setPasswordTouched(false);
    setPhoneTouched(false);
    setIdentityTouched(false);
    setFullnameTouched(false);
    setHireDateTouched(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || submitting) return;

    setSubmitting(true);
    try {
      const payload: CreateStaffPayload = {
        email,
        password,
        fullname,
        phoneNumber,
        role: 'STAFF',
        identityCard: identityCard || undefined,
        hireDate: hireDate || undefined,
        active
      };
      await onSubmit(payload);
      resetForm();
    } catch (error) {
      console.error('Error creating staff:', error);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (open && emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={handleClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Create Staff</h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  onBlur={() => setFullnameTouched(true)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    fullnameTouched && fullnameError ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter full name"
                />
                {fullnameTouched && fullnameError && (
                  <p className="text-red-500 text-xs mt-1">{fullnameError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  ref={emailInputRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    emailTouched && emailError ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter email address"
                />
                {emailTouched && emailError && (
                  <p className="text-red-500 text-xs mt-1">{emailError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setPasswordTouched(true)}
                    className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      passwordTouched && passwordError ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {passwordTouched && passwordError && (
                  <p className="text-red-500 text-xs mt-1">{passwordError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  onBlur={() => setPhoneTouched(true)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    phoneTouched && phoneError ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter phone number"
                />
                {phoneTouched && phoneError && (
                  <p className="text-red-500 text-xs mt-1">{phoneError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Identity Card</label>
                <input
                  type="text"
                  value={identityCard}
                  onChange={(e) => setIdentityCard(e.target.value.replace(/\D/g, ''))}
                  onBlur={() => setIdentityTouched(true)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    identityTouched && identityError ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter identity card number"
                />
                {identityTouched && identityError && (
                  <p className="text-red-500 text-xs mt-1">{identityError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
                <input
                  type="date"
                  value={hireDate}
                  onChange={(e) => setHireDate(e.target.value)}
                  onBlur={() => setHireDateTouched(true)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    hireDateTouched && hireDateError ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {hireDateTouched && hireDateError && (
                  <p className="text-red-500 text-xs mt-1">{hireDateError}</p>
                )}
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid || submitting}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${
                    isFormValid && !submitting
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-400 cursor-not-allowed'
                  }`}
                >
                  {submitting ? 'Creating...' : 'Create Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CreateStaffModal;
