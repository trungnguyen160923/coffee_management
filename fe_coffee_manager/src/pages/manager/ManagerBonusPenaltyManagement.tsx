import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle, XCircle, Trash2, X, User, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { bonusService, penaltyService } from '../../services';
import { payrollTemplateService } from '../../services';
import { Bonus, Penalty, BonusType, PenaltyType, BonusTemplate, PenaltyConfig } from '../../types';
import { staffService, shiftService } from '../../services';
import { StaffWithUserDto } from '../../types';
import { Shift } from '../../services/shiftService';
import ConfirmModal from '../../components/common/modal/ConfirmModal';

type TabType = 'bonus' | 'penalty';

const ManagerBonusPenaltyManagement: React.FC = () => {
  const { managerBranch } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('bonus');
  
  // Data state
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [staffList, setStaffList] = useState<StaffWithUserDto[]>([]);
  const [templates, setTemplates] = useState<BonusTemplate[] | PenaltyConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApplyTemplateModal, setShowApplyTemplateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Bonus | Penalty | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Form state
  const [formUserId, setFormUserId] = useState<number | ''>('');
  const [formPeriod, setFormPeriod] = useState<string>('');
  const [formType, setFormType] = useState<string>('');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formShiftId, setFormShiftId] = useState<number | ''>('');
  const [formIncidentDate, setFormIncidentDate] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | ''>('');
  const [selectedTemplatePenaltyType, setSelectedTemplatePenaltyType] = useState<string>('');
  const [templateAmountOverride, setTemplateAmountOverride] = useState<number | ''>('');
  const [templateDescriptionOverride, setTemplateDescriptionOverride] = useState<string>('');
  
  // Shifts state (for penalty form)
  const [staffShifts, setStaffShifts] = useState<Shift[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(false);

  useEffect(() => {
    if (managerBranch?.branchId) {
      fetchData();
      fetchStaff();
      fetchTemplates();
    }
  }, [managerBranch, activeTab]);

  // Load shifts khi chọn staff và period (chỉ cho penalty)
  useEffect(() => {
    if (activeTab === 'penalty' && formUserId && formPeriod) {
      fetchStaffShifts(Number(formUserId), formPeriod);
    } else {
      setStaffShifts([]);
      setFormShiftId('');
    }
  }, [formUserId, formPeriod, activeTab]);

  const fetchData = async () => {
    if (!managerBranch?.branchId) return;
    try {
      setLoading(true);
      if (activeTab === 'bonus') {
        const data = await bonusService.getBonuses({
          branchId: managerBranch.branchId,
        });
        setBonuses(data || []);
      } else {
        const data = await penaltyService.getPenalties({
          branchId: managerBranch.branchId,
        });
        setPenalties(data || []);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load data');
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
      if (activeTab === 'bonus') {
        const data = await payrollTemplateService.getBonusTemplatesForManager();
        setTemplates(data as BonusTemplate[]);
      } else {
        const data = await payrollTemplateService.getPenaltyConfigsForManager();
        setTemplates(data as PenaltyConfig[]);
      }
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

  const fetchStaffShifts = async (userId: number, period: string) => {
    try {
      setLoadingShifts(true);
      const shifts = await shiftService.getShiftsByStaffAndPeriod(userId, period);
      setStaffShifts(shifts || []);
    } catch (err: any) {
      console.error('Error fetching shifts:', err);
      setStaffShifts([]);
    } finally {
      setLoadingShifts(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatTime = (timeString: string) => {
    return timeString.substring(0, 5); // HH:mm
  };

  const handleCreate = () => {
    setFormUserId('');
    setFormPeriod(getCurrentMonthPeriod());
    setFormType('');
    setFormAmount('');
    setFormDescription('');
    setFormShiftId('');
    setFormIncidentDate('');
    setShowCreateModal(true);
  };

  const handleApplyTemplate = () => {
    setFormUserId('');
    setFormPeriod(getCurrentMonthPeriod());
    setSelectedTemplateId('');
    setSelectedTemplatePenaltyType('');
    setTemplateAmountOverride('');
    setTemplateDescriptionOverride('');
    setFormShiftId('');
    setFormIncidentDate('');
    setShowApplyTemplateModal(true);
  };

  const handleSave = async () => {
    if (!formUserId || !formPeriod || !formType || !formAmount) {
      toast.error('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      setActionLoading(true);
      if (activeTab === 'bonus') {
        await bonusService.createBonus({
          userId: Number(formUserId),
          period: formPeriod,
          bonusType: formType as BonusType,
          amount: Number(formAmount),
          description: formDescription,
        });
        toast.success('Tạo thưởng thành công');
      } else {
        await penaltyService.createPenalty({
          userId: Number(formUserId),
          period: formPeriod,
          penaltyType: formType as PenaltyType,
          amount: Number(formAmount),
          description: formDescription,
          shiftId: formShiftId ? Number(formShiftId) : null,
          incidentDate: formIncidentDate || null,
        });
        toast.success('Tạo phạt thành công');
      }
      setShowCreateModal(false);
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
      if (activeTab === 'bonus') {
        await bonusService.applyTemplate({
          userId: Number(formUserId),
          period: formPeriod,
          templateId: Number(selectedTemplateId),
          overrideAmount: templateAmountOverride ? Number(templateAmountOverride) : undefined,
          overrideDescription: templateDescriptionOverride || undefined,
        });
        toast.success('Áp dụng template thưởng thành công');
      } else {
        await penaltyService.applyTemplate({
          userId: Number(formUserId),
          period: formPeriod,
          templateId: Number(selectedTemplateId),
          overrideAmount: templateAmountOverride ? Number(templateAmountOverride) : undefined,
          overrideDescription: templateDescriptionOverride || undefined,
          shiftId: formShiftId ? Number(formShiftId) : null,
          incidentDate: formIncidentDate || null,
        });
        toast.success('Áp dụng template phạt thành công');
      }
      setShowApplyTemplateModal(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (item: Bonus | Penalty) => {
    try {
      setActionLoading(true);
      if (activeTab === 'bonus') {
        await bonusService.approveBonus((item as Bonus).bonusId);
        toast.success('Duyệt thưởng thành công');
      } else {
        await penaltyService.approvePenalty((item as Penalty).penaltyId);
        toast.success('Duyệt phạt thành công');
      }
      fetchData();
    } catch (err: any) {
      toast.error(err?.message || 'Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (item: Bonus | Penalty) => {
    const reason = prompt('Nhập lý do từ chối:');
    if (!reason) return;

    try {
      setActionLoading(true);
      if (activeTab === 'bonus') {
        await bonusService.rejectBonus((item as Bonus).bonusId, reason);
        toast.success('Từ chối thưởng thành công');
      } else {
        await penaltyService.rejectPenalty((item as Penalty).penaltyId, reason);
        toast.success('Từ chối phạt thành công');
      }
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
      if (activeTab === 'bonus') {
        await bonusService.deleteBonus((selectedItem as Bonus).bonusId);
        toast.success('Xóa thưởng thành công');
      } else {
        await penaltyService.deletePenalty((selectedItem as Penalty).penaltyId);
        toast.success('Xóa phạt thành công');
      }
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      PENDING: { label: 'Chờ duyệt', className: 'bg-yellow-100 text-yellow-800' },
      APPROVED: { label: 'Đã duyệt', className: 'bg-green-100 text-green-800' },
      REJECTED: { label: 'Đã từ chối', className: 'bg-red-100 text-red-800' },
    };
    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const getTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      // Bonus types
      PERFORMANCE: 'Hiệu suất',
      ATTENDANCE: 'Chuyên cần',
      SPECIAL: 'Đặc biệt',
      HOLIDAY: 'Lễ tết',
      OTHER: 'Khác',
      // Penalty types
      NO_SHOW: 'Vắng mặt',
      LATE: 'Đi muộn',
      EARLY_LEAVE: 'Về sớm',
      MISTAKE: 'Sai sót',
      VIOLATION: 'Vi phạm',
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

  const currentData = activeTab === 'bonus' ? bonuses : penalties;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Quản lý {activeTab === 'bonus' ? 'Thưởng' : 'Phạt'}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Quản lý {activeTab === 'bonus' ? 'thưởng' : 'phạt'} cho nhân viên trong chi nhánh {managerBranch.name}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('bonus')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'bonus'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Thưởng
          </button>
          <button
            onClick={() => setActiveTab('penalty')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'penalty'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Phạt
          </button>
        </nav>
      </div>

      {/* Actions */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
        >
          <Plus className="w-4 h-4" />
          Tạo {activeTab === 'bonus' ? 'thưởng' : 'phạt'} tùy chỉnh
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
                {activeTab === 'penalty' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ca làm việc
                  </th>
                )}
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
                  <td colSpan={activeTab === 'penalty' ? 7 : 6} className="px-6 py-8 text-center text-gray-500">
                    Đang tải...
                  </td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'penalty' ? 7 : 6} className="px-6 py-8 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                currentData.map((item) => {
                  const staff = staffList.find((s) => s.userId === item.userId);
                  return (
                    <tr key={activeTab === 'bonus' ? (item as Bonus).bonusId : (item as Penalty).penaltyId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            {staff?.fullname || `User #${item.userId}`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{item.period}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getTypeLabel(activeTab === 'bonus' ? (item as Bonus).bonusType : (item as Penalty).penaltyType)}
                      </td>
                      {activeTab === 'penalty' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(item as Penalty).shiftId ? (
                            <span className="text-blue-600 hover:underline cursor-pointer" title={`Ca #${(item as Penalty).shiftId}`}>
                              Ca #{(item as Penalty).shiftId}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          {item.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleApprove(item)}
                                className="text-green-600 hover:text-green-900"
                                title="Duyệt"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReject(item)}
                                className="text-red-600 hover:text-red-900"
                                title="Từ chối"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedItem(item);
                                  setShowDeleteModal(true);
                                }}
                                className="text-gray-600 hover:text-gray-900"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
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

      {/* Create Modal */}
      {showCreateModal && createPortal(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1300]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Tạo {activeTab === 'bonus' ? 'thưởng' : 'phạt'} tùy chỉnh
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
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
                  Loại <span className="text-red-500">*</span>
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  required
                >
                  <option value="">Chọn loại</option>
                  {activeTab === 'bonus' ? (
                    <>
                      <option value="PERFORMANCE">Hiệu suất</option>
                      <option value="ATTENDANCE">Chuyên cần</option>
                      <option value="SPECIAL">Đặc biệt</option>
                      <option value="HOLIDAY">Lễ tết</option>
                      <option value="OTHER">Khác</option>
                    </>
                  ) : (
                    <>
                      <option value="NO_SHOW">Vắng mặt</option>
                      <option value="LATE">Đi muộn</option>
                      <option value="EARLY_LEAVE">Về sớm</option>
                      <option value="MISTAKE">Sai sót</option>
                      <option value="VIOLATION">Vi phạm</option>
                      <option value="OTHER">Khác</option>
                    </>
                  )}
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
              {/* Chỉ hiện cho penalty và các loại liên quan đến shift */}
              {activeTab === 'penalty' && 
                (formType === 'LATE' || formType === 'EARLY_LEAVE' || formType === 'NO_SHOW') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ca làm việc <span className="text-gray-500 text-xs">(tùy chọn)</span>
                      </label>
                      <select
                        value={formShiftId || ''}
                        onChange={(e) => setFormShiftId(e.target.value ? Number(e.target.value) : '')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                        disabled={loadingShifts || !formUserId || !formPeriod}
                      >
                        <option value="">Không chọn ca (phạt chung)</option>
                        {staffShifts.map((shift) => (
                          <option key={shift.shiftId} value={shift.shiftId}>
                            {formatDate(shift.shiftDate)} - {formatTime(shift.startTime)} → {formatTime(shift.endTime)}
                          </option>
                        ))}
                      </select>
                      {loadingShifts && (
                        <p className="mt-1 text-sm text-gray-500">Đang tải danh sách ca...</p>
                      )}
                      {!loadingShifts && formUserId && formPeriod && staffShifts.length === 0 && (
                        <p className="mt-1 text-sm text-gray-500">Nhân viên chưa có ca làm việc trong kỳ này</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ngày xảy ra <span className="text-gray-500 text-xs">(tùy chọn)</span>
                      </label>
                      <input
                        type="date"
                        value={formIncidentDate}
                        onChange={(e) => setFormIncidentDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </>
                )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={actionLoading}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                {actionLoading ? 'Đang xử lý...' : 'Tạo'}
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
                    const template = templates.find((t) => 
                      (activeTab === 'bonus' ? (t as BonusTemplate).templateId : (t as PenaltyConfig).configId) === Number(e.target.value)
                    );
                    if (template) {
                      setTemplateAmountOverride(template.amount);
                      setTemplateDescriptionOverride(template.description);
                      // Lưu penaltyType nếu là penalty template
                      if (activeTab === 'penalty') {
                        setSelectedTemplatePenaltyType((template as PenaltyConfig).penaltyType);
                      } else {
                        setSelectedTemplatePenaltyType('');
                      }
                    } else {
                      setSelectedTemplatePenaltyType('');
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  required
                >
                  <option value="">Chọn template</option>
                  {templates.map((template) => {
                    const id = activeTab === 'bonus' ? (template as BonusTemplate).templateId : (template as PenaltyConfig).configId;
                    return (
                      <option key={id} value={id}>
                        {template.name} - {formatCurrency(template.amount)}
                      </option>
                    );
                  })}
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
              {/* Chỉ hiện cho penalty và các loại liên quan đến shift */}
              {activeTab === 'penalty' && 
                selectedTemplatePenaltyType &&
                (selectedTemplatePenaltyType === 'LATE' || 
                 selectedTemplatePenaltyType === 'EARLY_LEAVE' || 
                 selectedTemplatePenaltyType === 'NO_SHOW') && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ca làm việc <span className="text-gray-500 text-xs">(tùy chọn)</span>
                      </label>
                      <select
                        value={formShiftId || ''}
                        onChange={(e) => setFormShiftId(e.target.value ? Number(e.target.value) : '')}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                        disabled={loadingShifts || !formUserId || !formPeriod}
                      >
                        <option value="">Không chọn ca (phạt chung)</option>
                        {staffShifts.map((shift) => (
                          <option key={shift.shiftId} value={shift.shiftId}>
                            {formatDate(shift.shiftDate)} - {formatTime(shift.startTime)} → {formatTime(shift.endTime)}
                          </option>
                        ))}
                      </select>
                      {loadingShifts && (
                        <p className="mt-1 text-sm text-gray-500">Đang tải danh sách ca...</p>
                      )}
                      {!loadingShifts && formUserId && formPeriod && staffShifts.length === 0 && (
                        <p className="mt-1 text-sm text-gray-500">Nhân viên chưa có ca làm việc trong kỳ này</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ngày xảy ra <span className="text-gray-500 text-xs">(tùy chọn)</span>
                      </label>
                      <input
                        type="date"
                        value={formIncidentDate}
                        onChange={(e) => setFormIncidentDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </>
                )}
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
        title={`Xóa ${activeTab === 'bonus' ? 'thưởng' : 'phạt'}`}
        description={`Bạn có chắc chắn muốn xóa ${activeTab === 'bonus' ? 'thưởng' : 'phạt'} này?`}
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

export default ManagerBonusPenaltyManagement;

