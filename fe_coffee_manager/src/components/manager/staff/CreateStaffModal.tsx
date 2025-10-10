import React, { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { staffService } from '../../../services';
import { useAuth } from '../../../context/AuthContext';
import type { UserResponseDto } from '../../../types';

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (staff: UserResponseDto) => void;
};

const CreateStaffModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const [email, setEmail] = useState('');
  const [fullname, setFullname] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [identityCard, setIdentityCard] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [salary, setSalary] = useState<number | ''>('');
  const [position, setPosition] = useState<string>('Pha Chế');
  const [loading, setLoading] = useState(false);
  const { managerBranch } = useAuth();

  const reset = () => {
    setEmail('');
    setFullname('');
    setPhoneNumber('');
    setIdentityCard('');
    setHireDate('');
    setSalary('');
    setPosition('Pha Chế');
  };

  if (!open) return null;

  const handleSubmit = async () => {
    try {
      if (!email || !fullname) {
        toast.error('Please enter email and full name');
        return;
      }
      if (!managerBranch?.branchId) {
        toast.error('Missing manager branch. Please re-login as manager.');
        return;
      }
      setLoading(true);
      const payload: any = {
        email,
        password: '123456',
        fullname,
        phoneNumber,
        role: 'STAFF',
        branchId: managerBranch.branchId,
        salary: salary === '' ? undefined : salary,
        position: position || 'Pha Chế',
        hireDate: hireDate || undefined,
        identityCard: identityCard || undefined,
        active: true,
      };
      const resp: any = await staffService.createStaffV2(payload);
      if (resp?.code === 400) {
        toast.error(resp?.message || 'Failed to create staff');
        setLoading(false);
        return;
      }
      const userId = resp?.result?.userId || resp?.result?.user_id || resp?.userId || resp?.user_id;
      let created: UserResponseDto | null = null;
      if (userId) {
        try {
          created = await staffService.getStaffProfile(userId);
        } catch (e) {
          // Fallback minimal object
          created = {
            user_id: Number(userId),
            email,
            fullname,
            phoneNumber,
            identityCard,
            hireDate,
            salary: salary === '' ? undefined : Number(salary),
          } as unknown as UserResponseDto;
        }
      }
      if (created) onCreated(created);
      toast.success('Staff created successfully');
      reset();
      onClose();
    } catch (e: any) {
      const msg = e?.response?.message || e?.message || 'Failed to create staff';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Create Staff</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full name</label>
            <input value={fullname} onChange={(e) => setFullname(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" placeholder="Nguyễn Văn A" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" placeholder="email@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9+]/g, ''))} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" placeholder="0324xxxxxx" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">ID Card</label>
            <input value={identityCard} onChange={(e) => setIdentityCard(e.target.value.replace(/\D/g, ''))} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" placeholder="CCCD" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Hire date</label>
            <input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Position</label>
            <select value={position} onChange={(e) => setPosition(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm">
              <option value="Pha Chế">Pha Chế</option>
              <option value="Thu Ngân">Thu Ngân</option>
              <option value="Phục Vụ">Phục Vụ</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Salary</label>
            <input type="number" value={salary} onChange={(e) => setSalary(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" placeholder="e.g. 8000000" />
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-md border text-gray-700 hover:bg-gray-50">Cancel</button>
          <button disabled={loading} onClick={handleSubmit} className={`px-4 py-2 rounded-md text-white ${loading ? 'bg-amber-400' : 'bg-amber-600 hover:bg-amber-700'}`}>
            {loading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateStaffModal;

