import React, { useEffect, useState } from 'react';
import { X, Calendar, Users, Tag, MapPin, Clock } from 'lucide-react';
import { Discount } from '../../types/discount';
import { apiClient } from '../../services';
import { API_ENDPOINTS } from '../../config/constants';

interface DiscountDetailModalProps {
    discount: Discount;
    onClose: () => void;
}

const DiscountDetailModal: React.FC<DiscountDetailModalProps> = ({ discount, onClose }) => {
    const [branchName, setBranchName] = useState<string | null>(null);
    const [branchLoading, setBranchLoading] = useState(false);
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusInfo = () => {
        const now = new Date();
        const startDate = new Date(discount.startDate);
        const endDate = new Date(discount.endDate);

        if (!discount.active) {
            return {
                status: 'Inactive',
                color: 'bg-gray-100 text-gray-800',
                description: 'Discount has been disabled'
            };
        }

        if (now < startDate) {
            return {
                status: 'Not Started',
                color: 'bg-yellow-100 text-yellow-800',
                description: `Will start on ${formatDate(discount.startDate)}`
            };
        }

        if (now > endDate) {
            return {
                status: 'Expired',
                color: 'bg-red-100 text-red-800',
                description: `Ended on ${formatDate(discount.endDate)}`
            };
        }

        if (discount.usageLimit > 0 && discount.usedCount >= discount.usageLimit) {
            return {
                status: 'Usage Limit Reached',
                color: 'bg-red-100 text-red-800',
                description: `Used ${discount.usedCount}/${discount.usageLimit} times`
            };
        }

        return {
            status: 'Active',
            color: 'bg-green-100 text-green-800',
            description: 'Discount is currently active'
        };
    };

    const statusInfo = getStatusInfo();

    useEffect(() => {
        const loadBranch = async () => {
            if (!discount.branchId) {
                setBranchName(null);
                return;
            }
            try {
                setBranchLoading(true);
                const resp = await apiClient.get<{ code: number; result: any }>(`${API_ENDPOINTS.BRANCHES.BASE}/${discount.branchId}`);
                const b = (resp as any)?.result ?? resp;
                setBranchName(b?.name || null);
            } catch (e) {
                setBranchName(null);
            } finally {
                setBranchLoading(false);
            }
        };
        loadBranch();
    }, [discount.branchId]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Discount Details</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Header Info */}
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-2xl font-bold text-gray-900">{discount.name}</h3>
                            <p className="text-lg text-gray-600 font-mono">{discount.code}</p>
                            {discount.description && (
                                <p className="text-gray-500 mt-2">{discount.description}</p>
                            )}
                        </div>
                        <span className={`px-3 py-1 text-sm font-medium rounded-full ${statusInfo.color}`}>
                            {statusInfo.status}
                        </span>
                    </div>

                    {/* Status Description */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">{statusInfo.description}</p>
                    </div>

                    {/* Discount Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                                <Tag className="w-5 h-5 text-blue-600" />
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Discount Type</p>
                                    <p className="text-lg font-semibold text-gray-900">
                                        {discount.discountType === 'PERCENT' ? 'Percentage' : 'Fixed Amount'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-3">
                                <Tag className="w-5 h-5 text-green-600" />
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Value</p>
                                    <p className="text-lg font-semibold text-gray-900">
                                        {discount.discountType === 'PERCENT'
                                            ? `${discount.discountValue}%`
                                            : `${discount.discountValue.toLocaleString('vi-VN')} VNĐ`
                                        }
                                    </p>
                                </div>
                            </div>

                            {discount.minOrderAmount > 0 && (
                                <div className="flex items-center space-x-3">
                                    <Tag className="w-5 h-5 text-orange-600" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Minimum Order</p>
                                        <p className="text-lg font-semibold text-gray-900">
                                            {discount.minOrderAmount.toLocaleString('vi-VN')} VNĐ
                                        </p>
                                    </div>
                                </div>
                            )}

                            {discount.maxDiscountAmount && discount.maxDiscountAmount > 0 && (
                                <div className="flex items-center space-x-3">
                                    <Tag className="w-5 h-5 text-purple-600" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Maximum Discount</p>
                                        <p className="text-lg font-semibold text-gray-900">
                                            {discount.maxDiscountAmount.toLocaleString('vi-VN')} VNĐ
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                                <Calendar className="w-5 h-5 text-blue-600" />
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Valid Period</p>
                                    <p className="text-sm text-gray-900">
                                        {formatDate(discount.startDate)} - {formatDate(discount.endDate)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-3">
                                <Users className="w-5 h-5 text-green-600" />
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Usage</p>
                                    <p className="text-sm text-gray-900">
                                        {discount.usedCount}/{discount.usageLimit === 0 ? '∞' : discount.usageLimit} times
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-3">
                                <MapPin className="w-5 h-5 text-purple-600" />
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Applies to</p>
                                    <p className="text-sm text-gray-900">
                                        {discount.branchId
                                            ? (branchLoading ? 'Loading...' : (branchName || `Branch ${discount.branchId}`))
                                            : 'System-wide'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-3">
                                <Clock className="w-5 h-5 text-gray-600" />
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Created at</p>
                                    <p className="text-sm text-gray-900">
                                        {formatDate(discount.createAt)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Usage Statistics */}
                    {discount.usageLimit > 0 && (
                        <div className="bg-blue-50 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-blue-900 mb-2">Usage Statistics</h4>
                            <div className="w-full bg-blue-200 rounded-full h-2">
                                <div
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{
                                        width: `${Math.min((discount.usedCount / discount.usageLimit) * 100, 100)}%`
                                    }}
                                ></div>
                            </div>
                            <p className="text-xs text-blue-700 mt-1">
                                {Math.round((discount.usedCount / discount.usageLimit) * 100)}% used
                            </p>
                        </div>
                    )}

                    {/* Example Usage */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Usage Example</h4>
                        <div className="text-sm text-gray-600 space-y-1">
                            <p>• Order: 500,000 VND</p>
                            {discount.discountType === 'PERCENT' ? (
                                <p>• Discount: {discount.discountValue}% = {Math.round(500000 * discount.discountValue / 100).toLocaleString('vi-VN')} VND</p>
                            ) : (
                                <p>• Discount: {discount.discountValue.toLocaleString('vi-VN')} VND</p>
                            )}
                            <p>• Total: {discount.discountType === 'PERCENT'
                                ? (500000 - Math.round(500000 * discount.discountValue / 100)).toLocaleString('vi-VN')
                                : (500000 - discount.discountValue).toLocaleString('vi-VN')
                            } VND</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end p-6 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DiscountDetailModal;
