import React, { useState, useEffect } from 'react';
import { Settings, RefreshCw, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { payrollConfigService, PayrollConfiguration } from '../../services/payrollConfigService';

interface PayrollSettingsViewProps {
  readOnly?: boolean;
  simplified?: boolean; // For Staff - simplified view
}

const PayrollSettingsView: React.FC<PayrollSettingsViewProps> = ({ 
  readOnly = true, 
  simplified = false 
}) => {
  const [configs, setConfigs] = useState<PayrollConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const data = await payrollConfigService.getAllConfigs(false); // Only active configs
      setConfigs(data);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load payroll configurations');
    } finally {
      setLoading(false);
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

    configs.forEach((config) => {
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
  
  // For Staff - simplified view
  if (simplified) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="w-6 h-6" />
            Payroll Calculation Parameters
          </h1>
          <p className="text-gray-600 mt-1">
            View the parameters used to calculate your payroll
          </p>
        </div>

        {/* Wrapper with border */}
        <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
          {/* Insurance & Deductions */}
          <div className="mb-6">
            <h2 className="text-base font-semibold text-gray-800 mb-3">Insurance & Deductions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...groupedConfigs.insurance, ...groupedConfigs.deduction].map((config) => (
                <div key={config.configId} className="bg-white rounded-lg border border-gray-200 p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-sm text-gray-900">{config.displayName}</h3>
                      <p className="text-xs text-gray-500 mt-1">{config.configKey}</p>
                      {config.description && (
                        <p className="text-xs text-gray-600 mt-2">{config.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-base font-semibold text-gray-900">
                        {formatValue(config.configValue, config.unit)}
                      </div>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium mt-1 ${getConfigTypeColor(config.configType)}`}>
                        {config.configType}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tax Brackets */}
          <div className="mb-6">
            <h2 className="text-base font-semibold text-gray-800 mb-3">Personal Income Tax Brackets</h2>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Bracket</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Taxable Income Range</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase">Tax Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {[
                      { max: groupedConfigs.tax.find(c => c.configKey === 'tax_bracket_1_max')?.configValue || 0, rate: groupedConfigs.tax.find(c => c.configKey === 'tax_bracket_1_rate')?.configValue || 0 },
                      { max: groupedConfigs.tax.find(c => c.configKey === 'tax_bracket_2_max')?.configValue || 0, rate: groupedConfigs.tax.find(c => c.configKey === 'tax_bracket_2_rate')?.configValue || 0 },
                      { max: groupedConfigs.tax.find(c => c.configKey === 'tax_bracket_3_max')?.configValue || 0, rate: groupedConfigs.tax.find(c => c.configKey === 'tax_bracket_3_rate')?.configValue || 0 },
                      { max: groupedConfigs.tax.find(c => c.configKey === 'tax_bracket_4_max')?.configValue || 0, rate: groupedConfigs.tax.find(c => c.configKey === 'tax_bracket_4_rate')?.configValue || 0 },
                      { max: groupedConfigs.tax.find(c => c.configKey === 'tax_bracket_5_max')?.configValue || 0, rate: groupedConfigs.tax.find(c => c.configKey === 'tax_bracket_5_rate')?.configValue || 0 },
                      { max: groupedConfigs.tax.find(c => c.configKey === 'tax_bracket_6_max')?.configValue || 0, rate: groupedConfigs.tax.find(c => c.configKey === 'tax_bracket_6_rate')?.configValue || 0 },
                      { max: null, rate: groupedConfigs.tax.find(c => c.configKey === 'tax_bracket_7_rate')?.configValue || 0 },
                    ].map((bracket, index) => {
                      const prevMax = index === 0 ? 0 : [
                        groupedConfigs.tax.find(c => c.configKey === 'tax_bracket_1_max')?.configValue || 0,
                        groupedConfigs.tax.find(c => c.configKey === 'tax_bracket_2_max')?.configValue || 0,
                        groupedConfigs.tax.find(c => c.configKey === 'tax_bracket_3_max')?.configValue || 0,
                        groupedConfigs.tax.find(c => c.configKey === 'tax_bracket_4_max')?.configValue || 0,
                        groupedConfigs.tax.find(c => c.configKey === 'tax_bracket_5_max')?.configValue || 0,
                        groupedConfigs.tax.find(c => c.configKey === 'tax_bracket_6_max')?.configValue || 0,
                      ][index - 1];
                      
                      return (
                        <tr key={index}>
                          <td className="px-3 py-2 font-medium text-sm text-gray-900">Bracket {index + 1}</td>
                          <td className="px-3 py-2 text-sm text-gray-600">
                            {formatValue(prevMax, 'VND')} - {bracket.max ? formatValue(bracket.max, 'VND') : 'Above'}
                          </td>
                          <td className="px-3 py-2">
                            <span className="font-semibold text-sm text-gray-900">
                              {formatValue(bracket.rate, '%')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Overtime Rates */}
          <div className="mb-6">
            <h2 className="text-base font-semibold text-gray-800 mb-3">Overtime Rates</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {groupedConfigs.overtime.map((config) => (
                <div key={config.configId} className="bg-white rounded-lg border border-gray-200 p-3">
                  <h3 className="font-medium text-sm text-gray-900 mb-2">{config.displayName}</h3>
                  <div className="text-xl font-bold text-gray-900 mb-1">
                    {formatValue(config.configValue, config.unit)}
                  </div>
                  {config.description && (
                    <p className="text-xs text-gray-600">{config.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-800">
                <p className="font-medium mb-1">Note:</p>
                <p>These parameters are used to calculate your payroll. Changes to these values will only affect future payroll calculations.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // For Manager - full view with tabs but read-only
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
            View system payroll parameters (insurance, tax, deductions, overtime...)
          </p>
        </div>
        <div className="flex items-center gap-3">
          {readOnly && (
            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
              View Only
            </span>
          )}
          <button
            onClick={fetchConfigs}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {readOnly && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <Info className="w-4 h-4 inline mr-1" />
            This is a read-only view. Contact Admin to modify configurations.
          </p>
        </div>
      )}

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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentConfigs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No configurations found in this category
                  </td>
                </tr>
              ) : (
                currentConfigs.map((config) => (
                  <tr key={config.configId} className="hover:bg-gray-50">
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
                      <div className="font-medium text-gray-900">
                        {formatValue(config.configValue, config.unit)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {config.minValue !== null && config.minValue !== undefined && (
                        <div>Min: {formatValue(config.minValue, config.unit)}</div>
                      )}
                      {config.maxValue !== null && config.maxValue !== undefined && (
                        <div>Max: {formatValue(config.maxValue, config.unit)}</div>
                      )}
                      {config.minValue === null && config.maxValue === null && (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {config.description ? (
                        <div className="flex items-start gap-1">
                          <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="text-xs">{config.description}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Notes:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>These parameters are used to calculate payroll for all employees.</li>
              <li>Changes to these values will be applied to newly calculated payrolls.</li>
              <li>Previously calculated payrolls will not be affected.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayrollSettingsView;

