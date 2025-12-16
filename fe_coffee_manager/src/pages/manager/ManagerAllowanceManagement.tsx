import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, User, Calendar, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { allowanceService } from '../../services';
import { payrollTemplateService } from '../../services';
import { Allowance, AllowanceType, AllowanceTemplate } from '../../types';
import { staffService } from '../../services';
import { StaffWithUserDto } from '../../types';
import ConfirmModal from '../../components/common/modal/ConfirmModal';

const ManagerAllowanceManagement: React.FC = () => {
  const { managerBranch } = useAuth();
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [staffList, setStaffList] = useState<StaffWithUserDto[]>([]);
  const [templates, setTemplates] = useState<AllowanceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showApplyTemplateModal, setShowApplyTemplateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Allowance | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Form state
  const [formUserId, setFormUserId] = useState<number | ''>('');
  const [formPeriod, setFormPeriod] = useState<string>('');
  const [formType, setFormType] = useState<string>('');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
  const [templateAmountOverride, setTemplateAmountOverride] = useState<number | ''>('');
  const [templateDescriptionOverride, setTemplateDescriptionOverride] = useState<string>('');

  useEffect(() => {
    if (managerBranch?.branchId) {
      fetchData();
      fetchStaff();
      fetchTemplates();
    }
  }, [managerBranch]);

  const fetchData = async () => {
    if (!managerBranch?.branchId) return;
    try {
      setLoading(true);
      const data = await allowanceService.getAllowances({
        branchId: managerBranch.branchId,
      });
      setAllowances(data || []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load allowances');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    if (!managerBranch?.branchId) return;
    try {
      setLoadingStaff(true);
      const staffs = await staffService.getStaffsWithUserInfoByBranch(managerBranch.branchId);
      setStaffList(staffs || []);
    } catch (err: any) {
      console.error('Error fetching staff:', err);
    } finally {
      setLoadingStaff(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const data = await payrollTemplateService.getAllowanceTemplatesForManager();
      setTemplates(data || []);
    } catch (err: any) {
      console.error('Error fetching templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const getCurrentMonthPeriod = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const handleCreate = () => {
    setFormUserId('');
    setFormPeriod(getCurrentMonthPeriod());
    setFormType('');
    setFormAmount('');
    setFormDescription('');
    setFormStatus('ACTIVE');
    setShowCreateModal(true);
  };

  const handleEdit = (allowance: Allowance) => {
    setSelectedItem(allowance);
    setFormUserId(allowance.userId);
    setFormPeriod(allowance.period);
    setFormType(allowance.allowanceType);
    setFormAmount(allowance.amount);
    setFormDescription(allowance.description);
    setFormStatus(allowance.status);
    setShowEditModal(true);
  };

  const handleApplyTemplate = () => {
    setFormUserId('');
    setFormPeriod(getCurrentMonthPeriod());
    setSelectedTemplateId('');
    setTemplateAmountOverride('');
    setTemplateDescriptionOverride('');
    setShowApplyTemplateModal(true);
  };

  const handleSave = async () => {
    if (!formUserId || !formPeriod || !formType || !formAmount) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      setActionLoading(true);
      if (selectedItem) {
        // Update
        await allowanceService.updateAllowance(selectedItem.allowanceId, {
          userId: Number(formUserId),
          period: formPeriod,
          allowanceType: formType as AllowanceType,
          amount: Number(formAmount),
          description: formDescription,
        });
        toast.success('Cập nhật phụ cấp thành công');
      } else {
        // Create
        await allowanceService.createAllowance({
          userId: Number(formUserId),
          period: formPeriod,
          allowanceType: formType as AllowanceType,
          amount: Number(formAmount),
          description: formDescription,
        });
        toast.success('Tạo phụ cấp thành công');
      }
      setShowCreateModal(false);
      setShowEditModal(false);
      setSelectedItem(null);
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplyTemplateSubmit = async () => {
    if (!formUserId || !formPeriod || !selectedTemplateId) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      setActionLoading(true);
      await allowanceService.applyTemplate({
        userId: Number(formUserId),
        period: formPeriod,
        templateId: Number(selectedTemplateId),
        overrideAmount: templateAmountOverride ? Number(templateAmountOverride) : undefined,
        overrideDescription: templateDescriptionOverride || undefined,
      });
      toast.success('Áp dụng template phụ cấp thành công');
      setShowApplyTemplateModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;

    try {
      setActionLoading(true);
      await allowanceService.deleteAllowance(selectedItem.allowanceId);
      toast.success('Xóa phụ cấp thành công');
      setShowDeleteModal(false);
      setSelectedItem(null);
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const getTypeLabel = (type: AllowanceType) => {
    const typeLabels: Record<AllowanceType, string> = {
      TRANSPORT: 'Phụ cấp đi lại',
      MEAL: 'Phụ cấp ăn uống',
      PHONE: 'Phụ cấp điện thoại',
      HOUSING: 'Phụ cấp nhà ở',
      OTHER: 'Khác',
    };
    return typeLabels[type] || type;
  };

  if (!managerBranch) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          <p>Bạn chưa được gán vào chi nhánh nào. Vui lòng liên hệ Admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quản lý phụ cấp</h1>
        <p className="text-sm text-gray-600 mt-1">
          Quản lý phụ cấp cho nhân viên trong chi nhánh {managerBranch.name}
        </p>
      </div>

      {/* Actions */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
        >
          <Plus className="w-4 h-4" />
          Tạo phụ cấp tùy chỉnh
        </button>
        <button
          onClick={handleApplyTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Áp dụng template
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nhân viên
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kỳ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loại
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số tiền
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              ) : allowances.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                allowances.map((allowance) => {
                  const staff = staffList.find((s) => s.userId === allowance.userId);
                  return (
                    <tr key={allowance.allowanceId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {staff?.fullname || `User #${allowance.userId}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{allowance.period}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getTypeLabel(allowance.allowanceType)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(allowance.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            allowance.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {allowance.status === 'ACTIVE' ? 'Đang áp dụng' : 'Không áp dụng'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(allowance)}
                            className="text-amber-600 hover:text-amber-900"
                            title="Sửa"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedItem(allowance);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-600 hover:text-red-900"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && createPortal(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1300]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {selectedItem ? 'Sửa phụ cấp' : 'Tạo phụ cấp tùy chỉnh'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setSelectedItem(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nhân viên <span className="text-red-500">*</span>
                </label>
                <select
                  value={formUserId || ''}
                  onChange={(e) => setFormUserId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  required
                  disabled={!!selectedItem}
                >
                  <option value="">Chọn nhân viên</option>
                  {staffList.map((staff) => (
                    <option key={staff.userId} value={staff.userId}>
                      {staff.fullname || staff.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kỳ lương (YYYY-MM) <span className="text-red-500">*</span>
                </label>
                <input
                  type="month"
                  value={formPeriod}
                  onChange={(e) => setFormPeriod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  required
                  disabled={!!selectedItem}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loại <span className="text-red-500">*</span>
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  required
                >
                  <option value="">Chọn loại</option>
                  <option value="TRANSPORT">Phụ cấp đi lại</option>
                  <option value="MEAL">Phụ cấp ăn uống</option>
                  <option value="PHONE">Phụ cấp điện thoại</option>
                  <option value="HOUSING">Phụ cấp nhà ở</option>
                  <option value="OTHER">Khác</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số tiền <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  required
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  rows={3}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setSelectedItem(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={actionLoading}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                {actionLoading ? 'Đang xử lý...' : selectedItem ? 'Cập nhật' : 'Tạo'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Apply Template Modal */}
      {showApplyTemplateModal && createPortal(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1300]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Áp dụng template</h3>
              <button onClick={() => setShowApplyTemplateModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nhân viên <span className="text-red-500">*</span>
                </label>
                <select
                  value={formUserId || ''}
                  onChange={(e) => setFormUserId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  required
                >
                  <option value="">Chọn nhân viên</option>
                  {staffList.map((staff) => (
                    <option key={staff.userId} value={staff.userId}>
                      {staff.fullname || staff.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kỳ lương (YYYY-MM) <span className="text-red-500">*</span>
                </label>
                <input
                  type="month"
                  value={formPeriod}
                  onChange={(e) => setFormPeriod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedTemplateId || ''}
                  onChange={(e) => {
                    setSelectedTemplateId(e.target.value ? Number(e.target.value) : '');
                    const template = templates.find((t) => t.templateId === Number(e.target.value));
                    if (template) {
                      setTemplateAmountOverride(template.amount);
                      setTemplateDescriptionOverride(template.description);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  required
                >
                  <option value="">Chọn template</option>
                  {templates.map((template) => (
                    <option key={template.templateId} value={template.templateId}>
                      {template.name} - {formatCurrency(template.amount)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số tiền (tùy chọn, để ghi đè)
                </label>
                <input
                  type="number"
                  value={templateAmountOverride}
                  onChange={(e) => setTemplateAmountOverride(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả (tùy chọn, để ghi đè)
                </label>
                <textarea
                  value={templateDescriptionOverride}
                  onChange={(e) => setTemplateDescriptionOverride(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  rows={3}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowApplyTemplateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleApplyTemplateSubmit}
                disabled={actionLoading}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                {actionLoading ? 'Đang xử lý...' : 'Áp dụng'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Modal */}
      <ConfirmModal
        open={showDeleteModal}
        title="Xóa phụ cấp"
        description="Bạn có chắc chắn muốn xóa phụ cấp này?"
        confirmText="Xóa"
        cancelText="Hủy"
        onConfirm={handleDelete}
        onCancel={() => {
          setShowDeleteModal(false);
          setSelectedItem(null);
        }}
        loading={actionLoading}
      />
    </div>
  );
};

export default ManagerAllowanceManagement;

