import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Discount, CreateDiscountRequest, UpdateDiscountRequest } from '../../types/discount';
import { Branch } from '../../types';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services';
import { API_ENDPOINTS } from '../../config/constants';

interface DiscountFormProps {
    discount?: Discount | null;
    managerBranch?: Branch | null;
    onSubmit: (data: CreateDiscountRequest | UpdateDiscountRequest) => void;
    onClose: () => void;
}

const DiscountForm: React.FC<DiscountFormProps> = ({ discount, managerBranch, onSubmit, onClose }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        description: '',
        discountType: 'PERCENT' as 'PERCENT' | 'AMOUNT',
        discountValue: 0,
        minOrderAmount: 0,
        maxDiscountAmount: 0,
        startDate: '',
        endDate: '',
        usageLimit: 0,
        branchId: undefined as number | null | undefined,
        active: true
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loadingBranches, setLoadingBranches] = useState(false);

    const toLocalInputValue = (date: Date) => {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    useEffect(() => {
        if (discount) {
            setFormData({
                code: discount.code,
                name: discount.name,
                description: discount.description || '',
                discountType: discount.discountType,
                discountValue: discount.discountValue,
                minOrderAmount: discount.minOrderAmount,
                maxDiscountAmount: discount.maxDiscountAmount || 0,
                startDate: toLocalInputValue(new Date(discount.startDate)),
                endDate: toLocalInputValue(new Date(discount.endDate)),
                usageLimit: discount.usageLimit,
                branchId: (discount as any).branchId ?? undefined,
                active: discount.active
            });
        } else {
            // Set default values for new discount
            const now = new Date();
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

            setFormData({
                code: '',
                name: '',
                description: '',
                discountType: 'PERCENT',
                discountValue: 0,
                minOrderAmount: 0,
                maxDiscountAmount: 0,
                startDate: toLocalInputValue(tomorrow),
                endDate: toLocalInputValue(nextMonth),
                usageLimit: 0,
                branchId: managerBranch?.branchId || undefined,
                active: true
            });
        }
    }, [discount]);

    // Load branches for admin to choose
    useEffect(() => {
        const loadBranches = async () => {
            if (user?.role !== 'admin') return;
            try {
                setLoadingBranches(true);
                const qs = `?page=0&size=1000`;
                const resp = await apiClient.get<{ code: number; result: { data: Branch[] } }>(`${API_ENDPOINTS.BRANCHES.BASE}/paged${qs}`);
                setBranches(resp?.result?.data || []);
            } catch (e) {
                console.error('Failed to load branches for admin:', e);
                toast.error('Unable to load branches');
            } finally {
                setLoadingBranches(false);
            }
        };
        loadBranches();
    }, [user?.role]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.code.trim()) {
            newErrors.code = 'Discount code is required';
        }

        if (!formData.name.trim()) {
            newErrors.name = 'Discount name is required';
        }

        if (formData.discountValue <= 0) {
            newErrors.discountValue = 'Discount value must be greater than 0';
        }

        if (formData.discountType === 'PERCENT' && formData.discountValue > 100) {
            newErrors.discountValue = 'Percentage discount cannot exceed 100%';
        }

        if (formData.minOrderAmount < 0) {
            newErrors.minOrderAmount = 'Minimum order amount cannot be negative';
        }

        if (formData.maxDiscountAmount < 0) {
            newErrors.maxDiscountAmount = 'Maximum discount amount cannot be negative';
        }

        if (!formData.startDate) {
            newErrors.startDate = 'Start date is required';
        }

        if (!formData.endDate) {
            newErrors.endDate = 'End date is required';
        }

        if (formData.startDate && formData.endDate && new Date(formData.startDate) >= new Date(formData.endDate)) {
            newErrors.endDate = 'End date must be after start date';
        }

        if (formData.usageLimit < 0) {
            newErrors.usageLimit = 'Usage limit cannot be negative';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error('Please check the information');
            return;
        }

        const submitData: any = {
            ...formData,
            minOrderAmount: formData.minOrderAmount || 0,
            maxDiscountAmount: formData.maxDiscountAmount || undefined,
            usageLimit: formData.usageLimit || 0,
            // For admin: allow clearing branch to set system-wide (null)
            branchId: user?.role === 'admin' ? (formData.branchId ?? null) : (formData.branchId || undefined),
        };
        
        // For update requests: remove code (not allowed to change) and add clearBranch
        if (discount) {
            delete submitData.code; // Code cannot be changed after creation
            submitData.clearBranch = user?.role === 'admin' ? (formData.branchId === null) : undefined;
        }

        onSubmit(submitData);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">
                        {discount ? 'Update Discount' : 'Create New Discount'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Code */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Discount Code *
                            </label>
                            <input
                                type="text"
                                name="code"
                                value={formData.code}
                                onChange={handleInputChange}
                                disabled={!!discount} // Không cho phép sửa mã khi cập nhật
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.code ? 'border-red-500' : 'border-gray-300'
                                    } ${discount ? 'bg-gray-100' : ''}`}
                                placeholder="Enter discount code"
                            />
                            {errors.code && <p className="mt-1 text-sm text-red-600">{errors.code}</p>}
                        </div>

                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Discount Name *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.name ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                placeholder="Enter discount name"
                            />
                            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                        </div>

                        {/* Discount Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Discount Type *
                            </label>
                            <select
                                name="discountType"
                                value={formData.discountType}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="PERCENT">Percentage</option>
                                <option value="AMOUNT">Fixed Amount</option>
                            </select>
                        </div>

                        {/* Discount Value */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Discount Value *
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    name="discountValue"
                                    value={formData.discountValue}
                                    onChange={handleInputChange}
                                    min="0"
                                    step={formData.discountType === 'PERCENT' ? '1' : '1000'}
                                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.discountValue ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                    placeholder={formData.discountType === 'PERCENT' ? '10' : '10000'}
                                />
                                <span className="absolute right-3 top-2 text-sm text-gray-500">
                                    {formData.discountType === 'PERCENT' ? '%' : 'VND'}
                                </span>
                            </div>
                            {errors.discountValue && <p className="mt-1 text-sm text-red-600">{errors.discountValue}</p>}
                        </div>

                        {/* Min Order Amount */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Minimum Order Amount
                            </label>
                            <input
                                type="number"
                                name="minOrderAmount"
                                value={formData.minOrderAmount}
                                onChange={handleInputChange}
                                min="0"
                                step="1000"
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.minOrderAmount ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                placeholder="0"
                            />
                            {errors.minOrderAmount && <p className="mt-1 text-sm text-red-600">{errors.minOrderAmount}</p>}
                        </div>

                        {/* Max Discount Amount */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Maximum Discount Amount
                            </label>
                            <input
                                type="number"
                                name="maxDiscountAmount"
                                value={formData.maxDiscountAmount}
                                onChange={handleInputChange}
                                min="0"
                                step="1000"
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.maxDiscountAmount ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                placeholder="No limit"
                            />
                            {errors.maxDiscountAmount && <p className="mt-1 text-sm text-red-600">{errors.maxDiscountAmount}</p>}
                        </div>

                        {/* Start Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Start Date *
                            </label>
                            <input
                                type="datetime-local"
                                name="startDate"
                                value={formData.startDate}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.startDate ? 'border-red-500' : 'border-gray-300'
                                    }`}
                            />
                            {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}
                        </div>

                        {/* End Date */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                End Date *
                            </label>
                            <input
                                type="datetime-local"
                                name="endDate"
                                value={formData.endDate}
                                onChange={handleInputChange}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.endDate ? 'border-red-500' : 'border-gray-300'
                                    }`}
                            />
                            {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>}
                        </div>

                        {/* Usage Limit */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Usage Limit
                            </label>
                            <input
                                type="number"
                                name="usageLimit"
                                value={formData.usageLimit}
                                onChange={handleInputChange}
                                min="0"
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.usageLimit ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                placeholder="0 = unlimited"
                            />
                            {errors.usageLimit && <p className="mt-1 text-sm text-red-600">{errors.usageLimit}</p>}
                        </div>

                        {/* Branch selection: admin can choose, manager fixed */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Applicable Branch
                            </label>
                            {user?.role === 'admin' ? (
                                <select
                                    name="branchId"
                                    value={formData.branchId == null ? '' : String(formData.branchId)}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setFormData(prev => ({
                                            ...prev,
                                            branchId: value === '' ? null : Number(value)
                                        }));
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                                >
                                    <option value="">System-wide</option>
                                    {loadingBranches ? (
                                        <option value="" disabled>Loading...</option>
                                    ) : (
                                        branches.map(b => (
                                            <option key={b.branchId} value={b.branchId}>{b.name} — {b.address}</option>
                                        ))
                                    )}
                                </select>
                            ) : (
                                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700">
                                    {managerBranch ? managerBranch.name : 'System-wide'}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description
                        </label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter discount description"
                        />
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            name="active"
                            checked={formData.active}
                            onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 text-sm text-gray-700">
                            Activate discount
                        </label>
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {discount ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DiscountForm;
