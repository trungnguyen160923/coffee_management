import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Branch } from '../../../types';
import { Eye, EyeOff, X } from 'lucide-react';

export interface CreateManagerPayload {
  email: string;
  password?: string;
  fullname: string;
  phoneNumber: string;
  role: 'MANAGER';
  branchId: number;
  hireDate: string; // YYYY-MM-DD
  identityCard: string;
  baseSalary?: number;
  numberOfDependents?: number;
}

interface CreateManagerModalProps {
  open: boolean;
  branches: Branch[];
  loadingBranches?: boolean;
  managerToUpdate?: any; // UserResponseDto
  onClose: () => void;
  onSubmit: (payload: CreateManagerPayload) => Promise<void> | void;
}

const CreateManagerModal: React.FC<CreateManagerModalProps> = ({
  open,
  branches,
  loadingBranches,
  managerToUpdate,
  onClose,
  onSubmit,
}) => {
  const isUpdateMode = !!managerToUpdate;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullname, setFullname] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [branchId, setBranchId] = useState<number | ''>('');
  const [hireDate, setHireDate] = useState('');
  const [identityCard, setIdentityCard] = useState('');
  const [baseSalary, setBaseSalary] = useState<number | ''>('');
  const [numberOfDependents, setNumberOfDependents] = useState<number | ''>('');
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
      if (isUpdateMode && managerToUpdate) {
        setEmail(managerToUpdate.email || '');
        setPassword('');
        setFullname(managerToUpdate.fullname || '');
        setPhoneNumber(managerToUpdate.phoneNumber || '');
        setBranchId(managerToUpdate.branch?.branchId || '');
        setHireDate(
          managerToUpdate.hireDate
            ? new Date(managerToUpdate.hireDate).toISOString().split('T')[0]
            : ''
        );
        setIdentityCard(managerToUpdate.identityCard || '');
        setBaseSalary(managerToUpdate.baseSalary ?? managerToUpdate.salary ?? '');
        setNumberOfDependents(managerToUpdate.numberOfDependents ?? '');
      } else {
        setEmail('');
        setPassword('');
        setFullname('');
        setPhoneNumber('');
        setBranchId('');
        setHireDate('');
        setIdentityCard('');
        setBaseSalary(0);
        setNumberOfDependents(0);
      }

      setEmailTouched(false);
      setPasswordTouched(false);
      setPhoneTouched(false);
      setIdentityTouched(false);
      setFullnameTouched(false);
      setHireDateTouched(false);

      setTimeout(() => emailInputRef.current?.focus(), 0);
    }
  }, [open, isUpdateMode, managerToUpdate]);

  if (!open) return null;

  const handleSave = async () => {
    if (!isUpdateMode && !branchId) return;
    if (
      emailError ||
      (!isUpdateMode && passwordError) ||
      phoneError ||
      identityError ||
      fullnameError ||
      hireDateError
    )
      return;
    if (submitting) return;

    setSubmitting(true);
    try {
      await onSubmit({
        email,
        password: isUpdateMode ? undefined : password,
        fullname,
        phoneNumber,
        role: 'MANAGER',
        branchId: branchId ? Number(branchId) : isUpdateMode ? managerToUpdate?.branch?.branchId || -1 : -1,
        hireDate,
        identityCard,
        baseSalary: baseSalary === '' ? 0 : Number(baseSalary),
        numberOfDependents: numberOfDependents === '' ? 0 : Number(numberOfDependents),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between bg-gradient-to-r from-sky-500 to-emerald-500 px-6 py-3 rounded-t-lg">
          <h2 className="text-lg font-semibold text-white">
            {isUpdateMode ? 'Update manager' : 'Create manager'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 text-white"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-4 pb-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm text-gray-600 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                className={`w-full border rounded px-3 py-2 ${emailTouched && emailError ? 'border-red-400 focus:border-red-500' : ''}`}
                ref={emailInputRef}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                placeholder="e.g., manager@example.com"
              />
              {emailTouched && emailError && (
                <p className="mt-1 text-xs text-red-600">{emailError}</p>
              )}
            </div>

            {!isUpdateMode && (
              <div className="col-span-2">
                <label className="block text-sm text-gray-600 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
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
                {passwordTouched && passwordError && (
                  <p className="mt-1 text-xs text-red-600">{passwordError}</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                className={`w-full border rounded px-3 py-2 ${fullnameError && fullnameTouched ? 'border-red-400 focus:border-red-500' : ''}`}
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                onBlur={() => setFullnameTouched(true)}
                placeholder="e.g., John Doe"
              />
              {fullnameTouched && fullnameError && (
                <p className="mt-1 text-xs text-red-600">{fullnameError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Phone number <span className="text-red-500">*</span>
              </label>
              <input
                className={`w-full border rounded px-3 py-2 ${phoneTouched && phoneError ? 'border-red-400 focus:border-red-500' : ''}`}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                onBlur={() => setPhoneTouched(true)}
                placeholder="10-digit number"
                inputMode="numeric"
                maxLength={10}
              />
              {phoneTouched && phoneError && (
                <p className="mt-1 text-xs text-red-600">{phoneError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Hire date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                className={`w-full border rounded px-3 py-2 ${hireDateError && hireDateTouched ? 'border-red-400 focus:border-red-500' : ''}`}
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
                onBlur={() => setHireDateTouched(true)}
              />
              {hireDateTouched && hireDateError && (
                <p className="mt-1 text-xs text-red-600">{hireDateError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Identity card <span className="text-red-500">*</span>
              </label>
              <input
                className={`w-full border rounded px-3 py-2 ${identityTouched && identityError ? 'border-red-400 focus:border-red-500' : ''}`}
                value={identityCard}
                onChange={(e) => setIdentityCard(e.target.value.replace(/\D/g, ''))}
                onBlur={() => setIdentityTouched(true)}
                placeholder="At least 10 digits"
                inputMode="numeric"
              />
              {identityTouched && identityError && (
                <p className="mt-1 text-xs text-red-600">{identityError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Base salary (VND)</label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2"
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="e.g., 10000000"
                min="0"
                step="1000"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Number of dependents</label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2"
                value={numberOfDependents}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '') {
                    setNumberOfDependents('');
                  } else {
                    const n = Number(v);
                    setNumberOfDependents(Number.isNaN(n) ? '' : Math.max(0, Math.floor(n)));
                  }
                }}
                placeholder="e.g., 0"
                min="0"
                step="1"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm text-gray-600 mb-1">
                Assign to branch <span className="text-red-500">*</span>
              </label>
              <select
                className="w-full border rounded px-3 py-2"
                value={branchId}
                onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="" disabled={!isUpdateMode}>
                  {loadingBranches
                    ? 'Loading branches...'
                    : branches.length === 0
                    ? isUpdateMode
                      ? 'No unassigned branches available (current branch will be kept)'
                      : 'No unassigned branches available'
                    : isUpdateMode
                    ? 'Select a branch (or leave empty to keep current)'
                    : 'Select a branch'}
                </option>
                {branches.map((b) => (
                  <option key={b.branchId} value={b.branchId}>
                    {b.name} — {b.address}
                  </option>
                ))}
              </select>
              {!loadingBranches && branches.length === 0 && (
                <p className="mt-1 text-xs text-orange-600">
                  {isUpdateMode
                    ? 'No unassigned branches available. Leave empty to keep current branch, or create a new branch first.'
                    : 'All branches are already assigned to managers. Create a new branch first.'}
                </p>
              )}
              {isUpdateMode && managerToUpdate?.branch && (
                <p className="mt-1 text-xs text-gray-600">
                  Current branch: <strong>{managerToUpdate.branch.name}</strong>. Leave empty to keep it.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 pb-4 pt-2 flex justify-end gap-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded border border-gray-300 text-gray-700"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
            disabled={submitting || (!isUpdateMode && !branchId)}
          >
            {submitting ? (isUpdateMode ? 'Updating...' : 'Creating...') : isUpdateMode ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CreateManagerModal;
