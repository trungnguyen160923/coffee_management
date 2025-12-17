import { useEffect, useMemo, useState } from 'react';
import { Plus, Edit2, Trash2, Clock4, Users, Loader2, RefreshCw, X, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { shiftTemplateService, ShiftTemplate, ShiftTemplateFormValues, TemplateRoleRequirement, EmploymentType } from '../../services/shiftTemplateService';
import { ShiftTemplatesSkeleton } from '../../components/manager/skeletons';
import ConfirmModal from '../../components/common/ConfirmModal';
import authService, { StaffBusinessRole } from '../../services/authService';

interface FormState extends ShiftTemplateFormValues {
  isActive?: boolean;
}

type Mode = 'create' | 'edit';

export default function ShiftTemplateManagement() {
  const { user, managerBranch } = useAuth();
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');
  const [templateToDelete, setTemplateToDelete] = useState<ShiftTemplate | null>(null);
  const [templateToView, setTemplateToView] = useState<ShiftTemplate | null>(null);
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    startTime?: string;
    endTime?: string;
    maxStaffAllowed?: string;
    roleRequirements?: string;
  }>({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('create');
  const [selectedTemplate, setSelectedTemplate] = useState<ShiftTemplate | null>(null);
  const [form, setForm] = useState<FormState>({
    name: '',
    startTime: '08:00:00',
    endTime: '14:00:00',
    maxStaffAllowed: 4,
    description: '',
    isActive: true,
    roleRequirements: [],
  });

  const [availableRoles, setAvailableRoles] = useState<StaffBusinessRole[]>([]);
  const [newRoleRequirement, setNewRoleRequirement] = useState<{
    roleId: number | '';
    quantity: number;
    required: boolean;
    notes: string;
  }>({
    roleId: '',
    quantity: 1,
    required: true,
    notes: '',
  });

  // Calculate total role requirements quantity (for UI only)
  const totalRoleQuantity = useMemo(() => {
    return form.roleRequirements?.reduce((sum, req) => sum + req.quantity, 0) || 0;
  }, [form.roleRequirements]);

  // Calculate maximum quantity per single role - this is the strict lower bound
  // on number of staff needed, because one staff can cover multiple roles but
  // cannot fill multiple positions of the same role at once.
  const maxRoleQuantity = useMemo(() => {
    if (!form.roleRequirements || form.roleRequirements.length === 0) return 0;
    return form.roleRequirements.reduce((max, req) => Math.max(max, req.quantity || 0), 0);
  }, [form.roleRequirements]);

  // Check mismatches between role requirements and maxStaffAllowed
  const roleRequirementWarning = useMemo(() => {
    if (!form.maxStaffAllowed || !form.roleRequirements || form.roleRequirements.length === 0) {
      return null;
    }

    // Hard invalid case: at least one role requires more staff than maxStaffAllowed
    if (maxRoleQuantity > form.maxStaffAllowed) {
      return {
        type: 'error' as const,
        message: `Invalid configuration: at least one role requires ${maxRoleQuantity} staff, `
          + `but max staff allowed is only ${form.maxStaffAllowed}. Increase max staff or reduce that role's quantity.`,
      };
    }

    // Soft warning/info: total positions vs max staff (since one staff can have multiple roles)
    if (totalRoleQuantity > form.maxStaffAllowed) {
      return {
        type: 'warning' as const,
        message: `Total role requirements (${totalRoleQuantity}) exceeds max staff allowed (${form.maxStaffAllowed}). `
          + `Note: One person can have multiple roles, so this might still be valid if staff can cover multiple positions.`,
      };
    }
    if (totalRoleQuantity === form.maxStaffAllowed) {
      return {
        type: 'info' as const,
        message: `Total role requirements (${totalRoleQuantity}) equals max staff allowed. `
          + `Each staff member would need to cover exactly one position.`,
      };
    }
    return null;
  }, [totalRoleQuantity, maxRoleQuantity, form.maxStaffAllowed, form.roleRequirements]);

  const branchId = useMemo(() => {
    if (managerBranch?.branchId) return managerBranch.branchId;
    if (user?.branch?.branchId) return user.branch.branchId;
    if (user?.branchId) return Number(user.branchId);
    return null;
  }, [user, managerBranch]);

  const branchName = managerBranch?.name || user?.branch?.name || 'Branch';
  const branchOpenHours =
    managerBranch?.openHours && managerBranch?.endHours
      ? `${managerBranch.openHours?.slice(0, 5)} – ${managerBranch.endHours?.slice(0, 5)}`
      : null;

  const loadTemplates = async () => {
    if (!branchId) {
      toast.error('Branch not found');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data =
        activeTab === 'active'
          ? await shiftTemplateService.getByBranch(branchId)
          : await shiftTemplateService.getInactiveByBranch(branchId);
      
      setTemplates(data);
    } catch (e: any) {
      console.error('Failed to load shift templates', e);
      toast.error(e.message || 'Failed to load shift templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, activeTab]);

  useEffect(() => {
    // Load available staff business roles
    authService
      .getStaffBusinessRoles()
      .then((roles) => {
        setAvailableRoles(roles || []);
      })
      .catch((e) => {
        console.error('Failed to load staff business roles', e);
        setAvailableRoles([]);
      });
  }, []);

  const openCreateModal = () => {
    setMode('create');
    setSelectedTemplate(null);
    setForm({
      name: '',
      startTime: '08:00:00',
      endTime: '14:00:00',
      maxStaffAllowed: 4,
      employmentType: 'ANY',
      description: '',
      isActive: true,
      roleRequirements: [],
    });
    setNewRoleRequirement({
      roleId: '',
      quantity: 1,
      required: true,
      notes: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (template: ShiftTemplate) => {
    setMode('edit');
    setSelectedTemplate(template);
    setForm({
      name: template.name,
      startTime: template.startTime,
      endTime: template.endTime,
      maxStaffAllowed: template.maxStaffAllowed ?? undefined,
      employmentType: template.employmentType ?? 'ANY',
      description: template.description ?? '',
      isActive: template.isActive,
      roleRequirements: template.roleRequirements || [],
    });
    setNewRoleRequirement({
      roleId: '',
      quantity: 1,
      required: true,
      notes: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleInputChange = (field: keyof FormState, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addRoleRequirement = () => {
    if (!newRoleRequirement.roleId || newRoleRequirement.quantity < 1) {
      toast.error('Please select a role and set quantity (at least 1)');
      return;
    }

    // Check if role already exists
    const existing = form.roleRequirements?.find(
      (req) => req.roleId === newRoleRequirement.roleId
    );
    if (existing) {
      toast.error('This role is already added. Please remove it first or update the quantity.');
      return;
    }

    const newReq: TemplateRoleRequirement = {
      roleId: Number(newRoleRequirement.roleId),
      quantity: newRoleRequirement.quantity,
      required: newRoleRequirement.required,
      notes: newRoleRequirement.notes || undefined,
    };

    setForm((prev) => ({
      ...prev,
      roleRequirements: [...(prev.roleRequirements || []), newReq],
    }));

    // Reset new role requirement form
    setNewRoleRequirement({
      roleId: '',
      quantity: 1,
      required: true,
      notes: '',
    });
  };

  const removeRoleRequirement = (roleId: number) => {
    setForm((prev) => ({
      ...prev,
      roleRequirements: prev.roleRequirements?.filter((req) => req.roleId !== roleId) || [],
    }));
  };

  const updateRoleRequirement = (roleId: number, field: keyof TemplateRoleRequirement, value: any) => {
    setForm((prev) => ({
      ...prev,
      roleRequirements: prev.roleRequirements?.map((req) =>
        req.roleId === roleId ? { ...req, [field]: value } : req
      ) || [],
    }));
  };

  const getRoleName = (roleId: number) => {
    const role = availableRoles.find((r) => r.roleId === roleId);
    return role?.roleName || role?.name || `Role #${roleId}`;
  };

  const formatTimeRange = (t: ShiftTemplate) => `${t.startTime.slice(0, 5)} - ${t.endTime.slice(0, 5)}`;

  const validateForm = (): boolean => {
    const errors: typeof formErrors = {};
    let isValid = true;

    if (!form.name.trim()) {
      errors.name = 'Template name is required';
      isValid = false;
    }

    if (!form.startTime || !form.endTime) {
      if (!form.startTime) errors.startTime = 'Start time is required';
      if (!form.endTime) errors.endTime = 'End time is required';
      isValid = false;
    } else if (form.startTime >= form.endTime) {
      errors.endTime = 'End time must be after start time';
      isValid = false;
    }

    if (form.maxStaffAllowed !== undefined && form.maxStaffAllowed !== null && form.maxStaffAllowed < 1) {
      errors.maxStaffAllowed = 'Max staff must be at least 1';
      isValid = false;
    }

    // Validate that no single role requires more staff than maxStaffAllowed
    if (
      form.maxStaffAllowed !== undefined &&
      form.maxStaffAllowed !== null &&
      form.roleRequirements &&
      form.roleRequirements.length > 0
    ) {
      const maxQty = form.roleRequirements.reduce((max, req) => Math.max(max, req.quantity || 0), 0);
      if (maxQty > form.maxStaffAllowed) {
        errors.roleRequirements = `At least one role requires ${maxQty} staff, `
          + `but max staff allowed is only ${form.maxStaffAllowed}.`;
        isValid = false;
      }
    }

    setFormErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) {
      toast.error('Branch not found');
      return;
    }

    // Validate form
    if (!validateForm()) {
      toast.error('Please fix the form errors');
      return;
    }

    try {
      setSaving(true);

      if (mode === 'create') {
        await shiftTemplateService.createTemplate(branchId, form);
        toast.success('Shift template created successfully');
      } else if (mode === 'edit' && selectedTemplate) {
        await shiftTemplateService.updateTemplate(selectedTemplate.templateId, form);
        toast.success('Shift template updated successfully');
      }

      setIsModalOpen(false);
      setFormErrors({});
      await loadTemplates();
    } catch (e: any) {
      console.error('Failed to save shift template', e);
      const errorMessage = e?.response?.data?.message || e?.message || 'Failed to save shift template';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!templateToDelete) return;
    try {
      await shiftTemplateService.deleteTemplate(templateToDelete.templateId);
      setTemplateToDelete(null);
      toast.success('Shift template deactivated successfully');
      await loadTemplates();
    } catch (e: any) {
      console.error('Failed to delete shift template', e);
      const errorMessage = e?.response?.data?.message || e?.message || 'Failed to delete shift template';
      toast.error(errorMessage);
    }
  };

  if (loading && templates.length === 0) {
    return <ShiftTemplatesSkeleton />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Shift templates</h1>
            <p className="text-sm text-slate-500">
              {branchName} – Manage standard shift patterns for this branch
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={async () => {
                setRefreshing(true);
                await loadTemplates();
                setRefreshing(false);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
              disabled={loading || refreshing}
            >
              {refreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span>Refresh</span>
            </button>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium shadow-sm hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New template
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-1 py-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('active')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    activeTab === 'active'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Active
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('inactive')}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    activeTab === 'inactive'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Inactive
                </button>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <Clock4 className="w-4 h-4 text-sky-500" />
                <span>
                  {templates.length} {activeTab === 'active' ? 'active templates' : 'inactive templates'}
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Template name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Duration (hours)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Max staff
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                      No templates yet. Create the first shift template for this branch.
                    </td>
                  </tr>
                ) : (
                  templates.map((t) => (
                    <tr key={t.templateId} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {t.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {formatTimeRange(t)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {Number(t.durationHours ?? 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <div className="inline-flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>{t.maxStaffAllowed ?? '-'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            t.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-slate-50 text-slate-500 border border-slate-100'
                          }`}
                        >
                          {t.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">
                        {t.description || '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => setTemplateToView(t)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                            title="View template details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(t)}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                            title="Edit template"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {activeTab === 'active' && (
                            <button
                              onClick={() => setTemplateToDelete(t)}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200"
                              title="Deactivate template"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-slate-100 flex flex-col max-h-[90vh] relative">
              {/* Loading Overlay */}
              {saving && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-slate-200 border-t-sky-600 rounded-full animate-spin"></div>
                    <p className="text-sm font-medium text-slate-700">Saving template...</p>
                  </div>
                </div>
              )}
              <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between flex-shrink-0">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-slate-900">
                    {mode === 'create' ? 'Create new shift template' : 'Edit shift template'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Define standard time blocks and capacity for shifts.
                  </p>
                  {branchOpenHours && (
                    <p className="text-xs text-slate-500">
                      Branch hours:{' '}
                      <span className="font-medium text-slate-700">{branchOpenHours}</span>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!saving) {
                      setIsModalOpen(false);
                      setFormErrors({});
                    }
                  }}
                  className="ml-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-white"
                  aria-label="Close"
                >
                  <span className="sr-only">Close</span>
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4.22 4.22a.75.75 0 0 1 1.06 0L8 6.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L9.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L8 9.06l-2.72 2.72a.75.75 0 1 1-1.06-1.06L6.94 8 4.22 5.28a.75.75 0 0 1 0-1.06Z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </div>

              <div className={`flex-1 min-h-0 overflow-y-auto ${saving ? 'pointer-events-none opacity-60' : ''}`}>
                <form id="shift-template-form" onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    Template name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => {
                      handleInputChange('name', e.target.value);
                      if (formErrors.name) {
                        setFormErrors((prev) => ({ ...prev, name: undefined }));
                      }
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                      formErrors.name
                        ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-slate-200 focus:ring-sky-500 focus:border-sky-500'
                    }`}
                    placeholder="e.g. Morning shift, Peak lunch shift..."
                  />
                  {formErrors.name && (
                    <p className="text-xs text-red-600 mt-0.5">{formErrors.name}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      Start time
                    </label>
                    <input
                      type="time"
                      value={form.startTime.slice(0, 5)}
                      onChange={(e) => {
                        handleInputChange('startTime', `${e.target.value}:00`);
                        if (formErrors.startTime) {
                          setFormErrors((prev) => ({ ...prev, startTime: undefined }));
                        }
                        if (formErrors.endTime && form.endTime && e.target.value < form.endTime.slice(0, 5)) {
                          setFormErrors((prev) => ({ ...prev, endTime: undefined }));
                        }
                      }}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                        formErrors.startTime
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                          : 'border-slate-200 focus:ring-sky-500 focus:border-sky-500'
                      }`}
                    />
                    {formErrors.startTime && (
                      <p className="text-xs text-red-600 mt-0.5">{formErrors.startTime}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      End time
                    </label>
                    <input
                      type="time"
                      value={form.endTime.slice(0, 5)}
                      onChange={(e) => {
                        handleInputChange('endTime', `${e.target.value}:00`);
                        if (formErrors.endTime) {
                          setFormErrors((prev) => ({ ...prev, endTime: undefined }));
                        }
                      }}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                        formErrors.endTime
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                          : 'border-slate-200 focus:ring-sky-500 focus:border-sky-500'
                      }`}
                    />
                    {formErrors.endTime && (
                      <p className="text-xs text-red-600 mt-0.5">{formErrors.endTime}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <label className="text-xs font-medium text-slate-700">
                        Max staff
                      </label>
                      {form.maxStaffAllowed && form.roleRequirements && form.roleRequirements.length > 0 && (
                        <span className={`text-xs font-medium ${
                          totalRoleQuantity > form.maxStaffAllowed
                            ? 'text-amber-600'
                            : 'text-slate-400'
                        }`}>
                          ({totalRoleQuantity} roles)
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      min={1}
                      value={form.maxStaffAllowed ?? ''}
                      onChange={(e) => {
                        handleInputChange(
                          'maxStaffAllowed',
                          e.target.value ? Number(e.target.value) : undefined
                        );
                        if (formErrors.maxStaffAllowed) {
                          setFormErrors((prev) => ({ ...prev, maxStaffAllowed: undefined }));
                        }
                      }}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 ${
                        formErrors.maxStaffAllowed
                          ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                          : form.maxStaffAllowed !== null && form.maxStaffAllowed !== undefined && totalRoleQuantity > form.maxStaffAllowed
                          ? 'border-amber-300'
                          : 'border-slate-200'
                      }`}
                    />
                    {formErrors.maxStaffAllowed ? (
                      <p className="text-xs text-red-600 mt-0.5">{formErrors.maxStaffAllowed}</p>
                    ) : (
                      <p className="text-xs text-slate-400">
                        Maximum number of staff members allowed in this shift
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      Employment Type
                    </label>
                    <select
                      value={form.employmentType ?? 'ANY'}
                      onChange={(e) =>
                        handleInputChange('employmentType', e.target.value as EmploymentType)
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="ANY">Any (All types)</option>
                      <option value="FULL_TIME">Full-time only</option>
                      <option value="PART_TIME">Part-time only</option>
                      <option value="CASUAL">Casual only</option>
                    </select>
                    <p className="text-xs text-slate-400">
                      Which type of staff can register for shifts created from this template
                    </p>
                  </div>
                  {mode === 'edit' && (
                    <div className="flex items-center gap-2 mt-5">
                      <input
                        id="isActive"
                        type="checkbox"
                        checked={form.isActive ?? true}
                        onChange={(e) =>
                          handleInputChange('isActive', e.target.checked)
                        }
                        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                      <label htmlFor="isActive" className="text-xs text-slate-700">
                        This template is active
                      </label>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">
                    Description
                  </label>
                  <textarea
                    value={form.description ?? ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 resize-none"
                    placeholder="Notes about this shift (peak hour, cleaning shift, training, ...)"
                  />
                </div>

                {/* Role Requirements Section */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-700">
                      Role Requirements
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        {form.roleRequirements?.length || 0} role(s), {totalRoleQuantity} position(s)
                      </span>
                      {form.maxStaffAllowed && (
                        <span className={`text-xs font-medium ${
                          totalRoleQuantity > form.maxStaffAllowed
                            ? 'text-amber-600'
                            : totalRoleQuantity === form.maxStaffAllowed
                            ? 'text-blue-600'
                            : 'text-slate-500'
                        }`}>
                          / {form.maxStaffAllowed} max staff
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-slate-500">
                      Define how many staff of each role are needed for shifts created from this template.
                      <span className="block mt-0.5 text-slate-400">
                        Note: One person can have multiple roles, so total positions may exceed max staff.
                      </span>
                    </p>
                    {formErrors.roleRequirements && (
                      <p className="text-xs text-red-600">{formErrors.roleRequirements}</p>
                    )}
                  </div>

                  {/* Warning/Info message */}
                  {roleRequirementWarning && (
                    <div className={`rounded-lg border px-3 py-2 text-xs ${
                      roleRequirementWarning.type === 'error'
                        ? 'border-red-200 bg-red-50 text-red-800'
                        : roleRequirementWarning.type === 'warning'
                        ? 'border-amber-200 bg-amber-50 text-amber-800'
                        : 'border-blue-200 bg-blue-50 text-blue-800'
                    }`}>
                      <div className="flex items-start gap-2">
                        <span className="font-semibold">
                          {roleRequirementWarning.type === 'error'
                            ? '⛔ Error:'
                            : roleRequirementWarning.type === 'warning'
                            ? '⚠️ Warning:'
                            : 'ℹ️ Info:'}
                        </span>
                        <span>{roleRequirementWarning.message}</span>
                      </div>
                    </div>
                  )}

                  {/* List of added role requirements */}
                  {form.roleRequirements && form.roleRequirements.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {form.roleRequirements.map((req) => (
                        <div
                          key={req.roleId}
                          className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-900">
                                {getRoleName(req.roleId)}
                              </span>
                              <span className="text-xs text-slate-500">×</span>
                              <input
                                type="number"
                                min={1}
                                value={req.quantity}
                                onChange={(e) =>
                                  updateRoleRequirement(
                                    req.roleId,
                                    'quantity',
                                    Number(e.target.value)
                                  )
                                }
                                className="w-16 rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                              />
                              <span className="text-xs text-slate-500">staff</span>
                              <label className="flex items-center gap-1 ml-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={req.required ?? true}
                                  onChange={(e) =>
                                    updateRoleRequirement(
                                      req.roleId,
                                      'required',
                                      e.target.checked
                                    )
                                  }
                                  className="h-3 w-3 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                                />
                                <span className="text-xs text-slate-600">Required</span>
                              </label>
                            </div>
                            {req.notes && (
                              <p className="text-xs text-slate-500 mt-1">{req.notes}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeRoleRequirement(req.roleId)}
                            className="flex-shrink-0 p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50"
                            title="Remove role requirement"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new role requirement form */}
                  <div className="mt-3 p-3 rounded-lg border border-slate-200 bg-white">
                    <div className="grid grid-cols-1 gap-2">
                      <div>
                        <label className="text-xs font-medium text-slate-700 mb-1 block">
                          Role
                        </label>
                        <select
                          value={newRoleRequirement.roleId}
                          onChange={(e) =>
                            setNewRoleRequirement((prev) => ({
                              ...prev,
                              roleId: e.target.value ? Number(e.target.value) : '',
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                        >
                          <option value="">Select a role...</option>
                          {availableRoles
                            .filter(
                              (role) =>
                                !form.roleRequirements?.some(
                                  (req) => req.roleId === role.roleId
                                )
                            )
                            .map((role) => (
                              <option key={role.roleId} value={role.roleId}>
                                {role.roleName || role.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-medium text-slate-700 mb-1 block">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={newRoleRequirement.quantity}
                            onChange={(e) =>
                              setNewRoleRequirement((prev) => ({
                                ...prev,
                                quantity: Number(e.target.value) || 1,
                              }))
                            }
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                          />
                        </div>
                        <div className="flex items-end">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newRoleRequirement.required}
                              onChange={(e) =>
                                setNewRoleRequirement((prev) => ({
                                  ...prev,
                                  required: e.target.checked,
                                }))
                              }
                              className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                            />
                            <span className="text-xs text-slate-700">Required</span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-700 mb-1 block">
                          Notes (optional)
                        </label>
                        <input
                          type="text"
                          value={newRoleRequirement.notes}
                          onChange={(e) =>
                            setNewRoleRequirement((prev) => ({
                              ...prev,
                              notes: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                          placeholder="e.g. Must have experience..."
                        />
                      </div>
                      <button
                        type="button"
                        onClick={addRoleRequirement}
                        disabled={!newRoleRequirement.roleId || newRoleRequirement.quantity < 1}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" />
                        Add Role Requirement
                      </button>
                    </div>
                  </div>
                </div>
                </form>
              </div>

              <div className="px-6 py-3 border-t border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between flex-shrink-0 bg-white">
                <p className="text-xs text-slate-400">
                  <span className="font-semibold">Note:</span> Existing shifts created from this template
                  will not be changed when you edit the template.
                </p>
                <div className="flex items-center gap-2 justify-end whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="shift-template-form"
                    onClick={handleSubmit}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 disabled:opacity-60 min-w-[150px] justify-center"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {mode === 'create' ? 'Create template' : 'Save changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Template Details Modal */}
        {templateToView && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-slate-100 flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Template Details
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    View complete information about this shift template
                  </p>
                </div>
                <button
                  onClick={() => setTemplateToView(null)}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                {/* Basic Information */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900 border-b border-slate-100 pb-2">
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-500">Template Name</label>
                      <p className="text-sm text-slate-900 mt-1">{templateToView.name}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500">Status</label>
                      <div className="mt-1">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            templateToView.isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : 'bg-slate-50 text-slate-500 border border-slate-100'
                          }`}
                        >
                          {templateToView.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500">Time Range</label>
                      <p className="text-sm text-slate-900 mt-1 flex items-center gap-1.5">
                        <Clock4 className="w-4 h-4 text-slate-400" />
                        {formatTimeRange(templateToView)}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500">Duration</label>
                      <p className="text-sm text-slate-900 mt-1">
                        {Number(templateToView.durationHours ?? 0).toFixed(2)} hours
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500">Max Staff Allowed</label>
                      <p className="text-sm text-slate-900 mt-1 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-slate-400" />
                        {templateToView.maxStaffAllowed ?? 'Not set'}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500">Employment Type</label>
                      <p className="text-sm text-slate-900 mt-1">
                        {templateToView.employmentType === 'ANY' ? 'Any (All types)' :
                         templateToView.employmentType === 'FULL_TIME' ? 'Full-time only' :
                         templateToView.employmentType === 'PART_TIME' ? 'Part-time only' :
                         templateToView.employmentType === 'CASUAL' ? 'Casual only' :
                         templateToView.employmentType || 'Not set'}
                      </p>
                    </div>
                    {templateToView.description && (
                      <div className="col-span-2">
                        <label className="text-xs font-medium text-slate-500">Description</label>
                        <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">
                          {templateToView.description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Role Requirements */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Role Requirements
                    </h3>
                    <span className="text-xs text-slate-500">
                      {templateToView.roleRequirements?.length || 0} role(s),{' '}
                      {templateToView.roleRequirements?.reduce((sum, req) => sum + req.quantity, 0) || 0} position(s)
                    </span>
                  </div>
                  {!templateToView.roleRequirements || templateToView.roleRequirements.length === 0 ? (
                    <p className="text-sm text-slate-500 italic py-4 text-center">
                      No role requirements defined for this template
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {templateToView.roleRequirements.map((req) => (
                        <div
                          key={req.roleId}
                          className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-slate-900">
                                {getRoleName(req.roleId)}
                              </span>
                              <span className="text-xs text-slate-500">×</span>
                              <span className="text-sm font-semibold text-slate-900">
                                {req.quantity}
                              </span>
                              <span className="text-xs text-slate-500">staff</span>
                              {req.required !== false && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                  Required
                                </span>
                              )}
                              {req.required === false && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200">
                                  Optional
                                </span>
                              )}
                            </div>
                            {req.notes && (
                              <p className="text-xs text-slate-600 mt-1 italic">
                                {req.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-end gap-2 flex-shrink-0 bg-white">
                <button
                  type="button"
                  onClick={() => {
                    setTemplateToView(null);
                    openEditModal(templateToView);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 hover:bg-slate-50 font-medium"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Template
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateToView(null)}
                  className="px-4 py-2 rounded-lg bg-slate-600 text-white text-sm font-medium hover:bg-slate-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmModal
          open={!!templateToDelete}
          title="Deactivate shift template"
          description={
            templateToDelete
              ? `Are you sure you want to deactivate "${templateToDelete.name}"? Existing shifts created from this template will not be affected.`
              : undefined
          }
          confirmText="Deactivate"
          cancelText="Cancel"
          onConfirm={handleConfirmDelete}
          onCancel={() => setTemplateToDelete(null)}
        />
      </div>
    </div>
  );
}



