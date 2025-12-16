import React, { useState, useEffect } from 'react';
import { Eye, Building2, Globe, CheckCircle, X, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import { payrollTemplateService } from '../../services';
import { staffService, bonusService, penaltyService, allowanceService } from '../../services';
import { AllowanceTemplate, BonusTemplate, PenaltyConfig, StaffWithUserDto } from '../../types';
import ConfirmModal from '../../components/common/modal/ConfirmModal';
import { ManagerPayrollTemplatesSkeleton } from '../../components/manager/skeletons';

type TemplateTab = 'allowance' | 'bonus' | 'penalty';

const ManagerPayrollTemplates: React.FC = () => {
  const { managerBranch } = useAuth();
  const [activeTab, setActiveTab] = useState<TemplateTab>('allowance');
  const [allowanceTemplates, setAllowanceTemplates] = useState<AllowanceTemplate[]>([]);
  const [bonusTemplates, setBonusTemplates] = useState<BonusTemplate[]>([]);
  const [penaltyConfigs, setPenaltyConfigs] = useState<PenaltyConfig[]>([]);
  const [staffList, setStaffList] = useState<StaffWithUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Apply template modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<AllowanceTemplate | BonusTemplate | PenaltyConfig | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [formPeriod, setFormPeriod] = useState<string>('');
  const [templateAmountOverride, setTemplateAmountOverride] = useState<number | ''>('');
  const [templateDescriptionOverride, setTemplateDescriptionOverride] = useState<string>('');

  // Create template modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formName, setFormName] = useState<string>('');
  const [formType, setFormType] = useState<string>('');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formCriteriaRef, setFormCriteriaRef] = useState<string>('');

  // Edit template modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<AllowanceTemplate | BonusTemplate | PenaltyConfig | null>(null);
  const [templateUsageCount, setTemplateUsageCount] = useState<number>(0);
  const [editFormName, setEditFormName] = useState<string>('');
  const [editFormType, setEditFormType] = useState<string>('');
  const [editFormAmount, setEditFormAmount] = useState<number | ''>('');
  const [editFormDescription, setEditFormDescription] = useState<string>('');
  const [editFormCriteriaRef, setEditFormCriteriaRef] = useState<string>('');
  const [editFormIsActive, setEditFormIsActive] = useState<boolean>(true);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState<AllowanceTemplate | BonusTemplate | PenaltyConfig | null>(null);

  useEffect(() => {
    if (managerBranch?.branchId) {
      fetchTemplates();
      fetchStaff();
    }
  }, [managerBranch, activeTab]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      // Delay 2s for testing skeleton
      await new Promise(resolve => setTimeout(resolve, 2000));
      switch (activeTab) {
        case 'allowance':
          const allowances = await payrollTemplateService.getAllowanceTemplatesForManager();
          setAllowanceTemplates(allowances || []);
          break;
        case 'bonus':
          const bonuses = await payrollTemplateService.getBonusTemplatesForManager();
          setBonusTemplates(bonuses || []);
          break;
        case 'penalty':
          const penalties = await payrollTemplateService.getPenaltyConfigsForManager();
          setPenaltyConfigs(penalties || []);
          break;
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load templates');
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

  const getCurrentMonthPeriod = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const handleCreateTemplate = () => {
    setFormName('');
    setFormType('');
    setFormAmount('');
    setFormDescription('');
    setFormCriteriaRef('');
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async () => {
    if (!formName || !formType || !formAmount) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setActionLoading(true);
      
      if (activeTab === 'allowance') {
        await payrollTemplateService.createAllowanceTemplateForManager({
          name: formName,
          allowanceType: formType as any,
          amount: Number(formAmount),
          description: formDescription || undefined,
        });
        toast.success('Allowance template created successfully');
      } else if (activeTab === 'bonus') {
        await payrollTemplateService.createBonusTemplateForManager({
          name: formName,
          bonusType: formType as any,
          amount: Number(formAmount),
          description: formDescription || undefined,
          criteriaRef: formCriteriaRef || undefined,
        });
        toast.success('Bonus template created successfully');
      } else {
        await payrollTemplateService.createPenaltyConfigForManager({
          name: formName,
          penaltyType: formType as any,
          amount: Number(formAmount),
          description: formDescription || undefined,
        });
        toast.success('Penalty config created successfully');
      }
      
      setShowCreateModal(false);
      setFormName('');
      setFormType('');
      setFormAmount('');
      setFormDescription('');
      setFormCriteriaRef('');
      fetchTemplates();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create template');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditTemplate = async (template: AllowanceTemplate | BonusTemplate | PenaltyConfig) => {
    setEditingTemplate(template);
    setEditFormName(template.name);
    setEditFormAmount(template.amount);
    setEditFormDescription(template.description || '');
    if (activeTab === 'allowance') {
      setEditFormType((template as AllowanceTemplate).allowanceType);
    } else if (activeTab === 'bonus') {
      setEditFormType((template as BonusTemplate).bonusType);
      setEditFormCriteriaRef((template as BonusTemplate).criteriaRef || '');
    } else {
      setEditFormType((template as PenaltyConfig).penaltyType);
    }
    setEditFormIsActive(template.isActive);
    
    // Fetch template detail để lấy usageCount
    try {
      let detail: AllowanceTemplate | BonusTemplate | PenaltyConfig;
      if (activeTab === 'allowance') {
        detail = await payrollTemplateService.getAllowanceTemplateById((template as AllowanceTemplate).templateId);
      } else if (activeTab === 'bonus') {
        detail = await payrollTemplateService.getBonusTemplateById((template as BonusTemplate).templateId);
      } else {
        detail = await payrollTemplateService.getPenaltyConfigById((template as PenaltyConfig).configId);
      }
      setTemplateUsageCount(detail.usageCount || 0);
    } catch (err: any) {
      console.error('Error fetching template detail:', err);
      setTemplateUsageCount(0);
    }
    
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!editFormName || !editFormType || !editFormAmount || !editingTemplate) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setActionLoading(true);
      
      if (activeTab === 'allowance') {
        await payrollTemplateService.updateAllowanceTemplateForManager(
          (editingTemplate as AllowanceTemplate).templateId,
          {
            name: editFormName,
            allowanceType: editFormType as any,
            amount: Number(editFormAmount),
            description: editFormDescription || undefined,
            isActive: editFormIsActive,
          }
        );
        toast.success('Allowance template updated successfully');
      } else if (activeTab === 'bonus') {
        await payrollTemplateService.updateBonusTemplateForManager(
          (editingTemplate as BonusTemplate).templateId,
          {
            name: editFormName,
            bonusType: editFormType as any,
            amount: Number(editFormAmount),
            description: editFormDescription || undefined,
            criteriaRef: editFormCriteriaRef || undefined,
            isActive: editFormIsActive,
          }
        );
        toast.success('Bonus template updated successfully');
      } else {
        await payrollTemplateService.updatePenaltyConfigForManager(
          (editingTemplate as PenaltyConfig).configId,
          {
            name: editFormName,
            penaltyType: editFormType as any,
            amount: Number(editFormAmount),
            description: editFormDescription || undefined,
            isActive: editFormIsActive,
          }
        );
        toast.success('Penalty config updated successfully');
      }
      
      setShowEditModal(false);
      setEditingTemplate(null);
      setTemplateUsageCount(0);
      fetchTemplates();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update template');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteTemplate = (template: AllowanceTemplate | BonusTemplate | PenaltyConfig) => {
    setDeletingTemplate(template);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingTemplate) return;

    try {
      setActionLoading(true);
      
      if (activeTab === 'allowance') {
        await payrollTemplateService.deleteAllowanceTemplateForManager(
          (deletingTemplate as AllowanceTemplate).templateId
        );
        toast.success('Allowance template deleted successfully');
      } else if (activeTab === 'bonus') {
        await payrollTemplateService.deleteBonusTemplateForManager(
          (deletingTemplate as BonusTemplate).templateId
        );
        toast.success('Bonus template deleted successfully');
      } else {
        await payrollTemplateService.deletePenaltyConfigForManager(
          (deletingTemplate as PenaltyConfig).configId
        );
        toast.success('Penalty config deleted successfully');
      }
      
      setShowDeleteModal(false);
      setDeletingTemplate(null);
      fetchTemplates();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete template');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApplyTemplate = (template: AllowanceTemplate | BonusTemplate | PenaltyConfig) => {
    setSelectedTemplate(template);
    setSelectedUserIds([]);
    setFormPeriod(getCurrentMonthPeriod());
    setTemplateAmountOverride(template.amount);
    setTemplateDescriptionOverride(template.description);
    setShowApplyModal(true);
  };

  const handleSelectAllStaff = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(staffList.map((staff) => staff.userId));
    } else {
      setSelectedUserIds([]);
    }
  };

  const handleToggleStaff = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleApplySubmit = async () => {
    if (!selectedTemplate || selectedUserIds.length === 0 || !formPeriod) {
      toast.error('Please select at least one employee');
      return;
    }

    try {
      setActionLoading(true);
      const templateId = activeTab === 'allowance'
        ? (selectedTemplate as AllowanceTemplate).templateId
        : activeTab === 'bonus'
        ? (selectedTemplate as BonusTemplate).templateId
        : (selectedTemplate as PenaltyConfig).configId;

      let successCount = 0;
      let errorCount = 0;

      // Apply template cho từng nhân viên
      for (const userId of selectedUserIds) {
        try {
          if (activeTab === 'allowance') {
            await allowanceService.applyTemplate({
              userId,
              period: formPeriod,
              templateId,
              overrideAmount: templateAmountOverride ? Number(templateAmountOverride) : undefined,
              overrideDescription: templateDescriptionOverride || undefined,
            });
          } else if (activeTab === 'bonus') {
            await bonusService.applyTemplate({
              userId,
              period: formPeriod,
              templateId,
              overrideAmount: templateAmountOverride ? Number(templateAmountOverride) : undefined,
              overrideDescription: templateDescriptionOverride || undefined,
            });
          } else {
            await penaltyService.applyTemplate({
              userId,
              period: formPeriod,
              templateId,
              overrideAmount: templateAmountOverride ? Number(templateAmountOverride) : undefined,
              overrideDescription: templateDescriptionOverride || undefined,
            });
          }
          successCount++;
        } catch (err: any) {
          errorCount++;
          console.error(`Error applying template for user ${userId}:`, err);
        }
      }

      if (errorCount === 0) {
        toast.success(`Template applied successfully to ${successCount} staff`);
      } else if (successCount > 0) {
        toast.success(`Template applied to ${successCount} staff, ${errorCount} errors`);
      } else {
        toast.error(`Failed to apply template to all staff`);
      }

      setShowApplyModal(false);
      setSelectedTemplate(null);
      setSelectedUserIds([]);
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

  const getScopeBadge = (branchId: number | null) => {
    if (branchId === null) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Globe className="w-3 h-3" />
          SYSTEM
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <Building2 className="w-3 h-3" />
        {managerBranch?.name || `Branch #${branchId}`}
      </span>
    );
  };

  const getTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      // Allowance types
      TRANSPORT: 'Transport',
      MEAL: 'Meal',
      PHONE: 'Phone',
      HOUSING: 'Housing',
      OTHER: 'Other',
      // Bonus types
      PERFORMANCE: 'Performance',
      ATTENDANCE: 'Attendance',
      SPECIAL: 'Special',
      HOLIDAY: 'Holiday',
      // Penalty types
      NO_SHOW: 'No Show',
      LATE: 'Late',
      EARLY_LEAVE: 'Early Leave',
      MISTAKE: 'Mistake',
      VIOLATION: 'Violation',
    };
    return typeLabels[type] || type;
  };

  if (!managerBranch) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          <p>You are not assigned to any branch. Please contact Admin.</p>
        </div>
      </div>
    );
  }

  // Show skeleton during initial load (when switching tabs or first load)
  if (loading) {
    // Check if current tab has no data yet
    const hasNoDataForCurrentTab = 
      (activeTab === 'allowance' && allowanceTemplates.length === 0) ||
      (activeTab === 'bonus' && bonusTemplates.length === 0) ||
      (activeTab === 'penalty' && penaltyConfigs.length === 0);
    
    if (hasNoDataForCurrentTab) {
      return <ManagerPayrollTemplatesSkeleton />;
    }
  }

  const currentTemplates =
    activeTab === 'allowance'
      ? allowanceTemplates
      : activeTab === 'bonus'
      ? bonusTemplates
      : penaltyConfigs;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payroll Templates</h1>
        <p className="text-sm text-gray-600 mt-1">
          View, create, and apply templates for staff in {managerBranch.name} branch
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex items-center justify-between">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('allowance')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'allowance'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Allowance
            </button>
            <button
              onClick={() => setActiveTab('bonus')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'bonus'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Bonus
            </button>
            <button
              onClick={() => setActiveTab('penalty')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'penalty'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Penalty
            </button>
          </nav>
          <button
            onClick={handleCreateTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </button>
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : currentTemplates.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No templates available</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentTemplates.map((template) => (
            <div
              key={
                activeTab === 'allowance'
                  ? (template as AllowanceTemplate).templateId
                  : activeTab === 'bonus'
                  ? (template as BonusTemplate).templateId
                  : (template as PenaltyConfig).configId
              }
              className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
                  {getScopeBadge(template.branchId)}
                </div>
                <div className="flex items-center gap-2">
                  {!template.isActive && (
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                      Inactive
                    </span>
                  )}
                  {/* Chỉ hiển thị Edit/Delete cho template của branch (không phải SYSTEM) */}
                  {template.branchId !== null && (
                    <>
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="p-1.5 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                        title="Edit template"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template)}
                        className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete template"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium text-gray-900">
                    {getTypeLabel(
                      activeTab === 'allowance'
                        ? (template as AllowanceTemplate).allowanceType
                        : activeTab === 'bonus'
                        ? (template as BonusTemplate).bonusType
                        : (template as PenaltyConfig).penaltyType
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium text-gray-900">{formatCurrency(template.amount)}</span>
                </div>
                <div className="text-sm text-gray-600 mt-2 min-h-[48px]">
                  {template.description ? (
                    <p className="line-clamp-2">{template.description}</p>
                  ) : (
                    // Reserve space so cards stay aligned even without description
                    <p className="line-clamp-2 invisible">Placeholder description</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleApplyTemplate(template)}
                disabled={!template.isActive}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Apply to Staff
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Template Modal */}
      {showCreateModal && createPortal(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1300]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create Template</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormName('');
                  setFormType('');
                  setFormAmount('');
                  setFormDescription('');
                  setFormCriteriaRef('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  placeholder="Enter template name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  required
                >
                  <option value="">Select type</option>
                  {activeTab === 'allowance' ? (
                    <>
                      <option value="TRANSPORT">Transport</option>
                      <option value="MEAL">Meal</option>
                      <option value="PHONE">Phone</option>
                      <option value="HOUSING">Housing</option>
                      <option value="OTHER">Other</option>
                    </>
                  ) : activeTab === 'bonus' ? (
                    <>
                      <option value="PERFORMANCE">Performance</option>
                      <option value="ATTENDANCE">Attendance</option>
                      <option value="SPECIAL">Special</option>
                      <option value="HOLIDAY">Holiday</option>
                      <option value="OTHER">Other</option>
                    </>
                  ) : (
                    <>
                      <option value="NO_SHOW">No Show</option>
                      <option value="LATE">Late</option>
                      <option value="EARLY_LEAVE">Early Leave</option>
                      <option value="MISTAKE">Mistake</option>
                      <option value="VIOLATION">Violation</option>
                      <option value="OTHER">Other</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  placeholder="Enter amount"
                  required
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  rows={3}
                  placeholder="Enter description"
                />
              </div>
              {activeTab === 'bonus' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Criteria Reference (optional)
                  </label>
                  <input
                    type="text"
                    value={formCriteriaRef}
                    onChange={(e) => setFormCriteriaRef(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g., MIN_SHIFTS:20,NO_LATE"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Format: MIN_SHIFTS:20,MIN_HOURS:160,NO_LATE, etc.
                  </p>
                </div>
              )}
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Note:</strong> This template will be created for your branch ({managerBranch.name}) only.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormName('');
                  setFormType('');
                  setFormAmount('');
                  setFormDescription('');
                  setFormCriteriaRef('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSubmit}
                disabled={actionLoading || !formName || !formType || !formAmount}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Creating...' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Template Modal */}
      {showEditModal && editingTemplate && createPortal(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1300]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Edit Template</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingTemplate(null);
                  setTemplateUsageCount(0);
                  setEditFormName('');
                  setEditFormType('');
                  setEditFormAmount('');
                  setEditFormDescription('');
                  setEditFormCriteriaRef('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editFormName}
                  onChange={(e) => setEditFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  placeholder="Enter template name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={editFormType}
                  onChange={(e) => setEditFormType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  required
                >
                  <option value="">Select type</option>
                  {activeTab === 'allowance' ? (
                    <>
                      <option value="TRANSPORT">Transport</option>
                      <option value="MEAL">Meal</option>
                      <option value="PHONE">Phone</option>
                      <option value="HOUSING">Housing</option>
                      <option value="OTHER">Other</option>
                    </>
                  ) : activeTab === 'bonus' ? (
                    <>
                      <option value="PERFORMANCE">Performance</option>
                      <option value="ATTENDANCE">Attendance</option>
                      <option value="SPECIAL">Special</option>
                      <option value="HOLIDAY">Holiday</option>
                      <option value="OTHER">Other</option>
                    </>
                  ) : (
                    <>
                      <option value="NO_SHOW">No Show</option>
                      <option value="LATE">Late</option>
                      <option value="EARLY_LEAVE">Early Leave</option>
                      <option value="MISTAKE">Mistake</option>
                      <option value="VIOLATION">Violation</option>
                      <option value="OTHER">Other</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={editFormAmount}
                  onChange={(e) => setEditFormAmount(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  placeholder="Enter amount"
                  required
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editFormDescription}
                  onChange={(e) => setEditFormDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  rows={3}
                  placeholder="Enter description"
                />
              </div>
              {activeTab === 'bonus' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Criteria Reference (optional)
                  </label>
                  <input
                    type="text"
                    value={editFormCriteriaRef}
                    onChange={(e) => setEditFormCriteriaRef(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    placeholder="e.g., MIN_SHIFTS:20,NO_LATE"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Format: MIN_SHIFTS:20,MIN_HOURS:160,NO_LATE, etc.
                  </p>
                </div>
              )}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormIsActive}
                    onChange={(e) => setEditFormIsActive(e.target.checked)}
                    className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>
              {templateUsageCount > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>⚠️ Warning:</strong> This template has been used <strong>{templateUsageCount}</strong> time{templateUsageCount > 1 ? 's' : ''}. 
                    Updates will only affect new records created after this change. Existing records will remain unchanged.
                  </p>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingTemplate(null);
                  setTemplateUsageCount(0);
                  setEditFormName('');
                  setEditFormType('');
                  setEditFormAmount('');
                  setEditFormDescription('');
                  setEditFormCriteriaRef('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={actionLoading || !editFormName || !editFormType || !editFormAmount}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading ? 'Updating...' : 'Update Template'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirm Modal */}
      <ConfirmModal
        open={showDeleteModal}
        onCancel={() => {
          setShowDeleteModal(false);
          setDeletingTemplate(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Template"
        description={
          deletingTemplate
            ? `Are you sure you want to delete "${deletingTemplate.name}"? This will deactivate the template (soft delete).`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        loading={actionLoading}
      />

      {/* Apply Template Modal */}
      {showApplyModal && selectedTemplate && createPortal(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1300]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Apply Template</h3>
              <button
                onClick={() => {
                  setShowApplyModal(false);
                  setSelectedTemplate(null);
                  setSelectedUserIds([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900 mb-1">{selectedTemplate.name}</p>
                <p className="text-sm text-gray-600">
                  {formatCurrency(selectedTemplate.amount)} - {getTypeLabel(
                    activeTab === 'allowance'
                      ? (selectedTemplate as AllowanceTemplate).allowanceType
                      : activeTab === 'bonus'
                      ? (selectedTemplate as BonusTemplate).bonusType
                      : (selectedTemplate as PenaltyConfig).penaltyType
                  )}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Staff <span className="text-red-500">*</span>
                  {selectedUserIds.length > 0 && (
                    <span className="ml-2 text-xs text-gray-500">
                      ({selectedUserIds.length} selected)
                    </span>
                  )}
                </label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-60 overflow-y-auto bg-gray-50">
                  {staffList.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-2">
                      {loadingStaff ? 'Loading...' : 'No staff available'}
                    </p>
                  ) : (
                    <>
                      <div className="mb-2 pb-2 border-b border-gray-200">
                        <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.length === staffList.length && staffList.length > 0}
                            onChange={(e) => handleSelectAllStaff(e.target.checked)}
                            className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                          />
                          <span className="text-sm font-medium text-gray-900">
                            Select All ({staffList.length})
                          </span>
                        </label>
                      </div>
                      <div className="space-y-1">
                        {staffList.map((staff) => (
                          <label
                            key={staff.userId}
                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={selectedUserIds.includes(staff.userId)}
                              onChange={() => handleToggleStaff(staff.userId)}
                              className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                            />
                            <span className="text-sm text-gray-900">
                              {staff.fullname || staff.email}
                            </span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pay Period (YYYY-MM) <span className="text-red-500">*</span>
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
                  Amount (optional, to override)
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
                  Description (optional, to override)
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
                onClick={() => {
                  setShowApplyModal(false);
                  setSelectedTemplate(null);
                  setSelectedUserIds([]);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApplySubmit}
                disabled={actionLoading || selectedUserIds.length === 0}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading
                  ? `Processing... (${selectedUserIds.length} staff)`
                  : `Apply to ${selectedUserIds.length} staff`}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ManagerPayrollTemplates;

