import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { StaffWithUserDto } from '../../../types';
import { authService } from '../../../services';

type Props = {
  open: boolean;
  staff: StaffWithUserDto | null;
  onClose: () => void;
};

const StaffDetailModal: React.FC<Props> = ({ open, staff, onClose }) => {
  const formatEnum = (value?: string | null) =>
    value ? value.replace(/_/g, ' ') : '-';

  const [roleNames, setRoleNames] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!open || !staff) return;
    authService
      .getStaffBusinessRoles()
      .then((roles) => {
        const map: Record<number, string> = {};
        (roles || []).forEach((r) => {
          map[r.roleId] = r.roleName || r.name;
        });
        setRoleNames(map);
      })
      .catch(() => {
        setRoleNames({});
      });
  }, [open, staff]);

  if (!open || !staff) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Staff Details</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-full p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700">Basic Info</h4>
              <p className="text-sm text-gray-600">
                <span className="font-medium">ID:</span> {staff.userId}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Full name:</span> {staff.fullname}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Email:</span> {staff.email}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Phone:</span> {staff.phoneNumber}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Branch:</span> {staff.branch?.name ?? '-'}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">System role:</span> {staff.roleName ?? '-'}
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700">Employment & Pay</h4>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Identity card:</span> {staff.identityCard ?? '-'}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Hire date:</span>{' '}
                {staff.hireDate ? new Date(staff.hireDate).toLocaleDateString('en-GB') : '-'}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Employment type:</span> {formatEnum(staff.employmentType)}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Pay type:</span> {formatEnum(staff.payType)}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Base salary:</span> {staff.baseSalary ?? '-'}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Hourly rate:</span> {staff.hourlyRate ?? '-'}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-medium">Overtime rate:</span> {staff.overtimeRate ?? '-'}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <h4 className="text-sm font-semibold text-gray-700">Staff roles (F&amp;B positions)</h4>
            <p className="text-sm text-gray-600 mt-1">
              <span className="font-medium">Proficiency:</span>{' '}
              {formatEnum(staff.proficiencyLevel) || 'INTERMEDIATE'}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {staff.staffBusinessRoleIds && staff.staffBusinessRoleIds.length > 0 ? (
                staff.staffBusinessRoleIds.map((id) => (
                  <span
                    key={id}
                    className="inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold bg-amber-50 border-amber-300 text-amber-700"
                  >
                    {roleNames[id] || `ID ${id}`}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-500">No roles assigned</span>
              )}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffDetailModal;


