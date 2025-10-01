import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Branch } from '../../../types';
import { Eye, EyeOff } from 'lucide-react';

export interface CreateManagerPayload {
  email: string;
  password: string;
  fullname: string;
  phoneNumber: string;
  role: 'MANAGER';
  branchId: number;
  hireDate: string; // YYYY-MM-DD
  identityCard: string;
}

interface CreateManagerModalProps {
  open: boolean;
  branches: Branch[];
  loadingBranches?: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateManagerPayload) => Promise<void> | void;
}

const CreateManagerModal: React.FC<CreateManagerModalProps> = ({ open, branches, loadingBranches, onClose, onSubmit }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullname, setFullname] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [branchId, setBranchId] = useState<number | ''>('');
  const [hireDate, setHireDate] = useState('');
  const [identityCard, setIdentityCard] = useState('');
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
    return password.length >= 6 ? '' : 'Minimum 6 characters';
  }, [password]);

  const phoneError = useMemo(() => {
    if (!phoneNumber) return 'Phone number is required';
    return /^\d{10}$/.test(phoneNumber) ? '' : 'Must be 10 digits';
  }, [phoneNumber]);

  const identityError = useMemo(() => {
    if (!identityCard) return 'Identity card is required';
    return /^\d{10,}$/.test(identityCard) ? '' : 'At least 10 digits';
  }, [identityCard]);

  const fullnameError = useMemo(() => {
    return fullname && fullname.trim().length > 0 ? '' : 'Full name is required';
  }, [fullname]);

  const hireDateError = useMemo(() => {
    return hireDate && hireDate.trim().length > 0 ? '' : 'Hire date is required';
  }, [hireDate]);

  useEffect(() => {
    if (open) {
      setEmail('');
      setPassword('');
      setFullname('');
      setPhoneNumber('');
      setBranchId('');
      setHireDate('');
      setIdentityCard('');
      setEmailTouched(false);
      setPasswordTouched(false);
      setPhoneTouched(false);
      setIdentityTouched(false);
      setFullnameTouched(false);
      setHireDateTouched(false);
      // Focus first field
      setTimeout(() => emailInputRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  const handleSave = async () => {
    if (!branchId) return;
    if (emailError || passwordError || phoneError || identityError || fullnameError || hireDateError) return;
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        email,
        password,
        fullname,
        phoneNumber,
        role: 'MANAGER',
        branchId: Number(branchId),
        hireDate,
        identityCard,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Create Manager</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input
              className={`w-full border rounded px-3 py-2 ${emailTouched && emailError ? 'border-red-400 focus:border-red-500' : ''}`}
              ref={emailInputRef}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              placeholder="e.g., manager@example.com"
            />
            {emailTouched && emailError && <p className="mt-1 text-xs text-red-600">{emailError}</p>}
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-gray-600 mb-1">Password</label>
            <div className={`relative ${passwordError ? 'has-[input]:border-red-400' : ''}`}>
              <input
                type={showPassword ? 'text' : 'password'}
                className={`w-full border rounded px-3 py-2 pr-10 ${passwordTouched && passwordError ? 'border-red-400 focus:border-red-500' : ''}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setPasswordTouched(true)}
                placeholder="At least 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {passwordTouched && passwordError && <p className="mt-1 text-xs text-red-600">{passwordError}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Full name</label>
            <input
              className={`w-full border rounded px-3 py-2 ${fullnameError && fullnameTouched ? 'border-red-400 focus:border-red-500' : ''}`}
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              onBlur={() => setFullnameTouched(true)}
              placeholder="e.g., John Doe"
            />
            {fullnameTouched && fullnameError && <p className="mt-1 text-xs text-red-600">{fullnameError}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Phone number</label>
            <input
              className={`w-full border rounded px-3 py-2 ${phoneTouched && phoneError ? 'border-red-400 focus:border-red-500' : ''}`}
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
              onBlur={() => setPhoneTouched(true)}
              placeholder="10-digit number"
              inputMode="numeric"
              maxLength={10}
            />
            {phoneTouched && phoneError && <p className="mt-1 text-xs text-red-600">{phoneError}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Hire date</label>
            <input
              type="date"
              className={`w-full border rounded px-3 py-2 ${hireDateError && hireDateTouched ? 'border-red-400 focus:border-red-500' : ''}`}
              value={hireDate}
              onChange={(e) => setHireDate(e.target.value)}
              onBlur={() => setHireDateTouched(true)}
            />
            {hireDateTouched && hireDateError && <p className="mt-1 text-xs text-red-600">{hireDateError}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Identity card</label>
            <input
              className={`w-full border rounded px-3 py-2 ${identityTouched && identityError ? 'border-red-400 focus:border-red-500' : ''}`}
              value={identityCard}
              onChange={(e) => setIdentityCard(e.target.value.replace(/\D/g, ''))}
              onBlur={() => setIdentityTouched(true)}
              placeholder="At least 10 digits"
              inputMode="numeric"
            />
            {identityTouched && identityError && <p className="mt-1 text-xs text-red-600">{identityError}</p>}
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-gray-600 mb-1">Assign to branch</label>
            <select className="w-full border rounded px-3 py-2" value={branchId} onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : '')}>
              <option value="" disabled>{loadingBranches ? 'Loading branches...' : 'Select a branch'}</option>
              {branches.map((b) => (
                <option key={b.branchId} value={b.branchId}>{b.name} — {b.address}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded border border-gray-300 text-gray-700" disabled={submitting}>Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60" disabled={submitting || !branchId}>
            {submitting ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CreateManagerModal;


