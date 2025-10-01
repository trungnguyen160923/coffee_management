import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface CreateBranchPayload {
  name: string;
  address: string;
  phone: string;
  openHours: string; // HH:mm
  endHours: string;  // HH:mm
}

interface CreateBranchModalProps {
  open: boolean;
  defaultOpenHours?: string;
  defaultEndHours?: string;
  onClose: () => void;
  onSubmit: (payload: CreateBranchPayload) => Promise<void> | void;
}

const CreateBranchModal: React.FC<CreateBranchModalProps> = ({
  open,
  defaultOpenHours = '09:00',
  defaultEndHours = '21:00',
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [openHours, setOpenHours] = useState(defaultOpenHours);
  const [endHours, setEndHours] = useState(defaultEndHours);
  const [submitting, setSubmitting] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const [nameTouched, setNameTouched] = useState(false);
  const [addressTouched, setAddressTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [openTouched, setOpenTouched] = useState(false);
  const [endTouched, setEndTouched] = useState(false);

  const nameError = useMemo(() => {
    return name && name.trim().length > 0 ? '' : 'Branch name is required';
  }, [name]);

  const addressError = useMemo(() => {
    return address && address.trim().length > 0 ? '' : 'Address is required';
  }, [address]);

  const phoneError = useMemo(() => {
    if (!phone) return 'Phone number is required';
    // Allow digits, spaces, parentheses, dots, dashes, plus
    const allowed = /^[\d\s().+\-]+$/;
    const digits = phone.replace(/\D/g, '');
    if (!allowed.test(phone)) return 'Invalid characters in phone number';
    if (digits.length < 8 || digits.length > 15) return 'Phone must have 8-15 digits';
    return '';
  }, [phone]);

  const hoursError = useMemo(() => {
    const toMinutes = (t: string) => {
      const parts = t.split(':');
      const h = parseInt(parts[0] || '0', 10);
      const m = parseInt(parts[1] || '0', 10);
      return h * 60 + m;
    };
    if (!openHours || !endHours) return '';
    const o = toMinutes(openHours);
    const e = toMinutes(endHours);
    if (o >= e) return 'Opening time must be earlier than closing time';
    return '';
  }, [openHours, endHours]);

  useEffect(() => {
    if (open) {
      // reset when opened
      setName('');
      setAddress('');
      setPhone('');
      setOpenHours(defaultOpenHours);
      setEndHours(defaultEndHours);
      setNameTouched(false);
      setAddressTouched(false);
      setPhoneTouched(false);
      setOpenTouched(false);
      setEndTouched(false);
      setTimeout(() => nameInputRef.current?.focus(), 0);
    }
  }, [open, defaultOpenHours, defaultEndHours]);

  if (!open) return null;

  const handleSave = async () => {
    if (submitting) return;
    if (nameError || addressError || phoneError || hoursError) return;
    setSubmitting(true);
    try {
      await onSubmit({ name, address, phone, openHours, endHours });
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Add Branch</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Branch name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setNameTouched(true)}
              ref={nameInputRef}
              className={`w-full border rounded px-3 py-2 ${nameTouched && nameError ? 'border-red-400 focus:border-red-500' : ''}`}
              placeholder="e.g., Downtown Branch"
            />
            {nameTouched && nameError && <p className="mt-1 text-xs text-red-600">{nameError}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Address</label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onBlur={() => setAddressTouched(true)}
              className={`w-full border rounded px-3 py-2 ${addressTouched && addressError ? 'border-red-400 focus:border-red-500' : ''}`}
              placeholder="e.g., 123 Main St, District 2, Ho Chi Minh City"
            />
            {addressTouched && addressError && <p className="mt-1 text-xs text-red-600">{addressError}</p>}
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Phone number</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => setPhoneTouched(true)}
              className={`w-full border rounded px-3 py-2 ${phoneTouched && phoneError ? 'border-red-400 focus:border-red-500' : ''}`}
              placeholder="e.g., (028) 7109.4949 or +84123456789"
            />
            {phoneTouched && phoneError && <p className="mt-1 text-xs text-red-600">{phoneError}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Opening time</label>
              <input
                type="time"
                value={openHours}
                onChange={(e) => setOpenHours(e.target.value)}
                onBlur={() => setOpenTouched(true)}
                className={`w-full border rounded px-3 py-2 ${(openTouched || endTouched) && hoursError ? 'border-red-400 focus:border-red-500' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Closing time</label>
              <input
                type="time"
                value={endHours}
                onChange={(e) => setEndHours(e.target.value)}
                onBlur={() => setEndTouched(true)}
                className={`w-full border rounded px-3 py-2 ${(openTouched || endTouched) && hoursError ? 'border-red-400 focus:border-red-500' : ''}`}
              />
            </div>
          </div>
          {(openTouched || endTouched) && hoursError && (
            <p className="text-xs text-red-600">{hoursError}</p>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border border-gray-300 text-gray-700"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
            disabled={submitting || !!(nameError || addressError || phoneError || hoursError)}
          >
            {submitting ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CreateBranchModal;


