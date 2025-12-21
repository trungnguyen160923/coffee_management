import React, { useState, useEffect } from 'react';
import { Settings, RefreshCw, Info, Edit2, X, Check, Trash2, Power } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { payrollConfigService, PayrollConfiguration, PayrollConfigurationUpdateRequest } from '../../services/payrollConfigService';
import ConfirmModal from '../../components/common/modal/ConfirmModal';

const AdminPayrollSettings: React.FC = () => {
  const [configs, setConfigs] = useState<PayrollConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, {
    configValue?: number;
    minValue?: number | null;
    maxValue?: number | null;
    description?: string;
  }>>({});
  const [showInactive, setShowInactive] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<PayrollConfiguration | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      // Always fetch all configs (both active and inactive)
      const data = await payrollConfigService.getAllConfigs(true);
      setConfigs(data);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load payroll configurations');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (config: PayrollConfiguration) => {
    setEditingKey(config.configKey);
    setEditValues({ 
      [config.configKey]: {
        configValue: config.configValue,
        minValue: config.minValue ?? null,
        maxValue: config.maxValue ?? null,
        description: config.description || '',
      }
    });
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditValues({});
  };

  const handleSave = async (config: PayrollConfiguration) => {
    const editData = editValues[config.configKey];
    if (!editData) {
      handleCancelEdit();
      return;
    }

    const newValue = editData.configValue;
    const newMinValue = editData.minValue;
    const newMaxValue = editData.maxValue;
    const newDescription = editData.description;

    // Kiểm tra xem có thay đổi gì không
    const hasValueChange = newValue !== undefined && newValue !== config.configValue;
    const hasMinChange = newMinValue !== undefined && newMinValue !== (config.minValue ?? null);
    const hasMaxChange = newMaxValue !== undefined && newMaxValue !== (config.maxValue ?? null);
    const hasDescChange = newDescription !== undefined && newDescription !== (config.description || '');
    
    const hasChanges = hasValueChange || hasMinChange || hasMaxChange || hasDescChange;

    if (!hasChanges) {
      handleCancelEdit();
      return;
    }

    // Validate min/max với giá trị mới
    const minValueToCheck = newMinValue !== undefined ? newMinValue : config.minValue;
    const maxValueToCheck = newMaxValue !== undefined ? newMaxValue : config.maxValue;

    if (newValue !== undefined) {
      if (minValueToCheck !== null && minValueToCheck !== undefined && newValue < minValueToCheck) {
        toast.error(`Value must be >= ${formatValue(minValueToCheck, config.unit || '')}`);
        return;
      }
      if (maxValueToCheck !== null && maxValueToCheck !== undefined && newValue > maxValueToCheck) {
        toast.error(`Value must be <= ${formatValue(maxValueToCheck, config.unit || '')}`);
        return;
      }
    }

    // Validate min <= max nếu cả hai đều có
    if (newMinValue !== undefined && newMaxValue !== undefined && 
        newMinValue !== null && newMaxValue !== null && 
        newMinValue > newMaxValue) {
      toast.error('Min value must be <= Max value');
      return;
    }

    try {
      setSaving(true);
      const request: PayrollConfigurationUpdateRequest = {
        configValue: newValue !== undefined ? newValue : config.configValue,
      };
      
      // Chỉ gửi các field khác nếu có thay đổi hoặc muốn set giá trị
      if (newMinValue !== undefined) {
        request.minValue = newMinValue;
      }
      if (newMaxValue !== undefined) {
        request.maxValue = newMaxValue;
      }
      if (newDescription !== undefined) {
        request.description = newDescription;
      }
      
      await payrollConfigService.updateConfig(config.configKey, request);
      toast.success('Configuration updated successfully');
      await fetchConfigs();
      handleCancelEdit();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update configuration');
    } finally {
      setSaving(false);
    }
  };

  // Danh sách các critical configs (sẽ bị disable thay vì xóa)
  const criticalConfigs = [
    'insurance_rate', 'personal_deduction', 'dependent_deduction',
    'default_overtime_rate', 'weekend_overtime_multiplier', 'holiday_overtime_multiplier',
    'max_daily_hours', 'standard_working_days_per_month', 'standard_working_hours_per_day',
    'tax_bracket_1_rate', 'tax_bracket_1_max', 'tax_bracket_2_rate', 'tax_bracket_2_max',
    'tax_bracket_3_rate', 'tax_bracket_3_max', 'tax_bracket_4_rate', 'tax_bracket_4_max',
    'tax_bracket_5_rate', 'tax_bracket_5_max', 'tax_bracket_6_rate', 'tax_bracket_6_max',
    'tax_bracket_7_rate'
  ];

  const handleDeleteConfig = async () => {
    if (!configToDelete) return;

    try {
      setSaving(true);
      await payrollConfigService.deleteConfig(configToDelete.configKey);
      const isCritical = criticalConfigs.includes(configToDelete.configKey);
      toast.success(
        isCritical
          ? 'Critical configuration has been disabled'
          : 'Configuration deleted successfully'
      );
      await fetchConfigs();
      setShowDeleteModal(false);
      setConfigToDelete(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleActivateConfig = async (config: PayrollConfiguration) => {
    try {
      setSaving(true);
      const request: PayrollConfigurationUpdateRequest = {
        configValue: config.configValue,
        isActive: true,
      };
      await payrollConfigService.updateConfig(config.configKey, request);
      toast.success('Configuration activated successfully');
      await fetchConfigs();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to activate configuration');
    } finally {
      setSaving(false);
    }
  };

  const formatValue = (value: number, unit?: string): string => {
    if (unit === '%') {
      return `${(value * 100).toFixed(2)}%`;
    }
    if (unit === 'VNĐ' || unit === 'VND') {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(value);
    }
    if (unit === 'x') {
      return `${value.toFixed(2)}x`;
    }
    return value.toLocaleString('vi-VN');
  };

  const getConfigTypeColor = (type: string) => {
    switch (type) {
      case 'RATE':
        return 'bg-blue-100 text-blue-800';
      case 'AMOUNT':
        return 'bg-green-100 text-green-800';
      case 'MULTIPLIER':
        return 'bg-purple-100 text-purple-800';
      case 'DAYS':
      case 'HOURS':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const groupConfigsByCategory = () => {
    const groups: Record<string, PayrollConfiguration[]> = {
      all: [],
      insurance: [],
      deduction: [],
      overtime: [],
      tax: [],
      other: [],
    };

    // Filter by active/inactive status
    const filteredConfigs = showInactive 
      ? configs.filter(c => !c.isActive) 
      : configs.filter(c => c.isActive);

    filteredConfigs.forEach((config) => {
      groups.all.push(config);
      const key = config.configKey.toLowerCase();
      if (key.includes('insurance')) {
        groups.insurance.push(config);
      } else if (key.includes('deduction') || key.includes('personal') || key.includes('dependent')) {
        groups.deduction.push(config);
      } else if (key.includes('overtime') || key.includes('weekend') || key.includes('holiday')) {
        groups.overtime.push(config);
      } else if (key.includes('tax') || key.includes('bracket')) {
        groups.tax.push(config);
      } else {
        groups.other.push(config);
      }
    });

    return groups;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  const groupedConfigs = groupConfigsByCategory();
  const categories = [
    { key: 'all', label: 'All', count: groupedConfigs.all.length },
    { key: 'insurance', label: 'Insurance', count: groupedConfigs.insurance.length },
    { key: 'deduction', label: 'Deductions', count: groupedConfigs.deduction.length },
    { key: 'overtime', label: 'Overtime', count: groupedConfigs.overtime.length },
    { key: 'tax', label: 'Tax', count: groupedConfigs.tax.length },
    { key: 'other', label: 'Other', count: groupedConfigs.other.length },
  ];

  const currentConfigs = groupedConfigs[activeCategory as keyof typeof groupedConfigs] || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Payroll Configuration
          </h1>
          <p className="text-gray-600 mt-1">
            Manage system payroll parameters (insurance, tax, deductions, overtime...)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-600">Show inactive configurations</span>
          </label>
          <button
            onClick={fetchConfigs}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category.key}
              onClick={() => setActiveCategory(category.key)}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeCategory === category.key
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {category.label} ({category.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Configuration Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Current Value
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Limits
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentConfigs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No configurations found in this category
                  </td>
                </tr>
              ) : (
                currentConfigs.map((config) => (
                    <tr
                      key={config.configId}
                      className={!config.isActive ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{config.displayName}</div>
                        <div className="text-xs text-gray-500 mt-1">{config.configKey}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getConfigTypeColor(
                            config.configType
                          )}`}
                        >
                          {config.configType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {editingKey === config.configKey ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="any"
                              value={editValues[config.configKey]?.configValue ?? config.configValue}
                              onChange={(e) =>
                                setEditValues({
                                  ...editValues,
                                  [config.configKey]: {
                                    ...editValues[config.configKey],
                                    configValue: parseFloat(e.target.value) || 0,
                                  },
                                })
                              }
                              className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <span className="text-sm text-gray-500">{config.unit || ''}</span>
                          </div>
                        ) : (
                          <div className="font-medium text-gray-900">
                            {formatValue(config.configValue, config.unit)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {editingKey === config.configKey ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 w-8">Min:</span>
                              <input
                                type="number"
                                step="any"
                                value={editValues[config.configKey]?.minValue ?? config.minValue ?? ''}
                                onChange={(e) =>
                                  setEditValues({
                                    ...editValues,
                                    [config.configKey]: {
                                      ...editValues[config.configKey],
                                      minValue: e.target.value === '' ? null : parseFloat(e.target.value) || null,
                                    },
                                  })
                                }
                                placeholder="No limit"
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-xs"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 w-8">Max:</span>
                              <input
                                type="number"
                                step="any"
                                value={editValues[config.configKey]?.maxValue ?? config.maxValue ?? ''}
                                onChange={(e) =>
                                  setEditValues({
                                    ...editValues,
                                    [config.configKey]: {
                                      ...editValues[config.configKey],
                                      maxValue: e.target.value === '' ? null : parseFloat(e.target.value) || null,
                                    },
                                  })
                                }
                                placeholder="No limit"
                                className="w-24 px-2 py-1 border border-gray-300 rounded text-xs"
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            {config.minValue !== null && config.minValue !== undefined && (
                              <div>Min: {formatValue(config.minValue, config.unit)}</div>
                            )}
                            {config.maxValue !== null && config.maxValue !== undefined && (
                              <div>Max: {formatValue(config.maxValue, config.unit)}</div>
                            )}
                            {config.minValue === null && config.maxValue === null && (
                              <span className="text-gray-400">-</span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {editingKey === config.configKey ? (
                          <textarea
                            value={editValues[config.configKey]?.description ?? config.description ?? ''}
                            onChange={(e) =>
                              setEditValues({
                                ...editValues,
                                [config.configKey]: {
                                  ...editValues[config.configKey],
                                  description: e.target.value,
                                },
                              })
                            }
                            rows={2}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            placeholder="Enter description..."
                          />
                        ) : (
                          config.description ? (
                            <div className="flex items-start gap-1">
                              <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                              <span className="text-xs">{config.description}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {editingKey === config.configKey ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSave(config)}
                              disabled={saving}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                              title="Lưu"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              disabled={saving}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                              title="Hủy"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {!config.isActive && showInactive ? (
                              // Hiển thị nút Activate khi config inactive và đang ở chế độ show inactive
                              <button
                                onClick={() => handleActivateConfig(config)}
                                disabled={saving}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                title="Activate"
                              >
                                <Power className="w-4 h-4" />
                              </button>
                            ) : (
                              // Hiển thị nút Edit và Delete khi config active hoặc không ở chế độ show inactive
                              <>
                                <button
                                  onClick={() => handleEdit(config)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setConfigToDelete(config);
                                    setShowDeleteModal(true);
                                  }}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
            </tbody>
          </table>
        </div>
      </div>

      {configs.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No configurations found</p>
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Notes:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Only Admin can modify these configurations.</li>
              <li>Changes will be applied immediately to newly calculated payrolls.</li>
              <li>Previously calculated payrolls will not be affected.</li>
              <li>
                Parameters such as insurance rates and tax rates are usually regulated by the government and rarely change.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        open={showDeleteModal}
        onCancel={() => {
          setShowDeleteModal(false);
          setConfigToDelete(null);
        }}
        onConfirm={handleDeleteConfig}
        title="Confirm Delete Configuration"
        description={
          configToDelete
            ? `Are you sure you want to delete configuration "${configToDelete.displayName}" (${configToDelete.configKey})?\n\n` +
              (criticalConfigs.includes(configToDelete.configKey)
                ? '⚠️ Warning: This is a critical configuration used in payroll calculation. The configuration will be disabled instead of being permanently deleted.'
                : 'This configuration will be removed from the system.')
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        loading={saving}
      />
    </div>
  );
};

export default AdminPayrollSettings;

