import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { authService, staffService } from '../../../services';
import { useAuth } from '../../../context/AuthContext';
import type { StaffWithUserDto } from '../../../types';

type Mode = 'create' | 'edit';

type Props = {
  open: boolean;
  mode: Mode;
  staff?: StaffWithUserDto | null;
  onClose: () => void;
  onSuccess: () => void; // callback reload list + stats
};

const CreateStaffModal: React.FC<Props> = ({ open, mode, staff, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [fullname, setFullname] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [identityCard, setIdentityCard] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [salary, setSalary] = useState<number | ''>('');
  const [employmentType, setEmploymentType] = useState<'FULL_TIME' | 'PART_TIME'>('FULL_TIME');
  const [hourlyRate, setHourlyRate] = useState<number | ''>('');
  const [overtimeRate, setOvertimeRate] = useState<number | ''>('');
  const [availableRoles, setAvailableRoles] = useState<{ roleId: number; name: string; roleName: string }[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [proficiencyLevel, setProficiencyLevel] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'>('INTERMEDIATE');
  const [loading, setLoading] = useState(false);
  const { managerBranch } = useAuth();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const reset = () => {
    setEmail('');
    setFullname('');
    setPhoneNumber('');
    setIdentityCard('');
    setHireDate('');
    setSalary('');
    setEmploymentType('FULL_TIME');
    setHourlyRate('');
    setOvertimeRate('');
    setSelectedRoleIds([]);
    setProficiencyLevel('INTERMEDIATE');
    setPassword('');
    setErrors({});
  };

  useEffect(() => {
    if (!open) return;

    // Load staff business roles from auth-service
    authService
      .getStaffBusinessRoles()
      .then((roles) => {
        setAvailableRoles(roles || []);
      })
      .catch(() => {
        // Silent fail, keep roles empty
      });

    // Prefill when editing
    if (mode === 'edit' && staff) {
      setEmail(staff.email || '');
      setFullname(staff.fullname || '');
      setPhoneNumber(staff.phoneNumber || '');
      setIdentityCard(staff.identityCard || '');
      setHireDate(staff.hireDate || '');
      // Map employment/pay fields if available (không cho đổi trên UI nhưng vẫn hiển thị đúng)
      setEmploymentType(
        (staff.employmentType as 'FULL_TIME' | 'PART_TIME') || 'FULL_TIME'
      );
      if (staff.payType === 'MONTHLY') {
        setSalary(typeof staff.baseSalary === 'number' ? staff.baseSalary : '');
        setHourlyRate('');
      } else if (staff.payType === 'HOURLY') {
        setHourlyRate(typeof staff.hourlyRate === 'number' ? staff.hourlyRate : '');
        setSalary('');
      } else {
        setSalary('');
        setHourlyRate('');
      }
      setOvertimeRate(
        typeof staff.overtimeRate === 'number' ? staff.overtimeRate : ''
      );
      // Roles & proficiency cho edit: lấy từ BE
      setSelectedRoleIds(staff.staffBusinessRoleIds || []);
      setProficiencyLevel(
        (staff.proficiencyLevel as any) || 'INTERMEDIATE'
      );
    } else if (mode === 'create') {
      reset();
    }
  }, [open, mode, staff]);

  if (!open) return null;

  const handleSubmit = async () => {
    try {
      const newErrors: Record<string, string> = {};
      if (!fullname.trim()) newErrors.fullname = 'Full name is required';
      if (!email.trim()) newErrors.email = 'Email is required';
      if (!phoneNumber.trim()) newErrors.phoneNumber = 'Phone is required';
      if (!identityCard.trim()) newErrors.identityCard = 'ID Card is required';
      if (!hireDate.trim()) newErrors.hireDate = 'Hire date is required';

      if (mode === 'create') {
        if (!password.trim()) {
          newErrors.password = 'Password is required';
        } else if (password.length < 6) {
          newErrors.password = 'Password must be at least 6 characters';
        }
      }

      if (availableRoles.length > 0 && selectedRoleIds.length === 0) {
        newErrors.roles = 'Please select at least one staff role';
      }

      if (employmentType === 'FULL_TIME') {
        if (salary === '' || Number(salary) <= 0) {
          newErrors.salary = 'Monthly salary is required and must be > 0';
        }
      } else if (employmentType === 'PART_TIME') {
        if (hourlyRate === '' || Number(hourlyRate) <= 0) {
          newErrors.hourlyRate = 'Hourly rate is required and must be > 0';
        }
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setErrors({});

      if (mode === 'create') {
        if (!managerBranch?.branchId) {
          toast.error('Missing manager branch. Please re-login as manager.');
          return;
        }

        setLoading(true);
        const payload: any = {
          email,
          password,
          fullname,
          phoneNumber,
          role: 'STAFF',
          branchId: managerBranch.branchId,
          salary: salary === '' ? undefined : salary,
          employmentType,
          payType: employmentType === 'FULL_TIME' ? 'MONTHLY' : 'HOURLY',
          hourlyRate: hourlyRate === '' ? undefined : hourlyRate,
          overtimeRate: overtimeRate === '' ? undefined : overtimeRate,
          proficiencyLevel,
          hireDate: hireDate || undefined,
          identityCard: identityCard || undefined,
          active: true,
          staffBusinessRoleIds: selectedRoleIds, // danh sách role nghiệp vụ, backend sẽ xử lý thêm
        };
        const resp: any = await staffService.createStaffV2(payload);
        if (resp?.code === 400) {
          toast.error(resp?.message || 'Failed to create staff');
          setLoading(false);
          return;
        }

        toast.success('Staff created successfully');
        reset();
        onSuccess();
        onClose();
      } else if (mode === 'edit' && staff) {
        // Update full staff info via V2 API
        setLoading(true);
        const payload: any = {
          email,
          fullname,
          phoneNumber,
          identityCard,
          hireDate,
          employmentType,
          payType: employmentType === 'FULL_TIME' ? 'MONTHLY' : 'HOURLY',
          baseSalary: employmentType === 'FULL_TIME' ? (salary === '' ? undefined : salary) : undefined,
          hourlyRate: employmentType === 'PART_TIME' ? (hourlyRate === '' ? undefined : hourlyRate) : undefined,
          overtimeRate: overtimeRate === '' ? undefined : overtimeRate,
          staffBusinessRoleIds: selectedRoleIds,
          proficiencyLevel,
        };
        await staffService.updateStaffProfile(staff.userId, payload);
        toast.success('Staff updated successfully');
        onSuccess();
        onClose();
      }
    } catch (e: any) {
      const msg = e?.response?.message || e?.message || (mode === 'create' ? 'Failed to create staff' : 'Failed to update staff');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? 'Create Staff' : 'Edit Staff'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 pt-4 pb-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Full name</label>
              <input value={fullname} onChange={(e) => setFullname(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" placeholder="Nguyễn Văn A" />
              {errors.fullname && <p className="mt-1 text-xs text-red-600">{errors.fullname}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" placeholder="email@example.com" />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>
            {mode === 'create' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <div className="mt-1 relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm pr-10"
                    placeholder="At least 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
              </div>
            )}
            <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9+]/g, ''))} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" placeholder="0324xxxxxx" />
            {errors.phoneNumber && <p className="mt-1 text-xs text-red-600">{errors.phoneNumber}</p>}
          </div>
            <div>
            <label className="block text-sm font-medium text-gray-700">ID Card</label>
            <input value={identityCard} onChange={(e) => setIdentityCard(e.target.value.replace(/\D/g, ''))} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" placeholder="CCCD" />
            {errors.identityCard && <p className="mt-1 text-xs text-red-600">{errors.identityCard}</p>}
          </div>
            <div>
            <label className="block text-sm font-medium text-gray-700">Hire date</label>
            <input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" />
            {errors.hireDate && <p className="mt-1 text-xs text-red-600">{errors.hireDate}</p>}
          </div>
            <div>
            <label className="block text-sm font-medium text-gray-700">Employment Type</label>
            <select
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value as 'FULL_TIME' | 'PART_TIME')}
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="FULL_TIME">Full time</option>
              <option value="PART_TIME">Part time</option>
            </select>
          </div>
            <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Staff roles (F&B positions)
            </label>
            {availableRoles.length === 0 ? (
              <p className="text-xs text-gray-400">No staff roles available or failed to load.</p>
            ) : (
              <div className="flex flex-wrap gap-2 mt-1">
                {availableRoles.map((r) => {
                  const checked = selectedRoleIds.includes(r.roleId);
                  return (
                    <label
                      key={r.roleId}
                      className={`flex items-center px-3 py-1 rounded-full border text-xs cursor-pointer select-none ${
                        checked
                          ? 'bg-amber-100 border-amber-500 text-amber-700 font-semibold'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-amber-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={checked}
                        onChange={() => {
                          setSelectedRoleIds((prev) =>
                            prev.includes(r.roleId)
                              ? prev.filter((id) => id !== r.roleId)
                              : [...prev, r.roleId]
                          );
                        }}
                      />
                      <span>{r.roleName || r.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
            <p className="mt-1 text-xs text-gray-500">
              You can select one or multiple roles for this staff member (e.g. vừa Pha chế, vừa Phục vụ).
            </p>
            {errors.roles && <p className="mt-1 text-xs text-red-600">{errors.roles}</p>}
            </div>
            <div>
            <label className="block text-sm font-medium text-gray-700">Proficiency level</label>
            <select
              value={proficiencyLevel}
              onChange={(e) =>
                setProficiencyLevel(e.target.value as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT')
              }
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
            >
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
              <option value="EXPERT">Expert</option>
            </select>
          </div>
            {employmentType === 'FULL_TIME' && (
              <div>
              <label className="block text-sm font-medium text-gray-700">Monthly salary</label>
              <input
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value === '' ? '' : Number(e.target.value))}
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                placeholder="e.g. 8000000"
              />
              {errors.salary && <p className="mt-1 text-xs text-red-600">{errors.salary}</p>}
              </div>
            )}
            {employmentType === 'PART_TIME' && (
              <div>
              <label className="block text-sm font-medium text-gray-700">Hourly rate</label>
              <input
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value === '' ? '' : Number(e.target.value))}
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
                placeholder="e.g. 35000"
              />
              {errors.hourlyRate && <p className="mt-1 text-xs text-red-600">{errors.hourlyRate}</p>}
              </div>
            )}
            <div>
            <label className="block text-sm font-medium text-gray-700">Overtime rate (optional)</label>
            <input
              type="number"
              value={overtimeRate}
              onChange={(e) => setOvertimeRate(e.target.value === '' ? '' : Number(e.target.value))}
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
              placeholder="e.g. 60000"
            />
            </div>
          </div>
        </div>
        <div className="px-6 pb-4 pt-2 flex items-center justify-end gap-3 border-t">
          <button onClick={onClose} className="px-4 py-2 rounded-md border text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button
            disabled={loading}
            onClick={handleSubmit}
            className={`px-4 py-2 rounded-md text-white ${
              loading ? 'bg-amber-400' : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {loading ? (mode === 'create' ? 'Creating...' : 'Updating...') : mode === 'create' ? 'Create' : 'Update'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateStaffModal;

