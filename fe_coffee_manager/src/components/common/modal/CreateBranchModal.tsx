import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface CreateBranchPayload {
  name: string;
  address: string;
  phone: string;
  openHours: string; // HH:mm
  endHours: string;  // HH:mm
  openDays: string;  // "1,2,3,4,5,6,7"
}

interface CreateBranchModalProps {
  open: boolean;
  defaultOpenHours?: string;
  defaultEndHours?: string;
  initialData?: Partial<CreateBranchPayload>;
  mode?: 'create' | 'edit';
  onClose: () => void;
  onSubmit: (payload: CreateBranchPayload) => Promise<void> | void;
}

const CreateBranchModal: React.FC<CreateBranchModalProps> = ({
  open,
  defaultOpenHours = '09:00',
  defaultEndHours = '21:00',
  initialData,
  mode = 'create',
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [openHours, setOpenHours] = useState(defaultOpenHours);
  const [endHours, setEndHours] = useState(defaultEndHours);
  // 1=Mon .. 7=Sun
  const [openDaysSelected, setOpenDaysSelected] = useState<number[]>([1, 2, 3, 4, 5, 6, 7]);
  const [submitting, setSubmitting] = useState(false);
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  const [nameTouched, setNameTouched] = useState(false);
  const [addressTouched, setAddressTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [openTouched, setOpenTouched] = useState(false);
  const [endTouched, setEndTouched] = useState(false);
  const [openDaysTouched, setOpenDaysTouched] = useState(false);

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

  const openDaysError = useMemo(() => {
    if (!openDaysSelected || openDaysSelected.length === 0) return 'Select at least one open day';
    return '';
  }, [openDaysSelected]);

  useEffect(() => {
    if (open) {
      // reset when opened
      setName(initialData?.name ?? '');
      setAddress(initialData?.address ?? '');
      setPhone(initialData?.phone ?? '');
      setOpenHours(initialData?.openHours ?? defaultOpenHours);
      setEndHours(initialData?.endHours ?? defaultEndHours);
      setNameTouched(false);
      setAddressTouched(false);
      setPhoneTouched(false);
      setOpenTouched(false);
      setEndTouched(false);
      if (initialData?.openDays) {
        const parts = initialData.openDays.split(',').map((p) => parseInt(p.trim(), 10));
        const cleaned = Array.from(new Set(parts.filter((d) => d >= 1 && d <= 7))).sort((a, b) => a - b);
        setOpenDaysSelected(cleaned.length ? cleaned : [1, 2, 3, 4, 5, 6, 7]);
      } else {
        setOpenDaysSelected([1, 2, 3, 4, 5, 6, 7]);
      }
      setOpenDaysTouched(false);
      setTimeout(() => nameInputRef.current?.focus(), 0);
    }
  }, [open, defaultOpenHours, defaultEndHours, initialData]);

  if (!open) return null;

  const handleSave = async () => {
    if (submitting) return;
    if (nameError || addressError || phoneError || hoursError || openDaysError) return;
    const openDays = openDaysSelected.slice().sort((a, b) => a - b).join(',');
    setSubmitting(true);
    try {
      await onSubmit({ name, address, phone, openHours, endHours, openDays });
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-semibold mb-4">
          {mode === 'edit' ? 'Update Branch' : 'Add Branch'}
        </h2>
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
          <div>
            <label className="block text-sm text-gray-600 mb-1">Open days</label>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 1, label: 'Mon' },
                { value: 2, label: 'Tue' },
                { value: 3, label: 'Wed' },
                { value: 4, label: 'Thu' },
                { value: 5, label: 'Fri' },
                { value: 6, label: 'Sat' },
                { value: 7, label: 'Sun' },
              ].map((d) => {
                const active = openDaysSelected.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => {
                      setOpenDaysTouched(true);
                      setOpenDaysSelected((prev) =>
                        prev.includes(d.value)
                          ? prev.filter((v) => v !== d.value)
                          : [...prev, d.value]
                      );
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
            {openDaysTouched && openDaysError && (
              <p className="mt-1 text-xs text-red-600">{openDaysError}</p>
            )}
          </div>
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
            {submitting ? 'Saving...' : mode === 'edit' ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CreateBranchModal;


