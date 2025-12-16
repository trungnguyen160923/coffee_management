import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Building2, Globe } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  payrollTemplateService,
  AllowanceTemplate,
  BonusTemplate,
  PenaltyConfig,
} from '../../services';
import { branchService } from '../../services';
import { Branch } from '../../types';
import ConfirmModal from '../../components/common/modal/ConfirmModal';
import { PayrollTemplatesSkeleton } from '../../components/admin/skeletons';

type TemplateTab = 'allowance' | 'bonus' | 'penalty';

const AdminPayrollTemplates: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TemplateTab>('allowance');
  const [allowanceTemplates, setAllowanceTemplates] = useState<AllowanceTemplate[]>([]);
  const [bonusTemplates, setBonusTemplates] = useState<BonusTemplate[]>([]);
  const [penaltyConfigs, setPenaltyConfigs] = useState<PenaltyConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form state
  const [formBranchId, setFormBranchId] = useState<number | null>(null);
  const [formName, setFormName] = useState<string>('');
  const [formType, setFormType] = useState<string>('');
  const [formAmount, setFormAmount] = useState<number | ''>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  useEffect(() => {
    fetchBranches();
    fetchTemplates();
  }, [activeTab]);

  const fetchBranches = async () => {
    try {
      const response = await branchService.getBranches();
      setBranches(response.branches || []);
    } catch (err) {
      console.error('Error fetching branches:', err);
    }
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      // Admin chỉ lấy SYSTEM templates (branchId: null), không lấy branch custom
      switch (activeTab) {
        case 'allowance':
          const allowances = await payrollTemplateService.getAllowanceTemplates({ branchId: null });
          setAllowanceTemplates(allowances);
          break;
        case 'bonus':
          const bonuses = await payrollTemplateService.getBonusTemplates({ branchId: null });
          setBonusTemplates(bonuses);
          break;
        case 'penalty':
          const penalties = await payrollTemplateService.getPenaltyConfigs({ branchId: null });
          setPenaltyConfigs(penalties);
          break;
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
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
    const branch = branches.find((b) => b.branchId === branchId);
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <Building2 className="w-3 h-3" />
        {branch?.name || `Branch #${branchId}`}
      </span>
    );
  };

  const handleCreate = () => {
    setSelectedItem(null);
    setFormBranchId(null);
    setFormName('');
    setFormType('');
    setFormAmount('');
    setFormDescription('');
    setFormIsActive(true);
    setShowCreateModal(true);
  };

  const handleEdit = (item: any) => {
    setSelectedItem(item);
    setFormBranchId(item.branchId);
    setFormName(item.name || '');
    setFormType(item.allowanceType || item.bonusType || item.penaltyType);
    setFormAmount(item.amount);
    setFormDescription(item.description || '');
    setFormIsActive(item.isActive);
    setShowEditModal(true);
  };

  const handleDelete = (item: any) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const handleSave = async () => {
    if (!formName || !formType || !formAmount) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setActionLoading(true);
      if (selectedItem) {
        // Update
        switch (activeTab) {
          case 'allowance':
            await payrollTemplateService.updateAllowanceTemplate(selectedItem.templateId, {
              name: formName,
              allowanceType: formType as any,
              amount: formAmount as number,
              description: formDescription,
              isActive: formIsActive,
            });
            break;
          case 'bonus':
            await payrollTemplateService.updateBonusTemplate(selectedItem.templateId, {
              name: formName,
              bonusType: formType as any,
              amount: formAmount as number,
              description: formDescription,
              isActive: formIsActive,
            });
            break;
          case 'penalty':
            await payrollTemplateService.updatePenaltyConfig(selectedItem.configId, {
              name: formName,
              penaltyType: formType as any,
              amount: formAmount as number,
              description: formDescription,
              isActive: formIsActive,
            });
            break;
        }
        toast.success('Template updated successfully');
      } else {
        // Create
        switch (activeTab) {
          case 'allowance':
            await payrollTemplateService.createAllowanceTemplate({
              branchId: formBranchId,
              name: formName,
              allowanceType: formType as any,
              amount: formAmount as number,
              description: formDescription,
            });
            break;
          case 'bonus':
            await payrollTemplateService.createBonusTemplate({
              branchId: formBranchId,
              name: formName,
              bonusType: formType as any,
              amount: formAmount as number,
              description: formDescription,
            });
            break;
          case 'penalty':
            await payrollTemplateService.createPenaltyConfig({
              branchId: formBranchId,
              name: formName,
              penaltyType: formType as any,
              amount: formAmount as number,
              description: formDescription,
            });
            break;
        }
        toast.success('Template created successfully');
      }
      setShowCreateModal(false);
      setShowEditModal(false);
      fetchTemplates();
    } catch (err: any) {
      toast.error(err?.message || 'Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedItem) return;

    try {
      setActionLoading(true);
      switch (activeTab) {
        case 'allowance':
          await payrollTemplateService.deleteAllowanceTemplate(selectedItem.templateId);
          break;
        case 'bonus':
          await payrollTemplateService.deleteBonusTemplate(selectedItem.templateId);
          break;
        case 'penalty':
          await payrollTemplateService.deletePenaltyConfig(selectedItem.configId);
          break;
      }
      toast.success('Template deleted successfully');
      setShowDeleteModal(false);
      setSelectedItem(null);
      fetchTemplates();
    } catch (err: any) {
      toast.error(err?.message || 'Delete failed');
    } finally {
      setActionLoading(false);
    }
  };

  const getTypeOptions = () => {
    switch (activeTab) {
      case 'allowance':
        return ['TRANSPORT', 'MEAL', 'PHONE', 'HOUSING', 'OTHER'];
      case 'bonus':
        return ['PERFORMANCE', 'ATTENDANCE', 'SPECIAL', 'HOLIDAY', 'OTHER'];
      case 'penalty':
        return ['NO_SHOW', 'LATE', 'EARLY_LEAVE', 'MISTAKE', 'VIOLATION', 'OTHER'];
      default:
        return [];
    }
  };

  const getCurrentTemplates = () => {
    switch (activeTab) {
      case 'allowance':
        return allowanceTemplates;
      case 'bonus':
        return bonusTemplates;
      case 'penalty':
        return penaltyConfigs;
      default:
        return [];
    }
  };

  const getItemId = (item: any) => {
    switch (activeTab) {
      case 'allowance':
        return item.templateId;
      case 'bonus':
        return item.templateId;
      case 'penalty':
        return item.configId;
      default:
        return 0;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Template Management</h1>
          <p className="text-sm text-gray-600 mt-1">Manage templates for allowances, bonuses, and penalties</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
        >
          <Plus className="w-4 h-4" />
          Create New
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {(['allowance', 'bonus', 'penalty'] as TemplateTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab === 'allowance' && 'Allowance'}
              {tab === 'bonus' && 'Bonus'}
              {tab === 'penalty' && 'Penalty'}
            </button>
          ))}
        </nav>
      </div>

      {/* Table */}
      {loading ? (
        <PayrollTemplatesSkeleton />
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scope
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getCurrentTemplates().length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      No data
                    </td>
                  </tr>
                ) : (
                  getCurrentTemplates().map((item) => (
                    <tr key={getItemId(item)} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getScopeBadge(item.branchId)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.allowanceType || item.bonusType || item.penaltyType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {item.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {item.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1300]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {selectedItem ? 'Edit Template' : 'Create Template'}
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
                  Scope
                </label>
                <select
                  value={formBranchId || ''}
                  onChange={(e) =>
                    setFormBranchId(e.target.value ? Number(e.target.value) : null)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">SYSTEM (All branches)</option>
                  {branches.map((branch) => (
                    <option key={branch.branchId} value={branch.branchId}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
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
                >
                  <option value="">Select type</option>
                  {getTypeOptions().map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formAmount}
                  onChange={(e) =>
                    setFormAmount(e.target.value ? Number(e.target.value) : '')
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  placeholder="Enter amount"
                  required
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
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
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
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={actionLoading || !formName || !formType || !formAmount}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-400"
              >
                {actionLoading ? 'Processing...' : selectedItem ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <ConfirmModal
        open={showDeleteModal}
        title="Delete Template"
        description="Are you sure you want to delete this template?"
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setShowDeleteModal(false);
          setSelectedItem(null);
        }}
        loading={actionLoading}
      />
    </div>
  );
};

export default AdminPayrollTemplates;

